#!/usr/bin/env node

import { supabase } from './config/supabase.js';
import fs from 'fs';

async function deployFunction() {
  console.log('📦 Deploying updated soft-moderation function...');
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('./supabase/soft-moderation-final.sql', 'utf8');
    
    // Execute the SQL to update the function
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });
    
    if (error) {
      console.error('❌ Deployment error:', error);
      
      // Try alternative approach - execute parts manually
      console.log('🔄 Trying manual function update...');
      
      const updateFunctionSQL = `
        CREATE OR REPLACE FUNCTION auto_approve_message_to_moment(p_message_id UUID)
        RETURNS BOOLEAN
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          message_record RECORD;
          advisory_record RECORD;
          moment_id UUID;
          auto_title TEXT;
          auto_region TEXT;
          auto_category TEXT;
        BEGIN
          SELECT * INTO message_record FROM messages WHERE id = p_message_id;
          IF NOT FOUND THEN
            RAISE EXCEPTION 'Message not found: %', p_message_id;
          END IF;
          
          SELECT * INTO advisory_record 
          FROM advisories 
          WHERE message_id = p_message_id 
          ORDER BY created_at DESC 
          LIMIT 1;
          
          IF advisory_record.escalation_suggested = true THEN
            RETURN false;
          END IF;
          
          IF advisory_record.confidence < 0.5 THEN
            RETURN false;
          END IF;
          
          auto_title := CASE
            WHEN LENGTH(message_record.content) <= 50 THEN message_record.content
            WHEN POSITION('.' IN message_record.content) > 0 AND POSITION('.' IN message_record.content) <= 80 THEN
              SUBSTRING(message_record.content FROM 1 FOR POSITION('.' IN message_record.content) - 1)
            ELSE
              SUBSTRING(message_record.content FROM 1 FOR 50) || '...'
          END;
          
          auto_region := 'National';
          auto_category := 'Community';
          
          INSERT INTO moments (
            title, content, region, category, language, content_source, status, created_by, media_urls
          ) VALUES (
            auto_title, message_record.content, auto_region, auto_category,
            COALESCE(message_record.language_detected, 'eng'), 'community', 'draft', 'auto_moderation',
            CASE WHEN message_record.media_url IS NOT NULL THEN ARRAY[message_record.media_url] ELSE ARRAY[]::TEXT[] END
          ) RETURNING id INTO moment_id;
          
          UPDATE messages SET processed = true WHERE id = p_message_id;
          
          RETURN true;
        END;
        $$;
      `;
      
      const { error: funcError } = await supabase.rpc('exec_sql', {
        sql_query: updateFunctionSQL
      });
      
      if (funcError) {
        console.error('❌ Function update failed:', funcError);
      } else {
        console.log('✅ Function updated successfully');
      }
    } else {
      console.log('✅ Soft-moderation function deployed successfully');
    }
    
    // Test the function
    console.log('🧪 Testing auto-approval process...');
    const { data: result, error: testError } = await supabase.rpc('process_auto_approval_queue');
    
    if (testError) {
      console.error('❌ Test error:', testError);
    } else {
      console.log(`✅ Processed ${result || 0} messages`);
    }
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
  }
}

deployFunction().then(() => {
  console.log('🏁 Deployment completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Deployment failed:', error);
  process.exit(1);
});