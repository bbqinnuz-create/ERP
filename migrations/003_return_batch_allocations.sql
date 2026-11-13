CREATE TABLE return_line_batch_allocations (
  id                    TEXT PRIMARY KEY,
  return_line_id        TEXT NOT NULL REFERENCES return_lines(id),
  sale_line_allocation_id TEXT NOT NULL REFERENCES sale_line_batch_allocations(id),
  batch_id              TEXT NOT NULL REFERENCES batches(id),
  qty                   INTEGER NOT NULL CHECK (qty > 0),
  unit_cost             INTEGER NOT NULL CHECK (unit_cost >= 0),
  stock_movement_id     TEXT NOT NULL REFERENCES stock_movements(id)
);

CREATE INDEX idx_return_allocations_line ON return_line_batch_allocations(return_line_id);
CREATE INDEX idx_return_allocations_sale_allocation ON return_line_batch_allocations(sale_line_allocation_id);

CREATE TRIGGER trg_return_line_batch_allocations_no_update BEFORE UPDATE ON return_line_batch_allocations
BEGIN SELECT RAISE(ABORT, 'return_line_batch_allocations is append-only: UPDATE is forbidden'); END;

CREATE TRIGGER trg_return_line_batch_allocations_no_delete BEFORE DELETE ON return_line_batch_allocations
BEGIN SELECT RAISE(ABORT, 'return_line_batch_allocations is append-only: DELETE is forbidden'); END;
