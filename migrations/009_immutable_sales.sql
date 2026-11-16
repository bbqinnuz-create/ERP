CREATE TRIGGER trg_sales_no_update
BEFORE UPDATE ON sales
BEGIN
  SELECT RAISE(ABORT, 'sales_are_immutable');
END;

CREATE TRIGGER trg_sales_no_delete
BEFORE DELETE ON sales
BEGIN
  SELECT RAISE(ABORT, 'sales_are_immutable');
END;

CREATE TRIGGER trg_sale_lines_no_update
BEFORE UPDATE ON sale_lines
BEGIN
  SELECT RAISE(ABORT, 'sales_are_immutable');
END;

CREATE TRIGGER trg_sale_lines_no_delete
BEFORE DELETE ON sale_lines
BEGIN
  SELECT RAISE(ABORT, 'sales_are_immutable');
END;

CREATE TRIGGER trg_sale_discounts_no_update
BEFORE UPDATE ON sale_discounts
BEGIN
  SELECT RAISE(ABORT, 'sales_are_immutable');
END;

CREATE TRIGGER trg_sale_discounts_no_delete
BEFORE DELETE ON sale_discounts
BEGIN
  SELECT RAISE(ABORT, 'sales_are_immutable');
END;

CREATE TRIGGER trg_paid_counter_orders_no_update
BEFORE UPDATE ON counter_orders
WHEN OLD.status = 'paid'
BEGIN
  SELECT RAISE(ABORT, 'paid_counter_orders_are_immutable');
END;

CREATE TRIGGER trg_paid_counter_orders_no_delete
BEFORE DELETE ON counter_orders
WHEN OLD.status = 'paid'
BEGIN
  SELECT RAISE(ABORT, 'paid_counter_orders_are_immutable');
END;
