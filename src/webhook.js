import { supabase } from '../config/supabase.js';
import { callMCPAdvisory } from './advisory.js';
import { detectLanguage } from './language.js';
import { downloadAndStoreMedia } from './media.js';
import axios from 'axios';

export function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.warn('Webhook verification failed');
    res.status(403).json({ error: 'Forbidden' });
  }
}

export async function handleWebhook(req, res) {
  try {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));
    
    const { entry } = req.body;
    if (!entry || !entry[0]) {
      return res.status(200).json({ status: 'no_entry' });
    }

    const changes = entry[0].changes;
    if (!changes || !changes[0]) {
      return res.status(200).json({ status: 'no_changes' });
    }

    const { value } = changes[0];
    if (!value.messages || value.messages.length === 0) {
      return res.status(200).json({ status: 'no_messages' });
    }

    // Process each message
    for (const message of value.messages) {
      await processMessage(message, value);
    }

    res.status(200).json({ status: 'processed' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
}

async function processMessage(message, value) {
  try {
    const fromNumber = message.from;
    const messageType = message.type;
    let content = '';
    let mediaId = null;

    // Extract content based on message type
    switch (messageType) {
      case 'text':
        content = message.text.body;
        break;
      case 'image':
        content = message.image.caption || '[Image]';
        mediaId = message.image.id;
        break;
      case 'audio':
        content = '[Audio message]';
        mediaId = message.audio.id;
        break;
      case 'video':
        content = message.video.caption || '[Video]';
        mediaId = message.video.id;
        break;
      case 'document':
        content = message.document.filename || '[Document]';
        mediaId = message.document.id;
        break;
      default:
        content = `[${messageType} message]`;
    }

    // Handle opt-out commands
    if (content.toLowerCase().trim() === 'stop' || content.toLowerCase().trim() === 'unsubscribe') {
      await handleOptOut(fromNumber);
      return;
    }

    // Handle opt-in commands
    if (content.toLowerCase().trim() === 'start' || content.toLowerCase().trim() === 'join') {
      await handleOptIn(fromNumber);
      return;
    }

    // Detect language
    const languageDetected = detectLanguage(content);

    // Store message in database
    const { data: messageRecord, error: insertError } = await supabase
      .from('messages')
      .insert({
        from_number: fromNumber,
        message_type: messageType,
        content,
        language_detected: languageDetected,
        media_id: mediaId,
        raw_data: message,
        processed: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Message insert error:', insertError);
      return;
    }

    // Process media if present
    if (mediaId) {
      try {
        await downloadAndStoreMedia(mediaId, messageRecord.id, messageType);
      } catch (mediaError) {
        console.error('Media processing error:', mediaError);
      }
    }

    // Call MCP advisory (Supabase-native)
    try {
      await callMCPAdvisory({
        id: messageRecord.id,
        content,
        language_detected: languageDetected,
        message_type: messageType,
        from_number: fromNumber,
        timestamp: new Date().toISOString()
      });
    } catch (mcpError) {
      console.error('MCP advisory error:', mcpError);
    }

    // Trigger n8n workflow if configured (optional)
    if (process.env.N8N_WEBHOOK_URL) {
      await triggerN8nWorkflow({
        message: messageRecord,
        advisory: { escalation_needed: false }, // Will be updated by MCP
        trust: { escalation_needed: false }
      });
    }

    // Mark as processed
    await supabase
      .from('messages')
      .update({ processed: true })
      .eq('id', messageRecord.id);

  } catch (error) {
    console.error('Message processing error:', error);
  }
}

async function handleOptOut(phoneNumber) {
  try {
    await supabase
      .from('subscriptions')
      .upsert({
        phone_number: phoneNumber,
        opted_in: false,
        opted_out_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      });
    console.log(`User ${phoneNumber} opted out`);
  } catch (error) {
    console.error('Opt-out error:', error);
  }
}

async function handleOptIn(phoneNumber) {
  try {
    await supabase
      .from('subscriptions')
      .upsert({
        phone_number: phoneNumber,
        opted_in: true,
        opted_in_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        regions: ['National'],
        categories: ['Education', 'Safety', 'Culture', 'Opportunity', 'Events', 'Health', 'Technology']
      });
    console.log(`User ${phoneNumber} opted in`);
  } catch (error) {
    console.error('Opt-in error:', error);
  }
}

async function triggerN8nWorkflow(data) {
  try {
    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nUrl) {
      console.log('N8N webhook URL not configured, skipping workflow trigger');
      return;
    }

    const response = await axios.post(`${n8nUrl}/webhook/whatsapp-inbound`, data, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_WEBHOOK_SECRET || 'default'
      }
    });

    console.log('N8N workflow triggered successfully');
  } catch (error) {
    console.error('N8N workflow trigger failed:', error.message);
    // Don't throw - n8n failure shouldn't break message processing
  }
}