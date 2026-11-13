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
    'nav.purchases': 'Приходы',
    'nav.movements': 'Движения',
    'nav.users': 'Пользователи и права',
    'nav.connection': 'Подключение ПК',
    'connection.title': 'Подключение рабочих ПК',
    'connection.description': 'Откройте один из адресов на компьютере в той же локальной сети. Если адрес не открывается, проверьте Wi-Fi и настройки брандмауэра.',
    'connection.refresh': 'Обновить адреса',
    'connection.no_lan_addresses': 'Не найден локальный адрес. Проверьте подключение главного ПК к сети.',
    'connection.open': 'Открыть',
    'connection.copy': 'Копировать',
    'connection.copy_done': 'Адрес скопирован.',
    'connection.copy_manual': 'Адрес выделен — скопируйте его вручную.',
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
    'stock.warehouse': 'Склад',
    'stock.columns': 'Товар,Склад,Количество,Резерв',
    'purchases.title': 'Приход товара',
    'purchases.warehouse': 'Склад',
    'purchases.date': 'Дата документа',
    'purchases.supplier': 'Поставщик',
    'purchases.lines': 'Строки прихода',
    'purchases.add_line': 'Добавить строку',
    'purchases.product': 'Товар',
    'purchases.qty': 'Количество',
    'purchases.unit_cost': 'Закупочная цена, тийин за единицу',
    'purchases.remove_line': 'Убрать',
    'purchases.note': 'Примечание',
    'purchases.submit': 'Провести приход',
    'purchases.history': 'Документы прихода',
    'purchases.columns': 'Дата,Номер,Склад,Поставщик,Сумма,Статус,Действие',
    'purchases.view': 'Просмотр',
    'purchases.detail_columns': 'Артикул,Товар,Единица,Количество,Закупочная цена,Сумма строки',
    'purchases.detail_columns_no_cost': 'Артикул,Товар,Единица,Количество',
    'purchases.status_posted': 'Проведён',
    'purchases.status_reversed': 'Сторнирован',
    'purchases.reverse': 'Сторнировать',
    'purchases.reverse_confirm': 'Сторнировать весь приход? Это действие нельзя отменить.',
    'purchases.no_warehouse': 'Нет активного склада',
    'purchases.no_product': 'Нет активного товара',
    'purchases.no_rows': 'Приходов пока нет',
    'purchases.no_permission': 'Нет права оформлять приход.',
    'movements.title': 'История движений товара',
    'movements.product': 'Товар',
    'movements.warehouse': 'Склад',
    'movements.refresh': 'Обновить',
    'movements.previous': 'Назад',
    'movements.next': 'Дальше',
    'movements.all_products': 'Все товары',
    'movements.all_warehouses': 'Все склады',
    'movements.columns': 'Дата,Товар,Склад,Тип,Количество,Документ,Пользователь,Себестоимость,Примечание',
    'movement.PURCHASE': 'Приход',
    'movement.SALE': 'Продажа',
    'movement.RETURN': 'Возврат',
    'movement.WRITE_OFF': 'Списание',
    'movement.ADJUST_PLUS': 'Корректировка плюс',
    'movement.ADJUST_MINUS': 'Корректировка минус',
    'movement.REVERSAL': 'Сторно',
    'purchase.duplicate_product': 'Один товар можно добавить в приход только одной строкой. Разделите позиции на разные документы.',
    'purchase.not_found': 'Документ прихода не найден.',
    'purchase.already_reversed': 'Приход уже сторнирован.',
    'purchase.reversal_stock_not_restored': 'Нельзя сторнировать: остаток каждой партии должен быть полностью восстановлен.',
    'stock.locked_by_stocktake': 'Нельзя двигать товар: он заблокирован активной инвентаризацией.',
    'stock.insufficient': 'Недостаточно доступного остатка.',
    'stock.balance_invalid': 'Остаток повреждён или слишком велик; проведите сверку.',
    'fifo.cost_out_of_range': 'Себестоимость выходит за допустимый диапазон.',
    'validation.invalid_date': 'Укажите корректную дату.',
    'validation.invalid_purchase_lines': 'Добавьте от 1 до 200 строк прихода.',
    'validation.invalid_purchase_line': 'Некорректная строка прихода.',
    'validation.invalid_product': 'Выберите активный товар.',
    'validation.invalid_warehouse': 'Выберите активный склад.',
    'validation.invalid_product_or_warehouse': 'Выберите активный товар и склад одного филиала.',
    'validation.invalid_quantity': 'Количество должно быть положительным числом с точностью до 0,001.',
    'validation.invalid_unit_cost': 'Цена закупки должна быть целым числом тийинов не меньше нуля.',
    'validation.invalid_total': 'Итоговая стоимость слишком велика.',
    'validation.invalid_supplier': 'Название поставщика слишком длинное.',
    'validation.invalid_note': 'Примечание слишком длинное.',
    'validation.invalid_limit': 'Недопустимый лимит строк.',
    'validation.invalid_offset': 'Недопустимая позиция страницы.',
    'validation.invalid_unit_price': 'Цена должна быть целым числом тийинов не меньше нуля.',
    'status.select_option': 'Выберите значение',
    'status.all': 'Все',
    'status.no_data': 'Нет данных',
    'status.loaded': 'Загружено.',
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
    'nav.purchases': 'Kirimlar',
    'nav.movements': 'Harakatlar',
    'nav.users': 'Foydalanuvchilar va huquqlar',
    'nav.connection': 'Kompyuterlarni ulash',
    'connection.title': 'Ishchi kompyuterlarni ulash',
    'connection.description': 'Manzillardan birini shu mahalliy tarmoqqa ulangan kompyuterda oching. Manzil ochilmasa, Wi-Fi va xavfsizlik devori sozlamalarini tekshiring.',
    'connection.refresh': 'Manzillarni yangilash',
    'connection.no_lan_addresses': 'Mahalliy manzil topilmadi. Asosiy kompyuter tarmoqqa ulanganini tekshiring.',
    'connection.open': 'Ochish',
    'connection.copy': 'Nusxalash',
    'connection.copy_done': 'Manzil nusxalandi.',
    'connection.copy_manual': 'Manzil belgilandi — uni qo‘lda nusxalang.',
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
    'stock.warehouse': 'Ombor',
    'stock.columns': 'Tovar,Ombor,Miqdor,Rezerv',
    'purchases.title': 'Tovar kirimi',
    'purchases.warehouse': 'Ombor',
    'purchases.date': 'Hujjat sanasi',
    'purchases.supplier': 'Yetkazib beruvchi',
    'purchases.lines': 'Kirim qatorlari',
    'purchases.add_line': 'Qator qo‘shish',
    'purchases.product': 'Tovar',
    'purchases.qty': 'Miqdor',
    'purchases.unit_cost': 'Xarid narxi, birligi uchun tiyin',
    'purchases.remove_line': 'Olib tashlash',
    'purchases.note': 'Izoh',
    'purchases.submit': 'Kirimni rasmiylashtirish',
    'purchases.history': 'Kirim hujjatlari',
    'purchases.columns': 'Sana,Raqam,Ombor,Yetkazib beruvchi,Summa,Holat,Amal',
    'purchases.view': 'Ko‘rish',
    'purchases.detail_columns': 'Artikul,Tovar,Birlik,Miqdor,Xarid narxi,Qator summasi',
    'purchases.detail_columns_no_cost': 'Artikul,Tovar,Birlik,Miqdor',
    'purchases.status_posted': 'Rasmiylashtirilgan',
    'purchases.status_reversed': 'Bekor qilingan',
    'purchases.reverse': 'Bekor qilish',
    'purchases.reverse_confirm': 'Butun kirim bekor qilinsinmi? Bu amalni qaytarib bo‘lmaydi.',
    'purchases.no_warehouse': 'Faol ombor yo‘q',
    'purchases.no_product': 'Faol tovar yo‘q',
    'purchases.no_rows': 'Hozircha kirimlar yo‘q',
    'purchases.no_permission': 'Kirim qilish huquqi yo‘q.',
    'movements.title': 'Tovar harakati tarixi',
    'movements.product': 'Tovar',
    'movements.warehouse': 'Ombor',
    'movements.refresh': 'Yangilash',
    'movements.previous': 'Oldingi',
    'movements.next': 'Keyingi',
    'movements.all_products': 'Barcha tovarlar',
    'movements.all_warehouses': 'Barcha omborlar',
    'movements.columns': 'Sana,Tovar,Ombor,Turi,Miqdor,Hujjat,Foydalanuvchi,Tannarx,Izoh',
    'movement.PURCHASE': 'Kirim',
    'movement.SALE': 'Sotuv',
    'movement.RETURN': 'Qaytarish',
    'movement.WRITE_OFF': 'Hisobdan chiqarish',
    'movement.ADJUST_PLUS': 'Ijobiy tuzatish',
    'movement.ADJUST_MINUS': 'Salbiy tuzatish',
    'movement.REVERSAL': 'Bekor qilish',
    'purchase.duplicate_product': 'Bir tovar kirimga faqat bir marta qo‘shiladi. Turli narxdagi qatorlarni alohida hujjat qiling.',
    'purchase.not_found': 'Kirim hujjati topilmadi.',
    'purchase.already_reversed': 'Kirim allaqachon bekor qilingan.',
    'purchase.reversal_stock_not_restored': 'Bekor qilib bo‘lmaydi: har bir partiya qoldig‘i to‘liq tiklanishi kerak.',
    'stock.locked_by_stocktake': 'Tovar faol inventarizatsiya tomonidan bloklangan.',
    'stock.insufficient': 'Mavjud qoldiq yetarli emas.',
    'stock.balance_invalid': 'Qoldiq noto‘g‘ri yoki juda katta; tekshiruvni bajaring.',
    'fifo.cost_out_of_range': 'Tannarx ruxsat etilgan chegaradan katta.',
    'validation.invalid_date': 'To‘g‘ri sanani kiriting.',
    'validation.invalid_purchase_lines': '1–200 ta kirim qatorini kiriting.',
    'validation.invalid_purchase_line': 'Kirim qatori noto‘g‘ri.',
    'validation.invalid_product': 'Faol tovarni tanlang.',
    'validation.invalid_warehouse': 'Faol omborni tanlang.',
    'validation.invalid_product_or_warehouse': 'Faol tovar va bir filialdagi omborni tanlang.',
    'validation.invalid_quantity': 'Miqdor musbat va 0,001 aniqlikda bo‘lishi kerak.',
    'validation.invalid_unit_cost': 'Xarid narxi butun tiyinlarda va manfiy bo‘lmasligi kerak.',
    'validation.invalid_total': 'Umumiy summa juda katta.',
    'validation.invalid_supplier': 'Yetkazib beruvchi nomi juda uzun.',
    'validation.invalid_note': 'Izoh juda uzun.',
    'validation.invalid_limit': 'Qatorlar soni noto‘g‘ri.',
    'validation.invalid_offset': 'Sahifa o‘rni noto‘g‘ri.',
    'validation.invalid_unit_price': 'Narx butun tiyinlarda va manfiy bo‘lmasligi kerak.',
    'status.select_option': 'Qiymatni tanlang',
    'status.all': 'Barchasi',
    'status.no_data': 'Ma’lumot yo‘q',
    'status.loaded': 'Yuklandi.',
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
let movementOffset = 0;
let inventoryProducts = [];
let inventoryWarehouses = [];
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
  $('#navigation [data-page="connection"]').hidden = user.role !== 'admin';
  $('#product-form').hidden = user.permissions.settings !== 1 || user.permissions.price_edit !== 1;
  if (!$('#product-form').hidden) void loadProductUnits();
  $('#purchase-form').hidden = user.permissions.purchase !== 1;
  $('#user-form').hidden = user.permissions.users_manage !== 1;
  $('#user-edit-form').hidden = true;
  $('#permission-editor').hidden = true;
  showPage('products');
  void loadInventoryOptions();
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
  if (name === 'purchases') void loadPurchases();
  if (name === 'movements') void loadMovementHistory();
  if (name === 'connection' && state.user?.role === 'admin') void loadConnectionInfo();
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
    const warehouseFilter = $('#stock-warehouse-filter').value;
    const visibleRows = rows.filter((item) => !warehouseFilter || item.warehouse_id === warehouseFilter);
    for (const item of visibleRows) {
      const row = document.createElement('tr');
      row.append(cell(item.name),
        cell(item.warehouse_name), cell(formatQuantity(item.qty)), cell(formatQuantity(item.reserved)));
      body.append(row);
    }
    if (visibleRows.length === 0) {
      const row = document.createElement('tr');
      const empty = cell(t('status.no_data'));
      empty.colSpan = 4;
      row.append(empty);
      body.append(row);
    }
  } catch (error) {
    message(error.message);
  }
}

function formatQuantity(value) {
  const negative = value < 0;
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute / 1000);
  const fraction = String(absolute % 1000).padStart(3, '0').replace(/0+$/, '');
  return `${negative ? '−' : ''}${whole}${fraction ? `${state.lang === 'ru' ? ',' : '.'}${fraction}` : ''}`;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString(state.lang === 'uz' ? 'uz-UZ' : 'ru-RU', {
    timeZone: 'Asia/Tashkent',
  });
}

function dateForInput() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function makeOption(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

function setWarehouseOptions(select, includeAll = false) {
  const selected = select.value;
  const options = [];
  if (includeAll) options.push(makeOption('', t('movements.all_warehouses')));
  else options.push(makeOption('', t('status.select_option')));
  for (const warehouse of inventoryWarehouses) {
    options.push(makeOption(warehouse.id, warehouse.name));
  }
  select.replaceChildren(...options);
  if (options.some((option) => option.value === selected)) select.value = selected;
}

function setProductOptions(select, includeAll = false) {
  const selected = select.value;
  const options = [];
  if (includeAll) options.push(makeOption('', t('movements.all_products')));
  else options.push(makeOption('', t('status.select_option')));
  for (const product of inventoryProducts) {
    options.push(makeOption(product.id, `${product.sku} — ${product.name}`));
  }
  select.replaceChildren(...options);
  if (options.some((option) => option.value === selected)) select.value = selected;
}

async function loadInventoryOptions() {
  try {
    const [{ rows: products }, { rows: warehouses }] = await Promise.all([
      api('/api/references/products'),
      api('/api/references/warehouses'),
    ]);
    inventoryProducts = products;
    inventoryWarehouses = warehouses;
    setWarehouseOptions($('#stock-warehouse-filter'), true);
    setWarehouseOptions($('#purchase-warehouse'));
    setWarehouseOptions($('#movement-warehouse-filter'), true);
    setProductOptions($('#movement-product-filter'), true);
    const dateInput = $('#purchase-form').elements.namedItem('date');
    if (!dateInput.value) dateInput.value = dateForInput();
    document.querySelectorAll('#purchase-lines [data-purchase-product]').forEach((select) => setProductOptions(select));
  } catch (error) {
    message(error.message);
  }
}

function addPurchaseLine() {
  const row = document.createElement('div');
  row.className = 'purchase-line';
  const product = document.createElement('select');
  product.required = true;
  product.dataset.purchaseProduct = 'true';
  setProductOptions(product);
  const quantity = document.createElement('input');
  quantity.type = 'number';
  quantity.min = '0.001';
  quantity.step = '0.001';
  quantity.required = true;
  quantity.dataset.purchaseQty = 'true';
  quantity.setAttribute('aria-label', t('purchases.qty'));
  const unitCost = document.createElement('input');
  unitCost.type = 'number';
  unitCost.min = '0';
  unitCost.step = '1';
  unitCost.required = true;
  unitCost.dataset.purchaseCost = 'true';
  unitCost.setAttribute('aria-label', t('purchases.unit_cost'));
  const productLabel = document.createElement('label');
  const productCaption = document.createElement('span');
  productCaption.dataset.purchaseLabel = 'purchases.product';
  productCaption.textContent = t('purchases.product');
  productLabel.append(productCaption, product);
  const quantityLabel = document.createElement('label');
  const quantityCaption = document.createElement('span');
  quantityCaption.dataset.purchaseLabel = 'purchases.qty';
  quantityCaption.textContent = t('purchases.qty');
  quantityLabel.append(quantityCaption, quantity);
  const costLabel = document.createElement('label');
  const costCaption = document.createElement('span');
  costCaption.dataset.purchaseLabel = 'purchases.unit_cost';
  costCaption.textContent = t('purchases.unit_cost');
  costLabel.append(costCaption, unitCost);
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = t('purchases.remove_line');
  remove.addEventListener('click', () => {
    if ($('#purchase-lines').children.length > 1) row.remove();
  });
  row.append(productLabel, quantityLabel, costLabel, remove);
  $('#purchase-lines').append(row);
}

async function loadPurchases() {
  try {
    const { purchases } = await api('/api/purchases');
    buildHead('#purchases-head', 'purchases.columns');
    const body = $('#purchases-body');
    body.replaceChildren();
    if (purchases.length === 0) {
      const row = document.createElement('tr');
      const empty = cell(t('purchases.no_rows'));
      empty.colSpan = 7;
      row.append(empty);
      body.append(row);
      return;
    }
    for (const purchase of purchases) {
      const row = document.createElement('tr');
      row.append(
        cell(purchase.date),
        cell(purchase.number),
        cell(purchase.warehouse_name),
        cell(purchase.supplier),
        cell(purchase.total_cost === undefined ? '—' : purchase.total_cost),
        cell(t(`purchases.status_${purchase.status}`)),
      );
      const action = document.createElement('td');
      const view = document.createElement('button');
      view.type = 'button';
      view.textContent = t('purchases.view');
      view.addEventListener('click', () => { void loadPurchaseDetails(purchase.id); });
      action.append(view);
      if (purchase.status === 'posted' && state.user?.permissions.purchase === 1) {
        const reverse = document.createElement('button');
        reverse.type = 'button';
        reverse.textContent = t('purchases.reverse');
        reverse.addEventListener('click', () => { void reversePurchaseRequest(purchase.id); });
        action.append(reverse);
      }
      row.append(action);
      body.append(row);
    }
  } catch (error) {
    message(error.message);
  }
}

async function loadPurchaseDetails(id) {
  try {
    const { purchase, lines } = await api(`/api/purchases/${encodeURIComponent(id)}`);
    const canViewCost = state.user?.permissions.view_cost === 1;
    $('#purchase-detail-title').textContent =
      `${purchase.number} — ${purchase.date} — ${purchase.warehouse_name}${purchase.supplier ? ` — ${purchase.supplier}` : ''}`;
    buildHead(
      '#purchase-detail-head',
      canViewCost ? 'purchases.detail_columns' : 'purchases.detail_columns_no_cost',
    );
    const body = $('#purchase-detail-body');
    body.replaceChildren();
    for (const line of lines) {
      const values = [line.sku, line.name, line.unit, formatQuantity(line.qty)];
      if (canViewCost) {
        values.push(line.unitCost, line.costTotal);
      }
      const row = document.createElement('tr');
      values.forEach((value) => row.append(cell(value)));
      body.append(row);
    }
    $('#purchase-detail').hidden = false;
  } catch (error) {
    message(error.message);
  }
}

async function reversePurchaseRequest(id) {
  if (!window.confirm(t('purchases.reverse_confirm'))) return;
  try {
    await api(`/api/purchases/${encodeURIComponent(id)}/reverse`, { method: 'POST' });
    message('status.saved');
    await Promise.all([loadPurchases(), loadStock()]);
  } catch (error) {
    message(error.message);
  }
}

async function loadMovementHistory() {
  try {
    const params = new URLSearchParams();
    const productId = $('#movement-product-filter').value;
    const warehouseId = $('#movement-warehouse-filter').value;
    const pageSize = 200;
    if (productId) params.set('productId', productId);
    if (warehouseId) params.set('warehouseId', warehouseId);
    params.set('limit', String(pageSize));
    params.set('offset', String(movementOffset));
    const { rows, hasMore } = await api(`/api/stock/movements?${params}`);
    buildHead('#movements-head', 'movements.columns');
    const body = $('#movements-body');
    body.replaceChildren();
    for (const movement of rows) {
      const row = document.createElement('tr');
      row.append(
        cell(formatDateTime(movement.created_at)),
        cell(`${movement.sku} — ${movement.product_name}`),
        cell(movement.warehouse_name),
        cell(t(`movement.${movement.type}`)),
        cell(formatQuantity(movement.qty)),
        cell(movement.document_number),
        cell(movement.user_name),
        cell(movement.unit_cost === undefined ? '' : movement.unit_cost),
        cell(movement.note),
      );
      body.append(row);
    }
    if (rows.length === 0) {
      const row = document.createElement('tr');
      const empty = cell(t('status.no_data'));
      empty.colSpan = 9;
      row.append(empty);
      body.append(row);
    }
    $('#movements-previous').disabled = movementOffset === 0;
    $('#movements-next').disabled = !hasMore;
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

async function loadConnectionInfo() {
  try {
    const { addresses, warningKey } = await api('/api/server-info');
    const container = $('#connection-addresses');
    const rows = addresses.map((address) => {
      const row = document.createElement('div');
      row.className = 'connection-row';

      const interfaceName = document.createElement('span');
      interfaceName.textContent = address.interfaceName;

      const field = document.createElement('input');
      field.type = 'url';
      field.readOnly = true;
      field.value = address.url;
      field.setAttribute('aria-label', address.interfaceName);

      const actions = document.createElement('div');
      actions.className = 'connection-actions';
      const open = document.createElement('a');
      open.href = address.url;
      open.target = '_blank';
      open.rel = 'noopener noreferrer';
      open.textContent = t('connection.open');
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = t('connection.copy');
      copy.addEventListener('click', () => { void copyConnectionAddress(field); });
      actions.append(open, copy);

      row.append(interfaceName, field, actions);
      return row;
    });
    container.replaceChildren(...rows);
    $('#connection-warning').textContent = warningKey ? t(warningKey) : '';
  } catch (error) {
    message(error.message);
  }
}

async function copyConnectionAddress(field) {
  if (!navigator.clipboard?.writeText) {
    field.select();
    message('connection.copy_manual');
    return;
  }
  try {
    await navigator.clipboard.writeText(field.value);
    message('connection.copy_done');
  } catch {
    field.select();
    message('connection.copy_manual');
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
    void loadInventoryOptions();
    $('#current-user').textContent = `${state.user.fullName} (${state.user.login})`;
    document.querySelectorAll('#purchase-lines button').forEach((button) => {
      button.textContent = t('purchases.remove_line');
    });
    document.querySelectorAll('#purchase-lines [data-purchase-label]').forEach((node) => {
      node.textContent = t(node.dataset.purchaseLabel);
    });
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

$('#refresh-connection-info').addEventListener('click', () => { void loadConnectionInfo(); });

$('#stock-warehouse-filter').addEventListener('change', () => { void loadStock(); });
$('#movement-product-filter').addEventListener('change', () => { movementOffset = 0; void loadMovementHistory(); });
$('#movement-warehouse-filter').addEventListener('change', () => { movementOffset = 0; void loadMovementHistory(); });
$('#refresh-movements').addEventListener('click', () => { void loadMovementHistory(); });
$('#movements-previous').addEventListener('click', () => {
  movementOffset = Math.max(0, movementOffset - 200);
  void loadMovementHistory();
});
$('#movements-next').addEventListener('click', () => {
  movementOffset += 200;
  void loadMovementHistory();
});
$('#add-purchase-line').addEventListener('click', addPurchaseLine);

$('#purchase-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const lines = [...$('#purchase-lines').children].map((row) => ({
    productId: row.querySelector('[data-purchase-product]').value,
    qty: row.querySelector('[data-purchase-qty]').value,
    unitCost: Number(row.querySelector('[data-purchase-cost]').value),
  }));
  try {
    await api('/api/purchases', {
      method: 'POST',
      body: JSON.stringify({
        warehouseId: form.get('warehouseId'),
        date: form.get('date'),
        supplier: form.get('supplier'),
        note: form.get('note'),
        lines,
      }),
    });
    formElement.reset();
    $('#purchase-lines').replaceChildren();
    addPurchaseLine();
    formElement.elements.namedItem('date').value = dateForInput();
    message('status.created');
    await Promise.all([loadPurchases(), loadStock()]);
  } catch (error) {
    message(error.message);
  }
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
  const saveButton = $('#save-permissions');
  saveButton.disabled = true;
  message('status.loading');
  try {
    const permissions = {};
    $('#permission-list').querySelectorAll('[data-permission]').forEach((input) => {
      permissions[input.dataset.permission] = input.type === 'checkbox' ? Number(input.checked) : Number(input.value);
    });
    const result = await api(`/api/users/${encodeURIComponent(state.selectedUser.id)}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    });
    state.selectedUser = { ...state.selectedUser, permissions: result.permissions };
    message('status.saved');
    await loadUsers();
  } catch (error) {
    message(error.message);
  } finally {
    saveButton.disabled = false;
  }
});

localize();
addPurchaseLine();
window.setInterval(() => { void checkSessionStatus(); }, 10_000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void checkSessionStatus();
});
api('/api/auth/me')
  .then(({ user }) => showApp(user))
  .catch((error) => showLogin(error.message === 'auth.required' ? '' : error.message));
