-- Just insert superadmin user into existing table
INSERT INTO admin_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'superadmin')
ON CONFLICT (user_id) DO UPDATE SET role = 'superadmin';