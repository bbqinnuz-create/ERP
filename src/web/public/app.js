const translations = {
  ru: {
    'app.title': 'Учёт магазина',
    'money.currency': 'сум',
    'language.label': 'Язык',
    'server.checking': 'Проверка сервера',
    'server.online': 'Сервер доступен',
    'server.offline': 'Нет связи с сервером',
    'server.unavailable': 'Не удалось связаться с сервером. Проверьте подключение и повторите попытку.',
    'status.server_updated': 'Сервер подтвердил выполнение действия.',
    'common.cancel': 'Отмена',
    'common.dismiss': 'Закрыть уведомление',
    'login.title': 'Вход',
    'login.login': 'Логин',
    'login.password': 'Пароль',
    'login.submit': 'Войти',
    'auth.logout': 'Выйти',
    'nav.pages': 'Страницы',
    'nav.sales': 'Продажа',
    'nav.held_carts': 'Отложенные корзины',
    'nav.reservations': 'Резерв',
    'nav.products': 'Товары',
    'nav.stock': 'Остатки',
    'nav.warehouses': 'Склады',
    'nav.purchases': 'Приходы',
    'nav.movements': 'Движения',
    'nav.debts': 'Долги',
    'nav.cash': 'Общая касса',
    'nav.users': 'Пользователи и права',
    'nav.connection': 'Подключение ПК',
    'nav.print': 'Печать чеков',
    'nav.returns': 'Возвраты',
    'nav.writeoffs': 'Списания',
    'nav.stocktakes': 'Инвентаризация',
    'nav.reports': 'Отчёты и копии',
    'reports.title': 'Отчёты',
    'reports.type': 'Отчёт',
    'reports.from': 'С даты (Ташкент)',
    'reports.to': 'По дату (Ташкент)',
    'reports.warehouse': 'Склад',
    'reports.product': 'Товар',
    'reports.cashier': 'Пользователь',
    'reports.run': 'Сформировать',
    'reports.export': 'Скачать CSV для Excel',
    'reports.no_rows': 'Нет данных за выбранные условия.',
    'reports.truncated': 'Показаны первые 10 000 строк. Уточните фильтры для полного экспорта.',
    'reports.summary.cash': 'Остаток наличных сейчас: {balance}; изменение за период: {periodAmount}.',
    'reports.summary.valuation': 'Оценка остатка по себестоимости партий: {value}.',
    'reports.summary.backups': 'Папка копий: {directory}. Последняя операция: {lastRun}.',
    'reports.type.sales_by_day': 'Продажи по дням',
    'reports.type.sales_by_product': 'Продажи по товарам',
    'reports.type.sales_by_category': 'Продажи по категориям',
    'reports.type.sales_by_cashier': 'Продажи по кассирам',
    'reports.type.sales_by_payment_method': 'Продажи по способам оплаты',
    'reports.type.cashier_summary': 'Сводка по кассирам',
    'reports.type.profit_by_sale': 'Прибыль по чекам',
    'reports.type.profit_by_product': 'Прибыль по товарам',
    'reports.type.profit_by_category': 'Прибыль по категориям',
    'reports.type.stock': 'Остатки',
    'reports.type.low_stock': 'Ниже минимального остатка',
    'reports.type.stock_valuation': 'Оценка склада по партиям',
    'reports.type.movements': 'Движения товара',
    'reports.type.discounts': 'Скидки',
    'reports.type.returns': 'Возвраты',
    'reports.type.writeoffs': 'Списания',
    'reports.type.debt_balances': 'Открытые долги по чекам',
    'reports.type.debt_history': 'История долгов и распределения оплат',
    'reports.type.cash': 'Общая касса',
    'reports.type.noncash': 'Безналичные суммы',
    'reports.type.reservations': 'Резервы',
    'reports.type.audit': 'Журнал действий',
    'reports.column.date': 'Дата',
    'reports.column.sales': 'Продажи',
    'reports.column.salesCount': 'Чеков',
    'reports.column.subtotal': 'До скидок',
    'reports.column.discount': 'Скидка',
    'reports.column.total': 'Сумма чеков',
    'reports.column.paid': 'Оплачено',
    'reports.column.debt': 'В долг',
    'reports.column.sku': 'Артикул',
    'reports.column.product': 'Товар',
    'reports.column.sale': 'Чек',
    'reports.column.kind': 'Тип скидки',
    'reports.column.category': 'Категория',
    'reports.column.cart': 'Отложенная корзина',
    'reports.column.qty': 'Количество',
    'reports.column.returns': 'Возвраты',
    'reports.column.netSales': 'Продажи за вычетом возвратов',
    'reports.column.user': 'Пользователь',
    'reports.column.salesTotal': 'Продажи',
    'reports.column.returnQty': 'Возвращённое количество',
    'reports.column.method': 'Способ оплаты',
    'reports.column.purpose': 'Назначение',
    'reports.column.direction': 'Направление',
    'reports.column.payments': 'Операций',
    'reports.column.amount': 'Сумма',
    'reports.column.number': 'Номер',
    'reports.column.customer': 'Клиент',
    'reports.column.cost': 'Себестоимость',
    'reports.column.profit': 'Прибыль',
    'reports.column.warehouse': 'Склад',
    'reports.column.reserved': 'Резерв',
    'reports.column.available': 'Доступно',
    'reports.column.minStock': 'Минимум',
    'reports.column.batch': 'Партия',
    'reports.column.receivedAt': 'Дата поступления партии',
    'reports.column.unitCost': 'Себестоимость единицы',
    'reports.column.value': 'Стоимость остатка',
    'reports.column.type': 'Тип',
    'reports.column.document': 'Документ',
    'reports.column.note': 'Примечание',
    'reports.column.percentBp': 'Скидка, базисные пункты',
    'reports.column.approvedBy': 'Подтвердил',
    'reports.column.reason': 'Причина',
    'reports.column.lines': 'Строк',
    'reports.column.balance': 'Остаток долга',
    'reports.column.payment': 'Платёж',
    'reports.column.allocated': 'Распределено',
    'reports.column.before': 'Было',
    'reports.column.after': 'Стало',
    'reports.column.action': 'Действие',
    'reports.column.entity': 'Раздел',
    'reports.column.entityId': 'ID записи',
    'reports.column.expiresAt': 'Истекает',
    'reports.column.received': 'Получено',
    'reports.column.returned': 'Выплачено',
    'reports.column.net': 'Итого',
    'reports.column.status': 'Статус',
    'backup.title': 'Резервные копии',
    'backup.description': 'Ежедневные копии создаются в 02:00 по Ташкенту. Каталог BACKUP_DIR должен находиться на отдельном физическом носителе. Хранятся последние 30 дней.',
    'backup.create': 'Создать копию сейчас',
    'backup.not_configured': 'BACKUP_DIR не задан. Укажите путь ко второму физическому носителю в .env и перезапустите сервер.',
    'backup.latest': 'Последний запуск: {status}; время: {date}; файл: {file}; целостность: {integrity}; расхождения: {discrepancies}.',
    'backup.no_runs': 'Копии ещё не создавались.',
    'backup.created': 'Резервная копия создана и проверена.',
    'backup.directory_not_configured': 'Каталог резервных копий не настроен. Укажите BACKUP_DIR и перезапустите сервер.',
    'backup.columns': 'Файл,Создана,Размер (байт)',
    'backup.run.success': 'успешно',
    'backup.run.error': 'ошибка',
    'reports.all_warehouses': 'Все склады',
    'reports.all_products': 'Все товары',
    'reports.all_users': 'Все пользователи',
    'reports.discount.qty': 'Цена по количеству',
    'reports.discount.promo': 'Акция',
    'reports.discount.customer': 'Скидка клиента',
    'reports.discount.check': 'Скидка на чек',
    'reports.discount.manual': 'Ручная скидка',
    'reports.value.sale': 'Продажа',
    'reports.value.return': 'Возврат',
    'reports.value.debt_payment': 'Оплата долга',
    'reports.value.in': 'Поступление',
    'reports.value.out': 'Выплата',
    'reports.reservation.active': 'Активен',
    'reports.reservation.released': 'Освобождён',
    'reports.reservation.consumed': 'Использован',
    'report.invalid_filters': 'Проверьте фильтры отчёта.',
    'report.invalid_type': 'Выберите допустимый тип отчёта.',
    'report.filter_not_supported': 'Этот фильтр недоступен для выбранного отчёта.',
    'report.invalid_period': 'Начало периода не может быть позже его окончания.',
    'report.amount_out_of_range': 'Сумма отчёта выходит за допустимые пределы.',
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
    'products.columns': 'Артикул,Товар,Единица,Цена,Статус,Действие',
    'products.edit_price': 'Изменить цену',
    'products.price_dialog_title': 'Изменение цены',
    'products.save_price': 'Сохранить цену',
    'product_import.title': 'Импорт товаров из CSV',
    'product_import.description': 'Скачайте шаблон XLSX, заполните лист «Товары», сохраните его как CSV UTF-8 и загрузите файл. Импорт меняет только карточки товаров, но не остатки.',
    'product_import.template': 'Скачать шаблон XLSX',
    'product_import.csv_file': 'Файл CSV',
    'product_import.mode': 'Совпавший артикул',
    'product_import.mode_skip': 'Пропустить существующий товар',
    'product_import.mode_update': 'Обновить заполненные поля',
    'product_import.create_categories': 'Создавать отсутствующие категории',
    'product_import.categories_to_create': 'Будут созданы категории: {categories}.',
    'product_import.categories_created': 'Созданы категории: {categories}.',
    'product_import.preview': 'Проверить файл',
    'product_import.commit': 'Импортировать проверенные строки',
    'product_import.download_report': 'Скачать отчёт CSV',
    'product_import.columns': 'Строка,Артикул,Действие,Ошибки',
    'product_import.summary': 'Всего строк: {total}; новых: {create}; обновлений: {update}; пропусков: {skip}; ошибок: {error}.',
    'product_import.outcome': 'Импорт завершён. Добавлено: {create}; обновлено: {update}; пропущено: {skip}; ошибок: {error}.',
    'product_import.action.create': 'Добавить',
    'product_import.action.update': 'Обновить',
    'product_import.action.skip': 'Пропустить',
    'product_import.action.error': 'Ошибка',
    'product_import.invalid_request': 'Проверьте параметры импорта.',
    'product_import.invalid_options': 'Проверьте параметры импорта.',
    'product_import.invalid_language': 'Выбран неподдерживаемый язык шаблона.',
    'product_import.invalid_mode': 'Выберите допустимый режим совпадающих товаров.',
    'product_import.invalid_file': 'Загрузите файл CSV.',
    'product_import.file_too_large': 'Файл превышает лимит 2 МиБ.',
    'product_import.too_many_rows': 'В файле больше 5000 строк товаров.',
    'product_import.empty_file': 'Файл CSV пуст.',
    'product_import.invalid_csv': 'Проверьте формат CSV и кавычки в ячейках.',
    'product_import.invalid_headers': 'Заголовки CSV не соответствуют шаблону или содержат дубли.',
    'product_import.extra_columns': 'В строке больше ячеек, чем заголовков.',
    'product_import.required_sku': 'Укажите артикул.',
    'product_import.required_name_ru': 'Укажите название на русском.',
    'product_import.required_unit': 'Укажите единицу учёта.',
    'product_import.required_price_sum': 'Укажите базовую цену в сумах.',
    'product_import.invalid_sku': 'Проверьте артикул.',
    'product_import.invalid_name_ru': 'Проверьте русское название.',
    'product_import.invalid_name_uz': 'Проверьте узбекское название.',
    'product_import.invalid_unit': 'Проверьте единицу учёта.',
    'product_import.invalid_category': 'Название категории слишком длинное.',
    'product_import.invalid_price': 'Цена должна быть неотрицательной и указана в сумах, не более двух знаков после запятой.',
    'product_import.invalid_min_stock': 'Минимальный остаток должен быть неотрицательным и иметь не более трёх знаков после запятой.',
    'product_import.invalid_attributes': 'Дополнительные атрибуты должны быть JSON-объектом.',
    'product_import.invalid_row': 'Проверьте данные строки.',
    'product_import.duplicate_file_sku': 'Этот артикул указан в файле несколько раз.',
    'product_import.duplicate_file_barcode': 'Этот штрихкод указан в файле несколько раз.',
    'product_import.barcode_in_use': 'Штрихкод уже используется другим товаром.',
    'product_import.category_not_found': 'Активная категория с таким названием не найдена.',
    'product_import.category_ambiguous': 'Название категории неоднозначно; проверьте справочник категорий.',
    'product_import.category_inactive': 'Категория с таким названием существует, но отключена. Активируйте её в справочнике.',
    'product_import.no_update_fields': 'Для обновления заполните хотя бы одно поле помимо артикула.',
    'sales.title': 'Продажа',
    'sales.default_warehouse': 'Общий склад по умолчанию',
    'sales.choose_warehouse': 'Склад для этой продажи',
    'sales.selected_warehouse': 'Склад продажи',
    'sales.save_default_warehouse': 'Сохранить склад',
    'sales.warehouse_unconfigured': 'Настройте общий склад по умолчанию.',
    'sales.no_warehouse': 'Нет активного склада.',
    'sales.no_permitted_warehouse': 'Нет склада, разрешённого для продаж.',
    'sales.choose_warehouse_first': 'Выберите склад для продажи.',
    'sales.search': 'Поиск по названию, артикулу или штрихкоду',
    'sales.product_name': 'Название',
    'sales.available_stock': 'Остаток (Количество с учётом забронированных)',
    'sales.product_price': 'Цена',
    'sales.add': 'Добавить',
    'sales.no_products': 'Товары не найдены.',
    'sales.out_of_stock': 'Нет доступного остатка',
    'sales.quantity': 'Количество',
    'sales.customer': 'Клиент (необязательно)',
    'sales.no_customer': 'Без клиента',
    'sales.cart': 'Корзина',
    'sales.cart_columns': 'Товар,Количество,Цена,Ручная скидка (б.п.),Сумма,Действие',
    'sales.remove': 'Убрать',
    'sales.manual_discount': 'Ручная скидка в базисных пунктах',
    'sales.check_discount': 'Скидка на чек',
    'sales.discount_percent': 'Процент',
    'sales.discount_amount': 'Сумма в тийинах',
    'sales.payments': 'Оплата',
    'sales.payment_amount': 'Оплачиваемая сумма в сумах',
    'sales.tendered': 'Получено наличными в сумах',
    'sales.confirm_payment': 'Подтвердить оплату',
    'sales.pay_at_counter': 'Оплата у кассы — зарезервировать товар',
    'sales.select_payment_method': 'Выберите способ оплаты',
    'sales.total': 'Итого',
    'sales.paid': 'Оплата',
    'sales.due': 'Остаток в долг',
    'sales.submit': 'Оплатить',
    'sales.receipt': 'Чек создан',
    'sales.receipt_summary': 'Чек {number}; итого {total}; оплачено {paid}; долг {debt}; сдача {change}.',
    'sales.no_payment_method': 'Нет активных способов оплаты.',
    'customers.add': 'Добавить клиента',
    'customers.add_title': 'Новый клиент',
    'customers.name': 'Имя клиента',
    'customers.phone': 'Телефон (необязательно)',
    'customers.note': 'Примечание (необязательно)',
    'customers.save': 'Сохранить клиента',
    'held.title': 'Отложенные корзины',
    'held.no_carts': 'Отложенных корзин нет.',
    'held.customer_required': 'Для резерва выберите клиента.',
    'held.sell': 'Продать',
    'held.already_reserved': 'Уже зарезервирована',
    'held.reserve_success': 'Товары зарезервированы.',
    'held.counter_payment_reserved': 'Корзина зарезервирована для оплаты у кассы. Продажа ещё не оформлена.',
    'held.reserve_deficit': 'Резерв превышает фактический остаток. Уменьшите его количество.',
    'reservations.title': 'Зарезервированные товары',
    'reservations.columns': 'Клиент,Товар,Количество,Склад,Корзина,Создан,Истекает',
    'reservations.none': 'Активных резервов нет.',
    'returns.receipt_language': 'Язык чека возврата',
    'stocktake.reservation_reduced': 'Количество резерва уменьшено.',
    'debts.title': 'Долги клиентов',
    'debts.customer': 'Клиент',
    'debts.columns': 'Клиент,Остаток долга,Открытые чеки',
    'debts.sales_columns': 'Чек,Дата,Итого,Остаток,Прощение',
    'debts.no_debtors': 'Открытых долгов нет.',
    'debts.select_customer': 'Выберите клиента',
    'debts.balance': 'Общий долг клиента',
    'debts.payment_method': 'Способ оплаты',
    'debts.payment_amount': 'Сумма оплаты, сум',
    'debts.collect': 'Принять оплату долга',
    'debts.forgive': 'Прощение долга',
    'debts.reason': 'Причина',
    'debts.forgive_hint': 'Для каждого выбранного чека укажите сумму прощения в сумах.',
    'debts.forgive_amount': 'Сумма прощения в сумах',
    'debts.forgive_submit': 'Простить указанные суммы',
    'debts.forgive_confirm': 'Записать прощение долга по указанным чекам?',
    'debts.payment_success': 'Оплата долга принята.',
    'debts.forgive_success': 'Прощение долга записано.',
    'cash.title': 'Общая касса',
    'cash.balance': 'Расчётный остаток наличных',
    'cash.period_balance': 'Изменение наличных за период',
    'cash.operation_type': 'Операция',
    'cash.type.cash_in': 'Внесение',
    'cash.type.cash_out': 'Изъятие',
    'cash.type.expense': 'Расход',
    'cash.type.collection': 'Инкассация',
    'cash.amount': 'Сумма, сум',
    'cash.category': 'Категория расхода',
    'cash.reason': 'Причина или назначение',
    'cash.reference': 'Подтверждающие данные',
    'cash.create': 'Провести операцию',
    'cash.from': 'С даты',
    'cash.to': 'По дату',
    'cash.refresh': 'Обновить',
    'cash.noncash': 'Безналичные оплаты за период',
    'cash.noncash_columns': 'Способ,Получено,Возвращено,Итого',
    'cash.history': 'Журнал наличных',
    'cash.columns': 'Дата и время,Документ,Тип,Сумма,Пользователь,Категория,Причина,Подтверждающие данные,Действие',
    'cash.no_rows': 'Операций за выбранный период нет.',
    'cash.reverse': 'Сторнировать',
    'cash.reverse_reason': 'Укажите причину встречной операции:',
    'cash.reverse_confirm': 'Создать встречную операцию?',
    'cash.entry.sale': 'Оплата продажи наличными',
    'cash.entry.debt_payment': 'Оплата долга наличными',
    'cash.entry.return': 'Возврат наличных',
    'cash.operation_created': 'Кассовая операция проведена.',
    'cash.operation_reversed': 'Создана встречная кассовая операция.',
    'cart.empty': 'Корзина пуста.',
    'cart.line_not_found': 'Строка корзины не найдена.',
    'cart.not_active': 'Корзина уже закрыта.',
    'cart.held_not_found': 'Отложенная корзина не найдена.',
    'cart.held_not_open': 'Отложенная корзина уже закрыта.',
    'cart.held_customer_mismatch': 'Нельзя изменить клиента отложенной корзины.',
    'reservation.already_active': 'Для корзины уже создан резерв.',
    'reservation.warehouse_mismatch': 'Резерв создан для другого склада.',
    'reservation.cart_mismatch': 'Состав резерва не совпадает с корзиной.',
    'reservation.not_found': 'Резерв не найден.',
    'reservation.not_active': 'Резерв уже не активен.',
    'reservation.cannot_increase': 'Резерв можно только уменьшить или освободить.',
    'returns.title': 'Возврат по чеку',
    'returns.search': 'Номер чека',
    'returns.find': 'Найти чек',
    'returns.reason': 'Причина возврата',
    'returns.payment_method': 'Способ выплаты остатка',
    'returns.submit': 'Оформить возврат',
    'returns.lines': 'Товар,Продано,Возвращено ранее,Вернуть',
    'returns.sold': 'Продано',
    'returns.returned': 'Уже возвращено',
    'returns.qty': 'Количество к возврату',
    'returns.quote': 'К возврату: {total}; в погашение долга: {debt}; выплатить: {payout}',
    'returns.no_sales': 'Чек не найден.',
    'returns.created': 'Возврат оформлен.',
    'return.invalid_sale': 'Укажите исходный чек.',
    'return.invalid_reason': 'Укажите причину возврата (до 1000 символов).',
    'return.invalid_lines': 'Выберите товар и количество для возврата.',
    'return.invalid_payments': 'Проверьте способы и суммы выплаты.',
    'return.sale_not_found': 'Исходный чек не найден.',
    'return.quantity_exceeded': 'Количество превышает остаток, доступный для возврата.',
    'return.allocation_integrity_error': 'Не удалось восстановить исходные партии товара.',
    'return.amount_out_of_range': 'Сумма возврата слишком велика.',
    'return.payment_total_mismatch': 'Сумма выплаты не совпадает с расчётом возврата.',
    'return.idempotency_conflict': 'Ключ запроса уже использован для другой операции.',
    'return.invalid_search': 'Введите номер чека.',
    'writeoff.title': 'Списание товара',
    'writeoff.reason': 'Причина',
    'writeoff.damaged': 'Повреждён',
    'writeoff.lost': 'Утерян',
    'writeoff.expired': 'Истёк срок годности',
    'writeoff.other': 'Другое',
    'writeoff.submit': 'Оформить списание',
    'writeoff.columns': 'Дата,Номер,Склад,Причина,Товар,Количество,Себестоимость',
    'writeoff.created': 'Списание оформлено.',
    'writeoff.invalid_reason': 'Выберите причину списания.',
    'writeoff.invalid_note': 'Примечание слишком длинное.',
    'writeoff.invalid_lines': 'Добавьте корректные товары и количества.',
    'stocktake.title': 'Инвентаризация',
    'stocktake.mode': 'Объём',
    'stocktake.all': 'Весь склад',
    'stocktake.selected': 'Выбранные товары',
    'stocktake.products': 'Товары',
    'stocktake.start': 'Начать инвентаризацию',
    'stocktake.save': 'Сохранить фактические количества',
    'stocktake.complete': 'Завершить',
    'stocktake.cancel': 'Отменить',
    'stocktake.columns': 'Номер,Склад,Режим,Статус,Начата',
    'stocktake.lines': 'Товар,Системный остаток,Фактический остаток,Резерв,Себестоимость вручную',
    'stocktake.manual_cost': 'Себестоимость, тийин за единицу',
    'stocktake.reservations': 'Активные резервы',
    'stocktake.reduce_reservation': 'Уменьшить / освободить',
    'stocktake.complete_confirm': 'Сохранить фактические количества и завершить инвентаризацию?',
    'stocktake.complete_with_deficit_confirm': 'После завершения останется дефицит резерва. Продолжить?',
    'stocktake.cancel_reason': 'Укажите причину отмены инвентаризации:',
    'stocktake.active': 'Активна',
    'stocktake.completed': 'Завершена',
    'stocktake.cancelled': 'Отменена',
    'stocktake.reserve_deficit': 'Есть дефицит резерва. Уменьшите его количество.',
    'stocktake.no_reserve_deficit': 'Дефицита резерва нет.',
    'stocktake.invalid_start': 'Проверьте склад и режим инвентаризации.',
    'stocktake.invalid_note': 'Примечание слишком длинное.',
    'stocktake.invalid_products': 'Выберите активные товары для выборочной инвентаризации.',
    'stocktake.already_active': 'На этом складе уже идёт инвентаризация.',
    'stocktake.not_found': 'Инвентаризация не найдена.',
    'stocktake.invalid_counts': 'Проверьте введённые количества.',
    'stocktake.manual_cost_admin_only': 'Ручную себестоимость может указать только администратор.',
    'stocktake.not_active': 'Инвентаризация не активна.',
    'stocktake.counts_incomplete': 'Сначала заполните фактическое количество по всем товарам.',
    'stocktake.stock_integrity_error': 'Остаток партий не совпадает с журналом движений.',
    'stocktake.manual_cost_required': 'Для излишка без закупочной цены администратор должен указать себестоимость.',
    'stocktake.invalid_cancel_reason': 'Укажите причину отмены инвентаризации.',
    'held.select': 'Отложенная корзина',
    'held.hold': 'Отложить текущую корзину',
    'held.reserve': 'Зарезервировать',
    'held.none': 'Нет отложенных корзин',
    'held.created': 'Корзина отложена.',
    'held.reserved': 'Резерв создан.',
    'held.sold': 'Отложенная корзина продана.',
    'sale.cart_product_inactive': 'В корзине есть неактивный товар. Удалите его.',
    'sale.discount_limit_exceeded': 'Скидка превышает лимит. Уменьшите скидку.',
    'sale.discount_not_allowed': 'У вас нет права на эту скидку.',
    'sale.below_cost': 'Продажа ниже себестоимости запрещена.',
    'sale.overpayment': 'Сумма оплат больше суммы чека.',
    'sale.customer_required_for_debt': 'Для продажи в долг выберите клиента.',
    'sale.idempotency_conflict': 'Ключ запроса уже использован для другой операции.',
    'settings.default_warehouse_required': 'Администратор должен выбрать общий склад по умолчанию.',
    'settings.default_warehouse_unavailable': 'Общий склад отключён. Настройте другой активный склад.',
    'settings.invalid_default_warehouse': 'Выберите активный склад.',
    'print.title': 'Очередь печати',
    'print.copy_language': 'Язык копии',
    'print.refresh': 'Обновить очередь',
    'print.profile': 'Настройка шапки и подвала чека',
    'print.store_name': 'Название магазина',
    'print.address': 'Адрес',
    'print.phone': 'Телефон',
    'print.footer_ru': 'Подвал чека (русский)',
    'print.footer_uz': 'Подвал чека (узбекский)',
    'print.save_profile': 'Сохранить оформление',
    'print.columns': 'Время,Чек,Кассир,Тип,Состояние,Попытки,Ошибка,Действие',
    'print.kind.original': 'Оригинал',
    'print.kind.copy': 'Копия',
    'print.status.pending': 'В очереди',
    'print.status.printing': 'Печатается',
    'print.status.printed': 'Передан принтеру',
    'print.status.error': 'Ошибка печати',
    'print.status.uncertain': 'Проверьте принтер',
    'print.check_printer': 'Неизвестно, вышел ли этот чек. Проверьте принтер перед повтором.',
    'print.disabled': 'Печать не настроена на сервере. Задания сохраняются в очереди.',
    'print.copy': 'Печать копии',
    'print.copy_confirm': 'Создать задание на повторную печать этого чека?',
    'print.uncertain_confirm': 'Сначала проверьте, вышел ли чек из принтера. Создать копию всё равно?',
    'print.profile_saved': 'Оформление чека сохранено.',
    'print.no_jobs': 'Заданий на печать нет.',
    'print.invalid_request': 'Проверьте язык и параметры повторной печати.',
    'print.invalid_profile': 'Проверьте параметры оформления чека.',
    'print.no_active_branch': 'Нет активной точки продажи для чека.',
    'print.job_not_found': 'Задание печати не найдено.',
    'print.job_in_progress': 'Задание сейчас печатается.',
    'print.confirm_uncertain': 'Сначала подтвердите проверку принтера.',
    'sales.no_active_warehouse': 'Нет активного склада.',
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
    'purchase_import.title': 'Загрузить строки из CSV',
    'purchase_import.description': 'Загрузите заполненный шаблон CSV. Столбцы: «Артикул», «Количество», «Закупочная цена, сум». Допускаются и прежние заголовки sku, qty, unit_cost_sum.',
    'purchase_import.template': 'Скачать шаблон XLSX',
    'purchase_import.category': 'Категория товаров в шаблоне',
    'purchase_import.products_template': 'Скачать шаблон со всеми товарами',
    'purchase_import.all_categories': 'Все категории',
    'purchase_import.update_sale_price': 'Обновить цены продажи из файла при проведении прихода',
    'purchase_import.csv_file': 'Файл CSV UTF-8',
    'purchase_import.preview': 'Проверить файл',
    'purchase_import.apply': 'Добавить строки в приход',
    'purchase_import.columns': 'Строка,Артикул,Товар,Количество,Закупочная цена,Цена продажи: было → станет,Статус / ошибки',
    'purchase_import.ready': 'Готово',
    'purchase_import.error': 'Ошибка',
    'purchase_import.summary': 'Готово строк: {ready}; с ошибками: {error}.',
    'purchase_import.applied': 'Строки добавлены в форму прихода. Проверьте документ перед проведением.',
    'purchase_import.invalid_file': 'Загрузите файл CSV.',
    'purchase_import.file_too_large': 'Размер файла не должен превышать 2 МБ.',
    'purchase_import.too_many_rows': 'В файле должно быть не больше 200 строк.',
    'purchase_import.empty_file': 'В файле нет строк с данными.',
    'purchase_import.invalid_csv': 'Проверьте формат CSV и кавычки в ячейках.',
    'purchase_import.invalid_headers': 'CSV должен содержать обязательные столбцы «Артикул», «Количество» и «Закупочная цена, сум».',
    'purchase_import.sale_price_column_required': 'Для обновления цен в файле нужен столбец «Цена продажи, сум».',
    'purchase_import.required_sale_price': 'Укажите цену продажи.',
    'purchase_import.invalid_sale_price': 'Цена продажи должна быть неотрицательной и указана в сумах, не более двух знаков после запятой.',
    'purchase_import.invalid_category': 'Выберите существующую активную категорию.',
    'purchase_import.price_update_confirm': 'Вместе с приходом будут обновлены цены продажи {count} товаров. Продолжить?',
    'purchase_import.price_changed_since_preview': 'Цена одного из товаров изменилась после предпросмотра. Повторите проверку файла.',
    'purchase_import.invalid_request': 'Проверьте параметры импорта.',
    'purchase_import.extra_columns': 'Лишние столбцы.',
    'purchase_import.required_sku': 'Укажите артикул.',
    'purchase_import.invalid_sku': 'Артикул не должен быть длиннее 200 символов.',
    'purchase_import.duplicate_sku': 'Артикул повторяется в файле.',
    'purchase_import.product_not_found': 'Активный товар с таким артикулом не найден.',
    'purchase_import.product_inactive': 'Товар с таким артикулом неактивен.',
    'purchase_import.required_qty': 'Укажите количество.',
    'purchase_import.invalid_qty': 'Количество должно быть положительным и иметь не более 3 знаков после запятой.',
    'purchase_import.required_unit_cost': 'Укажите закупочную цену.',
    'purchase_import.invalid_unit_cost': 'Цена должна быть неотрицательной и указана в сумах, не более двух знаков после запятой.',
    'purchase_import.duplicate_form_product': 'Этот товар уже есть в строках текущего прихода.',
    'purchase_import.too_many_form_lines': 'В приходе нельзя больше 200 строк.',
    'purchase_import.fix_errors_before_submit': 'Исправьте ошибки предпросмотра или загрузите другой файл перед проведением прихода.',
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
    'purchase.invalid_product_price_updates': 'Проверьте список цен продажи для обновления.',
    'purchase.invalid_product_price_update': 'Проверьте данные изменения цены продажи.',
    'purchase.product_price_changed': 'Цена товара изменилась после предпросмотра; повторите импорт.',
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
    'validation.invalid_discount': 'Проверьте параметры скидки.',
    'validation.invalid_payment_amount': 'Введите сумму в сумах с точностью до тийина.',
    'validation.invalid_payments': 'Проверьте способы и суммы оплаты.',
    'validation.invalid_payment_method': 'Выберите активный способ оплаты.',
    'validation.invalid_payment_method_id': 'Выберите активный способ оплаты.',
    'validation.invalid_customer': 'Выберите активного клиента.',
    'validation.invalid_idempotency_key': 'Не удалось защитить чек от повторного создания.',
    'validation.idempotency_unavailable': 'Браузер не может создать безопасный ключ запроса.',
    'debt.invalid_forgiveness_reason': 'Укажите причину прощения долга длиной до 1000 символов.',
    'debt.invalid_forgiveness': 'Проверьте выбранные чеки и суммы прощения.',
    'debt.balance_out_of_range': 'Сумма долга выходит за допустимые пределы.',
    'debt.customer_not_found': 'Клиент не найден.',
    'debt.no_open_balance': 'У клиента нет открытого долга по выбранному чеку.',
    'debt.payment_exceeds_balance': 'Сумма оплаты превышает открытый долг.',
    'debt.idempotency_conflict': 'Ключ запроса уже использован для другой операции.',
    'debt.forgive_exceeds_balance': 'Сумма прощения превышает остаток выбранного чека.',
    'debt.admin_required': 'Прощать долг может только администратор.',
    'cash.invalid_amount': 'Введите положительную сумму в тийинах.',
    'cash.invalid_operation': 'Выберите допустимую кассовую операцию.',
    'cash.invalid_category': 'Проверьте категорию расхода.',
    'cash.category_required': 'Для расхода укажите категорию.',
    'cash.invalid_reason': 'Укажите причину или назначение длиной до 500 символов.',
    'cash.invalid_reference': 'Подтверждающие данные слишком длинные.',
    'cash.invalid_date_range': 'Проверьте период дат.',
    'cash.balance_out_of_range': 'Остаток кассы выходит за допустимые пределы.',
    'cash.no_cash_method': 'Нет активного способа оплаты «наличные».',
    'cash.no_active_branch': 'Нет активной точки продажи для номера документа.',
    'cash.operation_not_found': 'Кассовая операция не найдена.',
    'cash.idempotency_conflict': 'Ключ запроса уже использован для другой операции.',
    'cash.operation_already_reversed': 'Эта кассовая операция уже сторнирована.',
    'cash.reversal_of_reversal': 'Нельзя сторнировать встречную операцию.',
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
    'users.pages': 'Доступ к страницам',
    'users.pages_help': 'Эти разрешения ограничивают доступ к страницам дополнительно к правам на операции.',
    'users.sales_warehouses': 'Склады для продаж',
    'users.sales_warehouses_help': 'Если список пуст, используется общий склад по умолчанию.',
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
    'warehouses.title': 'Склады',
    'warehouses.name': 'Название склада',
    'warehouses.create': 'Создать склад',
    'warehouses.save': 'Сохранить',
    'warehouses.columns': 'Название,Статус,Действие',
    'warehouses.empty': 'Склады не найдены.',
    'warehouses.edit': 'Изменить',
    'warehouses.activate': 'Активировать',
    'warehouses.deactivate': 'Деактивировать',
    'warehouses.activate_confirm': 'Активировать склад?',
    'warehouses.deactivate_confirm': 'Отключить склад? Он останется в истории, но не будет доступен для новых операций.',
    'warehouses.branch_unavailable': 'Не удалось определить филиал для создания склада. Обратитесь к администратору.',
    'permission.sell': 'Продажа',
    'permission.pay_cash': 'Наличные',
    'permission.pay_card': 'Карта',
    'permission.pay_transfer': 'Перевод',
    'permission.pay_at_counter': 'Оплата у кассы',
    'users.sale_payment_permissions': 'Способы оплаты при продаже',
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
    'page.sales': 'Продажа',
    'page.heldCarts': 'Отложенные корзины',
    'page.reservations': 'Резервы',
    'page.print': 'Печать',
    'page.returns': 'Возвраты',
    'page.writeoffs': 'Списания',
    'page.stocktakes': 'Инвентаризация',
    'page.reports': 'Отчёты',
    'page.products': 'Товары',
    'page.stock': 'Остатки',
    'page.warehouses': 'Склады',
    'page.purchases': 'Приходы',
    'page.movements': 'Движения',
    'page.debts': 'Долги',
    'page.cash': 'Касса',
    'page.users': 'Пользователи',
    'page.connection': 'Подключение ПК',
    'auth.page_permission_denied': 'Нет доступа к этой странице.',
    'auth.warehouse_permission_denied': 'Продажа с этого склада запрещена.',
    'auth.no_accessible_pages': 'Для пользователя не настроен доступ ни к одной странице.',
    'validation.unknown_page': 'Неизвестная страница.',
    'validation.invalid_page_permissions': 'Неверный список прав на страницы.',
    'validation.invalid_warehouses': 'Неверный список складов.',
    'permission.discount_check_limit_bp': 'Лимит скидки на чек (б.п.)',
    'permission.discount_manual_limit_bp': 'Лимит ручной скидки (б.п.)',
    'auth.invalid_credentials': 'Неверный логин или пароль.',
    'auth.required': 'Сначала войдите в систему.',
    'auth.session_expired': 'Сессия завершена. Войдите снова.',
    'auth.session_replaced': 'Выполнен вход на другом устройстве.',
    'auth.permission_denied': 'Недостаточно прав.',
    'auth.payment_method_permission_denied': 'Пользователю запрещён этот способ оплаты.',
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
    'money.currency': 'soʻm',
    'language.label': 'Til',
    'server.checking': 'Server tekshirilmoqda',
    'server.online': 'Server ishlayapti',
    'server.offline': 'Server bilan aloqa yo‘q',
    'server.unavailable': 'Serverga ulanib bo‘lmadi. Ulanishni tekshirib, qayta urinib ko‘ring.',
    'status.server_updated': 'Server amal bajarilganini tasdiqladi.',
    'common.cancel': 'Bekor qilish',
    'common.dismiss': 'Bildirishnomani yopish',
    'login.title': 'Kirish',
    'login.login': 'Login',
    'login.password': 'Parol',
    'login.submit': 'Kirish',
    'auth.logout': 'Chiqish',
    'nav.pages': 'Sahifalar',
    'nav.sales': 'Savdo',
    'nav.held_carts': 'Saqlangan savatlar',
    'nav.reservations': 'Rezerv',
    'nav.products': 'Tovarlar',
    'nav.stock': 'Qoldiqlar',
    'nav.warehouses': 'Omborlar',
    'nav.purchases': 'Kirimlar',
    'nav.movements': 'Harakatlar',
    'nav.debts': 'Qarzlar',
    'nav.cash': 'Umumiy kassa',
    'nav.users': 'Foydalanuvchilar va huquqlar',
    'nav.connection': 'Kompyuterlarni ulash',
    'nav.print': 'Cheklarni chop etish',
    'nav.returns': 'Qaytarishlar',
    'nav.writeoffs': 'Hisobdan chiqarish',
    'nav.stocktakes': 'Inventarizatsiya',
    'nav.reports': 'Hisobotlar va nusxalar',
    'reports.title': 'Hisobotlar',
    'reports.type': 'Hisobot',
    'reports.from': 'Boshlanish sanasi (Toshkent)',
    'reports.to': 'Tugash sanasi (Toshkent)',
    'reports.warehouse': 'Ombor',
    'reports.product': 'Tovar',
    'reports.cashier': 'Foydalanuvchi',
    'reports.run': 'Shakllantirish',
    'reports.export': 'Excel uchun CSV yuklab olish',
    'reports.no_rows': 'Tanlangan shartlar bo‘yicha ma’lumot yo‘q.',
    'reports.truncated': 'Birinchi 10 000 qator ko‘rsatildi. To‘liq eksport uchun filtrlarni aniqlashtiring.',
    'reports.summary.cash': 'Hozirgi naqd pul qoldig‘i: {balance}; davr o‘zgarishi: {periodAmount}.',
    'reports.summary.valuation': 'Partiyalar tannarxi bo‘yicha qoldiq qiymati: {value}.',
    'reports.summary.backups': 'Nusxalar papkasi: {directory}. Oxirgi amal: {lastRun}.',
    'reports.type.sales_by_day': 'Kunlar bo‘yicha savdo',
    'reports.type.sales_by_product': 'Tovarlar bo‘yicha savdo',
    'reports.type.sales_by_category': 'Toifalar bo‘yicha savdo',
    'reports.type.sales_by_cashier': 'Sotuvchilar bo‘yicha savdo',
    'reports.type.sales_by_payment_method': 'To‘lov usullari bo‘yicha savdo',
    'reports.type.cashier_summary': 'Sotuvchilar hisoboti',
    'reports.type.profit_by_sale': 'Cheklar bo‘yicha foyda',
    'reports.type.profit_by_product': 'Tovarlar bo‘yicha foyda',
    'reports.type.profit_by_category': 'Toifalar bo‘yicha foyda',
    'reports.type.stock': 'Qoldiqlar',
    'reports.type.low_stock': 'Minimal qoldiqdan kam',
    'reports.type.stock_valuation': 'Partiyalar bo‘yicha ombor qiymati',
    'reports.type.movements': 'Tovar harakati',
    'reports.type.discounts': 'Chegirmalar',
    'reports.type.returns': 'Qaytarishlar',
    'reports.type.writeoffs': 'Hisobdan chiqarish',
    'reports.type.debt_balances': 'Cheklar bo‘yicha ochiq qarzlar',
    'reports.type.debt_history': 'Qarz va to‘lov taqsimoti tarixi',
    'reports.type.cash': 'Umumiy kassa',
    'reports.type.noncash': 'Naqdsiz summalar',
    'reports.type.reservations': 'Rezervlar',
    'reports.type.audit': 'Amallar jurnali',
    'reports.column.date': 'Sana',
    'reports.column.sales': 'Savdo',
    'reports.column.salesCount': 'Cheklar',
    'reports.column.subtotal': 'Chegirmagacha',
    'reports.column.discount': 'Chegirma',
    'reports.column.total': 'Cheklar summasi',
    'reports.column.paid': 'To‘langan',
    'reports.column.debt': 'Qarzga',
    'reports.column.sku': 'Artikul',
    'reports.column.product': 'Tovar',
    'reports.column.sale': 'Chek',
    'reports.column.kind': 'Chegirma turi',
    'reports.column.category': 'Toifa',
    'reports.column.cart': 'Saqlangan savatcha',
    'reports.column.qty': 'Miqdor',
    'reports.column.returns': 'Qaytarishlar',
    'reports.column.netSales': 'Qaytarishlardan keyingi savdo',
    'reports.column.user': 'Foydalanuvchi',
    'reports.column.salesTotal': 'Savdo',
    'reports.column.returnQty': 'Qaytarilgan miqdor',
    'reports.column.method': 'To‘lov usuli',
    'reports.column.purpose': 'Maqsad',
    'reports.column.direction': 'Yo‘nalish',
    'reports.column.payments': 'Amallar',
    'reports.column.amount': 'Summa',
    'reports.column.number': 'Raqam',
    'reports.column.customer': 'Mijoz',
    'reports.column.cost': 'Tannarx',
    'reports.column.profit': 'Foyda',
    'reports.column.warehouse': 'Ombor',
    'reports.column.reserved': 'Rezerv',
    'reports.column.available': 'Mavjud',
    'reports.column.minStock': 'Minimal qoldiq',
    'reports.column.batch': 'Partiya',
    'reports.column.receivedAt': 'Partiya kelgan sana',
    'reports.column.unitCost': 'Birlik tannarxi',
    'reports.column.value': 'Qoldiq qiymati',
    'reports.column.type': 'Turi',
    'reports.column.document': 'Hujjat',
    'reports.column.note': 'Izoh',
    'reports.column.percentBp': 'Chegirma, bazis punkt',
    'reports.column.approvedBy': 'Tasdiqladi',
    'reports.column.reason': 'Sabab',
    'reports.column.lines': 'Qatorlar',
    'reports.column.balance': 'Qarz qoldig‘i',
    'reports.column.payment': 'To‘lov',
    'reports.column.allocated': 'Taqsimlangan',
    'reports.column.before': 'Oldin',
    'reports.column.after': 'Keyin',
    'reports.column.action': 'Amal',
    'reports.column.entity': 'Bo‘lim',
    'reports.column.entityId': 'Yozuv IDsi',
    'reports.column.expiresAt': 'Muddati tugaydi',
    'reports.column.received': 'Qabul qilindi',
    'reports.column.returned': 'Qaytarildi',
    'reports.column.net': 'Jami',
    'reports.column.status': 'Holat',
    'backup.title': 'Zaxira nusxalari',
    'backup.description': 'Kunlik nusxalar Toshkent vaqti bilan 02:00 da yaratiladi. BACKUP_DIR alohida fizik tashuvchida bo‘lishi kerak. Oxirgi 30 kun saqlanadi.',
    'backup.create': 'Hozir nusxa yaratish',
    'backup.not_configured': 'BACKUP_DIR belgilanmagan. .env faylida ikkinchi fizik tashuvchi yo‘lini ko‘rsating va serverni qayta ishga tushiring.',
    'backup.latest': 'Oxirgi ishga tushirish: {status}; vaqt: {date}; fayl: {file}; yaxlitlik: {integrity}; tafovutlar: {discrepancies}.',
    'backup.no_runs': 'Hali nusxa yaratilmagan.',
    'backup.created': 'Zaxira nusxasi yaratildi va tekshirildi.',
    'backup.directory_not_configured': 'Zaxira nusxalari papkasi sozlanmagan. BACKUP_DIR ni belgilang va serverni qayta ishga tushiring.',
    'backup.columns': 'Fayl,Yaratilgan,Hajmi (bayt)',
    'backup.run.success': 'muvaffaqiyatli',
    'backup.run.error': 'xato',
    'reports.all_warehouses': 'Barcha omborlar',
    'reports.all_products': 'Barcha tovarlar',
    'reports.all_users': 'Barcha foydalanuvchilar',
    'reports.discount.qty': 'Miqdor bo‘yicha narx',
    'reports.discount.promo': 'Aksiya',
    'reports.discount.customer': 'Mijoz chegirmasi',
    'reports.discount.check': 'Chek chegirmasi',
    'reports.discount.manual': 'Qo‘lda chegirma',
    'reports.value.sale': 'Savdo',
    'reports.value.return': 'Qaytarish',
    'reports.value.debt_payment': 'Qarz to‘lovi',
    'reports.value.in': 'Kirim',
    'reports.value.out': 'Chiqim',
    'reports.reservation.active': 'Faol',
    'reports.reservation.released': 'Bo‘shatilgan',
    'reports.reservation.consumed': 'Ishlatilgan',
    'report.invalid_filters': 'Hisobot filtrlarini tekshiring.',
    'report.invalid_type': 'Hisobot turini tanlang.',
    'report.filter_not_supported': 'Tanlangan hisobot uchun bu filtr mavjud emas.',
    'report.invalid_period': 'Davr boshlanishi tugashidan keyin bo‘lishi mumkin emas.',
    'report.amount_out_of_range': 'Hisobot summasi ruxsat etilgan chegaradan katta.',
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
    'products.columns': 'Artikul,Tovar,Birlik,Narx,Holat,Amal',
    'products.edit_price': 'Narxni o‘zgartirish',
    'products.price_dialog_title': 'Narxni o‘zgartirish',
    'products.save_price': 'Narxni saqlash',
    'product_import.title': 'CSV dan tovarlarni import qilish',
    'product_import.description': 'XLSX shablonini yuklab oling, «Tovarlar» varag‘ini to‘ldiring, CSV UTF-8 sifatida saqlang va faylni yuklang. Import faqat tovar kartalarini o‘zgartiradi, qoldiqlarga tegmaydi.',
    'product_import.template': 'XLSX shablonini yuklab olish',
    'product_import.csv_file': 'CSV fayli',
    'product_import.mode': 'Artikul mos kelganda',
    'product_import.mode_skip': 'Mavjud tovarni o‘tkazib yuborish',
    'product_import.mode_update': 'To‘ldirilgan maydonlarni yangilash',
    'product_import.create_categories': 'Mavjud bo‘lmagan toifalarni yaratish',
    'product_import.categories_to_create': 'Yaratiladigan toifalar: {categories}.',
    'product_import.categories_created': 'Yaratilgan toifalar: {categories}.',
    'product_import.preview': 'Faylni tekshirish',
    'product_import.commit': 'Tekshirilgan qatorlarni import qilish',
    'product_import.download_report': 'CSV hisobotini yuklab olish',
    'product_import.columns': 'Qator,Artikul,Amal,Xatolar',
    'product_import.summary': 'Jami qator: {total}; yangi: {create}; yangilanish: {update}; o‘tkazildi: {skip}; xato: {error}.',
    'product_import.outcome': 'Import tugadi. Qo‘shildi: {create}; yangilandi: {update}; o‘tkazildi: {skip}; xato: {error}.',
    'product_import.action.create': 'Qo‘shish',
    'product_import.action.update': 'Yangilash',
    'product_import.action.skip': 'O‘tkazish',
    'product_import.action.error': 'Xato',
    'product_import.invalid_request': 'Import parametrlarini tekshiring.',
    'product_import.invalid_options': 'Import parametrlarini tekshiring.',
    'product_import.invalid_language': 'Shablon tili qo‘llab-quvvatlanmaydi.',
    'product_import.invalid_mode': 'Mos kelgan tovarlar uchun to‘g‘ri rejimni tanlang.',
    'product_import.invalid_file': 'CSV faylini yuklang.',
    'product_import.file_too_large': 'Fayl hajmi 2 MiB dan oshmasligi kerak.',
    'product_import.too_many_rows': 'Faylda 5000 dan ortiq tovar qatori bor.',
    'product_import.empty_file': 'CSV fayli bo‘sh.',
    'product_import.invalid_csv': 'CSV formatini va kataklardagi qo‘shtirnoqlarni tekshiring.',
    'product_import.invalid_headers': 'CSV sarlavhalari shablonga mos emas yoki takrorlangan.',
    'product_import.extra_columns': 'Qatorda sarlavhalardan ko‘proq katak bor.',
    'product_import.required_sku': 'Artikulni kiriting.',
    'product_import.required_name_ru': 'Rus tilidagi nomni kiriting.',
    'product_import.required_unit': 'Hisob birligini kiriting.',
    'product_import.required_price_sum': 'So‘mdagi asosiy narxni kiriting.',
    'product_import.invalid_sku': 'Artikulni tekshiring.',
    'product_import.invalid_name_ru': 'Ruscha nomni tekshiring.',
    'product_import.invalid_name_uz': 'O‘zbekcha nomni tekshiring.',
    'product_import.invalid_unit': 'Hisob birligini tekshiring.',
    'product_import.invalid_category': 'Toifa nomi juda uzun.',
    'product_import.invalid_price': 'Narx manfiy bo‘lmasligi va so‘mda verguldan keyin ikki raqamgacha bo‘lishi kerak.',
    'product_import.invalid_min_stock': 'Minimal qoldiq manfiy bo‘lmasligi va verguldan keyin uch raqamgacha bo‘lishi kerak.',
    'product_import.invalid_attributes': 'Qo‘shimcha atributlar JSON obyekt bo‘lishi kerak.',
    'product_import.invalid_row': 'Qator ma’lumotlarini tekshiring.',
    'product_import.duplicate_file_sku': 'Bu artikul faylda bir necha marta ko‘rsatilgan.',
    'product_import.duplicate_file_barcode': 'Bu shtrix-kod faylda bir necha marta ko‘rsatilgan.',
    'product_import.barcode_in_use': 'Shtrix-kod boshqa tovarda ishlatilmoqda.',
    'product_import.category_not_found': 'Bunday nomli faol toifa topilmadi.',
    'product_import.category_ambiguous': 'Toifa nomi bir xil; toifalar ro‘yxatini tekshiring.',
    'product_import.category_inactive': 'Bu nomli toifa mavjud, ammo o‘chirilgan. Uni ma’lumotnomada faollashtiring.',
    'product_import.no_update_fields': 'Yangilash uchun artikuldan tashqari kamida bitta maydonni to‘ldiring.',
    'sales.title': 'Savdo',
    'sales.default_warehouse': 'Umumiy standart ombor',
    'sales.choose_warehouse': 'Ushbu savdo uchun ombor',
    'sales.selected_warehouse': 'Savdo ombori',
    'sales.save_default_warehouse': 'Omborni saqlash',
    'sales.warehouse_unconfigured': 'Umumiy standart omborni sozlang.',
    'sales.no_warehouse': 'Faol ombor yo‘q.',
    'sales.no_permitted_warehouse': 'Savdo uchun ruxsat etilgan ombor yo‘q.',
    'sales.choose_warehouse_first': 'Savdo uchun omborni tanlang.',
    'sales.search': 'Nomi, artikul yoki shtrix-kod bo‘yicha qidirish',
    'sales.product_name': 'Nomi',
    'sales.available_stock': 'Qoldiq (band qilingan miqdor hisobga olingan)',
    'sales.product_price': 'Narx',
    'sales.add': 'Qo‘shish',
    'sales.no_products': 'Tovar topilmadi.',
    'sales.out_of_stock': 'Mavjud qoldiq yo‘q',
    'sales.quantity': 'Miqdor',
    'sales.customer': 'Mijoz (ixtiyoriy)',
    'sales.no_customer': 'Mijozsiz',
    'sales.cart': 'Savat',
    'sales.cart_columns': 'Tovar,Miqdor,Narx,Qo‘lda chegirma (b.p.),Summa,Amal',
    'sales.remove': 'Olib tashlash',
    'sales.manual_discount': 'Bazis punktlarida qo‘lda chegirma',
    'sales.check_discount': 'Chek uchun chegirma',
    'sales.discount_percent': 'Foiz',
    'sales.discount_amount': 'Tiyindagi summa',
    'sales.payments': 'To‘lov',
    'sales.payment_amount': 'So‘mda to‘lanadigan summa',
    'sales.tendered': 'Naqd olingan summa (so‘m)',
    'sales.confirm_payment': 'To‘lovni tasdiqlash',
    'sales.pay_at_counter': 'Kassada to‘lash — tovarni rezerv qilish',
    'sales.select_payment_method': 'To‘lov usulini tanlang',
    'sales.total': 'Jami',
    'sales.paid': 'To‘lov',
    'sales.due': 'Qarz qoldig‘i',
    'sales.submit': 'To‘lash',
    'sales.receipt': 'Chek yaratildi',
    'sales.receipt_summary': 'Chek {number}; jami {total}; to‘landi {paid}; qarz {debt}; qaytim {change}.',
    'sales.no_payment_method': 'Faol to‘lov usuli yo‘q.',
    'customers.add': 'Mijoz qo‘shish',
    'customers.add_title': 'Yangi mijoz',
    'customers.name': 'Mijoz ismi',
    'customers.phone': 'Telefon (ixtiyoriy)',
    'customers.note': 'Izoh (ixtiyoriy)',
    'customers.save': 'Mijozni saqlash',
    'held.title': 'Saqlangan savatlar',
    'held.no_carts': 'Saqlangan savatlar yo‘q.',
    'held.customer_required': 'Rezerv uchun mijozni tanlang.',
    'held.sell': 'Sotish',
    'held.already_reserved': 'Allaqachon rezerv qilingan',
    'held.reserve_success': 'Tovarlar rezerv qilindi.',
    'held.counter_payment_reserved': 'Savat kassada to‘lash uchun rezerv qilindi. Savdo hali rasmiylashtirilmadi.',
    'held.reserve_deficit': 'Rezerv haqiqiy qoldiqdan katta. Uning miqdorini kamaytiring.',
    'reservations.title': 'Rezerv qilingan tovarlar',
    'reservations.columns': 'Mijoz,Tovar,Miqdor,Ombor,Savat,Yaratilgan,Muddati',
    'reservations.none': 'Faol rezervlar yo‘q.',
    'returns.receipt_language': 'Qaytarish cheki tili',
    'stocktake.reservation_reduced': 'Rezerv miqdori kamaytirildi.',
    'debts.title': 'Mijozlar qarzi',
    'debts.customer': 'Mijoz',
    'debts.columns': 'Mijoz,Qarz qoldig‘i,Ochiq cheklar',
    'debts.sales_columns': 'Chek,Sana,Jami,Qoldiq,Kechirish',
    'debts.no_debtors': 'Ochiq qarz yo‘q.',
    'debts.select_customer': 'Mijozni tanlang',
    'debts.balance': 'Mijozning umumiy qarzi',
    'debts.payment_method': 'To‘lov usuli',
    'debts.payment_amount': 'To‘lov summasi, so‘m',
    'debts.collect': 'Qarz to‘lovini qabul qilish',
    'debts.forgive': 'Qarzni kechirish',
    'debts.reason': 'Sabab',
    'debts.forgive_hint': 'Har bir tanlangan chek uchun kechiriladigan summani so‘mda kiriting.',
    'debts.forgive_amount': 'So‘mdagi kechirish summasi',
    'debts.forgive_submit': 'Ko‘rsatilgan summalarni kechirish',
    'debts.forgive_confirm': 'Ko‘rsatilgan cheklar bo‘yicha qarz kechirilsinmi?',
    'debts.payment_success': 'Qarz to‘lovi qabul qilindi.',
    'debts.forgive_success': 'Qarzni kechirish yozildi.',
    'cash.title': 'Umumiy kassa',
    'cash.balance': 'Hisoblangan naqd pul qoldig‘i',
    'cash.period_balance': 'Davr uchun naqd pul o‘zgarishi',
    'cash.operation_type': 'Amal',
    'cash.type.cash_in': 'Kirim',
    'cash.type.cash_out': 'Olish',
    'cash.type.expense': 'Xarajat',
    'cash.type.collection': 'Inkassatsiya',
    'cash.amount': 'Summa, so‘m',
    'cash.category': 'Xarajat toifasi',
    'cash.reason': 'Sabab yoki maqsad',
    'cash.reference': 'Tasdiqlovchi ma’lumot',
    'cash.create': 'Amalni rasmiylashtirish',
    'cash.from': 'Boshlanish sanasi',
    'cash.to': 'Tugash sanasi',
    'cash.refresh': 'Yangilash',
    'cash.noncash': 'Davr uchun naqdsiz to‘lovlar',
    'cash.noncash_columns': 'Usul,Olingan,Qaytarilgan,Jami',
    'cash.history': 'Naqd pul jurnali',
    'cash.columns': 'Sana va vaqt,Hujjat,Turi,Summa,Foydalanuvchi,Toifa,Sabab,Tasdiqlovchi ma’lumot,Amal',
    'cash.no_rows': 'Tanlangan davrda amallar yo‘q.',
    'cash.reverse': 'Qarama-qarshi yozuv',
    'cash.reverse_reason': 'Qarama-qarshi amal sababini kiriting:',
    'cash.reverse_confirm': 'Qarama-qarshi amal yaratilsinmi?',
    'cash.entry.sale': 'Savdo uchun naqd to‘lov',
    'cash.entry.debt_payment': 'Qarz uchun naqd to‘lov',
    'cash.entry.return': 'Naqd qaytarish',
    'cash.operation_created': 'Kassa amali rasmiylashtirildi.',
    'cash.operation_reversed': 'Qarama-qarshi kassa amali yaratildi.',
    'cart.empty': 'Savat bo‘sh.',
    'cart.line_not_found': 'Savat qatori topilmadi.',
    'cart.not_active': 'Savat allaqachon yopilgan.',
    'cart.held_not_found': 'Saqlangan savatcha topilmadi.',
    'cart.held_not_open': 'Saqlangan savatcha allaqachon yopilgan.',
    'cart.held_customer_mismatch': 'Saqlangan savatcha mijozini o‘zgartirib bo‘lmaydi.',
    'reservation.already_active': 'Savatcha uchun rezerv allaqachon yaratilgan.',
    'reservation.warehouse_mismatch': 'Rezerv boshqa ombor uchun yaratilgan.',
    'reservation.cart_mismatch': 'Rezerv tarkibi savatcha bilan mos emas.',
    'reservation.not_found': 'Rezerv topilmadi.',
    'reservation.not_active': 'Rezerv faol emas.',
    'reservation.cannot_increase': 'Rezervni faqat kamaytirish yoki bo‘shatish mumkin.',
    'returns.title': 'Chek bo‘yicha qaytarish',
    'returns.search': 'Chek raqami',
    'returns.find': 'Chekni topish',
    'returns.reason': 'Qaytarish sababi',
    'returns.payment_method': 'Qolgan summani qaytarish usuli',
    'returns.submit': 'Qaytarishni rasmiylashtirish',
    'returns.lines': 'Tovar,Sotilgan,Avval qaytarilgan,Qaytarish',
    'returns.sold': 'Sotilgan',
    'returns.returned': 'Avval qaytarilgan',
    'returns.qty': 'Qaytariladigan miqdor',
    'returns.quote': 'Qaytarish: {total}; qarzni yopish: {debt}; to‘lash: {payout}',
    'returns.no_sales': 'Chek topilmadi.',
    'returns.created': 'Qaytarish rasmiylashtirildi.',
    'return.invalid_sale': 'Asl chekni ko‘rsating.',
    'return.invalid_reason': 'Qaytarish sababini kiriting (1000 belgigacha).',
    'return.invalid_lines': 'Qaytariladigan tovar va miqdorni tanlang.',
    'return.invalid_payments': 'To‘lov usuli va summalarini tekshiring.',
    'return.sale_not_found': 'Asl chek topilmadi.',
    'return.quantity_exceeded': 'Qaytariladigan miqdor ruxsat etilganidan oshdi.',
    'return.allocation_integrity_error': 'Tovarni asl partiyalarga qaytarib bo‘lmadi.',
    'return.amount_out_of_range': 'Qaytarish summasi juda katta.',
    'return.payment_total_mismatch': 'To‘lov summasi qaytarish hisobiga mos emas.',
    'return.idempotency_conflict': 'So‘rov kaliti boshqa amal uchun ishlatilgan.',
    'return.invalid_search': 'Chek raqamini kiriting.',
    'writeoff.title': 'Tovarni hisobdan chiqarish',
    'writeoff.reason': 'Sabab',
    'writeoff.damaged': 'Shikastlangan',
    'writeoff.lost': 'Yo‘qolgan',
    'writeoff.expired': 'Yaroqlilik muddati o‘tgan',
    'writeoff.other': 'Boshqa',
    'writeoff.submit': 'Hisobdan chiqarish',
    'writeoff.columns': 'Sana,Raqam,Ombor,Sabab,Tovar,Miqdor,Tannarx',
    'writeoff.created': 'Hisobdan chiqarildi.',
    'writeoff.invalid_reason': 'Hisobdan chiqarish sababini tanlang.',
    'writeoff.invalid_note': 'Izoh juda uzun.',
    'writeoff.invalid_lines': 'Tovar va miqdorlarni tekshiring.',
    'stocktake.title': 'Inventarizatsiya',
    'stocktake.mode': 'Qamrov',
    'stocktake.all': 'Butun ombor',
    'stocktake.selected': 'Tanlangan tovarlar',
    'stocktake.products': 'Tovarlar',
    'stocktake.start': 'Inventarizatsiyani boshlash',
    'stocktake.save': 'Haqiqiy miqdorlarni saqlash',
    'stocktake.complete': 'Yakunlash',
    'stocktake.cancel': 'Bekor qilish',
    'stocktake.columns': 'Raqam,Ombor,Tur,Holat,Boshlangan',
    'stocktake.lines': 'Tovar,Tizim qoldig‘i,Haqiqiy qoldiq,Rezerv,Qo‘lda tannarx',
    'stocktake.manual_cost': 'Tannarx, birligi uchun tiyin',
    'stocktake.reservations': 'Faol rezervlar',
    'stocktake.reduce_reservation': 'Kamaytirish / bo‘shatish',
    'stocktake.complete_confirm': 'Haqiqiy miqdorlarni saqlab, inventarizatsiya yakunlansinmi?',
    'stocktake.complete_with_deficit_confirm': 'Yakunlangandan so‘ng rezerv taqchilligi qoladi. Davom etilsinmi?',
    'stocktake.cancel_reason': 'Inventarizatsiyani bekor qilish sababini kiriting:',
    'stocktake.active': 'Faol',
    'stocktake.completed': 'Yakunlangan',
    'stocktake.cancelled': 'Bekor qilingan',
    'stocktake.reserve_deficit': 'Rezerv taqchilligi bor. Uning miqdorini kamaytiring.',
    'stocktake.no_reserve_deficit': 'Rezerv taqchilligi yo‘q.',
    'stocktake.invalid_start': 'Ombor va inventarizatsiya turini tekshiring.',
    'stocktake.invalid_note': 'Izoh juda uzun.',
    'stocktake.invalid_products': 'Tanlangan inventarizatsiya uchun faol tovarlarni tanlang.',
    'stocktake.already_active': 'Bu omborda inventarizatsiya allaqachon davom etmoqda.',
    'stocktake.not_found': 'Inventarizatsiya topilmadi.',
    'stocktake.invalid_counts': 'Kiritilgan miqdorlarni tekshiring.',
    'stocktake.manual_cost_admin_only': 'Tannarxni faqat administrator qo‘lda kiritishi mumkin.',
    'stocktake.not_active': 'Inventarizatsiya faol emas.',
    'stocktake.counts_incomplete': 'Avval barcha tovarlar bo‘yicha haqiqiy miqdorni kiriting.',
    'stocktake.stock_integrity_error': 'Partiyalar qoldig‘i harakatlar jurnaliga mos emas.',
    'stocktake.manual_cost_required': 'Xarid narxi yo‘q ortiqcha uchun administrator tannarx kiritishi kerak.',
    'stocktake.invalid_cancel_reason': 'Inventarizatsiyani bekor qilish sababini kiriting.',
    'held.select': 'Saqlangan savatcha',
    'held.hold': 'Joriy savatchani saqlash',
    'held.reserve': 'Rezerv qilish',
    'held.none': 'Saqlangan savatchalar yo‘q',
    'held.created': 'Savatcha saqlandi.',
    'held.reserved': 'Rezerv yaratildi.',
    'held.sold': 'Saqlangan savatcha sotildi.',
    'sale.cart_product_inactive': 'Savatda faol bo‘lmagan tovar bor. Uni olib tashlang.',
    'sale.discount_limit_exceeded': 'Chegirma limitdan oshdi. Chegirmani kamaytiring.',
    'sale.discount_not_allowed': 'Bu chegirma uchun huquqingiz yo‘q.',
    'sale.below_cost': 'Tannarxdan past sotish taqiqlangan.',
    'sale.overpayment': 'To‘lovlar summasi chek summasidan oshdi.',
    'sale.customer_required_for_debt': 'Nasiyaga sotish uchun mijozni tanlang.',
    'sale.idempotency_conflict': 'So‘rov kaliti boshqa amal uchun ishlatilgan.',
    'settings.default_warehouse_required': 'Administrator umumiy standart omborni tanlashi kerak.',
    'settings.default_warehouse_unavailable': 'Umumiy ombor o‘chirilgan. Boshqa faol omborni sozlang.',
    'settings.invalid_default_warehouse': 'Faol omborni tanlang.',
    'print.title': 'Chop etish navbati',
    'print.copy_language': 'Nusxa tili',
    'print.refresh': 'Navbatni yangilash',
    'print.profile': 'Chek sarlavhasi va pastki qismini sozlash',
    'print.store_name': 'Do‘kon nomi',
    'print.address': 'Manzil',
    'print.phone': 'Telefon',
    'print.footer_ru': 'Chek pastki qismi (ruscha)',
    'print.footer_uz': 'Chek pastki qismi (o‘zbekcha)',
    'print.save_profile': 'Chek ko‘rinishini saqlash',
    'print.columns': 'Vaqt,Chek,Sotuvchi,Turi,Holati,Urinishlar,Xato,Amal',
    'print.kind.original': 'Asl',
    'print.kind.copy': 'Nusxa',
    'print.status.pending': 'Navbatda',
    'print.status.printing': 'Chop etilmoqda',
    'print.status.printed': 'Printerga yuborildi',
    'print.status.error': 'Chop etish xatosi',
    'print.status.uncertain': 'Printerni tekshiring',
    'print.check_printer': 'Chek printerdan chiqqani noma’lum. Qayta chop etishdan oldin printerni tekshiring.',
    'print.disabled': 'Serverda chop etish sozlanmagan. Topshiriqlar navbatda saqlanadi.',
    'print.copy': 'Nusxani chop etish',
    'print.copy_confirm': 'Ushbu chekni qayta chop etish uchun topshiriq yaratilsinmi?',
    'print.uncertain_confirm': 'Avval chek printerdan chiqqanini tekshiring. Baribir nusxa yaratiladimi?',
    'print.profile_saved': 'Chek ko‘rinishi saqlandi.',
    'print.no_jobs': 'Chop etish topshiriqlari yo‘q.',
    'print.invalid_request': 'Til va qayta chop etish parametrlarini tekshiring.',
    'print.invalid_profile': 'Chek ko‘rinishi parametrlarini tekshiring.',
    'print.no_active_branch': 'Chek uchun faol savdo nuqtasi yo‘q.',
    'print.job_not_found': 'Chop etish topshirig‘i topilmadi.',
    'print.job_in_progress': 'Topshiriq hozir chop etilmoqda.',
    'print.confirm_uncertain': 'Avval printerni tekshirishni tasdiqlang.',
    'sales.no_active_warehouse': 'Faol ombor yo‘q.',
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
    'purchase_import.title': 'CSV faylidan qatorlarni yuklash',
    'purchase_import.description': 'To‘ldirilgan CSV shablonini yuklang. Ustunlar: «Artikul», «Miqdor», «Xarid narxi, so‘m». Eski sku, qty, unit_cost_sum sarlavhalari ham qabul qilinadi.',
    'purchase_import.template': 'XLSX shablonini yuklab olish',
    'purchase_import.category': 'Shablondagi tovarlar toifasi',
    'purchase_import.products_template': 'Barcha tovarlar bilan shablonni yuklab olish',
    'purchase_import.all_categories': 'Barcha toifalar',
    'purchase_import.update_sale_price': 'Kirimni rasmiylashtirishda fayldagi sotuv narxlarini yangilash',
    'purchase_import.csv_file': 'CSV UTF-8 fayli',
    'purchase_import.preview': 'Faylni tekshirish',
    'purchase_import.apply': 'Kirimga qatorlarni qo‘shish',
    'purchase_import.columns': 'Qator,Artikul,Tovar,Miqdor,Xarid narxi,Sotuv narxi: avval → yangi,Holat / xatolar',
    'purchase_import.ready': 'Tayyor',
    'purchase_import.error': 'Xato',
    'purchase_import.summary': 'Tayyor qatorlar: {ready}; xatoli qatorlar: {error}.',
    'purchase_import.applied': 'Qatorlar kirim shakliga qo‘shildi. Rasmiylashtirishdan oldin hujjatni tekshiring.',
    'purchase_import.invalid_file': 'CSV faylini yuklang.',
    'purchase_import.file_too_large': 'Fayl hajmi 2 MB dan oshmasligi kerak.',
    'purchase_import.too_many_rows': 'Faylda 200 tadan ko‘p qator bo‘lmasligi kerak.',
    'purchase_import.empty_file': 'Faylda ma’lumot qatorlari yo‘q.',
    'purchase_import.invalid_csv': 'CSV formatini va kataklardagi qo‘shtirnoqlarni tekshiring.',
    'purchase_import.invalid_headers': 'CSV faylida «Artikul», «Miqdor» va «Xarid narxi, so‘m» majburiy ustunlari bo‘lishi kerak.',
    'purchase_import.sale_price_column_required': 'Narxlarni yangilash uchun faylda «Цена продажи, сум» ustuni bo‘lishi kerak.',
    'purchase_import.required_sale_price': 'Sotuv narxini kiriting.',
    'purchase_import.invalid_sale_price': 'Sotuv narxi manfiy bo‘lmasligi va so‘mda verguldan keyin ikki raqamgacha bo‘lishi kerak.',
    'purchase_import.invalid_category': 'Mavjud faol toifani tanlang.',
    'purchase_import.price_update_confirm': 'Kirim bilan birga {count} ta tovarning sotuv narxi yangilanadi. Davom etilsinmi?',
    'purchase_import.price_changed_since_preview': 'Tovarlardan birining narxi oldindan ko‘rishdan keyin o‘zgargan. Faylni qayta tekshiring.',
    'purchase_import.invalid_request': 'Import parametrlarini tekshiring.',
    'purchase_import.extra_columns': 'Ortiqcha ustunlar.',
    'purchase_import.required_sku': 'Artikulni kiriting.',
    'purchase_import.invalid_sku': 'Artikul 200 belgidan oshmasligi kerak.',
    'purchase_import.duplicate_sku': 'Artikul faylda takrorlangan.',
    'purchase_import.product_not_found': 'Bunday artikulli faol tovar topilmadi.',
    'purchase_import.product_inactive': 'Bu artikulli tovar faol emas.',
    'purchase_import.required_qty': 'Miqdorni kiriting.',
    'purchase_import.invalid_qty': 'Miqdor musbat va verguldan keyin 3 tagacha raqam bo‘lishi kerak.',
    'purchase_import.required_unit_cost': 'Xarid narxini kiriting.',
    'purchase_import.invalid_unit_cost': 'Narx manfiy bo‘lmasligi va so‘mda verguldan keyin ikki raqamgacha bo‘lishi kerak.',
    'purchase_import.duplicate_form_product': 'Bu tovar joriy kirim qatorlarida allaqachon bor.',
    'purchase_import.too_many_form_lines': 'Kirimda 200 tadan ortiq qator bo‘lishi mumkin emas.',
    'purchase_import.fix_errors_before_submit': 'Kirimni rasmiylashtirishdan oldin fayldagi xatolarni tuzating yoki boshqa fayl yuklang.',
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
    'purchase.invalid_product_price_updates': 'Sotuv narxlarini yangilash ro‘yxatini tekshiring.',
    'purchase.invalid_product_price_update': 'Sotuv narxini o‘zgartirish ma’lumotlarini tekshiring.',
    'purchase.product_price_changed': 'Tovar narxi oldindan ko‘rishdan keyin o‘zgardi; importni qaytadan tekshiring.',
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
    'validation.invalid_discount': 'Chegirma parametrlarini tekshiring.',
    'validation.invalid_payment_amount': 'Summani so‘mda tiyingacha aniqlik bilan kiriting.',
    'validation.invalid_payments': 'To‘lov usullari va summalarini tekshiring.',
    'validation.invalid_payment_method': 'Faol to‘lov usulini tanlang.',
    'validation.invalid_payment_method_id': 'Faol to‘lov usulini tanlang.',
    'validation.invalid_customer': 'Faol mijozni tanlang.',
    'validation.invalid_idempotency_key': 'Chekni takror yaratishdan himoyalab bo‘lmadi.',
    'validation.idempotency_unavailable': 'Brauzer xavfsiz so‘rov kalitini yarata olmaydi.',
    'debt.invalid_forgiveness_reason': '1000 belgigacha qarzni kechirish sababini kiriting.',
    'debt.invalid_forgiveness': 'Tanlangan chek va kechirish summalarini tekshiring.',
    'debt.balance_out_of_range': 'Qarz summasi ruxsat etilgan chegaradan katta.',
    'debt.customer_not_found': 'Mijoz topilmadi.',
    'debt.no_open_balance': 'Tanlangan chek bo‘yicha ochiq qarz yo‘q.',
    'debt.payment_exceeds_balance': 'To‘lov summasi ochiq qarzdan oshib ketdi.',
    'debt.idempotency_conflict': 'So‘rov kaliti boshqa amal uchun ishlatilgan.',
    'debt.forgive_exceeds_balance': 'Kechirish summasi chek qoldig‘idan oshib ketdi.',
    'debt.admin_required': 'Qarzni faqat administrator kechirishi mumkin.',
    'cash.invalid_amount': 'Tiyinlarda musbat summa kiriting.',
    'cash.invalid_operation': 'Kassa amalini tanlang.',
    'cash.invalid_category': 'Xarajat toifasini tekshiring.',
    'cash.category_required': 'Xarajat uchun toifani kiriting.',
    'cash.invalid_reason': '500 belgigacha sabab yoki maqsad kiriting.',
    'cash.invalid_reference': 'Tasdiqlovchi ma’lumot juda uzun.',
    'cash.invalid_date_range': 'Sanalar oralig‘ini tekshiring.',
    'cash.balance_out_of_range': 'Kassa qoldig‘i ruxsat etilgan chegaradan katta.',
    'cash.no_cash_method': 'Faol «naqd» to‘lov usuli yo‘q.',
    'cash.no_active_branch': 'Hujjat raqami uchun faol savdo nuqtasi yo‘q.',
    'cash.operation_not_found': 'Kassa amali topilmadi.',
    'cash.idempotency_conflict': 'So‘rov kaliti boshqa amal uchun ishlatilgan.',
    'cash.operation_already_reversed': 'Bu kassa amali allaqachon bekor qilingan.',
    'cash.reversal_of_reversal': 'Qarama-qarshi amalni bekor qilib bo‘lmaydi.',
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
    'users.pages': 'Sahifalarga kirish',
    'users.pages_help': 'Bu ruxsatlar operatsiya huquqlariga qo‘shimcha ravishda sahifalarga kirishni cheklaydi.',
    'users.sales_warehouses': 'Savdo omborlari',
    'users.sales_warehouses_help': 'Ro‘yxat bo‘sh bo‘lsa, umumiy standart ombor ishlatiladi.',
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
    'warehouses.title': 'Omborlar',
    'warehouses.name': 'Ombor nomi',
    'warehouses.create': 'Ombor yaratish',
    'warehouses.save': 'Saqlash',
    'warehouses.columns': 'Nomi,Holati,Amal',
    'warehouses.empty': 'Omborlar topilmadi.',
    'warehouses.edit': 'O‘zgartirish',
    'warehouses.activate': 'Faollashtirish',
    'warehouses.deactivate': 'Faolsizlantirish',
    'warehouses.activate_confirm': 'Ombor faollashtirilsinmi?',
    'warehouses.deactivate_confirm': 'Ombor faolsizlantirilsinmi? U tarixda qoladi, ammo yangi amallar uchun ishlatilmaydi.',
    'warehouses.branch_unavailable': 'Ombor yaratish uchun filial aniqlanmadi. Administratorga murojaat qiling.',
    'permission.sell': 'Sotish',
    'permission.pay_cash': 'Naqd pul',
    'permission.pay_card': 'Karta',
    'permission.pay_transfer': 'O‘tkazma',
    'permission.pay_at_counter': 'Kassada to‘lash',
    'users.sale_payment_permissions': 'Savdoda to‘lov usullari',
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
    'page.sales': 'Savdo',
    'page.heldCarts': 'Saqlangan savatchalar',
    'page.reservations': 'Rezervlar',
    'page.print': 'Chop etish',
    'page.returns': 'Qaytarishlar',
    'page.writeoffs': 'Hisobdan chiqarish',
    'page.stocktakes': 'Inventarizatsiya',
    'page.reports': 'Hisobotlar',
    'page.products': 'Tovarlar',
    'page.stock': 'Qoldiqlar',
    'page.warehouses': 'Omborlar',
    'page.purchases': 'Kirimlar',
    'page.movements': 'Harakatlar',
    'page.debts': 'Qarzlar',
    'page.cash': 'Kassa',
    'page.users': 'Foydalanuvchilar',
    'page.connection': 'Kompyuterlarni ulash',
    'auth.page_permission_denied': 'Bu sahifaga kirish ruxsati yo‘q.',
    'auth.warehouse_permission_denied': 'Bu ombordan savdo qilish taqiqlangan.',
    'auth.no_accessible_pages': 'Foydalanuvchi uchun hech bir sahifaga kirish sozlanmagan.',
    'validation.unknown_page': 'Noma’lum sahifa.',
    'validation.invalid_page_permissions': 'Sahifa ruxsatlari ro‘yxati noto‘g‘ri.',
    'validation.invalid_warehouses': 'Omborlar ro‘yxati noto‘g‘ri.',
    'permission.discount_check_limit_bp': 'Chek chegirmasi limiti (bazis punkt)',
    'permission.discount_manual_limit_bp': 'Qo‘lda chegirma limiti (bazis punkt)',
    'auth.invalid_credentials': 'Login yoki parol noto‘g‘ri.',
    'auth.required': 'Avval tizimga kiring.',
    'auth.session_expired': 'Seans tugadi. Qayta kiring.',
    'auth.session_replaced': 'Boshqa qurilmadan kirildi.',
    'auth.permission_denied': 'Huquqlar yetarli emas.',
    'auth.payment_method_permission_denied': 'Foydalanuvchiga bu to‘lov usuli taqiqlangan.',
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
const paymentPermissionKeys = ['pay_cash', 'pay_card', 'pay_transfer', 'pay_at_counter'];
const pagePermissionKeys = [
  'sales', 'heldCarts', 'reservations', 'print', 'returns', 'writeoffs', 'stocktakes', 'reports',
  'products', 'stock', 'warehouses', 'purchases', 'movements', 'debts', 'cash', 'users', 'connection',
];

const state = {
  lang: localStorage.getItem('kassa_lang') === 'uz' ? 'uz' : 'ru',
  user: null,
  selectedUser: null,
  salesContext: null,
  salesWarehouseId: '',
  salesCart: null,
  salesQuote: null,
  salesManualDiscounts: {},
  heldCarts: [],
  customers: [],
  heldCustomerChoices: {},
  salesHeldCartId: '',
  returnSale: null,
  returnQuote: null,
  selectedStocktakeId: '',
  stocktakeDetail: null,
  debtors: [],
  debtPaymentMethods: [],
  debtCustomerId: '',
  debtDetails: null,
  cashSummary: null,
  report: null,
  reportOptions: null,
  warehouses: [],
  productImportCsv: null,
  productImportReport: null,
  productImportMode: 'skip',
  productImportCommitted: false,
  productImportCreateCategories: false,
  productImportLang: 'ru',
  purchaseImportReport: null,
  purchaseImportApplied: false,
  purchaseImportCategories: [],
  activePage: 'products',
};
let movementOffset = 0;
let cashOffset = 0;
let inventoryProducts = [];
let inventoryWarehouses = [];
let sessionCheckInFlight = false;
let healthCheckInFlight = false;
let salesQuoteTimer = null;
let toastTimer = null;
let editingProductId = null;
let editingWarehouseId = null;
let saleAttemptId = null;
let returnAttemptId = null;
let debtPaymentAttempt = null;
let cashOperationAttempt = null;
const cashReversalAttemptIds = new Map();
const ADD_CUSTOMER_VALUE = '__add_customer__';
let customerSelectionTarget = null;
const pagePaths = {
  sales: '/sell',
  heldCarts: '/held-carts',
  reservations: '/reservations',
  print: '/print',
  returns: '/returns',
  writeoffs: '/writeoffs',
  stocktakes: '/stocktakes',
  reports: '/reports',
  products: '/products',
  stock: '/stock',
  purchases: '/purchases',
  movements: '/movements',
  debts: '/debts',
  cash: '/cash',
  users: '/users',
  warehouses: '/warehouses',
  connection: '/connection',
};
const pageByPath = Object.fromEntries(Object.entries(pagePaths).map(([name, path]) => [path, name]));
pageByPath['/sales'] = 'sales';
const $ = (selector) => document.querySelector(selector);
const t = (key) => {
  const direct = translations[state.lang][key];
  if (direct) return direct;
  if (key.startsWith('validation.')) return translations[state.lang]['validation.invalid_data'];
  if (key.startsWith('settings.')) return translations[state.lang]['settings.invalid_key_or_value'];
  return translations[state.lang]['server.internal_error'];
};
const successMessages = new Set([
  'status.created', 'status.saved', 'status.logged_out', 'held.created', 'held.reserved', 'held.reserve_success',
  'held.counter_payment_reserved',
  'returns.created', 'writeoff.created', 'backup.created',
  'debts.payment_success', 'debts.forgive_success', 'cash.operation_created',
  'cash.operation_reversed', 'print.profile_saved', 'connection.copy_done', 'status.server_updated',
]);
function message(key, kind) {
  $('#message').textContent = key ? t(key) : '';
  const region = $('#toast-region');
  if (!key || key === 'status.loading') {
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = null;
    region.replaceChildren();
    return;
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.dataset.kind = kind ?? (successMessages.has(key) ? 'success' : 'error');
  toast.setAttribute('role', toast.dataset.kind === 'error' ? 'alert' : 'status');
  const text = document.createElement('p');
  text.className = 'toast-message';
  text.textContent = t(key);
  const close = document.createElement('button');
  close.className = 'toast-close';
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', t('common.dismiss'));
  close.addEventListener('click', () => {
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = null;
    toast.remove();
  });
  toast.append(text, close);
  region.replaceChildren(toast);
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.remove();
    toastTimer = null;
  }, 5000);
}

function setServerAvailability(available) {
  const indicator = $('#server-indicator');
  const stateName = available ? 'online' : 'offline';
  indicator.dataset.state = stateName;
  $('#server-indicator-label').textContent = t(`server.${stateName}`);
}

function localize() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
  $('#product-import-template').href =
    `/api/products/import/template?lang=${encodeURIComponent(state.lang)}`;
  $('#purchase-import-template').href = '/api/purchases/import/template';
  setPurchaseImportCategoryOptions();
  document.title = state.user
    ? `${document.querySelector(`#${state.activePage}-page h2`)?.textContent ?? t('app.title')} · ${t('app.title')}`
    : t('app.title');
  $('#language').value = state.lang;
  const serverState = $('#server-indicator').dataset.state;
  if (serverState === 'online' || serverState === 'offline') setServerAvailability(serverState === 'online');
}

function setCustomerOptions(select, selectedValue = '', required = false) {
  const options = [makeOption(ADD_CUSTOMER_VALUE, t('customers.add'))];
  options.push(makeOption('', required ? t('status.select_option') : t('sales.no_customer')));
  for (const customer of state.customers) options.push(makeOption(customer.id, customer.name));
  select.replaceChildren(...options);
  select.value = options.some((option) => option.value === selectedValue) ? selectedValue : '';
  select.dataset.selectedCustomer = select.value === ADD_CUSTOMER_VALUE ? '' : select.value;
}

function renderSalesCustomers() {
  const select = $('#sales-customer');
  if (!select) return;
  const selected = select.value;
  setCustomerOptions(select, selected);
}

function renderHeldCartsPage() {
  const container = $('#held-carts-list');
  if (!container) return;
  if (state.heldCarts.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = t('held.no_carts');
    container.replaceChildren(empty);
    return;
  }
  const cards = state.heldCarts.map((cart) => {
    const card = document.createElement('article');
    card.className = 'held-cart-card';
    const heading = document.createElement('h3');
    heading.textContent = `${cart.customerName ?? t('sales.no_customer')} — ${formatDateTime(cart.createdAt)}`;
    card.append(heading);
    const lines = document.createElement('ul');
    for (const line of cart.lines) {
      const item = document.createElement('li');
      item.textContent = `${line.sku} — ${line.name}: ${formatQuantity(line.qty)} ${line.unit}`;
      lines.append(item);
    }
    card.append(lines);
    const customerLabel = document.createElement('label');
    const customerCaption = document.createElement('span');
    customerCaption.textContent = t('sales.customer');
    const customer = document.createElement('select');
    customer.dataset.heldCustomer = cart.id;
    setCustomerOptions(customer, state.heldCustomerChoices[cart.id] ?? cart.customerId ?? '', true);
    state.heldCustomerChoices[cart.id] = customer.value;
    customerLabel.append(customerCaption, customer);
    card.append(customerLabel);
    const actions = document.createElement('div');
    actions.className = 'held-cart-actions';
    if (state.user?.permissions.sell === 1 &&
        (state.user.permissions.hold_cart === 1 ||
          (state.user.permissions.pay_at_counter === 1 && cart.reservations.length > 0))) {
      const sell = document.createElement('button');
      sell.type = 'button';
      sell.dataset.heldSell = cart.id;
      sell.textContent = t('held.sell');
      actions.append(sell);
    }
    if (state.user?.permissions.reserve_cart === 1) {
      const reserve = document.createElement('button');
      reserve.type = 'button';
      reserve.dataset.heldReserve = cart.id;
      reserve.textContent = cart.reservations.length > 0
        ? t('held.already_reserved')
        : t('held.reserve');
      reserve.disabled = cart.reservations.length > 0;
      actions.append(reserve);
    }
    card.append(actions);
    return card;
  });
  container.replaceChildren(...cards);
}

function renderReservations(reservations) {
  buildHead('#reservations-head', 'reservations.columns');
  const body = $('#reservations-body');
  body.replaceChildren();
  if (reservations.length === 0) {
    const row = document.createElement('tr');
    const empty = cell(t('reservations.none'));
    empty.colSpan = 7;
    row.append(empty);
    body.append(row);
    return;
  }
  for (const reservation of reservations) {
    const row = document.createElement('tr');
    row.append(
      cell(reservation.customerName ?? t('sales.no_customer')),
      cell(`${reservation.sku} — ${reservation.name} (${reservation.unit})`),
      cell(formatQuantity(reservation.qty)),
      cell(reservation.warehouseName),
      cell(reservation.cartId),
      cell(formatDateTime(reservation.createdAt)),
      cell(reservation.expiresAt ? formatDateTime(reservation.expiresAt) : '—'),
    );
    body.append(row);
  }
}

function beginAddCustomer(select) {
  customerSelectionTarget = {
    selectId: select.id || '',
    heldCartId: select.dataset.heldCustomer || '',
  };
  select.value = select.dataset.selectedCustomer ?? '';
  $('#customer-form').reset();
  $('#customer-dialog').showModal();
  $('#customer-form [name="name"]').focus();
}

async function saveNewCustomer(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const button = $('#customer-form button[type="submit"]');
  button.disabled = true;
  try {
    const { row } = await api('/api/sales/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: String(form.get('name') ?? '').trim(),
        phone: String(form.get('phone') ?? '').trim() || null,
        note: String(form.get('note') ?? '').trim() || null,
      }),
    });
    state.customers.push({ id: row.id, name: row.name });
    if (state.salesContext) state.salesContext.customers = state.customers;
    $('#customer-dialog').close();
    if (customerSelectionTarget?.selectId === 'sales-customer') {
      renderSalesCustomers();
      $('#sales-customer').value = row.id;
      $('#sales-customer').dataset.selectedCustomer = row.id;
      scheduleSalesQuote();
    }
    if (customerSelectionTarget?.heldCartId) {
      state.heldCustomerChoices[customerSelectionTarget.heldCartId] = row.id;
    }
    customerSelectionTarget = null;
    renderHeldCartsPage();
    message('status.created');
  } catch (error) {
    message(error.message);
  } finally {
    button.disabled = false;
  }
}

async function loadHeldCartsPage() {
  try {
    const [{ carts }, { rows: customers }] = await Promise.all([
      api('/api/held-carts'),
      api('/api/references/customers'),
    ]);
    state.customers = customers.map((customer) => ({ id: customer.id, name: customer.name }));
    state.heldCarts = carts;
    renderHeldCartsPage();
  } catch (error) {
    message(error.message);
  }
}

async function loadReservationsPage() {
  try {
    const { reservations } = await api('/api/reservations');
    renderReservations(reservations);
  } catch (error) {
    message(error.message);
  }
}

function sellHeldCart(cartId) {
  state.salesHeldCartId = cartId;
  showPage('sales');
}

async function reserveHeldCartFromPage(cartId) {
  try {
    const customerId = state.heldCustomerChoices[cartId];
    if (!customerId) throw new Error('held.customer_required');
    const warehouseId = state.salesContext?.warehouse?.id;
    await api(`/api/held-carts/${encodeURIComponent(cartId)}/reserve`, {
      method: 'POST',
      body: JSON.stringify({ ...(warehouseId ? { warehouseId } : {}), customerId }),
    });
    message('held.reserve_success');
    await loadHeldCartsPage();
    await loadReservationsPage();
  } catch (error) {
    message(error.message);
  }
}

async function api(path, options = {}) {
  const method = (options.method ?? 'GET').toUpperCase();
  let response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    });
  } catch {
    setServerAvailability(false);
    throw new Error('server.unavailable');
  }
  setServerAvailability(true);
  if (response.status === 204) {
    if (method !== 'GET') message('status.server_updated', 'success');
    return null;
  }
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) showLogin(data.errorKey);
    throw new Error(data.errorKey ?? 'server.internal_error');
  }
  if (method !== 'GET') message('status.server_updated', 'success');
  return data;
}

function showLogin(errorKey = '') {
  setNavigationExpanded(false);
  resetWarehouseForm();
  state.warehouses = [];
  resetProductImportPreview();
  state.user = null;
  state.salesContext = null;
  state.salesCart = null;
  state.salesQuote = null;
  state.salesManualDiscounts = {};
  state.heldCarts = [];
  state.customers = [];
  state.heldCustomerChoices = {};
  state.salesHeldCartId = '';
  state.debtors = [];
  state.debtPaymentMethods = [];
  state.debtCustomerId = '';
  state.debtDetails = null;
  state.cashSummary = null;
  state.report = null;
  state.reportOptions = null;
  saleAttemptId = null;
  debtPaymentAttempt = null;
  cashOperationAttempt = null;
  cashReversalAttemptIds.clear();
  $('#login-view').hidden = false;
  $('#app-view').hidden = true;
  $('#permission-editor').hidden = true;
  $('#user-edit-form').hidden = true;
  state.salesWarehouseId = '';
  state.salesContext = null;
  message(errorKey);
}

function showApp(user) {
  setNavigationExpanded(false);
  state.user = user;
  state.lang = user.lang;
  localStorage.setItem('kassa_lang', state.lang);
  localize();
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  $('#current-user').textContent = `${user.fullName} (${user.login})`;
  document.querySelectorAll('#navigation [data-page]').forEach((link) => {
    link.hidden = !canAccessPage(link.dataset.page);
  });
  $('#sales-held-carts-link').hidden =
    !canAccessPage('heldCarts');
  $('#sales-reservations-link').hidden = !canAccessPage('reservations');
  $('#backup-controls').hidden = user.role !== 'admin';
  const canViewDebts = ['debt_payment', 'reports']
    .some((permission) => user.permissions[permission] === 1);
  const canViewCash = ['cash_in', 'cash_out', 'expense', 'cash_collection', 'reports']
    .some((permission) => user.permissions[permission] === 1);
  $('#product-form').hidden = user.permissions.settings !== 1 || user.permissions.price_edit !== 1;
  $('#product-import-panel').hidden = user.permissions.settings !== 1 || user.permissions.price_edit !== 1;
  if (!$('#product-form').hidden && canAccessPage('products')) void loadProductUnits();
  $('#purchase-form').hidden = user.permissions.purchase !== 1;
  $('#purchase-import-panel').hidden = user.permissions.purchase !== 1;
  $('#purchase-import-update-price-field').hidden = user.permissions.price_edit !== 1;
  $('#sales-hold-cart').hidden = user.permissions.hold_cart !== 1;
  $('#sales-reserve-cart').hidden =
    user.permissions.reserve_cart !== 1 || user.permissions.hold_cart !== 1;
  $('#sales-pay-at-counter').hidden =
    user.permissions.pay_at_counter !== 1 || !canAccessPage('heldCarts');
  $('#writeoff-form').hidden = user.permissions.write_off !== 1;
  $('#stocktake-start-form').hidden = user.permissions.stocktake !== 1;
  $('#debt-payment-form').hidden = user.permissions.debt_payment !== 1;
  $('#debt-forgiveness-form').hidden = user.role !== 'admin';
  $('#cash-operation-form').hidden = ![
    user.permissions.cash_in,
    user.permissions.cash_out,
    user.permissions.expense,
    user.permissions.cash_collection,
  ].some((value) => value === 1);
  updateCashOperationTypes();
  $('#user-form').hidden = user.permissions.users_manage !== 1;
  $('#warehouse-form').hidden = user.permissions.settings !== 1;
  $('#print-profile-form').hidden = user.permissions.settings !== 1;
  $('#print-copy-language').value = user.lang;
  $('#user-edit-form').hidden = true;
  $('#permission-editor').hidden = true;
  showPage(pageByPath[window.location.pathname] ?? 'products');
  if (['products', 'sales', 'stock', 'purchases', 'movements', 'returns', 'writeoffs', 'stocktakes', 'reports']
    .some((page) => canAccessPage(page))) void loadInventoryOptions();
  if (canAccessPage('products')) void loadProducts();
  if (canAccessPage('sales')) void loadSalesPage();
  if (canViewDebts && canAccessPage('debts')) void loadDebts();
  if (canViewCash && canAccessPage('cash')) void loadCashPage();
  if (user.permissions.reports === 1 && canAccessPage('reports')) void loadReportOptions();
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

async function checkServerHealth() {
  if (healthCheckInFlight) return;
  healthCheckInFlight = true;
  try {
    const response = await fetch('/api/health', { cache: 'no-store', credentials: 'same-origin' });
    setServerAvailability(response.ok);
  } catch {
    setServerAvailability(false);
  } finally {
    healthCheckInFlight = false;
  }
}

function canAccessPage(name) {
  if (!state.user) return false;
  if (state.user.pagePermissions?.[name] !== 1) return false;
  const permissionMap = {
    sales: 'sell',
    heldCarts: ['hold_cart', 'reserve_cart', 'pay_at_counter'],
    reservations: 'reserve_cart',
    print: ['sell', 'return'],
    returns: 'return',
    writeoffs: 'write_off',
    stocktakes: 'stocktake',
    reports: 'reports',
    debts: ['debt_payment', 'reports'],
    cash: ['cash_in', 'cash_out', 'expense', 'cash_collection', 'reports'],
    users: 'users_manage',
    warehouses: 'settings',
    connection: 'admin',
  };
  const required = permissionMap[name];
  if (!required) return Boolean(pagePaths[name]);
  if (required === 'admin') return state.user.role === 'admin';
  return (Array.isArray(required) ? required : [required])
    .some((permission) => state.user.permissions[permission] === 1);
}

function setNavigationExpanded(expanded) {
  $('#navigation-toggle').setAttribute('aria-expanded', String(expanded));
  $('#navigation-menu').hidden = !expanded;
  $('#app-view').classList.toggle('navigation-expanded', expanded);
}

function showPage(name, updateHistory = true) {
  if (!pagePaths[name] || !canAccessPage(name)) {
    name = Object.keys(pagePaths).find((page) => canAccessPage(page)) ?? 'products';
    if (!canAccessPage(name)) {
      document.querySelectorAll('.page').forEach((page) => { page.hidden = true; });
      message('auth.no_accessible_pages');
      return;
    }
  }
  state.activePage = name;
  document.querySelectorAll('.page').forEach((page) => { page.hidden = page.id !== `${name}-page`; });
  document.querySelectorAll('#navigation [data-page]').forEach((link) => {
    if (link.dataset.page === name) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (window.location.pathname !== pagePaths[name]) {
    if (updateHistory) window.history.pushState({ page: name }, '', pagePaths[name]);
    else window.history.replaceState({ page: name }, '', pagePaths[name]);
  }
  const pageTitle = document.querySelector(`#${name}-page h2`)?.textContent;
  document.title = pageTitle ? `${pageTitle} · ${t('app.title')}` : t('app.title');
  if (name === 'users' && state.user?.permissions.users_manage === 1) void loadUsers();
  if (name === 'warehouses' && state.user?.permissions.settings === 1) void loadWarehouses();
  if (name === 'sales' && state.user?.permissions.sell === 1) void loadSalesPage();
  if (name === 'heldCarts' &&
      (state.user?.permissions.hold_cart === 1 || state.user?.permissions.reserve_cart === 1 ||
        state.user?.permissions.pay_at_counter === 1)) {
    void loadHeldCartsPage();
  }
  if (name === 'reservations' && state.user?.permissions.reserve_cart === 1) {
    void loadReservationsPage();
  }
  if (name === 'debts') void loadDebts();
  if (name === 'cash') void loadCashPage();
  if (name === 'stock') void loadStock();
  if (name === 'purchases') void loadPurchases();
  if (name === 'movements') void loadMovementHistory();
  if (name === 'connection' && state.user?.role === 'admin') void loadConnectionInfo();
  if (name === 'print' &&
      (state.user?.permissions.sell === 1 || state.user?.permissions.return === 1)) {
    void loadPrintJobs();
    if (state.user.permissions.settings === 1) void loadPrintProfile();
  }
  if (name === 'returns' && state.user?.permissions.return === 1) void loadReturnMethods();
  if (name === 'writeoffs' && state.user?.permissions.write_off === 1) void loadWriteOffs();
  if (name === 'stocktakes' && state.user?.permissions.stocktake === 1) void loadStocktakes();
  if (name === 'reports' && state.user?.permissions.reports === 1) {
    void loadReports();
    if (state.user.role === 'admin') void loadBackupStatus();
  }
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
        cell(product.unit), cell(formatMoney(product.base_price)),
        cell(product.active ? t('users.active') : t('users.inactive')));
      const actions = document.createElement('td');
      if (state.user?.permissions.price_edit === 1) {
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.dataset.editProductPrice = product.id;
        edit.dataset.basePrice = String(product.base_price);
        edit.textContent = t('products.edit_price');
        edit.setAttribute('aria-label', `${t('products.edit_price')}: ${product.sku}`);
        actions.append(edit);
      }
      row.append(actions);
      body.append(row);
    }
    if (rows.length === 0) {
      const empty = document.createElement('tr');
      const note = cell(t('products.empty'));
      note.colSpan = 6;
      empty.append(note);
      body.append(empty);
    }
  } catch (error) {
    message(error.message);
  }
}

function productImportSummary(key, counts, total) {
  return t(key)
    .replace('{total}', String(total))
    .replace('{create}', String(counts.create))
    .replace('{update}', String(counts.update))
    .replace('{skip}', String(counts.skip))
    .replace('{error}', String(counts.error));
}

function renderProductImportReport(report, preview) {
  state.productImportReport = report;
  state.productImportCommitted = !preview;
  $('#product-import-preview').hidden = false;
  buildHead('#product-import-head', 'product_import.columns');
  const body = $('#product-import-body');
  body.replaceChildren();
  for (const result of report.rows) {
    const row = document.createElement('tr');
    row.append(
      cell(result.line),
      cell(result.sku),
      cell(t(`product_import.action.${result.action}`)),
      cell(result.errors.map((error) => t(error)).join('; ')),
    );
    body.append(row);
  }
  $('#product-import-summary').textContent =
    productImportSummary('product_import.summary', report.counts, report.rows.length);
  const categoryMessage = $('#product-import-categories');
  categoryMessage.hidden = report.categoriesToCreate.length === 0;
  categoryMessage.textContent = report.categoriesToCreate.length === 0
    ? ''
    : t(preview ? 'product_import.categories_to_create' : 'product_import.categories_created')
      .replace('{categories}', report.categoriesToCreate.join(', '));
  $('#product-import-outcome').textContent = preview
    ? ''
    : productImportSummary('product_import.outcome', report.counts, report.rows.length);
  $('#product-import-commit').disabled =
    !preview || report.counts.create + report.counts.update === 0;
  $('#product-import-download').hidden = preview;
}

function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadProductImportReport() {
  if (!state.productImportReport) return;
  const lines = [
    t('product_import.columns').split(',').map(csvCell).join(','),
    ...state.productImportReport.rows.map((row) => [
      row.line,
      csvCell(row.sku),
      csvCell(t(`product_import.action.${row.action}`)),
      csvCell(row.errors.map((error) => t(error)).join('; ')),
    ].join(',')),
  ];
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'product-import-report.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function resetProductImportPreview() {
  state.productImportCsv = null;
  state.productImportReport = null;
  state.productImportCommitted = false;
  $('#product-import-preview').hidden = true;
  $('#product-import-outcome').textContent = '';
  $('#product-import-categories').hidden = true;
  $('#product-import-categories').textContent = '';
  $('#product-import-commit').disabled = true;
  $('#product-import-download').hidden = true;
}

async function previewProductImport(event) {
  event.preventDefault();
  try {
    const file = $('#product-import-file').files[0];
    if (!file) throw new Error('product_import.invalid_file');
    if (file.size > 2 * 1024 * 1024) throw new Error('product_import.file_too_large');
    let csv;
    try {
      csv = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
    } catch {
      throw new Error('product_import.invalid_csv');
    }
    state.productImportCsv = csv;
    state.productImportMode = $('#product-import-mode').value;
    state.productImportCreateCategories = $('#product-import-create-categories').checked;
    state.productImportLang = state.lang;
    const report = await api('/api/products/import/preview', {
      method: 'POST',
      body: JSON.stringify({
        csv,
        mode: state.productImportMode,
        lang: state.productImportLang,
        createMissingCategories: state.productImportCreateCategories,
      }),
    });
    renderProductImportReport(report, true);
  } catch (error) {
    message(error.message, 'error');
  }
}

async function commitProductImport() {
  if (state.productImportCsv === null || !state.productImportReport) return;
  const button = $('#product-import-commit');
  button.disabled = true;
  try {
    const report = await api('/api/products/import/commit', {
      method: 'POST',
      body: JSON.stringify({
        csv: state.productImportCsv,
        mode: state.productImportMode,
        lang: state.productImportLang,
        createMissingCategories: state.productImportCreateCategories,
      }),
    });
    renderProductImportReport(report, false);
    await loadProducts();
  } catch (error) {
    message(error.message, 'error');
    const counts = state.productImportReport?.counts;
    button.disabled = !counts || counts.create + counts.update === 0;
  }
}

function openPriceDialog(productId) {
  const edit = [...$('#products-body').querySelectorAll('[data-edit-product-price]')]
    .find((button) => button.dataset.editProductPrice === productId);
  const product = edit?.closest('tr');
  if (!product || !edit) return;
  editingProductId = productId;
  $('#price-product-name').textContent = product.cells[0].textContent + ' — ' + product.cells[1].textContent;
  $('#price-value').value = edit.dataset.basePrice;
  $('#price-dialog').showModal();
  $('#price-value').focus();
  $('#price-value').select();
}

async function saveProductPrice(event) {
  event.preventDefault();
  if (!editingProductId) return;
  const saveButton = $('#price-form button[type="submit"]');
  saveButton.disabled = true;
  try {
    await api(`/api/references/products/${encodeURIComponent(editingProductId)}/price`, {
      method: 'PATCH',
      body: JSON.stringify({ base_price: Number($('#price-value').value) }),
    });
    $('#price-dialog').close();
    editingProductId = null;
    await loadProducts();
    message('status.saved', 'success');
  } catch (error) {
    message(error.message, 'error');
  } finally {
    saveButton.disabled = false;
  }
}

async function createHeldCart() {
  try {
    const customerId = $('#sales-customer').value;
    await api('/api/held-carts', {
      method: 'POST',
      body: JSON.stringify({ customerId: customerId || null }),
    });
    state.salesHeldCartId = '';
    message('held.created');
    showPage('heldCarts');
  } catch (error) {
    message(error.message);
  }
}

async function reserveSalesCart() {
  try {
    const customerId = $('#sales-customer').value;
    if (!customerId) throw new Error('held.customer_required');
    const warehouseId = state.salesContext?.warehouse?.id;
    if (!warehouseId) throw new Error('settings.default_warehouse_required');
    if (state.salesHeldCartId) {
      await api(`/api/held-carts/${encodeURIComponent(state.salesHeldCartId)}/reserve`, {
        method: 'POST',
        body: JSON.stringify({ warehouseId, customerId }),
      });
    } else {
      await api('/api/held-carts/reserve-active', {
        method: 'POST',
        body: JSON.stringify({ warehouseId, customerId }),
      });
    }
    state.salesHeldCartId = '';
    message('held.reserve_success');
    showPage('reservations');
  } catch (error) {
    message(error.message);
  }
}

async function reserveForCounterPayment() {
  const button = $('#sales-pay-at-counter');
  button.disabled = true;
  try {
    const customerId = $('#sales-customer').value;
    if (!customerId) throw new Error('held.customer_required');
    const warehouseId = state.salesContext?.warehouse?.id;
    if (!warehouseId) throw new Error('settings.default_warehouse_required');
    await api('/api/sales/pay-at-counter', {
      method: 'POST',
      body: JSON.stringify({
        customerId,
        warehouseId,
        ...(state.salesHeldCartId ? { heldCartId: state.salesHeldCartId } : {}),
      }),
    });
    $('#sales-payment-dialog').close();
    state.salesHeldCartId = '';
    state.salesManualDiscounts = {};
    $('#sales-check-discount-value').value = '';
    $('#sales-customer').value = '';
    message('held.counter_payment_reserved');
    showPage('heldCarts');
  } catch (error) {
    message(error.message);
  } finally {
    button.disabled = false;
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

async function loadReturnMethods() {
  try {
    const { rows } = await api('/api/references/payment_methods');
    const select = $('#return-payment-method');
    const previous = select.value;
    const options = [makeOption('', t('status.select_option'))];
    for (const method of rows) {
      options.push(makeOption(method.id, state.lang === 'uz' ? method.name_uz || method.name_ru : method.name_ru));
    }
    select.replaceChildren(...options);
    if (options.some((option) => option.value === previous)) select.value = previous;
  } catch (error) {
    message(error.message);
  }
}

async function searchReturnSale(event) {
  event.preventDefault();
  state.returnSale = null;
  state.returnQuote = null;
  $('#return-form').hidden = true;
  try {
    const query = $('#return-search').value.trim();
    const { sales } = await api(`/api/returns/search?q=${encodeURIComponent(query)}`);
    const results = $('#return-search-results');
    results.replaceChildren();
    for (const sale of sales) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${sale.number} — ${sale.customer} — ${formatMoney(sale.total)}`;
      button.addEventListener('click', () => { void selectReturnSale(sale); });
      results.append(button);
    }
    if (sales.length === 0) results.textContent = t('returns.no_sales');
  } catch (error) {
    message(error.message);
  }
}

async function selectReturnSale(sale) {
  state.returnSale = sale;
  state.returnQuote = null;
  $('#return-sale-title').textContent = `${sale.number} — ${sale.customer}`;
  const container = $('#return-lines');
  container.replaceChildren();
  for (const line of sale.lines) {
    const row = document.createElement('div');
    row.className = 'purchase-line';
    const title = document.createElement('span');
    title.textContent = `${line.sku} — ${line.name}`;
    const sold = document.createElement('span');
    sold.textContent = `${t('returns.sold')}: ${formatQuantity(line.qty)}`;
    const returned = document.createElement('span');
    returned.textContent = `${t('returns.returned')}: ${formatQuantity(line.returnedQty)}`;
    const qty = document.createElement('input');
    qty.type = 'text';
    qty.inputMode = 'decimal';
    qty.maxLength = 16;
    qty.placeholder = t('returns.qty');
    qty.dataset.returnLine = line.id;
    qty.dataset.maxQty = String(line.qty - line.returnedQty);
    qty.disabled = line.qty <= line.returnedQty;
    qty.addEventListener('change', () => { void refreshReturnQuote(); });
    row.append(title, sold, returned, qty);
    container.append(row);
  }
  $('#return-form').hidden = false;
  $('#return-reason').value = '';
  $('#return-quote').textContent = '';
}

async function refreshReturnQuote() {
  if (!state.returnSale) return;
  const lines = [...document.querySelectorAll('#return-lines [data-return-line]')]
    .filter((input) => input.value.trim() && input.value.trim() !== '0')
    .map((input) => ({ saleLineId: input.dataset.returnLine, qty: input.value.trim() }));
  if (lines.length === 0) {
    state.returnQuote = null;
    $('#return-quote').textContent = '';
    return;
  }
  try {
    const { quote } = await api('/api/returns/quote', {
      method: 'POST',
      body: JSON.stringify({ saleId: state.returnSale.id, lines }),
    });
    state.returnQuote = quote;
    $('#return-quote').textContent = t('returns.quote')
      .replace('{total}', formatMoney(quote.totalRefund))
      .replace('{debt}', formatMoney(quote.debtOffset))
      .replace('{payout}', formatMoney(quote.payout));
    $('#return-payment-method').required = quote.payout > 0;
  } catch (error) {
    state.returnQuote = null;
    $('#return-quote').textContent = t(error.message);
  }
}

async function submitReturn(event) {
  event.preventDefault();
  if (!state.returnSale || !state.returnQuote) {
    message('return.invalid_lines');
    return;
  }
  const lines = [...document.querySelectorAll('#return-lines [data-return-line]')]
    .filter((input) => input.value.trim() && input.value.trim() !== '0')
    .map((input) => ({ saleLineId: input.dataset.returnLine, qty: input.value.trim() }));
  const payments = state.returnQuote.payout > 0
    ? [{ methodId: $('#return-payment-method').value, amount: state.returnQuote.payout }]
    : [];
  try {
    if (!returnAttemptId) returnAttemptId = createRequestId();
    const result = await api('/api/returns', {
      method: 'POST',
      body: JSON.stringify({
        saleId: state.returnSale.id,
        reason: $('#return-reason').value,
        lines,
        payments,
        idempotencyKey: returnAttemptId,
      }),
    });
    returnAttemptId = null;
    state.returnSale = null;
    state.returnQuote = null;
    $('#return-form').reset();
    $('#return-form').hidden = true;
    $('#return-search-results').replaceChildren();
    message('returns.created');
    await Promise.all([loadStock(), loadPrintJobs()]);
  } catch (error) {
    message(error.message);
  }
}

async function loadWriteOffs() {
  try {
    const { writeoffs } = await api('/api/writeoffs');
    buildHead('#writeoffs-head', 'writeoff.columns');
    const body = $('#writeoffs-body');
    body.replaceChildren();
    for (const item of writeoffs) {
      const row = document.createElement('tr');
      row.append(
        cell(formatDateTime(item.createdAt)),
        cell(item.number),
        cell(item.warehouseName),
        cell(t(`writeoff.${item.reason}`)),
        cell(`${item.sku} — ${item.productName}`),
        cell(formatQuantity(item.qty)),
        cell(formatMoney(item.costTotal)),
      );
      body.append(row);
    }
  } catch (error) {
    message(error.message);
  }
}

async function submitWriteOff(event) {
  event.preventDefault();
  const productId = $('#writeoff-product').value;
  const warehouseId = $('#writeoff-warehouse').value;
  try {
    await api('/api/writeoffs', {
      method: 'POST',
      body: JSON.stringify({
        warehouseId,
        reason: $('#writeoff-reason').value,
        note: $('#writeoff-note').value,
        lines: [{ productId, qty: $('#writeoff-qty').value }],
      }),
    });
    $('#writeoff-form').reset();
    message('writeoff.created');
    await Promise.all([loadWriteOffs(), loadStock()]);
  } catch (error) {
    message(error.message);
  }
}

async function loadStocktakes() {
  try {
    const { stocktakes } = await api('/api/stocktakes');
    const container = $('#stocktake-list');
    container.replaceChildren();
    for (const item of stocktakes) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${item.number} — ${item.warehouseName} — ${t(`stocktake.${item.status}`)} — ${formatDateTime(item.startedAt)}`;
      button.addEventListener('click', () => { void openStocktake(item.id); });
      container.append(button);
    }
    const active = stocktakes.find((item) => item.status === 'active');
    if (active && state.selectedStocktakeId !== active.id) await openStocktake(active.id);
    if (!active && state.selectedStocktakeId) {
      state.selectedStocktakeId = '';
      state.stocktakeDetail = null;
      $('#stocktake-detail').hidden = true;
    }
  } catch (error) {
    message(error.message);
  }
}

async function openStocktake(id) {
  try {
    const [detail, reservationResult] = await Promise.all([
      api(`/api/stocktakes/${encodeURIComponent(id)}`),
      state.user?.permissions.reserve_cart === 1
        ? api(`/api/stocktakes/${encodeURIComponent(id)}/reservations`)
        : Promise.resolve({ reservations: [] }),
    ]);
    state.selectedStocktakeId = id;
    state.stocktakeDetail = detail;
    renderStocktakeDetail(reservationResult.reservations);
  } catch (error) {
    message(error.message);
  }
}

function renderStocktakeDetail(reservations) {
  const detail = state.stocktakeDetail;
  if (!detail) return;
  const { stocktake, lines } = detail;
  const active = stocktake.status === 'active';
  $('#stocktake-detail').hidden = false;
  $('#stocktake-detail-title').textContent = `${stocktake.number} — ${stocktake.warehouseName}`;
  const hasDeficit = lines.some((line) => line.reserveDeficit > 0);
  $('#stocktake-reserve-warning').textContent = hasDeficit ? t('stocktake.reserve_deficit') : t('stocktake.no_reserve_deficit');
  $('#stocktake-save').hidden = !active;
  $('#stocktake-complete').hidden = !active;
  $('#stocktake-cancel').hidden = !active;
  const container = $('#stocktake-lines');
  container.replaceChildren();
  for (const line of lines) {
    const row = document.createElement('div');
    row.className = 'purchase-line';
    const title = document.createElement('span');
    title.textContent = `${line.sku} — ${line.name}`;
    const system = document.createElement('span');
    system.textContent = formatQuantity(line.qtySystem);
    const count = document.createElement('input');
    count.type = 'number';
    count.min = '0';
    count.step = '0.001';
    count.dataset.stocktakeCount = line.productId;
    count.value = line.qtyCounted == null ? '' : (line.qtyCounted / 1000).toFixed(3);
    count.disabled = !active;
    const reserved = document.createElement('span');
    reserved.textContent = `${formatQuantity(line.reserved)}${line.reserveDeficit > 0 ? ` (${t('held.reserve_deficit')})` : ''}`;
    row.append(title, system, count, reserved);
    if (state.user?.role === 'admin' && active) {
      const cost = document.createElement('input');
      cost.type = 'number';
      cost.min = '0';
      cost.step = '1';
      cost.placeholder = t('stocktake.manual_cost');
      cost.dataset.stocktakeCost = line.productId;
      cost.value = line.manualUnitCost == null ? '' : String(line.manualUnitCost);
      row.append(cost);
    }
    container.append(row);
  }
  const reservationContainer = $('#stocktake-reservations');
  reservationContainer.replaceChildren();
  if (reservations.length > 0 && state.user?.permissions.reserve_cart === 1) {
    const heading = document.createElement('h4');
    heading.textContent = t('stocktake.reservations');
    reservationContainer.append(heading);
    for (const reservation of reservations) {
      const row = document.createElement('div');
      row.className = 'purchase-line';
      const title = document.createElement('span');
      title.textContent = `${reservation.sku} — ${reservation.productName}`;
      const qty = document.createElement('input');
      qty.type = 'number';
      qty.min = '0';
      qty.max = String(reservation.qty / 1000);
      qty.step = '0.001';
      qty.value = (reservation.qty / 1000).toFixed(3);
      const save = document.createElement('button');
      save.type = 'button';
      save.textContent = t('stocktake.reduce_reservation');
      save.disabled = !active;
      save.addEventListener('click', () => { void reduceReservation(reservation.id, qty.value); });
      row.append(title, qty, save);
      reservationContainer.append(row);
    }
  }
}

async function reduceReservation(id, qty) {
  try {
    await api(`/api/reservations/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ qty }),
    });
    await openStocktake(state.selectedStocktakeId);
    message('stocktake.reservation_reduced');
  } catch (error) {
    message(error.message);
  }
}

async function saveStocktakeCounts() {
  if (!state.selectedStocktakeId) return false;
  const lines = [...document.querySelectorAll('#stocktake-lines [data-stocktake-count]')]
    .filter((input) => input.value.trim() !== '')
    .map((input) => {
      const line = { productId: input.dataset.stocktakeCount, qtyCounted: input.value };
      const cost = document.querySelector(`#stocktake-lines [data-stocktake-cost="${CSS.escape(line.productId)}"]`);
      if (cost?.value.trim()) line.manualUnitCost = Number(cost.value);
      return line;
    });
  try {
    const detail = await api(`/api/stocktakes/${encodeURIComponent(state.selectedStocktakeId)}/counts`, {
      method: 'POST',
      body: JSON.stringify({ lines }),
    });
    state.stocktakeDetail = detail;
    return true;
  } catch (error) {
    message(error.message);
    return false;
  }
}

async function completeStocktake() {
  if (!await saveStocktakeCounts()) return;
  const hasDeficit = state.stocktakeDetail?.lines.some((line) => line.reserveDeficit > 0);
  if (!window.confirm(t(hasDeficit ? 'stocktake.complete_with_deficit_confirm' : 'stocktake.complete_confirm'))) return;
  try {
    await api(`/api/stocktakes/${encodeURIComponent(state.selectedStocktakeId)}/complete`, { method: 'POST', body: '{}' });
    await Promise.all([loadStocktakes(), loadStock()]);
    message('status.saved');
  } catch (error) {
    message(error.message);
  }
}

async function cancelStocktake() {
  const reason = window.prompt(t('stocktake.cancel_reason'));
  if (!reason?.trim()) return;
  try {
    await api(`/api/stocktakes/${encodeURIComponent(state.selectedStocktakeId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    await loadStocktakes();
    message('status.saved');
  } catch (error) {
    message(error.message);
  }
}

async function startStocktake(event) {
  event.preventDefault();
  const mode = $('#stocktake-mode').value;
  const productIds = mode === 'selected'
    ? [...$('#stocktake-products').selectedOptions].map((option) => option.value)
    : [];
  try {
    const { stocktake } = await api('/api/stocktakes', {
      method: 'POST',
      body: JSON.stringify({
        warehouseId: $('#stocktake-warehouse').value,
        mode,
        productIds,
        note: $('#stocktake-note').value,
      }),
    });
    state.selectedStocktakeId = stocktake.id;
    await loadStocktakes();
    message('status.created');
  } catch (error) {
    message(error.message);
  }
}

function renderDebtors() {
  buildHead('#debtors-head', 'debts.columns');
  const body = $('#debtors-body');
  body.replaceChildren();
  for (const debtor of state.debtors) {
    const row = document.createElement('tr');
    const customer = document.createElement('td');
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = debtor.customerName;
    open.addEventListener('click', () => { void selectDebtCustomer(debtor.customerId); });
    customer.append(open);
    row.append(customer, cell(formatMoney(debtor.balance)), cell(debtor.openSaleCount));
    body.append(row);
  }
  if (state.debtors.length === 0) {
    const row = document.createElement('tr');
    const empty = cell(t('debts.no_debtors'));
    empty.colSpan = 3;
    row.append(empty);
    body.append(row);
  }
}

function renderDebtSales() {
  buildHead('#debts-sales-head', 'debts.sales_columns');
  const body = $('#debts-sales-body');
  body.replaceChildren();
  const details = state.debtDetails;
  const selected = state.debtors.find((debtor) => debtor.customerId === state.debtCustomerId);
  const customerName = details?.customer.name ?? selected?.customerName;
  $('#debt-customer-balance').textContent = customerName
    ? `${customerName}: ${t('debts.balance')} ${formatMoney(details?.balance ?? 0)}`
    : '';
  $('#debt-payment-form').hidden =
    state.user?.permissions.debt_payment !== 1 || !details || details.balance <= 0;
  $('#debt-forgiveness-form').hidden = state.user?.role !== 'admin' || !details || details.sales.length === 0;

  if (!details || details.sales.length === 0) {
    const row = document.createElement('tr');
    const empty = cell(t('status.no_data'));
    empty.colSpan = 5;
    row.append(empty);
    body.append(row);
    return;
  }
  for (const sale of details.sales) {
    const row = document.createElement('tr');
    row.append(cell(sale.number), cell(formatDateTime(sale.createdAt)),
      cell(formatMoney(sale.total)), cell(formatMoney(sale.balance)));
    const forgiveness = document.createElement('td');
    if (state.user?.role === 'admin') {
      const amount = document.createElement('input');
      amount.type = 'text';
      amount.inputMode = 'decimal';
      amount.dataset.forgiveSale = sale.id;
      amount.setAttribute('aria-label', `${t('debts.forgive_amount')} ${sale.number}`);
      forgiveness.append(amount);
    }
    row.append(forgiveness);
    body.append(row);
  }
}

async function selectDebtCustomer(customerId) {
  state.debtCustomerId = customerId;
  $('#debt-customer-select').value = customerId;
  try {
    state.debtDetails = await api(`/api/debts/${encodeURIComponent(customerId)}`);
    renderDebtSales();
  } catch (error) {
    message(error.message);
  }
}

async function loadDebts() {
  try {
    const { debtors, paymentMethods } = await api('/api/debts');
    state.debtors = debtors;
    state.debtPaymentMethods = paymentMethods;
    renderDebtors();

    const customerSelect = $('#debt-customer-select');
    const previousCustomerId = state.debtCustomerId;
    const options = [makeOption('', t('debts.select_customer'))];
    for (const debtor of debtors) {
      options.push(makeOption(debtor.customerId, `${debtor.customerName} — ${formatMoney(debtor.balance)}`));
    }
    customerSelect.replaceChildren(...options);
    const selected = debtors.some((debtor) => debtor.customerId === previousCustomerId)
      ? previousCustomerId
      : (previousCustomerId ? '' : (debtors[0]?.customerId ?? ''));
    customerSelect.value = selected;

    const methodSelect = $('#debt-payment-method');
    const selectedMethod = methodSelect.value;
    methodSelect.replaceChildren(
      makeOption('', t('status.select_option')),
      ...paymentMethods.map((method) => makeOption(method.id, method.name)),
    );
    if (paymentMethods.some((method) => method.id === selectedMethod)) methodSelect.value = selectedMethod;
    if (selected) {
      await selectDebtCustomer(selected);
    } else {
      state.debtCustomerId = '';
      state.debtDetails = null;
      renderDebtSales();
    }
    return true;
  } catch (error) {
    message(error.message);
    return false;
  }
}

function cashOperationPermission(type) {
  const permission = {
    cash_in: 'cash_in',
    cash_out: 'cash_out',
    expense: 'expense',
    collection: 'cash_collection',
  }[type];
  return Boolean(permission && state.user?.permissions[permission] === 1);
}

function updateCashOperationTypes() {
  const select = $('#cash-operation-type');
  if (!select || !state.user) return;
  const options = [...select.options];
  for (const option of options) {
    option.hidden = !cashOperationPermission(option.value);
    option.disabled = option.hidden;
  }
  const permitted = options.find((option) => !option.disabled);
  if (select.selectedOptions[0]?.disabled) select.value = permitted?.value ?? '';
  const isExpense = select.value === 'expense';
  $('#cash-category-field').hidden = !isExpense;
  $('#cash-operation-category').required = isExpense;
}

function cashEntryType(entry) {
  if (entry.operationType) return t(`cash.type.${entry.operationType}`);
  return t(`cash.entry.${entry.docType}`);
}

function renderCashSummary() {
  const summary = state.cashSummary;
  if (!summary) return;
  $('#cash-balance').textContent = formatMoney(summary.balance);
  $('#cash-period-balance').textContent = formatMoney(summary.periodBalance);

  buildHead('#cash-noncash-head', 'cash.noncash_columns');
  const nonCashBody = $('#cash-noncash-body');
  nonCashBody.replaceChildren();
  for (const method of summary.nonCashPayments) {
    const row = document.createElement('tr');
    row.append(
      cell(method.methodName),
      cell(formatMoney(method.received)),
      cell(formatMoney(method.paid)),
      cell(formatMoney(method.net)),
    );
    nonCashBody.append(row);
  }
  if (summary.nonCashPayments.length === 0) {
    const row = document.createElement('tr');
    const empty = cell(t('status.no_data'));
    empty.colSpan = 4;
    row.append(empty);
    nonCashBody.append(row);
  }

  buildHead('#cash-entries-head', 'cash.columns');
  const entriesBody = $('#cash-entries-body');
  entriesBody.replaceChildren();
  for (const entry of summary.entries) {
    const row = document.createElement('tr');
    row.append(
      cell(formatDateTime(entry.createdAt)),
      cell(entry.documentNumber),
      cell(cashEntryType(entry)),
      cell(formatMoney(entry.amount)),
      cell(entry.userName),
      cell(entry.category),
      cell(entry.reason),
      cell(entry.reference),
    );
    const action = document.createElement('td');
    if (entry.operationId && !entry.reversesId && !entry.reversed &&
        cashOperationPermission(entry.operationType === 'cash_in' ? 'cash_out' : 'cash_in')) {
      const reverse = document.createElement('button');
      reverse.type = 'button';
      reverse.textContent = t('cash.reverse');
      reverse.addEventListener('click', () => { void reverseCashEntry(entry); });
      action.append(reverse);
    }
    row.append(action);
    entriesBody.append(row);
  }
  if (summary.entries.length === 0) {
    const row = document.createElement('tr');
    const empty = cell(t('cash.no_rows'));
    empty.colSpan = 9;
    row.append(empty);
    entriesBody.append(row);
  }
  $('#cash-previous').disabled = cashOffset === 0;
  $('#cash-next').disabled = !summary.hasMore;
}

async function loadCashPage() {
  try {
    const from = $('#cash-from');
    const to = $('#cash-to');
    if (!from.value && !to.value) {
      from.value = dateForInput();
      to.value = from.value;
    }
    const params = new URLSearchParams({ limit: '200', offset: String(cashOffset) });
    if (from.value) params.set('from', from.value);
    if (to.value) params.set('to', to.value);
    state.cashSummary = await api(`/api/cash?${params}`);
    renderCashSummary();
    return true;
  } catch (error) {
    message(error.message);
    return false;
  }
}

const reportTypes = [
  'sales_by_day', 'sales_by_product', 'sales_by_category', 'sales_by_cashier',
  'sales_by_payment_method', 'cashier_summary', 'profit_by_sale', 'profit_by_product',
  'profit_by_category', 'stock', 'low_stock', 'stock_valuation', 'movements',
  'discounts', 'returns', 'writeoffs', 'debt_balances', 'debt_history', 'cash',
  'noncash', 'reservations', 'audit',
];
const reportCostTypes = new Set(['profit_by_sale', 'profit_by_product', 'profit_by_category']);
const reportFilterSupport = {
  sales_by_day: ['from', 'to', 'userId'],
  sales_by_product: ['from', 'to', 'productId', 'userId'],
  sales_by_category: ['from', 'to', 'productId', 'userId'],
  sales_by_cashier: ['from', 'to', 'userId'],
  sales_by_payment_method: ['from', 'to', 'userId'],
  cashier_summary: ['from', 'to', 'productId', 'userId'],
  profit_by_sale: ['from', 'to', 'warehouseId', 'productId', 'userId'],
  profit_by_product: ['from', 'to', 'warehouseId', 'productId', 'userId'],
  profit_by_category: ['from', 'to', 'warehouseId', 'productId', 'userId'],
  stock: ['warehouseId', 'productId'],
  low_stock: ['warehouseId', 'productId'],
  stock_valuation: ['warehouseId', 'productId'],
  movements: ['from', 'to', 'warehouseId', 'productId', 'userId'],
  discounts: ['from', 'to', 'productId', 'userId'],
  returns: ['from', 'to', 'warehouseId', 'productId', 'userId'],
  writeoffs: ['from', 'to', 'warehouseId', 'productId', 'userId'],
  debt_balances: ['userId'],
  debt_history: ['from', 'to', 'userId'],
  cash: ['from', 'to', 'userId'],
  noncash: ['from', 'to', 'userId'],
  reservations: ['from', 'to', 'warehouseId', 'productId', 'userId'],
  audit: ['from', 'to', 'userId'],
};
const reportMoneyColumns = {
  sales_by_day: ['subtotal', 'discount', 'total', 'paid', 'debt'],
  sales_by_product: ['sales', 'discount', 'returns', 'netSales'],
  sales_by_category: ['sales', 'discount', 'returns', 'netSales'],
  sales_by_cashier: ['subtotal', 'discount', 'total', 'paid', 'debt'],
  sales_by_payment_method: ['amount'],
  cashier_summary: ['salesTotal', 'discount'],
  profit_by_sale: ['sales', 'returns', 'netSales', 'cost', 'profit'],
  profit_by_product: ['netSales', 'cost', 'profit'],
  profit_by_category: ['netSales', 'cost', 'profit'],
  stock_valuation: ['unitCost', 'value'],
  discounts: ['amount'],
  returns: ['amount', 'cost'],
  writeoffs: ['cost'],
  debt_balances: ['total', 'balance'],
  debt_history: ['amount', 'allocated'],
  cash: ['amount'],
  noncash: ['received', 'returned', 'net'],
};
const reportQuantityColumns = new Set(['qty', 'returnQty', 'minStock', 'reserved', 'available']);

function updateReportFilterVisibility() {
  const supported = reportFilterSupport[$('#report-type').value] ?? [];
  document.querySelectorAll('[data-report-filter]').forEach((label) => {
    label.hidden = !supported.includes(label.dataset.reportFilter);
  });
}

async function loadReportOptions() {
  try {
    const options = await api('/api/reports/options');
    state.reportOptions = options;
    const previousType = $('#report-type').value || 'sales_by_day';
    const typeOptions = reportTypes
      .filter((type) => state.user?.permissions.view_cost === 1 ||
        (!reportCostTypes.has(type) && type !== 'stock_valuation'))
      .map((type) => makeOption(type, t(`reports.type.${type}`)));
    $('#report-type').replaceChildren(...typeOptions);
    if (typeOptions.some((option) => option.value === previousType)) {
      $('#report-type').value = previousType;
    }
    updateReportFilterVisibility();

    const selectedWarehouse = $('#report-warehouse').value;
    const warehouses = [makeOption('', t('reports.all_warehouses')),
      ...options.warehouses.map((row) => makeOption(row.id, row.name))];
    $('#report-warehouse').replaceChildren(...warehouses);
    if (warehouses.some((option) => option.value === selectedWarehouse)) {
      $('#report-warehouse').value = selectedWarehouse;
    }

    const selectedProduct = $('#report-product').value;
    const products = [makeOption('', t('reports.all_products')),
      ...options.products.map((row) => makeOption(row.id, `${row.sku} — ${row.name}`))];
    $('#report-product').replaceChildren(...products);
    if (products.some((option) => option.value === selectedProduct)) {
      $('#report-product').value = selectedProduct;
    }

    const selectedUser = $('#report-user').value;
    const users = [makeOption('', t('reports.all_users')),
      ...options.users.map((row) => makeOption(row.id, row.fullName))];
    $('#report-user').replaceChildren(...users);
    if (users.some((option) => option.value === selectedUser)) {
      $('#report-user').value = selectedUser;
    }

    if (!$('#report-to').value) $('#report-to').value = dateForInput();
    if (!$('#report-from').value) {
      const current = new Date(`${dateForInput()}T00:00:00.000Z`);
      current.setUTCDate(current.getUTCDate() - 30);
      $('#report-from').value = current.toISOString().slice(0, 10);
    }
  } catch (error) {
    message(error.message);
  }
}

function reportParams() {
  const params = new URLSearchParams({
    type: $('#report-type').value,
    lang: state.lang,
  });
  for (const [field, selector] of [
    ['from', '#report-from'], ['to', '#report-to'],
    ['warehouseId', '#report-warehouse'], ['productId', '#report-product'], ['userId', '#report-user'],
  ]) {
    const value = $(selector).value;
    if (value && reportFilterSupport[$('#report-type').value]?.includes(field)) params.set(field, value);
  }
  return params;
}

function reportDisplayValue(type, column, value) {
  if (value === null || value === undefined) return '';
  if (reportMoneyColumns[type]?.includes(column)) return formatMoney(value);
  if (reportQuantityColumns.has(column)) return formatQuantity(value);
  if (column === 'date' && typeof value === 'string' && value.includes('T')) return formatDateTime(value);
  if (column === 'kind' && ['qty', 'promo', 'customer', 'check', 'manual'].includes(value)) {
    return t(`reports.discount.${value}`);
  }
  if (column === 'purpose' || column === 'direction') return t(`reports.value.${value}`);
  if (column === 'status' && ['active', 'released', 'consumed'].includes(value)) {
    return t(`reports.reservation.${value}`);
  }
  if (column === 'reason' && ['damaged', 'lost', 'expired', 'other'].includes(value)) {
    return t(`writeoff.${value}`);
  }
  if (column === 'type' && ['PURCHASE', 'SALE', 'RETURN', 'WRITE_OFF', 'ADJUST_PLUS', 'ADJUST_MINUS', 'REVERSAL'].includes(value)) {
    return t(`movement.${value}`);
  }
  return String(value);
}

function renderReport() {
  const report = state.report;
  const head = $('#reports-head');
  const body = $('#reports-body');
  head.replaceChildren();
  body.replaceChildren();
  if (!report) {
    $('#report-export').disabled = true;
    $('#reports-summary').textContent = '';
    return;
  }
  const header = document.createElement('tr');
  for (const column of report.columns) {
    const th = document.createElement('th');
    th.textContent = t(`reports.column.${column}`);
    header.append(th);
  }
  head.append(header);
  for (const data of report.rows) {
    const row = document.createElement('tr');
    for (const column of report.columns) {
      row.append(cell(reportDisplayValue(report.type, column, data[column])));
    }
    body.append(row);
  }
  if (report.rows.length === 0) {
    const row = document.createElement('tr');
    const empty = cell(t('reports.no_rows'));
    empty.colSpan = Math.max(report.columns.length, 1);
    row.append(empty);
    body.append(row);
  }
  let summary = '';
  if (report.type === 'cash' && report.summary) {
    summary = t('reports.summary.cash')
      .replace('{balance}', formatMoney(report.summary.balance))
      .replace('{periodAmount}', formatMoney(report.summary.periodAmount));
  } else if (report.type === 'stock_valuation' && report.summary) {
    summary = t('reports.summary.valuation').replace('{value}', formatMoney(report.summary.value));
  }
  if (report.truncated) summary = `${summary}${summary ? ' ' : ''}${t('reports.truncated')}`;
  $('#reports-summary').textContent = summary;
  $('#report-export').disabled = report.truncated;
}

async function loadReports() {
  if (!state.reportOptions) await loadReportOptions();
  try {
    const { report } = await api(`/api/reports?${reportParams()}`);
    state.report = report;
    renderReport();
    message('');
  } catch (error) {
    state.report = null;
    renderReport();
    message(error.message);
  }
}

function csvValue(value, numeric = false) {
  if (value === null || value === undefined) return '';
  if (!numeric && typeof value === 'string' && /^[\s]*[=+\-@]/.test(value)) value = `'${value}`;
  return `"${String(value).replace(/"/g, '""')}"`;
}

function reportCsvNumber(value, column) {
  if (value === null || value === undefined) return '';
  if (!reportMoneyColumns[state.report.type]?.includes(column)) {
    if (reportQuantityColumns.has(column)) return formatQuantity(value).replace(',', '.');
    return reportDisplayValue(state.report.type, column, value);
  }
  const negative = value < 0;
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute / 100);
  const fraction = absolute % 100;
  return `${negative ? '-' : ''}${whole}${fraction ? `.${String(fraction).padStart(2, '0')}` : ''}`;
}

function exportReportCsv() {
  const report = state.report;
  if (!report || report.truncated) return;
  const lines = [
    report.columns.map((column) => csvValue(t(`reports.column.${column}`))).join(';'),
    ...report.rows.map((row) => report.columns.map((column) =>
      csvValue(reportCsvNumber(row[column], column), typeof row[column] === 'number')).join(';')),
  ];
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `report-${report.type}-${dateForInput()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function loadBackupStatus() {
  try {
    const { status } = await api('/api/backups');
    const note = $('#backup-status');
    if (!status.configured) {
      note.textContent = t('backup.not_configured');
    } else if (!status.lastRun) {
      note.textContent = t('backup.no_runs');
    } else {
      note.textContent = t('backup.latest')
        .replace('{status}', t(`backup.run.${status.lastRun.status}`))
        .replace('{date}', formatDateTime(status.lastRun.completedAt))
        .replace('{file}', status.lastRun.file ?? '—')
        .replace('{integrity}', status.lastRun.integrity ?? '—')
        .replace('{discrepancies}', String(status.lastRun.discrepancies ?? '—'));
      if (status.lastRun.error) note.textContent += ` ${status.lastRun.error}`;
    }
    if (status.directory) {
      $('#backup-directory-status').textContent = t('reports.summary.backups')
        .replace('{directory}', status.directory)
        .replace('{lastRun}', status.lastRun?.completedAt ? formatDateTime(status.lastRun.completedAt) : t('backup.no_runs'));
    }
    buildHead('#backup-head', 'backup.columns');
    const body = $('#backup-body');
    body.replaceChildren();
    for (const backup of status.backups) {
      const row = document.createElement('tr');
      row.append(cell(backup.file), cell(formatDateTime(backup.createdAt)), cell(backup.bytes));
      body.append(row);
    }
    if (status.backups.length === 0) {
      const row = document.createElement('tr');
      const empty = cell(t('status.no_data'));
      empty.colSpan = 3;
      row.append(empty);
      body.append(row);
    }
  } catch (error) {
    message(error.message);
  }
}

async function createBackupNow() {
  const button = $('#backup-create');
  button.disabled = true;
  try {
    await api('/api/backups', { method: 'POST' });
    message('backup.created');
    await loadBackupStatus();
  } catch (error) {
    message(error.message);
  } finally {
    button.disabled = false;
  }
}

async function submitDebtPayment(event) {
  event.preventDefault();
  if (!state.debtCustomerId) {
    message('validation.invalid_customer');
    return;
  }
  const button = $('#debt-payment-form button[type="submit"]');
  button.disabled = true;
  try {
    const payload = {
      customerId: state.debtCustomerId,
      methodId: $('#debt-payment-method').value,
      amount: moneyTextToTiyin($('#debt-payment-amount').value),
    };
    const fingerprint = JSON.stringify(payload);
    if (!debtPaymentAttempt || debtPaymentAttempt.fingerprint !== fingerprint) {
      debtPaymentAttempt = { fingerprint, id: createRequestId() };
    }
    await api('/api/debts/payments', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        idempotencyKey: debtPaymentAttempt.id,
      }),
    });
    debtPaymentAttempt = null;
    $('#debt-payment-amount').value = '';
    if (!(await loadDebts())) return;
    message('debts.payment_success');
    if (['cash_in', 'cash_out', 'expense', 'cash_collection', 'reports']
      .some((permission) => state.user?.permissions[permission] === 1)) {
      cashOffset = 0;
      if (!(await loadCashPage())) return;
    }
  } catch (error) {
    message(error.message);
  } finally {
    button.disabled = false;
  }
}

async function submitDebtForgiveness(event) {
  event.preventDefault();
  if (!state.debtCustomerId) {
    message('validation.invalid_customer');
    return;
  }
  if (!window.confirm(t('debts.forgive_confirm'))) return;
  const button = $('#debt-forgiveness-form button[type="submit"]');
  button.disabled = true;
  try {
    const items = [...document.querySelectorAll('#debts-sales-body [data-forgive-sale]')]
      .filter((input) => input.value.trim() !== '')
      .map((input) => ({
        saleId: input.dataset.forgiveSale,
        amount: moneyTextToTiyin(input.value),
      }));
    if (items.length === 0) throw new Error('debt.invalid_forgiveness');
    await api('/api/debts/forgiveness', {
      method: 'POST',
      body: JSON.stringify({
        customerId: state.debtCustomerId,
        reason: $('#debt-forgiveness-reason').value,
        items,
      }),
    });
    $('#debt-forgiveness-reason').value = '';
    if (!(await loadDebts())) return;
    message('debts.forgive_success');
  } catch (error) {
    message(error.message);
  } finally {
    button.disabled = false;
  }
}

async function submitCashOperation(event) {
  event.preventDefault();
  const button = $('#cash-operation-form button[type="submit"]');
  button.disabled = true;
  try {
    const type = $('#cash-operation-type').value;
    const payload = {
      type,
      amount: moneyTextToTiyin($('#cash-operation-amount').value),
      reason: $('#cash-operation-reason').value.trim(),
      category: type === 'expense' ? $('#cash-operation-category').value.trim() : null,
      reference: $('#cash-operation-reference').value.trim(),
    };
    const fingerprint = JSON.stringify(payload);
    if (!cashOperationAttempt || cashOperationAttempt.fingerprint !== fingerprint) {
      cashOperationAttempt = { fingerprint, id: createRequestId() };
    }
    await api('/api/cash/operations', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        idempotencyKey: cashOperationAttempt.id,
      }),
    });
    cashOperationAttempt = null;
    $('#cash-operation-amount').value = '';
    $('#cash-operation-category').value = '';
    $('#cash-operation-reason').value = '';
    $('#cash-operation-reference').value = '';
    cashOffset = 0;
    if (!(await loadCashPage())) return;
    message('cash.operation_created');
  } catch (error) {
    message(error.message);
  } finally {
    button.disabled = false;
  }
}

async function reverseCashEntry(entry) {
  if (!window.confirm(t('cash.reverse_confirm'))) return;
  const reason = window.prompt(t('cash.reverse_reason'));
  if (reason === null) return;
  try {
    const normalizedReason = reason.trim();
    const previousAttempt = cashReversalAttemptIds.get(entry.operationId);
    if (!previousAttempt || previousAttempt.reason !== normalizedReason) {
      cashReversalAttemptIds.set(entry.operationId, {
        reason: normalizedReason,
        id: createRequestId(),
      });
    }
    const attempt = cashReversalAttemptIds.get(entry.operationId);
    await api(`/api/cash/operations/${encodeURIComponent(entry.operationId)}/reverse`, {
      method: 'POST',
      body: JSON.stringify({
        reason: normalizedReason,
        idempotencyKey: attempt.id,
      }),
    });
    cashReversalAttemptIds.delete(entry.operationId);
    cashOffset = 0;
    if (!(await loadCashPage())) return;
    message('cash.operation_reversed');
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

function isValidProductQuantity(value) {
  const match = /^(\d{1,13})(?:[.,](\d{1,3}))?$/.exec(value.trim());
  if (!match) return false;
  const qty = BigInt(match[1]) * 1000n + BigInt((match[2] ?? '').padEnd(3, '0') || '0');
  return qty > 0n && qty <= BigInt(Number.MAX_SAFE_INTEGER);
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

function setPurchaseImportCategoryOptions() {
  const select = $('#purchase-import-category');
  if (!select) return;
  const selected = select.value;
  const options = [makeOption('', t('purchase_import.all_categories'))];
  for (const category of state.purchaseImportCategories) {
    options.push(makeOption(category.id, state.lang === 'uz'
      ? category.name_uz || category.name_ru
      : category.name_ru));
  }
  select.replaceChildren(...options);
  if (options.some((option) => option.value === selected)) select.value = selected;
  const url = new URL('/api/purchases/import/products-template', window.location.origin);
  if (select.value) url.searchParams.set('categoryId', select.value);
  $('#purchase-import-products-template').href = `${url.pathname}${url.search}`;
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
    const [{ rows: products }, { rows: warehouses }, { rows: categories }] = await Promise.all([
      api('/api/references/products'),
      api('/api/references/warehouses'),
      api('/api/references/categories'),
    ]);
    inventoryProducts = products;
    inventoryWarehouses = warehouses;
    state.purchaseImportCategories = categories;
    setPurchaseImportCategoryOptions();
    setWarehouseOptions($('#stock-warehouse-filter'), true);
    setWarehouseOptions($('#purchase-warehouse'));
    setWarehouseOptions($('#writeoff-warehouse'));
    setWarehouseOptions($('#stocktake-warehouse'));
    setWarehouseOptions($('#movement-warehouse-filter'), true);
    setProductOptions($('#movement-product-filter'), true);
    setProductOptions($('#writeoff-product'));
    const stocktakeProducts = inventoryProducts.map((product) =>
      makeOption(product.id, `${product.sku} — ${product.name}`));
    $('#stocktake-products').replaceChildren(...stocktakeProducts);
    const dateInput = $('#purchase-form').elements.namedItem('date');
    if (!dateInput.value) dateInput.value = dateForInput();
    document.querySelectorAll('#purchase-lines [data-purchase-product]').forEach((select) => setProductOptions(select));
  } catch (error) {
    message(error.message);
  }
}

function formatMoney(value) {
  const negative = value < 0;
  const absolute = Math.abs(value);
  const sums = Math.floor(absolute / 100);
  const tiyin = absolute % 100;
  const grouped = String(sums).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  const fraction = tiyin ? `${state.lang === 'uz' ? '.' : ','}${String(tiyin).padStart(2, '0')}` : '';
  return `${negative ? '−' : ''}${grouped}${fraction} ${t('money.currency')}`;
}

function moneyTextToTiyin(value) {
  const normalized = value.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) throw new Error('validation.invalid_payment_amount');
  const amount = BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0') || '0');
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('validation.invalid_payment_amount');
  return Number(amount);
}

function createRequestId() {
  if (!window.crypto?.getRandomValues) throw new Error('validation.idempotency_unavailable');
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function percentTextToBasisPoints(value) {
  const normalized = value.replace(',', '.').trim();
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) throw new Error('validation.invalid_discount');
  const basisPoints = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0') || '0');
  if (!Number.isSafeInteger(basisPoints) || basisPoints > 10_000) {
    throw new Error('validation.invalid_discount');
  }
  return basisPoints;
}

function salesOptions() {
  const customerId = $('#sales-customer').value || null;
  const manualDiscounts = Object.entries(state.salesManualDiscounts)
    .filter(([, value]) => value !== '' && Number(value) > 0)
    .map(([productId, value]) => {
      const valueBp = Number(value);
      if (!Number.isSafeInteger(valueBp) || valueBp < 0 || valueBp > 10_000) {
        throw new Error('validation.invalid_discount');
      }
      return { productId, discount: { kind: 'percent', valueBp } };
    });
  let checkDiscount = null;
  if (state.user?.permissions.discount_check === 1) {
    const value = $('#sales-check-discount-value').value.trim();
    if (value) {
      const kind = $('#sales-check-discount-kind').value;
      checkDiscount = kind === 'percent'
        ? { kind, valueBp: percentTextToBasisPoints(value) }
        : { kind, amount: Number(value) };
      if (kind === 'amount' &&
          (!Number.isSafeInteger(checkDiscount.amount) || checkDiscount.amount < 0)) {
        throw new Error('validation.invalid_discount');
      }
    }
  }
  return {
    customerId,
    manualDiscounts,
    checkDiscount,
    ...(state.salesHeldCartId ? { heldCartId: state.salesHeldCartId } : {}),
  };
}

function setSalesDefaultWarehouseOptions() {
  const select = $('#sales-default-warehouse');
  if (!select || !state.salesContext) return;
  const options = [makeOption('', t('status.select_option'))];
  for (const warehouse of state.salesContext.warehouses) {
    options.push(makeOption(warehouse.id, warehouse.name));
  }
  select.replaceChildren(...options);
  select.value = state.salesContext.defaultWarehouseId ?? '';
}

function setSalesWarehouseOptions() {
  const field = $('#sales-warehouse-choice-field');
  const select = $('#sales-warehouse-choice');
  const warehouses = state.salesContext?.salesWarehouses ?? [];
  field.hidden = warehouses.length < 2;
  const options = [makeOption('', t('status.select_option')),
    ...warehouses.map((warehouse) => makeOption(warehouse.id, warehouse.name))];
  select.replaceChildren(...options);
  select.value = state.salesWarehouseId;
}

function renderSalesPayments() {
  const container = $('#sales-payments');
  container.replaceChildren();
  const methods = state.salesContext?.paymentMethods ?? [];
  if (methods.length === 0) {
    container.textContent = t('sales.no_payment_method');
    return;
  }
  const prompt = document.createElement('p');
  prompt.className = 'sales-payment-prompt';
  prompt.textContent = t('sales.select_payment_method');
  container.append(prompt);
  for (const method of methods) {
    const card = document.createElement('div');
    card.className = 'sales-payment';
    const methodLabel = document.createElement('label');
    methodLabel.className = 'sales-payment-method';
    const methodChoice = document.createElement('input');
    methodChoice.type = 'checkbox';
    methodChoice.dataset.paymentMethod = method.id;
    methodLabel.append(methodChoice, document.createTextNode(method.name));
    const fields = document.createElement('div');
    fields.className = 'sales-payment-fields';
    fields.hidden = true;
    const amountLabel = document.createElement('label');
    const amountCaption = document.createElement('span');
    amountCaption.textContent = t('sales.payment_amount');
    const amount = document.createElement('input');
    amount.type = 'text';
    amount.inputMode = 'decimal';
    amount.dataset.paymentAmount = method.id;
    amount.setAttribute('aria-label', `${method.name}: ${t('sales.payment_amount')}`);
    amount.addEventListener('input', renderSalesSummary);
    amountLabel.append(amountCaption, amount);
    fields.append(amountLabel);
    if (method.kind === 'cash') {
      const tenderedLabel = document.createElement('label');
      const tenderedCaption = document.createElement('span');
      tenderedCaption.textContent = t('sales.tendered');
      const tendered = document.createElement('input');
      tendered.type = 'text';
      tendered.inputMode = 'decimal';
      tendered.dataset.paymentTendered = method.id;
      tendered.setAttribute('aria-label', `${method.name}: ${t('sales.tendered')}`);
      tendered.addEventListener('input', renderSalesSummary);
      tenderedLabel.append(tenderedCaption, tendered);
      fields.append(tenderedLabel);
    }
    methodChoice.addEventListener('change', () => {
      fields.hidden = !methodChoice.checked;
      renderSalesSummary();
    });
    card.append(methodLabel, fields);
    container.append(card);
  }
}

function renderSalesProducts() {
  const container = $('#sales-search-results');
  if (!container || !state.salesContext) return;
  const query = $('#sales-search').value.trim().toLocaleLowerCase();
  const matches = state.salesContext.products.filter((product) =>
    `${product.sku} ${product.name} ${product.barcode ?? ''}`.toLocaleLowerCase().includes(query));
  const visible = matches.slice(0, 30);
  const rows = visible.map((product) => {
    const row = document.createElement('div');
    row.className = 'sales-product';
    const name = document.createElement('span');
    name.textContent = `${product.sku} — ${product.name}`;
    const stock = document.createElement('span');
    stock.textContent = `${formatQuantity(product.availableQty)} ${product.unit}`;
    const price = document.createElement('span');
    price.textContent = formatMoney(product.base_price);
    const quantityLabel = document.createElement('label');
    quantityLabel.className = 'sales-product-quantity';
    const quantityCaption = document.createElement('span');
    quantityCaption.textContent = t('sales.quantity');
    const quantity = document.createElement('input');
    quantity.type = 'text';
    quantity.inputMode = 'decimal';
    quantity.required = true;
    quantity.dataset.productQty = product.id;
    quantity.setAttribute('aria-label', t('sales.quantity'));
    quantity.addEventListener('input', () => {
      button.disabled = !state.salesContext.warehouse ||
        product.availableQty <= 0 || !isValidProductQuantity(quantity.value);
    });
    quantityLabel.append(quantityCaption, quantity);
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.addProduct = product.id;
    button.textContent = product.availableQty > 0 ? t('sales.add') : t('sales.out_of_stock');
    button.disabled = true;
    button.addEventListener('click', () => {
      void addSalesProduct(product.id, quantity.value);
    });
    row.append(name, stock, price, quantityLabel, button);
    return row;
  });
  if (rows.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = t('sales.no_products');
    rows.push(empty);
  }
  const header = container.querySelector('.sales-product-header');
  container.replaceChildren(...(header ? [header, ...rows] : rows));
}

function renderSalesCart() {
  const body = $('#sales-cart-body');
  buildHead('#sales-cart-head', 'sales.cart_columns');
  body.replaceChildren();
  const cart = state.salesCart;
  const heldCart = state.heldCarts.find((item) => item.id === state.salesHeldCartId);
  $('#sales-pay-at-counter').disabled =
    !cart || cart.lines.length === 0 || Boolean(heldCart?.reservations.length);
  if (!cart || cart.lines.length === 0) {
    const row = document.createElement('tr');
    const empty = cell(t('cart.empty'));
    empty.colSpan = 6;
    row.append(empty);
    body.append(row);
    renderSalesSummary();
    return;
  }
  const canDiscount = state.user?.permissions.discount_manual === 1;
  const isHeld = Boolean(state.salesHeldCartId);
  for (const line of cart.lines) {
    const row = document.createElement('tr');
    row.dataset.salesProductId = line.productId;
    row.append(cell(`${line.sku} — ${line.name} (${line.unit})`));
    const qtyCell = document.createElement('td');
    const qty = document.createElement('input');
    qty.type = 'text';
    qty.inputMode = 'decimal';
    qty.value = formatQuantity(line.qty);
    qty.dataset.cartQty = line.productId;
    qty.disabled = isHeld;
    qty.setAttribute('aria-label', t('purchases.qty'));
    qty.addEventListener('change', () => { void updateSalesQuantity(line.productId, qty.value); });
    qtyCell.append(qty);
    row.append(qtyCell);
    const unitPriceCell = document.createElement('td');
    unitPriceCell.dataset.unitPrice = 'true';
    unitPriceCell.textContent = formatMoney(line.basePrice);
    row.append(unitPriceCell);
    const discountCell = document.createElement('td');
    if (canDiscount) {
      const discount = document.createElement('input');
      discount.type = 'number';
      discount.min = '0';
      discount.max = '10000';
      discount.step = '1';
      discount.value = state.salesManualDiscounts[line.productId] ?? '';
      discount.className = 'sales-manual-discount';
      discount.setAttribute('aria-label', t('sales.manual_discount'));
      discount.addEventListener('input', () => {
        state.salesManualDiscounts[line.productId] = discount.value;
        scheduleSalesQuote();
      });
      discountCell.append(discount);
    } else {
      discountCell.textContent = '—';
    }
    row.append(discountCell);
    const totalCell = document.createElement('td');
    totalCell.dataset.lineTotal = 'true';
    totalCell.textContent = formatMoney(line.basePrice);
    row.append(totalCell);
    const action = document.createElement('td');
    if (!isHeld) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = t('sales.remove');
      remove.addEventListener('click', () => { void removeSalesProduct(line.productId); });
      action.append(remove);
    }
    row.append(action);
    body.append(row);
  }
  renderSalesQuoteValues();
}

function renderSalesQuoteValues() {
  const lines = new Map((state.salesQuote?.lines ?? []).map((line) => [line.productId, line]));
  document.querySelectorAll('#sales-cart-body [data-sales-product-id]').forEach((row) => {
    const quote = lines.get(row.dataset.salesProductId);
    if (!quote) return;
    row.querySelector('[data-unit-price]').textContent = formatMoney(quote.unitPrice);
    row.querySelector('[data-line-total]').textContent = formatMoney(quote.lineTotal);
  });
  renderSalesSummary();
}

function renderSalesSummary() {
  const quote = state.salesQuote;
  if (!quote) {
    $('#sales-summary').textContent = '';
    return;
  }
  let paid = 0n;
  try {
    document.querySelectorAll('#sales-payments [data-payment-amount]').forEach((input) => {
      const methodChoice = input.closest('.sales-payment')?.querySelector('[data-payment-method]');
      if (!methodChoice?.checked) return;
      if (input.value.trim()) paid += BigInt(moneyTextToTiyin(input.value));
    });
    if (paid > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('validation.invalid_payment_amount');
  } catch {
    $('#sales-summary').textContent = `${t('sales.total')}: ${formatMoney(quote.total)}`;
    return;
  }
  const due = BigInt(quote.total) - paid;
  $('#sales-summary').textContent =
    `${t('sales.total')}: ${formatMoney(quote.total)}; ${t('sales.paid')}: ${formatMoney(Number(paid))}; ` +
    `${t('sales.due')}: ${formatMoney(Number(due))}`;
}

function scheduleSalesQuote() {
  if (salesQuoteTimer !== null) window.clearTimeout(salesQuoteTimer);
  salesQuoteTimer = window.setTimeout(() => { void refreshSalesQuote(); }, 250);
}

async function refreshSalesQuote() {
  salesQuoteTimer = null;
  if (!state.salesCart || state.salesCart.lines.length === 0) {
    state.salesQuote = null;
    renderSalesQuoteValues();
    return;
  }
  try {
    const { quote } = await api('/api/sales/quote', {
      method: 'POST',
      body: JSON.stringify(salesOptions()),
    });
    state.salesQuote = quote;
    renderSalesQuoteValues();
  } catch (error) {
    state.salesQuote = null;
    renderSalesQuoteValues();
    message(error.message);
  }
}

async function loadSalesPage() {
  try {
    const contextUrl = new URL('/api/sales/context', window.location.origin);
    if (state.salesWarehouseId) contextUrl.searchParams.set('warehouseId', state.salesWarehouseId);
    const [context, { cart }, heldResult] = await Promise.all([
      api(`${contextUrl.pathname}${contextUrl.search}`),
      api('/api/cart'),
      canAccessPage('heldCarts') &&
        (state.user?.permissions.hold_cart === 1 || state.user?.permissions.reserve_cart === 1 ||
          state.user?.permissions.pay_at_counter === 1)
        ? api('/api/held-carts')
        : Promise.resolve({ carts: [] }),
    ]);
    state.salesContext = context;
    state.salesWarehouseId = context.warehouse?.id ?? '';
    state.customers = context.customers;
    state.heldCarts = heldResult.carts;
    const heldCart = state.heldCarts.find((item) => item.id === state.salesHeldCartId);
    state.salesCart = heldCart ?? cart;
    state.salesManualDiscounts = Object.fromEntries(
      Object.entries(state.salesManualDiscounts).filter(([id]) =>
        cart.lines.some((line) => line.productId === id)),
    );
    $('#sales-warehouse-config').hidden = state.user?.permissions.settings !== 1;
    $('#sales-check-discount').hidden = state.user?.permissions.discount_check !== 1;
    $('#sales-warehouse-status').textContent = context.warehouse
      ? `${t('sales.selected_warehouse')}: ${context.warehouse.name}`
      : t(context.salesWarehouses.length === 0
        ? 'sales.no_permitted_warehouse'
        : context.salesWarehouses.length > 1
          ? 'sales.choose_warehouse_first'
          : 'sales.warehouse_unconfigured');
    setSalesDefaultWarehouseOptions();
    setSalesWarehouseOptions();
    renderSalesCustomers();
    $('#sales-customer').disabled = Boolean(heldCart?.customerId);
    $('#sales-hold-cart').disabled = Boolean(heldCart);
    $('#sales-reserve-cart').disabled = Boolean(heldCart?.reservations.length);
    $('#sales-pay-at-counter').disabled =
      state.salesCart.lines.length === 0 || Boolean(heldCart?.reservations.length);
    if (heldCart) {
      $('#sales-customer').value = heldCart.customerId ?? '';
      $('#sales-customer').dataset.selectedCustomer = heldCart.customerId ?? '';
    }
    renderSalesPayments();
    renderSalesProducts();
    renderSalesCart();
    $('#sales-receipt').hidden = true;
    await refreshSalesQuote();
  } catch (error) {
    message(error.message);
  }
}

async function addSalesProduct(productId, qty) {
  try {
    const { cart } = await api('/api/cart/lines', {
      method: 'POST',
      body: JSON.stringify({ productId, qty }),
    });
    state.salesCart = cart;
    renderSalesCart();
    await refreshSalesQuote();
  } catch (error) {
    message(error.message);
  }
}

async function updateSalesQuantity(productId, qty) {
  try {
    const { cart } = await api(`/api/cart/lines/${encodeURIComponent(productId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ qty }),
    });
    state.salesCart = cart;
    renderSalesCart();
    await refreshSalesQuote();
  } catch (error) {
    message(error.message);
    renderSalesCart();
  }
}

async function removeSalesProduct(productId) {
  try {
    const { cart } = await api(`/api/cart/lines/${encodeURIComponent(productId)}`, { method: 'DELETE' });
    state.salesCart = cart;
    delete state.salesManualDiscounts[productId];
    renderSalesCart();
    await refreshSalesQuote();
  } catch (error) {
    message(error.message);
  }
}

async function saveSalesDefaultWarehouse() {
  const warehouseId = $('#sales-default-warehouse').value;
  if (!warehouseId) {
    message('settings.invalid_default_warehouse');
    return;
  }
  const button = $('#save-default-warehouse');
  button.disabled = true;
  message('status.loading');
  try {
    await api('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ default_warehouse_id: warehouseId }),
    });
    state.salesWarehouseId = warehouseId;
    await loadSalesPage();
    message('status.saved');
  } catch (error) {
    message(error.message);
  } finally {
    button.disabled = false;
  }
}

function collectSalePayments() {
  const payments = [];
  document.querySelectorAll('#sales-payments [data-payment-amount]').forEach((input) => {
    const methodChoice = input.closest('.sales-payment')?.querySelector('[data-payment-method]');
    if (!methodChoice?.checked) return;
    const rawAmount = input.value.trim();
    if (!rawAmount) return;
    const amount = moneyTextToTiyin(rawAmount);
    if (amount === 0) return;
    const methodId = input.dataset.paymentAmount;
    const tenderedInput = [...document.querySelectorAll('#sales-payments [data-payment-tendered]')]
      .find((element) => element.dataset.paymentTendered === methodId);
    const rawTendered = tenderedInput?.value.trim() ?? '';
    payments.push({
      methodId,
      amount,
      ...(rawTendered ? { tendered: moneyTextToTiyin(rawTendered) } : {}),
    });
  });
  return payments;
}

async function submitSale(event) {
  event.preventDefault();
  const button = $('#sales-confirm-payment');
  button.disabled = true;
  try {
    if (!state.salesContext?.warehouse) throw new Error('settings.default_warehouse_required');
    const options = salesOptions();
    const payments = collectSalePayments();
    if (!saleAttemptId) saleAttemptId = createRequestId();
    const result = await api('/api/sales', {
      method: 'POST',
      body: JSON.stringify({
        ...options,
        warehouseId: state.salesWarehouseId,
        payments,
        receiptLang: state.lang,
        idempotencyKey: saleAttemptId,
      }),
    });
    saleAttemptId = null;
    $('#sales-payment-dialog').close();
    state.salesHeldCartId = '';
    state.salesManualDiscounts = {};
    $('#sales-check-discount-value').value = '';
    $('#sales-customer').value = '';
    await loadSalesPage();
    const change = result.payments.reduce((sum, payment) => sum + payment.change, 0);
    $('#sales-receipt-summary').textContent = t('sales.receipt_summary')
      .replace('{number}', result.sale.number)
      .replace('{total}', formatMoney(result.sale.total))
      .replace('{paid}', formatMoney(result.sale.paidTotal))
      .replace('{debt}', formatMoney(result.sale.debtAmount))
      .replace('{change}', formatMoney(change));
    $('#sales-receipt').hidden = false;
    message('status.created');
  } catch (error) {
    message(error.message);
  } finally {
    button.disabled = false;
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

function renderPurchaseImportReport(report) {
  state.purchaseImportReport = report;
  $('#purchase-import-preview').hidden = false;
  buildHead('#purchase-import-head', 'purchase_import.columns');
  const body = $('#purchase-import-body');
  body.replaceChildren();
  for (const result of report.rows) {
    const row = document.createElement('tr');
    row.append(
      cell(result.line),
      cell(result.sku),
      cell(result.productName ?? ''),
      cell(result.qty ?? ''),
      cell(result.unitCost === undefined ? '' : formatMoney(result.unitCost)),
      cell(result.basePrice === undefined || result.currentBasePrice === undefined
        ? ''
        : `${formatMoney(result.currentBasePrice)} → ${formatMoney(result.basePrice)}`),
      cell([
        t(`purchase_import.${result.action}`),
        ...result.errors.map((error) => t(error)),
      ].join(': ')),
    );
    body.append(row);
  }
  $('#purchase-import-summary').textContent = t('purchase_import.summary')
    .replace('{ready}', String(report.counts.ready))
    .replace('{error}', String(report.counts.error));
  $('#purchase-import-outcome').textContent = '';
  $('#purchase-import-apply').disabled = report.counts.ready === 0 || report.counts.error > 0;
}

function resetPurchaseImportPreview() {
  state.purchaseImportReport = null;
  state.purchaseImportApplied = false;
  $('#purchase-import-preview').hidden = true;
  $('#purchase-import-summary').textContent = '';
  $('#purchase-import-outcome').textContent = '';
  $('#purchase-import-apply').disabled = true;
}

async function previewPurchaseImport(event) {
  event.preventDefault();
  resetPurchaseImportPreview();
  const button = $('#purchase-import-preview-button');
  button.disabled = true;
  try {
    const file = $('#purchase-import-file').files[0];
    if (!file) throw new Error('purchase_import.invalid_file');
    if (file.size > 2 * 1024 * 1024) throw new Error('purchase_import.file_too_large');
    let csv;
    try {
      csv = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
    } catch {
      throw new Error('purchase_import.invalid_csv');
    }
    const report = await api('/api/purchases/import/preview', {
      method: 'POST',
      body: JSON.stringify({
        csv,
        updateSalePrice: $('#purchase-import-update-price').checked,
      }),
    });
    state.purchaseImportApplied = false;
    renderPurchaseImportReport(report);
  } catch (error) {
    message(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

function applyPurchaseImport() {
  const report = state.purchaseImportReport;
  if (!report || state.purchaseImportApplied || report.counts.error > 0 || report.counts.ready === 0) return;

  const existingRows = [...$('#purchase-lines').children];
  const existingProductIds = new Set(existingRows
    .map((row) => row.querySelector('[data-purchase-product]').value)
    .filter(Boolean));
  if (report.rows.some((row) => existingProductIds.has(row.productId))) {
    message('purchase_import.duplicate_form_product', 'error');
    return;
  }
  const emptyRows = existingRows.filter((row) =>
    !row.querySelector('[data-purchase-product]').value &&
    !row.querySelector('[data-purchase-qty]').value &&
    !row.querySelector('[data-purchase-cost]').value);
  const reusableEmptyRows = emptyRows.slice(0, report.counts.ready);
  const resultingCount = existingRows.length + report.counts.ready - reusableEmptyRows.length;
  if (resultingCount > 200) {
    message('purchase_import.too_many_form_lines', 'error');
    return;
  }

  const availableEmptyRows = [...reusableEmptyRows];
  for (const result of report.rows) {
    const row = availableEmptyRows.shift() ?? (addPurchaseLine(), $('#purchase-lines').lastElementChild);
    row.querySelector('[data-purchase-product]').value = result.productId;
    row.querySelector('[data-purchase-qty]').value = result.qty;
    row.querySelector('[data-purchase-cost]').value = result.unitCost;
  }
  state.purchaseImportApplied = true;
  $('#purchase-import-apply').disabled = true;
  $('#purchase-import-outcome').textContent = t('purchase_import.applied');
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

function resetWarehouseForm() {
  const form = $('#warehouse-form');
  if (!form) return;
  form.reset();
  editingWarehouseId = null;
  $('#warehouse-submit').textContent = t('warehouses.create');
  $('#warehouse-cancel-edit').hidden = true;
}

async function loadWarehouses() {
  try {
    const { rows } = await api('/api/references/warehouses?includeInactive=true');
    state.warehouses = rows;
    buildHead('#warehouses-head', 'warehouses.columns');
    const body = $('#warehouses-body');
    body.replaceChildren();
    for (const warehouse of rows) {
      const row = document.createElement('tr');
      row.append(
        cell(warehouse.name),
        cell(t(warehouse.active ? 'users.active' : 'users.inactive')),
      );
      const actions = document.createElement('td');
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = t('warehouses.edit');
      edit.addEventListener('click', () => {
        editingWarehouseId = warehouse.id;
        $('#warehouse-form').elements.namedItem('name').value = warehouse.name;
        $('#warehouse-submit').textContent = t('warehouses.save');
        $('#warehouse-cancel-edit').hidden = false;
        $('#warehouse-form').elements.namedItem('name').focus();
      });
      const toggleActive = document.createElement('button');
      toggleActive.type = 'button';
      toggleActive.textContent = t(warehouse.active ? 'warehouses.deactivate' : 'warehouses.activate');
      toggleActive.addEventListener('click', () => { void setWarehouseActive(warehouse); });
      actions.append(edit, toggleActive);
      row.append(actions);
      body.append(row);
    }
    if (rows.length === 0) {
      const row = document.createElement('tr');
      const empty = cell(t('warehouses.empty'));
      empty.colSpan = 3;
      row.append(empty);
      body.append(row);
    }
  } catch (error) {
    message(error.message);
  }
}

async function setWarehouseActive(warehouse) {
  const action = warehouse.active ? 'deactivate' : 'activate';
  if (!window.confirm(t(`warehouses.${action}_confirm`))) return;
  try {
    await api(`/api/references/warehouses/${encodeURIComponent(warehouse.id)}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !warehouse.active }),
    });
    await loadWarehouses();
    message('status.saved');
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

async function loadPrintJobs() {
  try {
    const { jobs, enabled } = await api('/api/print-jobs');
    buildHead('#print-jobs-head', 'print.columns');
    const body = $('#print-jobs-body');
    body.replaceChildren();
    const hasUncertain = jobs.some((job) => job.status === 'uncertain');
    $('#print-queue-note').textContent = [
      enabled ? '' : t('print.disabled'),
      hasUncertain ? t('print.check_printer') : '',
    ].filter(Boolean).join(' ');
    for (const job of jobs) {
      const row = document.createElement('tr');
      row.append(
        cell(formatDateTime(job.createdAt)),
        cell(job.number),
        cell(job.cashier),
        cell(t(`print.kind.${job.kind}`)),
        cell(t(`print.status.${job.status}`)),
        cell(job.attempts),
        cell(job.status === 'uncertain' ? t('print.check_printer') : job.error),
      );
      const action = document.createElement('td');
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = t('print.copy');
      copy.disabled = job.status === 'printing';
      copy.addEventListener('click', () => { void createPrintCopy(job); });
      action.append(copy);
      row.append(action);
      body.append(row);
    }
    if (jobs.length === 0) {
      const row = document.createElement('tr');
      const empty = cell(t('print.no_jobs'));
      empty.colSpan = 8;
      row.append(empty);
      body.append(row);
    }
  } catch (error) {
    message(error.message);
  }
}

async function createPrintCopy(job) {
  const confirmation = job.status === 'uncertain' ? 'print.uncertain_confirm' : 'print.copy_confirm';
  if (!window.confirm(t(confirmation))) return;
  try {
    await api(`/api/print-jobs/${encodeURIComponent(job.id)}/copy`, {
      method: 'POST',
      body: JSON.stringify({
        lang: $('#print-copy-language').value,
        ...(job.status === 'uncertain' ? { confirmUncertain: true } : {}),
      }),
    });
    await loadPrintJobs();
    message('status.created');
  } catch (error) {
    message(error.message);
  }
}

async function loadPrintProfile() {
  try {
    const { profile } = await api('/api/print-profile');
    const form = $('#print-profile-form');
    for (const key of ['storeName', 'address', 'phone', 'footerRu', 'footerUz']) {
      form.elements.namedItem(key).value = profile[key];
    }
  } catch (error) {
    message(error.message);
  }
}

async function savePrintProfile(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  try {
    await api('/api/print-profile', { method: 'PUT', body: JSON.stringify(values) });
    message('print.profile_saved');
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

async function editPermissions(user) {
  const editor = $('#permission-editor');
  editor.hidden = false;
  message('status.loading');
  try {
    const access = await api(`/api/users/${encodeURIComponent(user.id)}/permissions`);
    state.selectedUser = { ...user, ...access };
    $('#permission-user').textContent = user.fullName;
    const pageList = $('#page-permission-list');
    pageList.replaceChildren();
    for (const key of pagePermissionKeys) {
      const label = document.createElement('label');
      label.className = 'permission-item';
      const name = document.createElement('span');
      name.textContent = t(`page.${key}`);
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.pagePermission = key;
      input.checked = access.pagePermissions[key] === 1;
      label.append(input, name);
      pageList.append(label);
    }

    const warehouseList = $('#sales-warehouse-permission-list');
    warehouseList.replaceChildren();
    for (const warehouse of access.warehouses) {
      const label = document.createElement('label');
      label.className = 'permission-item';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.salesWarehouse = warehouse.id;
      input.checked = access.salesWarehouseIds.includes(warehouse.id);
      label.append(input, document.createTextNode(warehouse.name));
      warehouseList.append(label);
    }
    const salesPagePermission = pageList.querySelector('[data-page-permission="sales"]');
    const warehouseField = $('#sales-warehouse-permission');
    warehouseField.hidden = !salesPagePermission?.checked;
    salesPagePermission?.addEventListener('change', () => {
      warehouseField.hidden = !salesPagePermission.checked;
    });

    const list = $('#permission-list');
    list.replaceChildren();
    const paymentField = document.createElement('fieldset');
    paymentField.id = 'sale-payment-permissions';
    const paymentLegend = document.createElement('legend');
    paymentLegend.textContent = t('users.sale_payment_permissions');
    const paymentList = document.createElement('div');
    paymentList.className = 'permission-grid';
    for (const key of paymentPermissionKeys) {
      const label = document.createElement('label');
      label.className = 'permission-item';
      const name = document.createElement('span');
      name.textContent = t(`permission.${key}`);
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.permission = key;
      input.checked = access.permissions[key] === 1;
      label.append(input, name);
      paymentList.append(label);
    }
    paymentField.append(paymentLegend, paymentList);
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
        input.value = String(access.permissions[key] ?? 0);
      } else {
        input.type = 'checkbox';
        input.checked = access.permissions[key] === 1;
      }
      label.append(input, name);
      list.append(label);
      if (key === 'sell') list.append(paymentField);
    }
    const sellPermission = list.querySelector('[data-permission="sell"]');
    paymentField.hidden = !sellPermission?.checked;
    sellPermission?.addEventListener('change', () => {
      paymentField.hidden = !sellPermission.checked;
    });
    message('');
  } catch (error) {
    editor.hidden = true;
    message(error.message);
  }
}

$('#language').addEventListener('change', (event) => {
  const languageChanged = state.lang !== event.target.value;
  state.lang = event.target.value;
  if (languageChanged) resetProductImportPreview();
  localStorage.setItem('kassa_lang', state.lang);
  localize();
  if (state.user) {
    if (['products', 'sales', 'stock', 'purchases', 'movements', 'returns', 'writeoffs', 'stocktakes', 'reports']
      .some((page) => canAccessPage(page))) void loadInventoryOptions();
    if (state.user.permissions.reports === 1 && canAccessPage('reports')) void loadReportOptions();
    $('#current-user').textContent = `${state.user.fullName} (${state.user.login})`;
    document.querySelectorAll('#purchase-lines button').forEach((button) => {
      button.textContent = t('purchases.remove_line');
    });
    document.querySelectorAll('#purchase-lines [data-purchase-label]').forEach((node) => {
      node.textContent = t(node.dataset.purchaseLabel);
    });
    if (state.purchaseImportReport) renderPurchaseImportReport(state.purchaseImportReport);
    if (state.purchaseImportApplied) {
      $('#purchase-import-apply').disabled = true;
      $('#purchase-import-outcome').textContent = t('purchase_import.applied');
    }
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

$('#navigation-toggle').addEventListener('click', () => {
  const expanded = $('#navigation-toggle').getAttribute('aria-expanded') !== 'true';
  setNavigationExpanded(expanded);
});

$('#navigation').addEventListener('click', (event) => {
  const link = event.target.closest('a[data-page]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey) return;
  event.preventDefault();
  showPage(link.dataset.page);
});
$('#sales-page').addEventListener('click', (event) => {
  const link = event.target.closest('a[data-page]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey) return;
  event.preventDefault();
  showPage(link.dataset.page);
});
window.addEventListener('popstate', () => {
  if (state.user) showPage(pageByPath[window.location.pathname] ?? 'products', false);
});
$('#products-body').addEventListener('click', (event) => {
  const button = event.target.closest('[data-edit-product-price]');
  if (button) openPriceDialog(button.dataset.editProductPrice);
});
$('#product-import-form').addEventListener('submit', (event) => { void previewProductImport(event); });
$('#product-import-file').addEventListener('change', resetProductImportPreview);
$('#product-import-mode').addEventListener('change', resetProductImportPreview);
$('#product-import-create-categories').addEventListener('change', resetProductImportPreview);
$('#product-import-commit').addEventListener('click', () => { void commitProductImport(); });
$('#product-import-download').addEventListener('click', downloadProductImportReport);
$('#purchase-import-preview-button').addEventListener('click', (event) => { void previewPurchaseImport(event); });
$('#purchase-import-file').addEventListener('change', resetPurchaseImportPreview);
$('#purchase-import-category').addEventListener('change', setPurchaseImportCategoryOptions);
$('#purchase-import-update-price').addEventListener('change', resetPurchaseImportPreview);
$('#purchase-import-apply').addEventListener('click', applyPurchaseImport);
$('#price-form').addEventListener('submit', (event) => { void saveProductPrice(event); });
$('#price-cancel').addEventListener('click', () => {
  $('#price-dialog').close();
  editingProductId = null;
});
$('#price-dialog').addEventListener('close', () => { editingProductId = null; });

$('#refresh-connection-info').addEventListener('click', () => { void loadConnectionInfo(); });
$('#print-refresh').addEventListener('click', () => { void loadPrintJobs(); });
$('#print-profile-form').addEventListener('submit', (event) => { void savePrintProfile(event); });
$('#save-default-warehouse').addEventListener('click', () => { void saveSalesDefaultWarehouse(); });
$('#sales-warehouse-choice').addEventListener('change', (event) => {
  state.salesWarehouseId = event.currentTarget.value;
  void loadSalesPage();
});
$('#reports-form').addEventListener('submit', (event) => {
  event.preventDefault();
  void loadReports();
});
$('#report-type').addEventListener('change', updateReportFilterVisibility);
$('#report-export').addEventListener('click', exportReportCsv);
$('#backup-create').addEventListener('click', () => { void createBackupNow(); });
$('#sales-search').addEventListener('input', renderSalesProducts);
$('#sales-customer').addEventListener('change', (event) => {
  const select = event.currentTarget;
  if (select.value === ADD_CUSTOMER_VALUE) {
    beginAddCustomer(select);
    return;
  }
  select.dataset.selectedCustomer = select.value;
  scheduleSalesQuote();
});
$('#sales-hold-cart').addEventListener('click', () => { void createHeldCart(); });
$('#sales-reserve-cart').addEventListener('click', () => { void reserveSalesCart(); });
$('#sales-pay-at-counter').addEventListener('click', () => { void reserveForCounterPayment(); });
$('#held-carts-list').addEventListener('change', (event) => {
  const select = event.target.closest('[data-held-customer]');
  if (!select) return;
  if (select.value === ADD_CUSTOMER_VALUE) {
    beginAddCustomer(select);
    return;
  }
  select.dataset.selectedCustomer = select.value;
  state.heldCustomerChoices[select.dataset.heldCustomer] = select.value;
});
$('#held-carts-list').addEventListener('click', (event) => {
  const sell = event.target.closest('[data-held-sell]');
  if (sell) {
    void sellHeldCart(sell.dataset.heldSell);
    return;
  }
  const reserve = event.target.closest('[data-held-reserve]');
  if (reserve) void reserveHeldCartFromPage(reserve.dataset.heldReserve);
});
$('#customer-form').addEventListener('submit', (event) => { void saveNewCustomer(event); });
$('#customer-cancel').addEventListener('click', () => {
  $('#customer-dialog').close();
  customerSelectionTarget = null;
});
$('#sales-check-discount-kind').addEventListener('change', scheduleSalesQuote);
$('#sales-check-discount-value').addEventListener('input', scheduleSalesQuote);
$('#sales-submit').addEventListener('click', () => {
  $('#sales-payment-dialog').showModal();
  renderSalesSummary();
});
$('#sales-payment-cancel').addEventListener('click', () => {
  $('#sales-payment-dialog').close();
});
$('#sales-checkout').addEventListener('submit', (event) => { event.preventDefault(); });
$('#sales-payment-form').addEventListener('submit', (event) => { void submitSale(event); });
$('#return-search-form').addEventListener('submit', (event) => { void searchReturnSale(event); });
$('#return-form').addEventListener('submit', (event) => { void submitReturn(event); });
$('#writeoff-form').addEventListener('submit', (event) => { void submitWriteOff(event); });
$('#stocktake-start-form').addEventListener('submit', (event) => { void startStocktake(event); });
$('#stocktake-mode').addEventListener('change', () => {
  $('#stocktake-products-field').hidden = $('#stocktake-mode').value !== 'selected';
});
$('#stocktake-save').addEventListener('click', async () => {
  if (await saveStocktakeCounts()) {
    await openStocktake(state.selectedStocktakeId);
    message('status.saved');
  }
});
$('#stocktake-complete').addEventListener('click', () => { void completeStocktake(); });
$('#stocktake-cancel').addEventListener('click', () => { void cancelStocktake(); });
$('#debt-customer-select').addEventListener('change', (event) => {
  const customerId = event.currentTarget.value;
  state.debtCustomerId = customerId;
  if (customerId) void selectDebtCustomer(customerId);
  else {
    state.debtDetails = null;
    renderDebtSales();
  }
});
$('#debt-payment-form').addEventListener('submit', (event) => { void submitDebtPayment(event); });
$('#debt-forgiveness-form').addEventListener('submit', (event) => { void submitDebtForgiveness(event); });
$('#cash-operation-type').addEventListener('change', updateCashOperationTypes);
$('#cash-operation-form').addEventListener('submit', (event) => { void submitCashOperation(event); });
$('#cash-refresh').addEventListener('click', () => {
  cashOffset = 0;
  void loadCashPage();
});
$('#cash-from').addEventListener('change', () => {
  cashOffset = 0;
  void loadCashPage();
});
$('#cash-to').addEventListener('change', () => {
  cashOffset = 0;
  void loadCashPage();
});
$('#cash-previous').addEventListener('click', () => {
  cashOffset = Math.max(0, cashOffset - 200);
  void loadCashPage();
});
$('#cash-next').addEventListener('click', () => {
  cashOffset += 200;
  void loadCashPage();
});

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
  if (state.purchaseImportReport?.counts.error > 0) {
    message('purchase_import.fix_errors_before_submit', 'error');
    return;
  }
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const lines = [...$('#purchase-lines').children].map((row) => ({
    productId: row.querySelector('[data-purchase-product]').value,
    qty: row.querySelector('[data-purchase-qty]').value,
    unitCost: Number(row.querySelector('[data-purchase-cost]').value),
  }));
  const submittedProductIds = new Set(lines.map((line) => line.productId));
  const productPriceUpdates = state.purchaseImportApplied && state.purchaseImportReport?.updateSalePrice
    ? state.purchaseImportReport.rows
      .filter((row) => submittedProductIds.has(row.productId) &&
        row.basePrice !== undefined && row.currentBasePrice !== undefined &&
        row.basePrice !== row.currentBasePrice)
      .map((row) => ({
        productId: row.productId,
        basePrice: row.basePrice,
        expectedBasePrice: row.currentBasePrice,
      }))
    : [];
  if (productPriceUpdates.length > 0) {
    const confirmation = t('purchase_import.price_update_confirm')
      .replace('{count}', String(productPriceUpdates.length));
    if (!window.confirm(confirmation)) return;
  }
  try {
    await api('/api/purchases', {
      method: 'POST',
      body: JSON.stringify({
        warehouseId: form.get('warehouseId'),
        date: form.get('date'),
        supplier: form.get('supplier'),
        note: form.get('note'),
        lines,
        ...(productPriceUpdates.length > 0 ? { productPriceUpdates } : {}),
      }),
    });
    formElement.reset();
    $('#purchase-lines').replaceChildren();
    addPurchaseLine();
    $('#purchase-import-file').value = '';
    resetPurchaseImportPreview();
    $('#purchase-import-update-price').checked = false;
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

$('#warehouse-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const name = new FormData(formElement).get('name');
  const submit = $('#warehouse-submit');
  submit.disabled = true;
  try {
    if (editingWarehouseId) {
      await api(`/api/references/warehouses/${encodeURIComponent(editingWarehouseId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      resetWarehouseForm();
      await loadWarehouses();
      message('status.saved');
      return;
    }
    const branchId = state.warehouses[0]?.branch_id;
    if (!branchId) throw new Error('warehouses.branch_unavailable');
    await api('/api/references/warehouses', {
      method: 'POST',
      body: JSON.stringify({ branch_id: branchId, name }),
    });
    resetWarehouseForm();
    await loadWarehouses();
    message('status.created');
  } catch (error) {
    message(error.message);
  } finally {
    submit.disabled = false;
  }
});

$('#warehouse-cancel-edit').addEventListener('click', resetWarehouseForm);

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
    const pagePermissions = {};
    $('#page-permission-list').querySelectorAll('[data-page-permission]').forEach((input) => {
      pagePermissions[input.dataset.pagePermission] = Number(input.checked);
    });
    const salesWarehouseIds = [...$('#sales-warehouse-permission-list').querySelectorAll('[data-sales-warehouse]')]
      .filter((input) => input.checked)
      .map((input) => input.dataset.salesWarehouse);
    const result = await api(`/api/users/${encodeURIComponent(state.selectedUser.id)}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions, pagePermissions, salesWarehouseIds }),
    });
    state.selectedUser = { ...state.selectedUser, ...result };
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
void checkServerHealth();
window.setInterval(() => { void checkSessionStatus(); }, 10_000);
window.setInterval(() => { void checkServerHealth(); }, 15_000);
window.setInterval(() => {
  if (!$('#print-page').hidden && state.user?.permissions.sell === 1) void loadPrintJobs();
}, 5_000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    void checkSessionStatus();
    void checkServerHealth();
  }
});
api('/api/auth/me')
  .then(({ user }) => showApp(user))
  .catch((error) => showLogin(error.message === 'auth.required' ? '' : error.message));
