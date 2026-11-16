import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthError, bootstrapAdmin, createUser, setUserPermissions } from '../src/modules/auth/service';
import {
  listProductUnits,
  listReferences,
  saveReference,
  setReferenceActive,
  updateSettings,
} from '../src/modules/references/service';
import { makeEnv, type TestEnv } from './helpers';

let env: TestEnv;
let adminId: string;

beforeEach(async () => {
  env = makeEnv();
  const admin = await bootstrapAdmin(env.db, {
    login: 'owner',
    password: 'correct horse battery',
    fullName: 'Owner',
    role: 'admin',
    lang: 'ru',
  });
  adminId = admin.id;
});

afterEach(() => env.cleanup());

describe('справочники этапа 2', () => {
  it('создаёт категорию и товар, записывает аудит и скрывает вместо удаления', () => {
    saveReference(env.db, adminId, 'categories', { name_ru: 'Ткани', name_uz: 'Matolar' });
    const product = saveReference(env.db, adminId, 'products', {
      sku: 'FABRIC-1',
      name: 'Ткань',
      unit: 'метр',
      base_price: 1_500_000,
    });
    expect(product.name).toBe('Ткань');
    expect(product).not.toHaveProperty('name_ru');
    expect(product).not.toHaveProperty('name_uz');
    expect(env.db.prepare('SELECT name_ru, name_uz FROM products WHERE id = ?').get(product.id))
      .toEqual({ name_ru: 'Ткань', name_uz: null });
    expect(listReferences(env.db, 'products')).toHaveLength(1);

    setReferenceActive(env.db, adminId, 'products', String(product.id), false);
    expect(listReferences(env.db, 'products')).toHaveLength(0);
    expect(listReferences(env.db, 'products', true)[0]?.active).toBe(0);
    expect(env.db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE entity = 'products'").get())
      .toMatchObject({ count: 2 });
  });

  it('проверяет целочисленные суммы, типы характеристик и обязательные поля', () => {
    expect(() => saveReference(env.db, adminId, 'products', {
      sku: 'BAD',
      name: 'Bad',
      unit: 'шт',
      base_price: 1.5,
    })).toThrowError(new AuthError(400, 'validation.invalid_base_price'));

    expect(() => saveReference(env.db, adminId, 'products', {
      sku: 'OLD-API',
      name_ru: 'Old name field',
      unit: 'шт',
      base_price: 100,
    })).toThrowError(new AuthError(400, 'validation.unknown_field'));
    expect(() => saveReference(env.db, adminId, 'products', {
      sku: 'NO-PRICE',
      name: 'No price',
      unit: 'шт',
    })).toThrowError(new AuthError(400, 'validation.required_base_price'));
    expect(() => saveReference(env.db, adminId, 'products', {
      sku: 'LONG-UNIT',
      name: 'Long unit',
      unit: 'x'.repeat(33),
      base_price: 100,
    })).toThrowError(new AuthError(400, 'validation.invalid_unit'));

    expect(() => saveReference(env.db, adminId, 'attributes', {
      category_id: 'missing',
      key: 'material',
      name_ru: 'Материал',
      type: 'list',
      options: null,
    })).toThrowError(new AuthError(400, 'validation.options_required'));
  });

  it('предлагает стандартные единицы и сохраняет новые единицы с аудитом', () => {
    expect(listProductUnits(env.db)).toEqual(['шт', 'кг', 'тн', 'метр']);
    saveReference(env.db, adminId, 'products', {
      sku: 'PACK-1',
      name: 'Упаковка',
      unit: 'упак.',
      base_price: 500,
    });
    saveReference(env.db, adminId, 'products', {
      sku: 'PACK-2',
      name: 'Другая упаковка',
      unit: 'УПАК.',
      base_price: 600,
    });

    expect(listProductUnits(env.db)).toEqual(['шт', 'кг', 'тн', 'метр', 'упак.']);
    expect(env.db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE action = 'settings.product_units_updated'").get())
      .toMatchObject({ count: 1 });
    expect(() => updateSettings(env.db, adminId, { product_units: '["шт"]' }))
      .toThrowError(new AuthError(400, 'settings.invalid_key_or_value'));
  });

  it('создаёт характеристику списка с JSON-вариантами и клиента с целым лимитом скидки', () => {
    const category = saveReference(env.db, adminId, 'categories', { name_ru: 'Одежда' });
    const attribute = saveReference(env.db, adminId, 'attributes', {
      category_id: category.id,
      key: 'color',
      name_ru: 'Цвет',
      type: 'list',
      options: ['красный', 'синий'],
    });
    const customer = saveReference(env.db, adminId, 'customers', {
      name: 'Покупатель',
      discount_bp: 250,
    });
    expect(attribute.options).toBe('["красный","синий"]');
    expect(customer.discount_bp).toBe(250);
  });

  it('сопоставляет телефоны клиента с кодом страны и без него', () => {
    const first = saveReference(env.db, adminId, 'customers', {
      name: 'Покупатель',
      phone: '930 007 188',
    });
    const duplicate = saveReference(env.db, adminId, 'customers', {
      name: 'Покупатель повторно',
      phone: '+998 93 000 71 88',
    });

    expect(duplicate.id).toBe(first.id);
    expect(duplicate.name).toBe('Покупатель');
    expect(duplicate.phone).toBe('998930007188');
    expect((env.db.prepare('SELECT COUNT(*) AS count FROM customers').get() as { count: number }).count).toBe(1);
  });

  it('обновляет настройки по разрешённому списку и запрещает ослаблять правила сессий', () => {
    const updated = updateSettings(env.db, adminId, {
      receipt_lang_default: 'uz',
      reserve_days: 5,
      counter_reservation_hours: 5,
    });
    expect(updated.receipt_lang_default).toBe('uz');
    expect(updated.reserve_days).toBe('5');
    expect(updated.counter_reservation_hours).toBe('5');
    expect(() => updateSettings(env.db, adminId, { session_absolute_hours: '24' }))
      .toThrowError(new AuthError(400, 'settings.invalid_key_or_value'));
    expect(() => updateSettings(env.db, adminId, { counter_reservation_hours: '6' }))
      .toThrowError(new AuthError(400, 'settings.invalid_key_or_value'));
  });

  it('ограничивает права кассира и скидочные лимиты целыми базисными пунктами', async () => {
    const cashier = await createUser(env.db, adminId, {
      login: 'cashier',
      password: 'cashier secure password',
      fullName: 'Cashier',
      role: 'cashier',
      lang: 'ru',
    });
    expect(() => setUserPermissions(env.db, adminId, cashier.id, { sell: 2 }))
      .toThrowError(new AuthError(400, 'validation.invalid_permission_value'));
    expect(() => setUserPermissions(env.db, adminId, cashier.id, { discount_manual_limit_bp: 10_001 }))
      .toThrowError(new AuthError(400, 'validation.permission_limit_out_of_range'));
  });
});
