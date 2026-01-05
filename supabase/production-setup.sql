-- Create admin users and roles for production
-- Run this in Supabase SQL Editor after setting up the database

-- First, create admin users in Supabase Auth (do this via Supabase Dashboard)
-- Then run this SQL to assign roles

-- Insert admin role mappings (use actual UUIDs from auth.users table)
-- First create users via Supabase Auth Dashboard, then get their UUIDs and update below
-- Example: SELECT id, email FROM auth.users WHERE email LIKE '%unamifoundation.org';

-- Replace these UUIDs with actual user IDs from auth.users table
-- INSERT INTO admin_roles (user_id, role) VALUES
-- ('00000000-0000-0000-0000-000000000001', 'superadmin'),
-- ('00000000-0000-0000-0000-000000000002', 'moderator'),
-- ('00000000-0000-0000-0000-000000000003', 'content_admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- Create default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('app_name', 'Unami Foundation Moments', 'text', 'Application name'),
('app_logo', '/logo.png', 'text', 'Application logo URL'),
('primary_color', '#2563eb', 'text', 'Primary brand color'),
('whatsapp_number', '+27 65 829 5041', 'text', 'WhatsApp Business number'),
('support_email', 'support@unamifoundation.org', 'text', 'Support contact email'),
('max_moments_per_day', '50', 'text', 'Maximum moments per day'),
('auto_broadcast_enabled', 'true', 'text', 'Enable automatic broadcasting'),
('maintenance_mode', 'false', 'text', 'Maintenance mode status'),
('analytics_enabled', 'true', 'text', 'Enable analytics tracking'),
('default_region', 'National', 'text', 'Default region for moments')
ON CONFLICT (setting_key) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description;

-- Create default sponsor
INSERT INTO sponsors (name, display_name, contact_email, active) VALUES
('unami_foundation', 'Unami Foundation Partners', 'partners@unamifoundation.org', true)
ON CONFLICT (name) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    contact_email = EXCLUDED.contact_email;

-- Verify setup
SELECT 'Admin Roles:' as setup_item, CAST(user_id AS TEXT) as item_key, role as item_value FROM admin_roles
UNION ALL
SELECT 'System Settings:' as setup_item, setting_key as item_key, setting_value as item_value FROM system_settings
UNION ALL  
SELECT 'Sponsors:' as setup_item, name as item_key, display_name as item_value FROM sponsors WHERE active = true;