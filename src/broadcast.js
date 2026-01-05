import { supabase } from '../config/supabase.js';
import { sendWhatsAppMessage } from '../config/whatsapp.js';

// Comprehensive broadcast system for national-scale distribution
export async function broadcastMoment(momentId) {
  try {
    // Get moment details with sponsor info
    const { data: moment, error: momentError } = await supabase
      .from('moments')
      .select(`
        *,
        sponsors(display_name)
      `)
      .eq('id', momentId)
      .single();

    if (momentError || !moment) {
      throw new Error('Moment not found');
    }

    // Get active subscribers based on moment targeting
    let subscriberQuery = supabase
      .from('subscriptions')
      .select('phone_number, regions, categories')
      .eq('opted_in', true);

    // Filter by region if specified
    if (moment.region && moment.region !== 'National') {
      subscriberQuery = subscriberQuery.contains('regions', [moment.region]);
    }

    // Filter by category if specified
    if (moment.category) {
      subscriberQuery = subscriberQuery.contains('categories', [moment.category]);
    }

    const { data: subscribers, error: subError } = await subscriberQuery;
    if (subError) throw subError;

    // Create broadcast record
    const { data: broadcast, error: broadcastError } = await supabase
      .from('broadcasts')
      .insert({
        moment_id: momentId,
        recipient_count: subscribers?.length || 0,
        status: 'in_progress'
      })
      .select()
      .single();

    if (broadcastError) throw broadcastError;

    // Format WhatsApp message according to playbook rules
    const message = formatWhatsAppMessage(moment);
    
    let successCount = 0;
    let failureCount = 0;

    // Send to subscribers with rate limiting (WhatsApp API limits)
    for (const subscriber of subscribers || []) {
      try {
        await sendWhatsAppMessage(subscriber.phone_number, message, moment.media_urls);
        successCount++;
        
        // Rate limiting: 80 messages per second max
        await new Promise(resolve => setTimeout(resolve, 15));
      } catch (error) {
        console.error(`Failed to send to ${subscriber.phone_number}:`, error.message);
        failureCount++;
      }
    }

    // Update broadcast results
    await supabase
      .from('broadcasts')
      .update({
        success_count: successCount,
        failure_count: failureCount,
        status: 'completed',
        broadcast_completed_at: new Date().toISOString()
      })
      .eq('id', broadcast.id);

    // Update moment status
    await supabase
      .from('moments')
      .update({
        status: 'broadcasted',
        broadcasted_at: new Date().toISOString()
      })
      .eq('id', momentId);

    return {
      broadcast_id: broadcast.id,
      recipients: subscribers?.length || 0,
      success: successCount,
      failures: failureCount
    };

  } catch (error) {
    console.error('Broadcast error:', error.message);
    throw error;
  }
}

// Format WhatsApp message according to playbook rules
function formatWhatsAppMessage(moment) {
  let message = '';
  
  // Sponsored content labeling (playbook requirement)
  if (moment.is_sponsored && moment.sponsors?.display_name) {
    message += `📢 [Sponsored] Moment — ${moment.region}\n`;
  } else {
    message += `📢 Moment — ${moment.region}\n`;
  }
  
  // Main content (must be readable without clicks)
  message += `${moment.title}\n\n`;
  message += `${moment.content}\n\n`;
  
  // Category and region tagging in text
  message += `🏷️ ${moment.category}`;
  if (moment.region !== 'National') {
    message += ` • ${moment.region}`;
  }
  message += '\n\n';
  
  // Sponsor attribution if sponsored
  if (moment.is_sponsored && moment.sponsors?.display_name) {
    message += `Brought to you by ${moment.sponsors.display_name}\n`;
  }
  
  // Optional PWA link enhancement
  if (moment.pwa_link) {
    message += `🌐 More info: ${moment.pwa_link}\n`;
  }
  
  // Standard footer
  message += '\n📱 Reply STOP to unsubscribe';
  
  return message;
}

// Schedule and process pending broadcasts
export async function scheduleNextBroadcasts() {
  try {
    // Get moments scheduled for broadcast
    const { data: scheduledMoments, error } = await supabase
      .from('moments')
      .select('id, title, scheduled_at')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .limit(10);

    if (error) throw error;

    let processedCount = 0;
    
    for (const moment of scheduledMoments || []) {
      try {
        console.log(`Broadcasting scheduled moment: ${moment.title}`);
        await broadcastMoment(moment.id);
        processedCount++;
      } catch (error) {
        console.error(`Failed to broadcast moment ${moment.id}:`, error.message);
        
        // Mark as failed
        await supabase
          .from('moments')
          .update({ status: 'failed' })
          .eq('id', moment.id);
      }
    }

    console.log(`Processed ${processedCount} scheduled broadcasts`);
    return { scheduled: processedCount };
    
  } catch (error) {
    console.error('Scheduler error:', error.message);
    return { scheduled: 0, error: error.message };
  }
}

// Get broadcast analytics
export async function getBroadcastAnalytics(timeframe = '7d') {
  try {
    const startDate = new Date();
    if (timeframe === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (timeframe === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (timeframe === '90d') startDate.setDate(startDate.getDate() - 90);

    const { data: broadcasts, error } = await supabase
      .from('broadcasts')
      .select(`
        *,
        moments(title, region, category, is_sponsored)
      `)
      .gte('broadcast_started_at', startDate.toISOString())
      .eq('status', 'completed');

    if (error) throw error;

    const analytics = {
      totalBroadcasts: broadcasts?.length || 0,
      totalRecipients: broadcasts?.reduce((sum, b) => sum + (b.recipient_count || 0), 0) || 0,
      totalSuccess: broadcasts?.reduce((sum, b) => sum + (b.success_count || 0), 0) || 0,
      totalFailures: broadcasts?.reduce((sum, b) => sum + (b.failure_count || 0), 0) || 0,
      successRate: 0,
      byRegion: {},
      byCategory: {},
      sponsored: 0,
      organic: 0
    };

    if (analytics.totalRecipients > 0) {
      analytics.successRate = (analytics.totalSuccess / analytics.totalRecipients * 100).toFixed(1);
    }

    // Aggregate by region and category
    broadcasts?.forEach(broadcast => {
      const moment = broadcast.moments;
      if (moment) {
        // By region
        if (!analytics.byRegion[moment.region]) {
          analytics.byRegion[moment.region] = { count: 0, recipients: 0, success: 0 };
        }
        analytics.byRegion[moment.region].count++;
        analytics.byRegion[moment.region].recipients += broadcast.recipient_count || 0;
        analytics.byRegion[moment.region].success += broadcast.success_count || 0;

        // By category
        if (!analytics.byCategory[moment.category]) {
          analytics.byCategory[moment.category] = { count: 0, recipients: 0, success: 0 };
        }
        analytics.byCategory[moment.category].count++;
        analytics.byCategory[moment.category].recipients += broadcast.recipient_count || 0;
        analytics.byCategory[moment.category].success += broadcast.success_count || 0;

        // Sponsored vs organic
        if (moment.is_sponsored) {
          analytics.sponsored++;
        } else {
          analytics.organic++;
        }
      }
    });

    return analytics;
  } catch (error) {
    console.error('Analytics error:', error.message);
    throw error;
  }
}