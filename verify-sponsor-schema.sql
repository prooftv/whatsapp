-- Verification queries for sponsor branding integration
-- Run these in Supabase SQL Editor to verify schema

-- 1. Check if sponsor_assets table exists
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'sponsor_assets'
ORDER BY ordinal_position;

-- 2. Check enhanced sponsors table columns
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'sponsors'
ORDER BY ordinal_position;

-- 3. Verify sponsor_assets indexes
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'sponsor_assets';

-- 4. Check if sample data exists
SELECT 
  s.name,
  s.display_name,
  s.tier,
  s.logo_url,
  COUNT(sa.id) as asset_count
FROM sponsors s
LEFT JOIN sponsor_assets sa ON s.id = sa.sponsor_id
GROUP BY s.id, s.name, s.display_name, s.tier, s.logo_url
ORDER BY s.created_at DESC;

-- 5. Test sponsor assets relationship
SELECT 
  s.display_name as sponsor_name,
  sa.asset_type,
  sa.asset_url,
  sa.is_active,
  sa.created_at
FROM sponsors s
JOIN sponsor_assets sa ON s.id = sa.sponsor_id
WHERE sa.is_active = true
ORDER BY sa.created_at DESC
LIMIT 10;

-- 6. Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('sponsors', 'sponsor_assets')
ORDER BY tablename, policyname;