-- Campaigns Table Schema
-- Run this before campaign-mcp.sql

-- Campaigns table for sponsored content workflow
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sponsor_id UUID REFERENCES sponsors(id),
  budget DECIMAL(10,2) DEFAULT 0,
  target_regions TEXT[] DEFAULT '{}',
  target_categories TEXT[] DEFAULT '{}',
  media_urls TEXT[] DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'published', 'rejected')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_sponsor_id ON campaigns(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

-- RLS policies for campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin view campaigns" ON campaigns
  FOR SELECT USING (check_admin_role('moderator'));

CREATE POLICY "Admin manage campaigns" ON campaigns
  FOR ALL USING (check_admin_role('content_admin'));

-- Update trigger for campaigns
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

COMMENT ON TABLE campaigns IS 'Sponsored content campaigns with approval workflow';