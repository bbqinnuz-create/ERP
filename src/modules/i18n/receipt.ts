import type { ReceiptLanguage } from '../print/receipt';

export type ReceiptMessageKey =
  | 'cashier'
  | 'customer'
  | 'subtotal'
  | 'discount'
  | 'total'
  | 'paid'
  | 'change'
  | 'debt'
  | 'copy'
  | 'currency';

const RECEIPT_TRANSLATIONS: Record<ReceiptLanguage, Record<ReceiptMessageKey, string>> = {
  ru: {
    cashier: 'Кассир',
    customer: 'Клиент',
    subtotal: 'Подытог',
    discount: 'Скидка',
    total: 'ИТОГО',
    paid: 'Оплачено',
    change: 'Сдача',
    debt: 'Долг',
    copy: 'КОПИЯ',
    currency: 'сум',
  },
  uz: {
    cashier: 'Sotuvchi',
    customer: 'Mijoz',
    subtotal: 'Oraliq jami',
    discount: 'Chegirma',
    total: 'JAMI',
    paid: 'To‘landi',
    change: 'Qaytim',
    debt: 'Qarz',
    copy: 'NUSXA',
    currency: 'so‘m',
  },
};

export function translateReceipt(lang: ReceiptLanguage, key: ReceiptMessageKey): string {
  return RECEIPT_TRANSLATIONS[lang][key];
}
