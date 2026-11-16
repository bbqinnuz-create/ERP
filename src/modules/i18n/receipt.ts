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
  | 'return'
  | 'counterOrder'
  | 'reservationDuration'
  | 'reservationExpires'
  | 'hours'
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
    return: 'ВОЗВРАТ',
    counterOrder: 'ОЖИДАЕТ ОПЛАТЫ — БРОНЬ',
    reservationDuration: 'Срок брони',
    reservationExpires: 'Бронь действует до',
    hours: 'ч.',
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
    return: 'QAYTARISH',
    counterOrder: 'TO‘LOV KUTILMOQDA — BAND QILINGAN',
    reservationDuration: 'Band qilish muddati',
    reservationExpires: 'Band qilish muddati tugaydi',
    hours: 'soat',
    currency: 'so‘m',
  },
};

export function translateReceipt(lang: ReceiptLanguage, key: ReceiptMessageKey): string {
  return RECEIPT_TRANSLATIONS[lang][key];
}
