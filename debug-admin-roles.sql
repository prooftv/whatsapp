-- Check existing admin_roles table structure
\d admin_roles;

-- Check existing constraints
SELECT conname, consrc FROM pg_constraint WHERE conrelid = 'admin_roles'::regclass;

-- Check existing data
SELECT * FROM admin_roles LIMIT 5;