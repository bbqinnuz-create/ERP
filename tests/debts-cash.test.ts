import { describe, expect, it } from 'vitest';
import { addCustomer, addProduct, addUser, makeEnv } from './helpers';
import { addCartLine } from '../src/modules/carts/service';
import { createPurchase } from '../src/modules/purchases/service';
import {
  collectDebtPayment,
  forgiveDebt,
  getCustomerDebt,
  listDebtors,
  listDebtPaymentMethods,
} from '../src/modules/debts/service';
import { createCashOperation, getCashSummary, reverseCashOperation } from '../src/modules/cash/service';
import { createSale } from '../src/modules/sales/service';
import { setUserPermissions } from '../src/modules/auth/service';

function createDebtSale(
  env: ReturnType<typeof makeEnv>,
  userId: string,
  customerId: string,
  productId: string,
  key: string,
) {
  addCartLine(env.db, userId, { productId, qty: '1' });
  return createSale(env.db, userId, 'ru', {
    customerId,
    idempotencyKey: key,
    payments: [],
  }).receipt.sale;
}

function todayInTashkent(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

describe('debts and common cash', () => {
  it('allocates debt payments oldest-first, keeps cash-only entries, and replays idempotently', () => {
    const env = makeEnv();
    try {
      const { db, warehouseId } = env;
      const ownerId = addUser(db, 'debt-owner', 'admin');
      const customerId = addCustomer(db, 'Debt customer');
      const productId = addProduct(db, 'DEBT-ITEM', 'шт', 20_000);
      createPurchase(db, ownerId, {
        warehouseId,
        date: '2026-11-13',
        lines: [{ productId, qty: '3', unitCost: 1_000_000 }],
      });
      const firstSale = createDebtSale(env, ownerId, customerId, productId, 'debt-sale-1');
      const secondSale = createDebtSale(env, ownerId, customerId, productId, 'debt-sale-2');
      const cashMethodId = (db.prepare("SELECT id FROM payment_methods WHERE kind = 'cash'").get() as { id: string }).id;
      const cardMethodId = (db.prepare("SELECT id FROM payment_methods WHERE kind = 'card'").get() as { id: string }).id;

      expect(listDebtors(db)).toMatchObject([
        { customerId, balance: 4_000_000, openSaleCount: 2 },
      ]);
      const payment = collectDebtPayment(db, ownerId, {
        customerId,
        methodId: cashMethodId,
        amount: 2_500_000,
        idempotencyKey: 'debt-payment-cash',
      });
      expect(payment.allocations).toEqual([
        { saleId: firstSale.id, saleNumber: firstSale.number, amount: 2_000_000 },
        { saleId: secondSale.id, saleNumber: secondSale.number, amount: 500_000 },
      ]);
      expect(payment.replayed).toBe(false);
      expect((db.prepare('SELECT amount FROM cash_ledger').get() as { amount: number }).amount).toBe(2_500_000);

      const replay = collectDebtPayment(db, ownerId, {
        customerId,
        methodId: cashMethodId,
        amount: 2_500_000,
        idempotencyKey: 'debt-payment-cash',
      });
      expect(replay.replayed).toBe(true);
      expect(replay.payment.id).toBe(payment.payment.id);
      expect(() => collectDebtPayment(db, ownerId, {
        customerId,
        methodId: cashMethodId,
        amount: 2_000_000,
        idempotencyKey: 'debt-payment-cash',
      })).toThrowError(expect.objectContaining({
        status: 409,
        errorKey: 'debt.idempotency_conflict',
      }));
      expect((db.prepare("SELECT COUNT(*) AS count FROM payments WHERE purpose = 'debt_payment'").get() as
        { count: number }).count).toBe(1);

      expect(() => collectDebtPayment(db, ownerId, {
        customerId,
        methodId: cardMethodId,
        amount: 1_500_001,
        idempotencyKey: 'debt-overpayment',
      })).toThrowError(expect.objectContaining({
        status: 409,
        errorKey: 'debt.payment_exceeds_balance',
      }));
      const cardPayment = collectDebtPayment(db, ownerId, {
        customerId,
        methodId: cardMethodId,
        amount: 1_500_000,
        idempotencyKey: 'debt-payment-card',
      });
      expect(cardPayment.allocations).toEqual([
        { saleId: secondSale.id, saleNumber: secondSale.number, amount: 1_500_000 },
      ]);
      expect((db.prepare('SELECT COUNT(*) AS count FROM cash_ledger').get() as { count: number }).count).toBe(1);
      expect(getCustomerDebt(db, customerId)).toMatchObject({ balance: 0, sales: [] });
      expect(listDebtors(db)).toEqual([]);

      const summary = getCashSummary(db, { from: todayInTashkent(), to: todayInTashkent() });
      expect(summary.balance).toBe(2_500_000);
      expect(summary.nonCashPayments).toEqual([
        expect.objectContaining({ methodId: cardMethodId, received: 1_500_000, paid: 0, net: 1_500_000 }),
      ]);
      expect(listDebtPaymentMethods(db, 'uz').find((method) => method.id === cashMethodId)?.name)
        .toBe('Naqd pul');
      const uzSummary = getCashSummary(db, { from: todayInTashkent(), to: todayInTashkent() }, 'uz');
      expect(uzSummary.cashMethods[0]?.name).toBe('Naqd pul');
      expect(uzSummary.nonCashPayments[0]?.methodName).toBe('Karta');
    } finally {
      env.cleanup();
    }
  });

  it('forgives requested partial amounts across selected receipts only for an administrator', () => {
    const env = makeEnv();
    try {
      const { db, warehouseId } = env;
      const adminId = addUser(db, 'forgive-admin', 'admin');
      const cashierId = addUser(db, 'forgive-cashier', 'cashier');
      const customerId = addCustomer(db, 'Forgiveness customer');
      const productId = addProduct(db, 'FORGIVE-ITEM', 'шт', 20_000);
      createPurchase(db, adminId, {
        warehouseId,
        date: '2026-11-13',
        lines: [{ productId, qty: '3', unitCost: 1_000_000 }],
      });
      const firstSale = createDebtSale(env, adminId, customerId, productId, 'forgive-sale-1');
      const secondSale = createDebtSale(env, adminId, customerId, productId, 'forgive-sale-2');

      expect(() => forgiveDebt(db, cashierId, {
        customerId,
        reason: 'Approved correction',
        items: [{ saleId: firstSale.id, amount: 500_000 }],
      })).toThrowError(expect.objectContaining({
        status: 403,
        errorKey: 'debt.admin_required',
      }));
      expect(() => forgiveDebt(db, adminId, {
        customerId,
        reason: 'Approved correction',
        items: [{ saleId: firstSale.id, amount: 2_000_001 }],
      })).toThrowError(expect.objectContaining({
        status: 409,
        errorKey: 'debt.forgive_exceeds_balance',
      }));
      expect(() => forgiveDebt(db, adminId, {
        customerId,
        reason: 'Atomic validation',
        items: [
          { saleId: firstSale.id, amount: 500_000 },
          { saleId: secondSale.id, amount: 2_000_001 },
        ],
      })).toThrowError(expect.objectContaining({
        status: 409,
        errorKey: 'debt.forgive_exceeds_balance',
      }));
      expect((db.prepare("SELECT COUNT(*) AS count FROM debt_ledger WHERE type = 'DEBT_FORGIVE'").get() as
        { count: number }).count).toBe(0);

      const forgiven = forgiveDebt(db, adminId, {
        customerId,
        reason: 'Owner approved partial forgiveness',
        items: [
          { saleId: firstSale.id, amount: 500_000 },
          { saleId: secondSale.id, amount: 1_000_000 },
        ],
      });
      expect(forgiven.forgiven).toEqual([
        expect.objectContaining({ saleId: firstSale.id, amount: 500_000, balanceAfter: 1_500_000 }),
        expect.objectContaining({ saleId: secondSale.id, amount: 1_000_000, balanceAfter: 1_000_000 }),
      ]);
      expect(getCustomerDebt(db, customerId).balance).toBe(2_500_000);
      expect((db.prepare("SELECT COUNT(*) AS count FROM debt_ledger WHERE type = 'DEBT_FORGIVE'").get() as
        { count: number }).count).toBe(2);
      expect((db.prepare('SELECT COUNT(*) AS count FROM cash_ledger').get() as { count: number }).count).toBe(0);
    } finally {
      env.cleanup();
    }
  });

  it('records cash operations with signed entries, blocks unauthorized types, and prevents duplicate reversal', () => {
    const env = makeEnv();
    try {
      const { db } = env;
      const adminId = addUser(db, 'cash-admin', 'admin');
      const cashierId = addUser(db, 'cash-cashier', 'cashier');
      setUserPermissions(db, adminId, cashierId, { cash_in: 1, cash_collection: 1 });

      expect(() => createCashOperation(db, cashierId, {
        type: 'expense',
        amount: 100_000,
        reason: 'Unauthorized expense',
        category: 'Office',
        idempotencyKey: 'cash-denied-expense',
      })).toThrowError(expect.objectContaining({
        status: 403,
        errorKey: 'auth.permission_denied',
      }));

      const cashIn = createCashOperation(db, adminId, {
        type: 'cash_in',
        amount: 5_000_000,
        reason: 'Cash float',
        idempotencyKey: 'cash-in-once',
      });
      expect(createCashOperation(db, adminId, {
        type: 'cash_in',
        amount: 5_000_000,
        reason: 'Cash float',
        idempotencyKey: 'cash-in-once',
      })).toMatchObject({ replayed: true, operation: { id: cashIn.operation.id } });
      expect(() => createCashOperation(db, adminId, {
        type: 'cash_in',
        amount: 4_000_000,
        reason: 'Cash float',
        idempotencyKey: 'cash-in-once',
      })).toThrowError(expect.objectContaining({
        status: 409,
        errorKey: 'cash.idempotency_conflict',
      }));
      createCashOperation(db, adminId, {
        type: 'cash_out',
        amount: 1_000_000,
        reason: 'Owner withdrawal',
        idempotencyKey: 'cash-out-once',
      });
      const expense = createCashOperation(db, adminId, {
        type: 'expense',
        amount: 500_000,
        reason: 'Supplies',
        category: 'Office supplies',
        reference: 'REQ-15',
        idempotencyKey: 'cash-expense-once',
      });
      const collection = createCashOperation(db, adminId, {
        type: 'collection',
        amount: 500_000,
        reason: 'Bank collection',
        idempotencyKey: 'cash-collection-once',
      });
      expect((db.prepare('SELECT SUM(amount) AS balance FROM cash_ledger').get() as { balance: number }).balance)
        .toBe(3_000_000);

      const reversal = reverseCashOperation(db, adminId, collection.operation.id, {
        reason: 'Collection cancelled',
        idempotencyKey: 'cash-collection-reversal',
      });
      expect(reversal.operation).toMatchObject({
        type: 'cash_in',
        amount: 500_000,
        reversesId: collection.operation.id,
      });
      expect(() => reverseCashOperation(db, adminId, collection.operation.id, {
        reason: 'Different reason',
        idempotencyKey: 'cash-collection-reversal',
      })).toThrowError(expect.objectContaining({
        status: 409,
        errorKey: 'cash.idempotency_conflict',
      }));
      expect((db.prepare('SELECT SUM(amount) AS balance FROM cash_ledger').get() as { balance: number }).balance)
        .toBe(3_500_000);
      expect((db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE action IN ('cash.operation.create', 'cash.operation.reverse')").get() as
        { count: number }).count).toBe(5);
      expect((db.prepare("SELECT COUNT(*) AS count FROM sync_outbox WHERE table_name = 'cash_operations'").get() as
        { count: number }).count).toBe(5);
      expect(() => reverseCashOperation(db, adminId, collection.operation.id, {
        reason: 'Second reversal',
        idempotencyKey: 'cash-collection-reversal-2',
      })).toThrowError(expect.objectContaining({
        status: 409,
        errorKey: 'cash.operation_already_reversed',
      }));
      expect(() => reverseCashOperation(db, adminId, reversal.operation.id, {
        reason: 'Reverse the reversal',
        idempotencyKey: 'cash-reversal-of-reversal',
      })).toThrowError(expect.objectContaining({
        status: 409,
        errorKey: 'cash.reversal_of_reversal',
      }));

      const summary = getCashSummary(db, { from: todayInTashkent(), to: todayInTashkent() });
      expect(summary).toMatchObject({
        balance: 3_500_000,
        periodBalance: 3_500_000,
        entries: expect.arrayContaining([
          expect.objectContaining({ operationId: reversal.operation.id, amount: 500_000 }),
        ]),
      });
      expect(summary.entries.find((entry) => entry.operationId === expense.operation.id))
        .toMatchObject({ category: 'Office supplies', reference: 'REQ-15', reason: 'Supplies' });
    } finally {
      env.cleanup();
    }
  });
});
