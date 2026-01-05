-- Supabase Edge Function for MCP Advisory System
-- This replaces the Railway MCP service per playbook requirements

CREATE OR REPLACE FUNCTION mcp_advisory(
  message_content TEXT,
  message_language TEXT DEFAULT 'eng',
  message_type TEXT DEFAULT 'text',
  from_number TEXT DEFAULT NULL,
  message_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  advisory_result JSON;
  language_confidence FLOAT;
  urgency_level TEXT;
  harm_signals JSON;
  spam_indicators JSON;
  escalation_suggested BOOLEAN;
BEGIN
  -- Language confidence detection
  language_confidence := CASE
    WHEN message_content IS NULL OR LENGTH(message_content) < 10 THEN 0.1
    WHEN message_language = 'eng' AND message_content ~ '[a-zA-Z]' THEN 0.8
    WHEN message_language IN ('afr', 'zul', 'xho', 'nso', 'sot', 'tsn', 'ven', 'tso', 'ssw') THEN 0.7
    ELSE 0.5
  END;

  -- Urgency level detection
  urgency_level := CASE
    WHEN message_content ~* '\b(urgent|emergency|help|asap|now|please|crisis)\b' THEN 'high'
    WHEN message_content ~* '\b(soon|important|needed)\b' THEN 'medium'
    ELSE 'low'
  END;

  -- Harm signal detection (South African context)
  harm_signals := CASE
    WHEN message_content ~* '\b(kill|murder|bomb|attack|destroy|violence)\b' THEN
      json_build_object(
        'detected', true,
        'type', 'violence',
        'confidence', 0.8,
        'context', 'Potential threat language detected'
      )
    WHEN message_content ~* '\b(stupid|idiot|hate|racist|kaffir)\b' THEN
      json_build_object(
        'detected', true,
        'type', 'harassment',
        'confidence', 0.6,
        'context', 'Potential harassment or hate speech'
      )
    WHEN message_content ~* '\b(scam|fraud|money|bitcoin|investment|loan)\b' THEN
      json_build_object(
        'detected', true,
        'type', 'fraud',
        'confidence', 0.5,
        'context', 'Potential financial scam indicators'
      )
    ELSE
      json_build_object(
        'detected', false,
        'type', 'none',
        'confidence', 0,
        'context', 'No harm signals detected'
      )
  END;

  -- Spam pattern detection
  spam_indicators := CASE
    WHEN message_content ~* '\b(win|prize|money|free|click|link|www\.|http)\b' THEN
      json_build_object(
        'detected', true,
        'patterns', ARRAY['promotional'],
        'confidence', 0.4
      )
    WHEN LENGTH(message_content) > 500 THEN
      json_build_object(
        'detected', true,
        'patterns', ARRAY['excessive_length'],
        'confidence', 0.3
      )
    WHEN message_content ~ '(.)\1{4,}' THEN
      json_build_object(
        'detected', true,
        'patterns', ARRAY['repeated_chars'],
        'confidence', 0.2
      )
    ELSE
      json_build_object(
        'detected', false,
        'patterns', ARRAY[]::TEXT[],
        'confidence', 0
      )
  END;

  -- Escalation logic
  escalation_suggested := (
    (harm_signals->>'confidence')::FLOAT > 0.7 OR
    urgency_level = 'high' OR
    (spam_indicators->>'confidence')::FLOAT > 0.6
  );

  -- Build advisory result
  advisory_result := json_build_object(
    'language_confidence', language_confidence,
    'urgency_level', urgency_level,
    'harm_signals', harm_signals,
    'spam_indicators', spam_indicators,
    'escalation_suggested', escalation_suggested,
    'notes', 'Supabase-native MCP analysis',
    'processed_at', NOW(),
    'version', '1.0'
  );

  RETURN advisory_result;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION mcp_advisory TO service_role;

-- Create advisory trigger for automatic analysis
CREATE OR REPLACE FUNCTION trigger_mcp_analysis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  advisory_result JSON;
BEGIN
  -- Call MCP analysis function
  SELECT mcp_advisory(
    NEW.content,
    NEW.language_detected,
    NEW.message_type,
    NEW.from_number,
    NEW.created_at
  ) INTO advisory_result;

  -- Insert advisory results
  INSERT INTO advisories (
    message_id,
    advisory_type,
    confidence,
    details,
    escalation_suggested
  ) VALUES (
    NEW.id,
    'comprehensive',
    COALESCE((advisory_result->>'language_confidence')::FLOAT, 0),
    advisory_result,
    COALESCE((advisory_result->>'escalation_suggested')::BOOLEAN, false)
  );

  RETURN NEW;
END;
$$;

-- Create trigger on messages table
DROP TRIGGER IF EXISTS messages_mcp_analysis ON messages;
CREATE TRIGGER messages_mcp_analysis
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_mcp_analysis();

-- Create function to get MCP statistics
CREATE OR REPLACE FUNCTION get_mcp_stats(timeframe_days INTEGER DEFAULT 7)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  start_date TIMESTAMPTZ;
BEGIN
  start_date := NOW() - (timeframe_days || ' days')::INTERVAL;
  
  SELECT json_build_object(
    'total_analyzed', COUNT(*),
    'escalations', COUNT(*) FILTER (WHERE escalation_suggested = true),
    'high_confidence', COUNT(*) FILTER (WHERE confidence > 0.7),
    'avg_confidence', ROUND(AVG(confidence)::NUMERIC, 3),
    'by_type', json_object_agg(
      COALESCE((details->>'harm_signals'->>'type')::TEXT, 'none'),
      COUNT(*)
    )
  )
  INTO result
  FROM advisories
  WHERE created_at >= start_date;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_mcp_stats TO service_role;