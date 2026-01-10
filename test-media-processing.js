#!/usr/bin/env node

import { supabase } from './config/supabase.js';

async function testMediaProcessing() {
  console.log('🧪 Testing media processing for moments...');
  
  try {
    // Check if there are any messages with media_url that haven't been processed
    const { data: messagesWithMedia, error: messagesError } = await supabase
      .from('messages')
      .select('id, content, media_url, message_type, from_number, created_at')
      .not('media_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (messagesError) {
      console.error('❌ Error fetching messages:', messagesError);
      return;
    }
    
    console.log(`📱 Found ${messagesWithMedia?.length || 0} messages with media`);
    
    if (messagesWithMedia && messagesWithMedia.length > 0) {
      console.log('\n📋 Messages with media:');
      messagesWithMedia.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.message_type} from ${msg.from_number}`);
        console.log(`   Content: ${msg.content?.substring(0, 50)}...`);
        console.log(`   Media: ${msg.media_url}`);
        console.log(`   Created: ${msg.created_at}`);
        console.log('');
      });
    }
    
    // Check moments with media_urls
    const { data: momentsWithMedia, error: momentsError } = await supabase
      .from('moments')
      .select('id, title, media_urls, content_source, status, created_at')
      .not('media_urls', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (momentsError) {
      console.error('❌ Error fetching moments:', momentsError);
      return;
    }
    
    console.log(`🎯 Found ${momentsWithMedia?.length || 0} moments with media`);
    
    if (momentsWithMedia && momentsWithMedia.length > 0) {
      console.log('\n📋 Moments with media:');
      momentsWithMedia.forEach((moment, i) => {
        console.log(`${i + 1}. ${moment.title}`);
        console.log(`   Source: ${moment.content_source}`);
        console.log(`   Status: ${moment.status}`);
        console.log(`   Media URLs: ${JSON.stringify(moment.media_urls)}`);
        console.log(`   Created: ${moment.created_at}`);
        console.log('');
      });
    }
    
    // Test the auto-approval process
    console.log('🔄 Testing auto-approval process...');
    const { data: autoApprovalResult, error: autoApprovalError } = await supabase
      .rpc('process_auto_approval_queue');
    
    if (autoApprovalError) {
      console.error('❌ Auto-approval error:', autoApprovalError);
    } else {
      console.log(`✅ Auto-approval processed ${autoApprovalResult || 0} messages`);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
testMediaProcessing().then(() => {
  console.log('🏁 Media processing test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});