import { supabase } from '../config/supabase.js';

export const callMCPAdvisory = async (messageData) => {
  try {
    // Use Supabase-native MCP function (replaces Railway)
    const { data, error } = await supabase.rpc('mcp_advisory', {
      message_content: messageData.content,
      message_language: messageData.language_detected,
      message_type: messageData.message_type,
      from_number: messageData.from_number,
      message_timestamp: messageData.timestamp
    });
    
    if (error) throw error;
    
    const advisory = data;
    
    // Store advisory results in database
    try {
      await supabase.from('advisories').insert([
        {
          message_id: messageData.id,
          advisory_type: 'language',
          confidence: advisory.language_confidence,
          details: { language: messageData.language_detected }
        },
        {
          message_id: messageData.id,
          advisory_type: 'urgency',
          confidence: advisory.urgency_level === 'high' ? 0.9 : advisory.urgency_level === 'medium' ? 0.6 : 0.3,
          details: { level: advisory.urgency_level }
        },
        {
          message_id: messageData.id,
          advisory_type: 'harm',
          confidence: advisory.harm_signals.confidence,
          details: advisory.harm_signals,
          escalation_suggested: advisory.escalation_suggested
        },
        {
          message_id: messageData.id,
          advisory_type: 'spam',
          confidence: advisory.spam_indicators.confidence,
          details: advisory.spam_indicators
        }
      ]);
    } catch (dbError) {
      console.log('Advisory storage handled by trigger:', dbError.message);
    }
    
    return advisory;
    
  } catch (error) {
    console.error('Supabase MCP Advisory error:', error.message);
    
    // Return safe default when MCP fails
    return {
      language_confidence: 0.5,
      urgency_level: 'low',
      harm_signals: { detected: false, confidence: 0, type: 'none', context: 'MCP unavailable' },
      spam_indicators: { detected: false, confidence: 0, patterns: [] },
      escalation_suggested: false,
      notes: 'Supabase MCP service unavailable - using defaults'
    };
  }
};