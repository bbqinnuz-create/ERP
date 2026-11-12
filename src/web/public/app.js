const translations = {
  ru: {
    'app.title': 'Учёт магазина',
    'language.label': 'Язык',
    'login.title': 'Вход',
    'login.login': 'Логин',
    'login.password': 'Пароль',
    'login.submit': 'Войти',
    'auth.logout': 'Выйти',
    'nav.products': 'Товары',
    'nav.stock': 'Остатки',
    'nav.users': 'Пользователи и права',
    'products.title': 'Товары',
    'products.sku': 'Артикул',
    'products.name': 'Название',
    'products.unit': 'Единица учёта',
    'products.add_custom_unit': 'Добавить свою единицу…',
    'products.custom_unit': 'Новая единица учёта',
    'products.base_price': 'Базовая цена, тийин',
    'products.create': 'Добавить товар',
    'products.empty': 'Товаров пока нет',
    'products.columns': 'Артикул,Товар,Единица,Цена,Статус',
    'stock.title': 'Остатки',
    'stock.stage_note': 'Операции прихода и движения остатков появятся на следующих этапах.',
    'stock.empty': 'Движений и остатков пока нет',
    'stock.columns': 'Товар,Склад,Количество,Резерв',
    'users.title': 'Пользователи',
    'users.login': 'Логин',
    'users.full_name': 'Имя',
    'users.password': 'Пароль (не менее 5 символов)',
    'users.role': 'Роль',
    'users.cashier': 'Кассир',
    'users.admin': 'Администратор',
    'users.language': 'Язык',
    'users.create': 'Создать пользователя',
    'users.permissions': 'Права пользователя',
    'users.edit': 'Изменить пользователя',
    'users.new_password': 'Новый пароль (необязательно)',
    'users.save_user': 'Сохранить пользователя',
    'users.save_permissions': 'Сохранить права',
    'users.set_active': 'Сменить статус',
    'users.columns': 'Логин,Имя,Роль,Язык,Статус,Действие',
    'users.edit_user': 'Изменить',
    'users.active': 'Активен',
    'users.inactive': 'Отключён',
    'users.edit_permissions': 'Права',
    'users.choose': 'Выберите пользователя',
    'permission.sell': 'Продажа',
    'permission.hold_cart': 'Отложенная корзина',
    'permission.reserve_cart': 'Резерв товара',
    'permission.discount_check': 'Скидка на чек',
    'permission.discount_manual': 'Ручная скидка',
    'permission.sell_below_cost': 'Продажа ниже себестоимости',
    'permission.debt_sale': 'Продажа в долг',
    'permission.debt_payment': 'Приём оплаты долга',
    'permission.return': 'Возврат',
    'permission.write_off': 'Списание',
    'permission.purchase': 'Приход',
    'permission.stocktake': 'Инвентаризация',
    'permission.price_edit': 'Изменение цен',
    'permission.view_cost': 'Просмотр себестоимости',
    'permission.reports': 'Отчёты',
    'permission.cash_in': 'Внесение наличных',
    'permission.cash_out': 'Изъятие наличных',
    'permission.expense': 'Расход',
    'permission.cash_collection': 'Инкассация',
    'permission.users_manage': 'Управление пользователями',
    'permission.settings': 'Настройки и справочники',
    'permission.discount_check_limit_bp': 'Лимит скидки на чек (б.п.)',
    'permission.discount_manual_limit_bp': 'Лимит ручной скидки (б.п.)',
    'auth.invalid_credentials': 'Неверный логин или пароль.',
    'auth.required': 'Сначала войдите в систему.',
    'auth.session_expired': 'Сессия завершена. Войдите снова.',
    'auth.session_replaced': 'Выполнен вход на другом устройстве.',
    'auth.permission_denied': 'Недостаточно прав.',
    'users.not_found': 'Пользователь не найден.',
    'users.login_taken': 'Такой логин уже зарегистрирован.',
    'users.last_admin': 'Нельзя отключить или понизить последнего администратора.',
    'users.admin_permissions_implicit': 'Права администратора нельзя изменять отдельно.',
    'users.bootstrap_already_used': 'Начальный администратор уже создан.',
    'validation.invalid_login': 'Логин: 3–64 символа (латинские буквы, цифры, точка, дефис или подчёркивание).',
    'validation.invalid_password': 'Пароль должен содержать от 5 до 128 символов.',
    'validation.invalid_full_name': 'Укажите имя длиной до 120 символов.',
    'validation.invalid_role': 'Недопустимая роль.',
    'validation.invalid_language': 'Недопустимый язык.',
    'validation.invalid_active': 'Недопустимый статус.',
    'validation.unknown_field': 'Запрос содержит неизвестное поле.',
    'validation.empty_update': 'Нет изменений для сохранения.',
    'validation.unknown_permission': 'Неизвестное право.',
    'validation.invalid_permissions': 'Неверный список прав.',
    'validation.permission_limit_out_of_range': 'Лимит должен быть от 0 до 10000 базисных пунктов.',
    'validation.invalid_permission_value': 'Недопустимое значение права.',
    'validation.invalid_data': 'Проверьте введённые данные.',
    'validation.invalid_object': 'Ожидался объект.',
    'validation.invalid_sku': 'Укажите артикул.',
    'validation.invalid_unit': 'Укажите единицу учёта длиной до 32 символов.',
    'validation.invalid_name_ru': 'Укажите название.',
    'validation.required_name_ru': 'Укажите название товара.',
    'database.unique_conflict': 'Такое значение уже используется.',
    'database.invalid_reference': 'Связанная запись не найдена.',
    'database.invalid_value': 'Недопустимое значение.',
    'http.local_network_only': 'Доступ разрешён только из локальной сети.',
    'http.not_found': 'Страница или запись не найдена.',
    'http.body_too_large': 'Запрос слишком большой.',
    'http.json_required': 'Ожидался JSON-запрос.',
    'http.invalid_json': 'Не удалось прочитать запрос.',
    'settings.invalid_key_or_value': 'Недопустимая настройка или значение.',
    'server.internal_error': 'Внутренняя ошибка сервера.',
    'status.loading': 'Загрузка…',
    'status.saved': 'Сохранено.',
    'status.created': 'Создано.',
    'status.logged_out': 'Вы вышли из системы.',
    'status.stock_empty': 'Движений и остатков пока нет',
    'status.select_user': 'Сначала выберите пользователя.',
    'status.admin_permissions': 'У администратора все права.',
  },
  uz: {
    'app.title': 'Do‘kon hisobi',
    'language.label': 'Til',
    'login.title': 'Kirish',
    'login.login': 'Login',
    'login.password': 'Parol',
    'login.submit': 'Kirish',
    'auth.logout': 'Chiqish',
    'nav.products': 'Tovarlar',
    'nav.stock': 'Qoldiqlar',
    'nav.users': 'Foydalanuvchilar va huquqlar',
    'products.title': 'Tovarlar',
    'products.sku': 'Artikul',
    'products.name': 'Nomi',
    'products.unit': 'Hisob birligi',
    'products.add_custom_unit': 'Yangi hisob birligini qo‘shish…',
    'products.custom_unit': 'Yangi hisob birligi',
    'products.base_price': 'Asosiy narx, tiyin',
    'products.create': 'Tovar qo‘shish',
    'products.empty': 'Hozircha tovar yo‘q',
    'products.columns': 'Artikul,Tovar,Birlik,Narx,Holat',
    'stock.title': 'Qoldiqlar',
    'stock.stage_note': 'Kirim va qoldiq harakati keyingi bosqichlarda qo‘shiladi.',
    'stock.empty': 'Hozircha harakatlar va qoldiqlar yo‘q',
    'stock.columns': 'Tovar,Ombor,Miqdor,Rezerv',
    'users.title': 'Foydalanuvchilar',
    'users.login': 'Login',
    'users.full_name': 'Ism',
    'users.password': 'Parol (kamida 5 belgi)',
    'users.role': 'Rol',
    'users.cashier': 'Sotuvchi',
    'users.admin': 'Administrator',
    'users.language': 'Til',
    'users.create': 'Foydalanuvchi yaratish',
    'users.permissions': 'Foydalanuvchi huquqlari',
    'users.edit': 'Foydalanuvchini tahrirlash',
    'users.new_password': 'Yangi parol (ixtiyoriy)',
    'users.save_user': 'Foydalanuvchini saqlash',
    'users.save_permissions': 'Huquqlarni saqlash',
    'users.set_active': 'Holatni o‘zgartirish',
    'users.columns': 'Login,Ism,Rol,Til,Holat,Amal',
    'users.edit_user': 'Tahrirlash',
    'users.active': 'Faol',
    'users.inactive': 'O‘chirilgan',
    'users.edit_permissions': 'Huquqlar',
    'users.choose': 'Foydalanuvchini tanlang',
    'permission.sell': 'Sotish',
    'permission.hold_cart': 'Kechiktirilgan savat',
    'permission.reserve_cart': 'Tovarni band qilish',
    'permission.discount_check': 'Chekka chegirma',
    'permission.discount_manual': 'Qo‘lda chegirma',
    'permission.sell_below_cost': 'Tannarxdan arzon sotish',
    'permission.debt_sale': 'Nasiya savdo',
    'permission.debt_payment': 'Qarz to‘lovi',
    'permission.return': 'Qaytarish',
    'permission.write_off': 'Hisobdan chiqarish',
    'permission.purchase': 'Kirim',
    'permission.stocktake': 'Inventarizatsiya',
    'permission.price_edit': 'Narxlarni o‘zgartirish',
    'permission.view_cost': 'Tannarxni ko‘rish',
    'permission.reports': 'Hisobotlar',
    'permission.cash_in': 'Naqd pul kiritish',
    'permission.cash_out': 'Naqd pul olish',
    'permission.expense': 'Xarajat',
    'permission.cash_collection': 'Inkassatsiya',
    'permission.users_manage': 'Foydalanuvchilarni boshqarish',
    'permission.settings': 'Sozlamalar va ma’lumotnomalar',
    'permission.discount_check_limit_bp': 'Chek chegirmasi limiti (bazis punkt)',
    'permission.discount_manual_limit_bp': 'Qo‘lda chegirma limiti (bazis punkt)',
    'auth.invalid_credentials': 'Login yoki parol noto‘g‘ri.',
    'auth.required': 'Avval tizimga kiring.',
    'auth.session_expired': 'Seans tugadi. Qayta kiring.',
    'auth.session_replaced': 'Boshqa qurilmadan kirildi.',
    'auth.permission_denied': 'Huquqlar yetarli emas.',
    'users.not_found': 'Foydalanuvchi topilmadi.',
    'users.login_taken': 'Bu login allaqachon ro‘yxatdan o‘tgan.',
    'users.last_admin': 'Oxirgi administratorni o‘chirib yoki rolini pasaytirib bo‘lmaydi.',
    'users.admin_permissions_implicit': 'Administrator huquqlarini alohida o‘zgartirib bo‘lmaydi.',
    'users.bootstrap_already_used': 'Boshlang‘ich administrator yaratilgan.',
    'validation.invalid_login': 'Login 3–64 belgi: lotin harflari, raqam, nuqta, chiziqcha yoki pastki chiziq.',
    'validation.invalid_password': 'Parol 5–128 belgidan iborat bo‘lishi kerak.',
    'validation.invalid_full_name': '120 belgigacha ism kiriting.',
    'validation.invalid_role': 'Rol noto‘g‘ri.',
    'validation.invalid_language': 'Til noto‘g‘ri.',
    'validation.invalid_active': 'Holat noto‘g‘ri.',
    'validation.unknown_field': 'So‘rovda noma’lum maydon bor.',
    'validation.empty_update': 'Saqlash uchun o‘zgarish yo‘q.',
    'validation.unknown_permission': 'Noma’lum huquq.',
    'validation.invalid_permissions': 'Huquqlar ro‘yxati noto‘g‘ri.',
    'validation.permission_limit_out_of_range': 'Limit 0–10000 bazis punkt oralig‘ida bo‘lishi kerak.',
    'validation.invalid_permission_value': 'Huquq qiymati noto‘g‘ri.',
    'validation.invalid_data': 'Kiritilgan ma’lumotlarni tekshiring.',
    'validation.invalid_object': 'Obyekt kutilgan edi.',
    'validation.invalid_sku': 'Artikul kiriting.',
    'validation.invalid_unit': '32 belgigacha hisob birligini kiriting.',
    'validation.invalid_name_ru': 'Nom kiriting.',
    'validation.required_name_ru': 'Tovar nomini kiriting.',
    'database.unique_conflict': 'Bu qiymat ishlatilmoqda.',
    'database.invalid_reference': 'Bog‘langan yozuv topilmadi.',
    'database.invalid_value': 'Qiymat noto‘g‘ri.',
    'http.local_network_only': 'Faqat mahalliy tarmoqdan foydalanish mumkin.',
    'http.not_found': 'Sahifa yoki yozuv topilmadi.',
    'http.body_too_large': 'So‘rov hajmi juda katta.',
    'http.json_required': 'JSON so‘rovi kutilgan edi.',
    'http.invalid_json': 'So‘rovni o‘qib bo‘lmadi.',
    'settings.invalid_key_or_value': 'Sozlama yoki qiymat noto‘g‘ri.',
    'server.internal_error': 'Serverning ichki xatosi.',
    'status.loading': 'Yuklanmoqda…',
    'status.saved': 'Saqlandi.',
    'status.created': 'Yaratildi.',
    'status.logged_out': 'Tizimdan chiqdingiz.',
    'status.stock_empty': 'Hozircha harakatlar va qoldiqlar yo‘q',
    'status.select_user': 'Avval foydalanuvchini tanlang.',
    'status.admin_permissions': 'Administrator barcha huquqlarga ega.',
  },
};

const permissionKeys = [
  'sell', 'hold_cart', 'reserve_cart', 'discount_check', 'discount_manual', 'sell_below_cost',
  'debt_sale', 'debt_payment', 'return', 'write_off', 'purchase', 'stocktake', 'price_edit',
  'view_cost', 'reports', 'cash_in', 'cash_out', 'expense', 'cash_collection', 'users_manage', 'settings',
  'discount_check_limit_bp', 'discount_manual_limit_bp',
];

const state = { lang: localStorage.getItem('kassa_lang') === 'uz' ? 'uz' : 'ru', user: null, selectedUser: null };
let sessionCheckInFlight = false;
const $ = (selector) => document.querySelector(selector);
const t = (key) => {
  const direct = translations[state.lang][key];
  if (direct) return direct;
  if (key.startsWith('validation.')) return translations[state.lang]['validation.invalid_data'];
  if (key.startsWith('settings.')) return translations[state.lang]['settings.invalid_key_or_value'];
  return translations[state.lang]['server.internal_error'];
};
const message = (key) => { $('#message').textContent = key ? t(key) : ''; };

function localize() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.title = t('app.title');
  $('#language').value = state.lang;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) showLogin(data.errorKey);
    throw new Error(data.errorKey ?? 'server.internal_error');
  }
  return data;
}

function showLogin(errorKey = '') {
  state.user = null;
  $('#login-view').hidden = false;
  $('#app-view').hidden = true;
  $('#permission-editor').hidden = true;
  $('#user-edit-form').hidden = true;
  message(errorKey);
}

function showApp(user) {
  state.user = user;
  state.lang = user.lang;
  localStorage.setItem('kassa_lang', state.lang);
  localize();
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  $('#current-user').textContent = `${user.fullName} (${user.login})`;
  $('#navigation [data-page="users"]').hidden = user.permissions.users_manage !== 1;
  $('#product-form').hidden = user.permissions.settings !== 1 || user.permissions.price_edit !== 1;
  if (!$('#product-form').hidden) void loadProductUnits();
  $('#user-form').hidden = user.permissions.users_manage !== 1;
  $('#user-edit-form').hidden = true;
  $('#permission-editor').hidden = true;
  showPage('products');
  void loadProducts();
}

async function checkSessionStatus() {
  if (!state.user || sessionCheckInFlight || document.hidden) return;
  sessionCheckInFlight = true;
  try {
    await api('/api/auth/status');
  } catch (error) {
    if (state.user) message(error.message);
  } finally {
    sessionCheckInFlight = false;
  }
}

function showPage(name) {
  document.querySelectorAll('.page').forEach((page) => { page.hidden = page.id !== `${name}-page`; });
  if (name === 'users' && state.user?.permissions.users_manage === 1) void loadUsers();
  if (name === 'stock') void loadStock();
}

function cell(value) {
  const td = document.createElement('td');
  td.textContent = value == null ? '' : String(value);
  return td;
}

function buildHead(selector, key) {
  const row = document.createElement('tr');
  for (const label of t(key).split(',')) {
    const th = document.createElement('th');
    th.textContent = label;
    row.append(th);
  }
  $(selector).replaceChildren(row);
}

async function loadProducts() {
  try {
    const { rows } = await api('/api/references/products');
    buildHead('#products-head', 'products.columns');
    const body = $('#products-body');
    body.replaceChildren();
    for (const product of rows) {
      const row = document.createElement('tr');
      row.append(cell(product.sku), cell(product.name),
        cell(product.unit), cell(product.base_price), cell(product.active ? t('users.active') : t('users.inactive')));
      body.append(row);
    }
    if (rows.length === 0) message('products.empty');
  } catch (error) {
    message(error.message);
  }
}

async function loadProductUnits() {
  try {
    const { units } = await api('/api/product-units');
    const options = units.map((unit) => {
      const option = document.createElement('option');
      option.value = unit;
      option.textContent = unit;
      return option;
    });
    const customOption = document.createElement('option');
    customOption.value = '';
    customOption.dataset.custom = 'true';
    customOption.dataset.i18n = 'products.add_custom_unit';
    customOption.textContent = t('products.add_custom_unit');
    const select = $('#product-unit-select');
    select.replaceChildren(...options, customOption);
    select.value = units[0] ?? '';
    setCustomUnitMode(select.selectedOptions[0]?.dataset.custom === 'true');
  } catch (error) {
    message(error.message);
  }
}

function setCustomUnitMode(enabled) {
  $('#custom-unit-field').hidden = !enabled;
  $('#custom-unit-field input').required = enabled;
  $('#product-unit-select').required = !enabled;
  if (!enabled) $('#custom-unit-field input').value = '';
}

async function loadStock() {
  try {
    const { rows } = await api('/api/stock');
    buildHead('#stock-head', 'stock.columns');
    const body = $('#stock-body');
    body.replaceChildren();
    for (const item of rows) {
      const row = document.createElement('tr');
      row.append(cell(item.name),
        cell(item.warehouse_name), cell(item.qty), cell(item.reserved));
      body.append(row);
    }
    if (rows.length === 0) message('status.stock_empty');
  } catch (error) {
    message(error.message);
  }
}

async function loadUsers() {
  try {
    const { users } = await api('/api/users');
    buildHead('#users-head', 'users.columns');
    const body = $('#users-body');
    body.replaceChildren();
    for (const user of users) {
      const row = document.createElement('tr');
      row.append(cell(user.login), cell(user.fullName), cell(t(user.role === 'admin' ? 'users.admin' : 'users.cashier')),
        cell(user.lang.toUpperCase()), cell(t(user.active ? 'users.active' : 'users.inactive')));
      const action = document.createElement('td');
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = t('users.edit_user');
      edit.addEventListener('click', () => editUser(user));
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = t('users.edit_permissions');
      button.disabled = user.role === 'admin';
      button.addEventListener('click', () => editPermissions(user));
      action.append(edit, button);
      row.append(action);
      body.append(row);
    }
  } catch (error) {
    message(error.message);
  }
}

function editUser(user) {
  state.selectedUser = user;
  const form = $('#user-edit-form');
  form.hidden = false;
  form.elements.namedItem('fullName').value = user.fullName;
  form.elements.namedItem('role').value = user.role;
  form.elements.namedItem('lang').value = user.lang;
  form.elements.namedItem('active').checked = user.active;
  form.elements.namedItem('password').value = '';
}

function editPermissions(user) {
  state.selectedUser = user;
  $('#permission-editor').hidden = false;
  $('#permission-user').textContent = user.fullName;
  const list = $('#permission-list');
  list.replaceChildren();
  if (user.role === 'admin') {
    const note = document.createElement('p');
    note.textContent = t('status.admin_permissions');
    list.append(note);
    return;
  }
  for (const key of permissionKeys) {
    const label = document.createElement('label');
    label.className = 'permission-item';
    const name = document.createElement('span');
    name.textContent = t(`permission.${key}`);
    const input = document.createElement('input');
    input.dataset.permission = key;
    if (key.endsWith('_limit_bp')) {
      input.type = 'number';
      input.min = '0';
      input.max = '10000';
      input.step = '1';
      input.value = String(user.permissions[key] ?? 0);
    } else {
      input.type = 'checkbox';
      input.checked = user.permissions[key] === 1;
    }
    label.append(input, name);
    list.append(label);
  }
}

$('#language').addEventListener('change', (event) => {
  state.lang = event.target.value;
  localStorage.setItem('kassa_lang', state.lang);
  localize();
  if (state.user) {
    $('#current-user').textContent = `${state.user.fullName} (${state.user.login})`;
    void showPage(document.querySelector('.page:not([hidden])')?.id.replace('-page', '') ?? 'products');
  }
});

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  try {
    const { user } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login: form.get('login'), password: form.get('password') }),
    });
    formElement.reset();
    showApp(user);
    message('');
  } catch (error) {
    message(error.message);
  }
});

$('#logout').addEventListener('click', async () => {
  try {
    await api('/api/auth/logout', { method: 'POST' });
    showLogin('status.logged_out');
  } catch (error) {
    message(error.message);
  }
});

$('#navigation').addEventListener('click', (event) => {
  const page = event.target.closest('button')?.dataset.page;
  if (page) showPage(page);
});

$('#product-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const selectedUnit = form.get('unit');
  const unit = selectedUnit === '' ? form.get('custom_unit') : selectedUnit;
  try {
    await api('/api/references/products', {
      method: 'POST',
      body: JSON.stringify({
        sku: form.get('sku'),
        name: form.get('name'),
        unit,
        base_price: Number(form.get('base_price')),
      }),
    });
    formElement.reset();
    setCustomUnitMode(false);
    message('status.created');
    await loadProductUnits();
    await loadProducts();
  } catch (error) {
    message(error.message);
  }
});

$('#product-unit-select').addEventListener('change', (event) => {
  setCustomUnitMode(event.currentTarget.selectedOptions[0]?.dataset.custom === 'true');
});

$('#user-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  try {
    await api('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        login: form.get('login'),
        fullName: form.get('fullName'),
        password: form.get('password'),
        role: form.get('role'),
        lang: form.get('lang'),
      }),
    });
    formElement.reset();
    message('status.created');
    await loadUsers();
  } catch (error) {
    message(error.message);
  }
});

$('#user-edit-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.selectedUser) {
    message('status.select_user');
    return;
  }
  const form = new FormData(event.currentTarget);
  const update = {
    fullName: form.get('fullName'),
    role: form.get('role'),
    lang: form.get('lang'),
    active: form.get('active') === 'on',
  };
  const password = form.get('password');
  if (password) update.password = password;
  try {
    await api(`/api/users/${encodeURIComponent(state.selectedUser.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
    $('#user-edit-form').hidden = true;
    state.selectedUser = null;
    message('status.saved');
    await loadUsers();
  } catch (error) {
    message(error.message);
  }
});

$('#save-permissions').addEventListener('click', async () => {
  if (!state.selectedUser) {
    message('status.select_user');
    return;
  }
  const permissions = {};
  $('#permission-list').querySelectorAll('[data-permission]').forEach((input) => {
    permissions[input.dataset.permission] = input.type === 'checkbox' ? Number(input.checked) : Number(input.value);
  });
  try {
    await api(`/api/users/${encodeURIComponent(state.selectedUser.id)}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    });
    message('status.saved');
    await loadUsers();
  } catch (error) {
    message(error.message);
  }
});

localize();
window.setInterval(() => { void checkSessionStatus(); }, 10_000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void checkSessionStatus();
});
api('/api/auth/me')
  .then(({ user }) => showApp(user))
  .catch((error) => showLogin(error.message === 'auth.required' ? '' : error.message));
