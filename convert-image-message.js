import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function convertImageMessageToMoment() {
  console.log('📸 CONVERTING IMAGE MESSAGE TO MOMENT');
  console.log('═══════════════════════════════════════');

  const messageId = '8d634aae-1125-41b8-a2db-296403f9c9d5';
  
  // Get the message
  const { data: message } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .single();

  if (!message) {
    console.log('❌ Message not found');
    return;
  }

  console.log(`📱 Message: ${message.message_type} from ${message.from_number}`);
  console.log(`📝 Content: "${message.content}"`);

  // Create moment for image
  const { data: moment, error } = await supabase
    .from('moments')
    .insert({
      title: 'Community Image Share',
      content: 'Community member shared an image',
      region: 'GP',
      category: 'Events',
      content_source: 'whatsapp',
      status: 'draft',
      created_by: message.from_number,
      media_urls: []
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to create moment:', error);
    return;
  }

  console.log(`✅ Created moment: ${moment.id}`);
  console.log(`📋 Title: ${moment.title}`);

  // Mark message as processed
  await supabase
    .from('messages')
    .update({ processed: true })
    .eq('id', messageId);

  console.log('✅ Message marked as processed');

  // Check current moments
  const { data: allMoments } = await supabase
    .from('moments')
    .select('*')
    .eq('content_source', 'whatsapp')
    .order('created_at', { ascending: false });

  console.log(`\n📊 Total WhatsApp moments: ${allMoments?.length || 0}`);
  allMoments?.forEach(m => {
    console.log(`• ${m.title} (${m.status})`);
  });
}

convertImageMessageToMoment();