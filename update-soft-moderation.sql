-- Updated soft moderation to handle media messages
CREATE OR REPLACE FUNCTION process_auto_approval_queue()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_record RECORD;
  processed_count INTEGER := 0;
BEGIN
  -- Process messages that are ready for auto-approval (including media)
  FOR message_record IN
    SELECT m.id, m.content, m.from_number, m.message_type
    FROM messages m
    JOIN advisories a ON m.id = a.message_id
    WHERE m.processed = false
      AND a.escalation_suggested = false
      AND a.confidence >= 0.8
      AND m.created_at > NOW() - INTERVAL '24 hours'
      AND (
        LENGTH(m.content) >= 10 OR  -- Text messages with content
        m.message_type IN ('image', 'video', 'audio', 'document')  -- Media messages
      )
      AND LENGTH(COALESCE(m.content, '')) <= 1000
    ORDER BY m.created_at ASC
    LIMIT 10
  LOOP
    BEGIN
      -- Attempt to auto-approve (including media)
      IF auto_approve_message_to_moment_with_media(message_record.id) THEN
        processed_count := processed_count + 1;
        RAISE NOTICE 'Auto-approved message % from %', message_record.id, message_record.from_number;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log failure but continue processing
      RAISE NOTICE 'Failed to auto-approve message %: %', message_record.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN processed_count;
END;
$$;

-- Updated function to handle media messages
CREATE OR REPLACE FUNCTION auto_approve_message_to_moment_with_media(p_message_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_record RECORD;
  advisory_record RECORD;
  moment_id UUID;
  auto_title TEXT;
  auto_content TEXT;
  auto_region TEXT;
  auto_category TEXT;
BEGIN
  -- Get message details
  SELECT * INTO message_record FROM messages WHERE id = p_message_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found: %', p_message_id;
  END IF;
  
  -- Get latest advisory for this message
  SELECT * INTO advisory_record 
  FROM advisories 
  WHERE message_id = p_message_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Check if message qualifies for auto-approval
  IF advisory_record.escalation_suggested = true THEN
    RETURN false;
  END IF;
  
  IF advisory_record.confidence < 0.8 THEN
    RETURN false;
  END IF;
  
  -- Handle media messages with empty content
  IF message_record.message_type = 'image' AND (message_record.content = '' OR message_record.content IS NULL) THEN
    auto_title := 'Community Image Share';
    auto_content := 'Community member shared an image';
  ELSIF message_record.message_type = 'video' AND (message_record.content = '' OR message_record.content IS NULL) THEN
    auto_title := 'Community Video Share';
    auto_content := 'Community member shared a video';
  ELSIF message_record.message_type = 'audio' AND (message_record.content = '' OR message_record.content IS NULL) THEN
    auto_title := 'Community Audio Share';
    auto_content := 'Community member shared an audio message';
  ELSIF message_record.message_type = 'document' AND (message_record.content = '' OR message_record.content IS NULL) THEN
    auto_title := 'Community Document Share';
    auto_content := 'Community member shared a document';
  ELSE
    -- Regular text content
    auto_title := CASE
      WHEN LENGTH(message_record.content) <= 50 THEN message_record.content
      WHEN POSITION('.' IN message_record.content) > 0 AND POSITION('.' IN message_record.content) <= 80 THEN
        SUBSTRING(message_record.content FROM 1 FOR POSITION('.' IN message_record.content) - 1)
      ELSE
        SUBSTRING(message_record.content FROM 1 FOR 50) || '...'
    END;
    auto_content := message_record.content;
  END IF;
  
  -- Auto-detect region (default to National)
  auto_region := 'National';
  
  -- Auto-detect category
  auto_category := CASE
    WHEN message_record.message_type IN ('image', 'video', 'audio', 'document') THEN 'Community'
    WHEN auto_content ~* '\\b(school|education|learn|study|training|workshop)\\b' THEN 'Education'
    WHEN auto_content ~* '\\b(safety|security|crime|police|emergency)\\b' THEN 'Safety'
    WHEN auto_content ~* '\\b(culture|heritage|festival|celebration|tradition)\\b' THEN 'Culture'
    WHEN auto_content ~* '\\b(job|work|opportunity|employment|business)\\b' THEN 'Opportunity'
    WHEN auto_content ~* '\\b(event|meeting|gathering|conference)\\b' THEN 'Events'
    WHEN auto_content ~* '\\b(health|medical|clinic|hospital|doctor)\\b' THEN 'Health'
    WHEN auto_content ~* '\\b(technology|tech|digital|computer|internet)\\b' THEN 'Technology'
    ELSE 'Community'
  END;
  
  -- Create moment from message
  INSERT INTO moments (
    title,
    content,
    region,
    category,
    language,
    content_source,
    status,
    created_by
  ) VALUES (
    auto_title,
    auto_content,
    auto_region,
    auto_category,
    COALESCE(message_record.language_detected, 'eng'),
    'whatsapp',
    'draft',
    message_record.from_number
  ) RETURNING id INTO moment_id;
  
  -- Mark message as processed
  UPDATE messages 
  SET processed = true 
  WHERE id = p_message_id;
  
  -- Log the auto-approval
  INSERT INTO flags (
    message_id,
    flag_type,
    severity,
    action_taken,
    notes
  ) VALUES (
    p_message_id,
    'auto_approved',
    'low',
    'converted_to_moment',
    'Automatically approved and converted to moment: ' || moment_id
  );
  
  RETURN true;
END;
$$;