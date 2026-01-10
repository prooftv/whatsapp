#!/usr/bin/env node

import { supabase } from './config/supabase.js';

async function fixImageMessages() {
  console.log('🔧 Fixing existing image messages...');
  
  try {
    // Get all image messages that are processed but have no media_url
    const { data: imageMessages, error } = await supabase
      .from('messages')
      .select('id, content, message_type, from_number, created_at')
      .eq('message_type', 'image')
      .is('media_url', null)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Error fetching messages:', error);
      return;
    }
    
    console.log(`📱 Found ${imageMessages?.length || 0} image messages to fix`);
    
    let processedCount = 0;
    
    for (const message of imageMessages || []) {
      try {
        // Create a moment from this image message
        const title = message.content || 'Community Image Share';
        const content = message.content || '[Image shared by community member]';
        
        const { data: moment, error: momentError } = await supabase
          .from('moments')
          .insert({
            title: title.substring(0, 100),
            content: content,
            region: 'GP',
            category: 'Events',
            content_source: 'community',
            status: 'draft',
            created_by: 'image_fixer',
            media_urls: [] // Will be empty until we can download the actual media
          })
          .select()
          .single();
        
        if (momentError) {
          console.error(`❌ Failed to create moment for message ${message.id}:`, momentError);
          continue;
        }
        
        console.log(`✅ Created moment "${moment.title}" from image message`);
        processedCount++;
        
      } catch (error) {
        console.error(`❌ Error processing message ${message.id}:`, error);
      }
    }
    
    console.log(`🎯 Successfully processed ${processedCount} image messages`);
    
    // Now check the moments
    const { data: moments } = await supabase
      .from('moments')
      .select('id, title, content_source, media_urls, status')
      .eq('content_source', 'community')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`\\n📋 Community moments (${moments?.length || 0}):`);
    moments?.forEach((moment, i) => {
      console.log(`${i + 1}. ${moment.title}`);
      console.log(`   Status: ${moment.status}`);
      console.log(`   Media URLs: ${JSON.stringify(moment.media_urls)}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

fixImageMessages().then(() => {
  console.log('🏁 Image message fix completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fix failed:', error);
  process.exit(1);
});