import { describe, expect, it } from 'vitest';
import {
  assertNotBelowCost,
  calculateCart,
  type PriceCart,
  type PriceRule,
  type PriceSettings,
} from '../src/modules/prices/service';

const settings: PriceSettings = {
  rounding: 'tiyin',
  permissions: {
    discountManual: true,
    discountManualLimitBp: 10_000,
    discountCheck: true,
    discountCheckLimitBp: 10_000,
  },
};

function cart(
  lines: PriceCart['lines'],
  extra: Partial<PriceCart> = {},
): PriceCart {
  return { lines, ...extra };
}

function rule(input: Partial<PriceRule> & Pick<PriceRule, 'id' | 'type'>): PriceRule {
  return {
    productId: 'product-a',
    price: 1_300_000,
    ...input,
  };
}

describe('движок цен и скидок', () => {
  it('применяет границы количества к суммарной позиции', () => {
    const rules = [
      rule({ id: 'up-to-50', type: 'qty', price: 1_500_000, maxQty: 50_000 }),
      rule({ id: 'over-50', type: 'qty', price: 1_400_000, minQty: 50_000, minInclusive: false }),
    ];
    const at50 = calculateCart(cart([{ productId: 'product-a', qty: 50_000, basePrice: 1_600_000 }]), rules, settings, new Date('2026-11-13T10:00:00Z'));
    const at50001 = calculateCart(cart([{ productId: 'product-a', qty: 50_001, basePrice: 1_600_000 }]), rules, settings, new Date('2026-11-13T10:00:00Z'));
    const at51 = calculateCart(cart([{ productId: 'product-a', qty: 51_000, basePrice: 1_600_000 }]), rules, settings, new Date('2026-11-13T10:00:00Z'));

    expect(at50.lines[0]).toMatchObject({ unitPrice: 1_500_000, lineTotal: 75_000_000 });
    expect(at50001.lines[0]).toMatchObject({ unitPrice: 1_400_000, lineTotal: 70_001_400 });
    expect(at51.lines[0]).toMatchObject({ unitPrice: 1_400_000, lineTotal: 71_400_000 });

    const merged = calculateCart(cart([
      { productId: 'product-a', qty: 30_000, basePrice: 1_600_000 },
      { productId: 'product-a', qty: 20_001, basePrice: 1_600_000 },
    ]), rules, settings, new Date('2026-11-13T10:00:00Z'));
    expect(merged.lines).toHaveLength(1);
    expect(merged.lines[0]).toMatchObject({ qty: 50_001, unitPrice: 1_400_000 });
  });

  it('выбирает одну самую низкую подходящую цену', () => {
    const result = calculateCart(
      cart([{ productId: 'product-a', qty: 1000, basePrice: 1_600_000 }], { customerId: 'customer-a' }),
      [
        rule({ id: 'quantity', type: 'qty', price: 1_400_000 }),
        rule({ id: 'promo', type: 'promo', price: 1_300_000 }),
        rule({ id: 'customer', type: 'customer', customerId: 'customer-a', percentBp: 1000, price: null }),
      ],
      settings,
      new Date('2026-11-13T10:00:00Z'),
    );

    expect(result.lines[0]).toMatchObject({ unitPrice: 1_300_000, lineTotal: 1_300_000 });
    expect(result.lines[0]?.appliedDiscounts).toEqual([
      { kind: 'promo', ruleId: 'promo', amount: 300_000 },
    ]);
  });

  it('применяет процентное правило к товару категории', () => {
    const result = calculateCart(
      cart([{
        productId: 'product-a',
        categoryId: 'category-a',
        qty: 1000,
        basePrice: 10_000,
      }]),
      [rule({
        id: 'category-promo',
        type: 'promo',
        productId: null,
        categoryId: 'category-a',
        price: null,
        percentBp: 1500,
      })],
      settings,
      new Date('2026-11-13T10:00:00Z'),
    );

    expect(result.lines[0]).toMatchObject({
      unitPrice: 8500,
      appliedDiscounts: [{ kind: 'promo', ruleId: 'category-promo', amount: 1500 }],
    });
  });

  it('применяет клиентское правило только к указанному клиенту и разрешает ничью по приоритету', () => {
    const customerRule = rule({
      id: 'customer-price',
      type: 'customer',
      customerId: 'customer-a',
      price: null,
      percentBp: 2000,
    });
    const result = calculateCart(
      cart([{ productId: 'product-a', qty: 1000, basePrice: 1000 }], { customerId: 'customer-a' }),
      [
        rule({ id: 'lower-priority', type: 'promo', price: 800, priority: 1 }),
        rule({ id: 'higher-priority', type: 'promo', price: 800, priority: 2 }),
        customerRule,
      ],
      settings,
      new Date('2026-11-13T10:00:00Z'),
    );
    const noCustomer = calculateCart(
      cart([{ productId: 'product-a', qty: 1000, basePrice: 1000 }]),
      [customerRule],
      settings,
      new Date('2026-11-13T10:00:00Z'),
    );

    expect(result.lines[0]?.appliedDiscounts[0]?.ruleId).toBe('higher-priority');
    expect(noCustomer.lines[0]?.unitPrice).toBe(1000);
  });

  it('учитывает первый и последний день акции по времени Ташкента включительно', () => {
    const promo = rule({
      id: 'dated-promo',
      type: 'promo',
      price: 900,
      dateFrom: '2026-11-13',
      dateTo: '2026-11-15',
    });
    const input = cart([{ productId: 'product-a', qty: 1000, basePrice: 1000 }]);
    const onFirstDay = calculateCart(input, [promo], settings, new Date('2026-11-12T19:00:00Z'));
    const onLastDay = calculateCart(input, [promo], settings, new Date('2026-11-15T18:59:59Z'));
    const before = calculateCart(input, [promo], settings, new Date('2026-11-12T18:59:59Z'));
    const after = calculateCart(input, [promo], settings, new Date('2026-11-15T19:00:00Z'));

    expect(onFirstDay.lines[0]?.unitPrice).toBe(900);
    expect(onLastDay.lines[0]?.unitPrice).toBe(900);
    expect(before.lines[0]?.unitPrice).toBe(1000);
    expect(after.lines[0]?.unitPrice).toBe(1000);
  });

  it('распределяет скидку на чек пропорционально с точной суммой в тийинах', () => {
    const result = calculateCart(
      cart([
        { productId: 'product-a', qty: 1000, basePrice: 10_003 },
        { productId: 'product-b', qty: 1000, basePrice: 20_007 },
        { productId: 'product-c', qty: 1000, basePrice: 30_011 },
      ], { checkDiscount: { kind: 'percent', valueBp: 500 } }),
      [],
      settings,
      new Date('2026-11-13T10:00:00Z'),
    );

    expect(result.subtotal).toBe(60_021);
    expect(result.discountTotal).toBe(3001);
    expect(result.total).toBe(57_020);
    expect(result.lines.reduce((sum, line) => sum + line.checkDiscount, 0)).toBe(3001);
    expect(result.lines.reduce((sum, line) => sum + line.lineTotal, 0)).toBe(result.total);
  });

  it('применяет ручную скидку строки и фиксированную скидку чека в заданных пределах', () => {
    const limitedSettings: PriceSettings = {
      ...settings,
      permissions: {
        ...settings.permissions,
        discountManualLimitBp: 500,
        discountCheckLimitBp: 500,
      },
    };
    const result = calculateCart(
      cart([{ productId: 'product-a', qty: 1000, basePrice: 10_000 }], {
        manualDiscounts: [{ productId: 'product-a', discount: { kind: 'percent', valueBp: 500 } }],
        checkDiscount: { kind: 'amount', amount: 475 },
      }),
      [],
      limitedSettings,
      new Date('2026-11-13T10:00:00Z'),
    );

    expect(result.lines[0]).toMatchObject({
      manualDiscount: 500,
      checkDiscount: 475,
      lineDiscount: 975,
      lineTotal: 9025,
    });
    expect(result.total).toBe(9025);
  });

  it('возвращает NEEDS_ADMIN при превышении лимита скидки', () => {
    const limitedSettings: PriceSettings = {
      ...settings,
      permissions: { ...settings.permissions, discountCheckLimitBp: 499 },
    };
    expect(() => calculateCart(
      cart([{ productId: 'product-a', qty: 1000, basePrice: 100_000 }], {
        checkDiscount: { kind: 'percent', valueBp: 500 },
      }),
      [],
      limitedSettings,
      new Date('2026-11-13T10:00:00Z'),
    )).toThrowError(expect.objectContaining({ code: 'NEEDS_ADMIN' }));
    expect(() => calculateCart(
      cart([{ productId: 'product-a', qty: 1000, basePrice: 100_000 }], {
        manualDiscounts: [{ productId: 'product-a', discount: { kind: 'amount', amount: 5000 } }],
      }),
      [],
      { ...limitedSettings, permissions: { ...limitedSettings.permissions, discountManualLimitBp: 499 } },
      new Date('2026-11-13T10:00:00Z'),
    )).toThrowError(expect.objectContaining({ code: 'NEEDS_ADMIN' }));
  });

  it('не применяет скидку без соответствующего права', () => {
    const deniedSettings: PriceSettings = {
      ...settings,
      permissions: { ...settings.permissions, discountManual: false },
    };
    expect(() => calculateCart(
      cart([{ productId: 'product-a', qty: 1000, basePrice: 1000 }], {
        manualDiscounts: [{ productId: 'product-a', discount: { kind: 'amount', amount: 100 } }],
      }),
      [],
      deniedSettings,
      new Date('2026-11-13T10:00:00Z'),
    )).toThrowError(expect.objectContaining({ code: 'DISCOUNT_NOT_ALLOWED' }));
  });

  it('округляет строку до целого сума только при соответствующей настройке', () => {
    const input = cart([{ productId: 'product-a', qty: 1000, basePrice: 150 }]);
    const rounded = calculateCart(input, [], { ...settings, rounding: 'sum' }, new Date('2026-11-13T10:00:00Z'));
    const exact = calculateCart(input, [], settings, new Date('2026-11-13T10:00:00Z'));

    expect(rounded).toMatchObject({ subtotal: 200, total: 200 });
    expect(exact).toMatchObject({ subtotal: 150, total: 150 });
  });

  it('запрещает продажу ниже себестоимости без обхода правами', () => {
    const result = calculateCart(
      cart([{ productId: 'product-a', qty: 1000, basePrice: 1000 }]),
      [],
      settings,
      new Date('2026-11-13T10:00:00Z'),
    );

    expect(() => assertNotBelowCost(result, [{ productId: 'product-a', costTotal: 1001 }]))
      .toThrowError(expect.objectContaining({ code: 'BELOW_COST' }));
    expect(() => assertNotBelowCost(result, [{ productId: 'product-a', costTotal: 1000 }]))
      .not.toThrow();
    expect(() => calculateCart(
      cart([{ productId: 'product-a', qty: 1000, basePrice: 1000, fifoCostTotal: 1001 }]),
      [],
      settings,
      new Date('2026-11-13T10:00:00Z'),
    )).toThrowError(expect.objectContaining({ code: 'BELOW_COST' }));
    expect(() => calculateCart(
      cart([{ productId: 'product-a', qty: 1000, basePrice: 1000, fifoCostTotal: 900 }], {
        manualDiscounts: [{ productId: 'product-a', discount: { kind: 'amount', amount: 200 } }],
      }),
      [],
      settings,
      new Date('2026-11-13T10:00:00Z'),
    )).toThrowError(expect.objectContaining({ code: 'BELOW_COST' }));
  });
});
