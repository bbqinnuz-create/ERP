INSERT INTO user_permissions (user_id, permission, value)
SELECT u.id, permissions.permission, permissions.value
FROM users u
CROSS JOIN (
  SELECT 'pay_cash' AS permission, 1 AS value
  UNION ALL SELECT 'pay_card', 1
  UNION ALL SELECT 'pay_transfer', 1
  UNION ALL SELECT 'pay_at_counter', 0
) AS permissions
WHERE u.role = 'cashier';
