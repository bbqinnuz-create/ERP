CREATE TABLE ip_rules (
  ip          TEXT PRIMARY KEY,
  mode        TEXT NOT NULL CHECK (mode IN ('any', 'selected')),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE ip_rule_users (
  ip       TEXT NOT NULL REFERENCES ip_rules(ip) ON DELETE CASCADE,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (ip, user_id)
);

CREATE TABLE ip_requests (
  ip             TEXT PRIMARY KEY,
  status         TEXT NOT NULL CHECK (status IN ('pending', 'denied')),
  first_seen_at  TEXT NOT NULL,
  last_seen_at   TEXT NOT NULL
);
