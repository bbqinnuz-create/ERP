ALTER TABLE print_jobs
  ADD COLUMN lang TEXT NOT NULL DEFAULT 'ru' CHECK (lang IN ('ru', 'uz'));

ALTER TABLE print_jobs
  ADD COLUMN snapshot_json TEXT;

UPDATE print_jobs
SET lang = COALESCE(
  (SELECT s.lang FROM sales s WHERE print_jobs.doc_type = 'sale' AND s.id = print_jobs.doc_id),
  'ru'
);
