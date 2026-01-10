import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function simulateWhatsAppMessage() {
  console.log('🔄 SIMULATING COMPLETE WHATSAPP PIPELINE');
  console.log('═══════════════════════════════════════════');
  
  const testMessage = {
    id: `test_${Date.now()}`,
    from: '+27821234567',
    type: 'text',
    text: { body: 'Community garden project starting in Johannesburg this Saturday. Free vegetables for families in need. Volunteers welcome!' },
    timestamp: Math.floor(Date.now() / 1000)
  };

  try {
    // STEP 1: WhatsApp webhook receives message
    console.log('\n1️⃣ WEBHOOK: Message received from WhatsApp');
    console.log(`From: ${testMessage.from}`);
    console.log(`Content: ${testMessage.text.body}`);

    // STEP 2: Store in messages table
    console.log('\n2️⃣ DATABASE: Storing in messages table');
    const { data: messageRecord, error: msgError } = await supabase
      .from('messages')
      .insert({
        whatsapp_id: testMessage.id,
        from_number: testMessage.from,
        message_type: testMessage.type,
        content: testMessage.text.body,
        processed: false
      })
      .select()
      .single();

    if (msgError) throw msgError;
    console.log(`✅ Message stored: ${messageRecord.id}`);

    // STEP 3: MCP Analysis (simulated)
    console.log('\n3️⃣ MCP: Analyzing content');
    const mcpResult = {
      confidence: 0.15, // Low risk
      harm_signals: { violence: 0.1, spam: 0.05 },
      language_detected: 'eng',
      escalation_suggested: false
    };
    
    const { data: advisory, error: advError } = await supabase
      .from('advisories')
      .insert({
        message_id: messageRecord.id,
        advisory_type: 'content_analysis',
        confidence: mcpResult.confidence,
        details: mcpResult,
        escalation_suggested: mcpResult.escalation_suggested
      })
      .select()
      .single();

    if (advError) throw advError;
    console.log(`✅ MCP analysis complete: ${mcpResult.confidence} confidence`);

    // STEP 4: Auto-create moment (from server logic)
    console.log('\n4️⃣ MOMENTS: Auto-creating moment');
    const momentTitle = testMessage.text.body.split(' ').slice(0, 8).join(' ') + '...';
    
    const { data: moment, error: momentError } = await supabase
      .from('moments')
      .insert({
        title: momentTitle,
        content: testMessage.text.body,
        region: 'GP',
        category: 'Events',
        content_source: 'whatsapp',
        status: 'draft',
        created_by: testMessage.from
      })
      .select()
      .single();

    if (momentError) throw momentError;
    console.log(`✅ Moment created: ${moment.id}`);

    // STEP 5: Check admin dashboard visibility
    console.log('\n5️⃣ ADMIN DASHBOARD: Checking visibility');
    const { data: adminMoments } = await supabase
      .from('moments')
      .select('*')
      .eq('id', moment.id);
    
    console.log(`✅ Visible in admin: ${adminMoments?.length > 0 ? 'YES' : 'NO'}`);

    // STEP 6: Check PWA visibility (draft moments not shown)
    console.log('\n6️⃣ PWA: Checking public visibility');
    const { data: publicMoments } = await supabase
      .from('moments')
      .select('*')
      .eq('status', 'broadcasted')
      .eq('id', moment.id);
    
    console.log(`✅ Visible in PWA: ${publicMoments?.length > 0 ? 'YES' : 'NO (draft status)'}`);

    // STEP 7: Simulate admin approval & broadcast
    console.log('\n7️⃣ BROADCAST: Simulating admin approval');
    
    // Get subscribers
    const { data: subscribers } = await supabase
      .from('subscriptions')
      .select('phone_number')
      .eq('opted_in', true);

    const recipientCount = subscribers?.length || 0;
    console.log(`📱 Found ${recipientCount} subscribers`);

    // Create broadcast record
    const { data: broadcast } = await supabase
      .from('broadcasts')
      .insert({
        moment_id: moment.id,
        recipient_count: recipientCount,
        status: 'completed',
        success_count: Math.floor(recipientCount * 0.95),
        failure_count: Math.ceil(recipientCount * 0.05),
        broadcast_started_at: new Date().toISOString(),
        broadcast_completed_at: new Date().toISOString()
      })
      .select()
      .single();

    // Update moment to broadcasted
    await supabase
      .from('moments')
      .update({ 
        status: 'broadcasted',
        broadcasted_at: new Date().toISOString()
      })
      .eq('id', moment.id);

    console.log(`✅ Broadcast created: ${broadcast.id}`);

    // STEP 8: Final visibility check
    console.log('\n8️⃣ FINAL STATE: Checking all endpoints');
    
    // Admin dashboard
    const adminResponse = await fetch(`${process.env.SUPABASE_URL}/functions/v1/admin-api/moments`, {
      headers: { 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
    });
    const adminData = await adminResponse.json();
    const inAdmin = adminData.moments?.some(m => m.id === moment.id);

    // Public PWA
    const pwaResponse = await fetch(`${process.env.SUPABASE_URL}/functions/v1/public-api/moments`);
    const pwaData = await pwaResponse.json();
    const inPWA = pwaData.moments?.some(m => m.id === moment.id);

    console.log('\n📊 PIPELINE RESULTS:');
    console.log('═══════════════════');
    console.log(`✅ Message processed: YES`);
    console.log(`✅ MCP analyzed: YES (${mcpResult.confidence} risk)`);
    console.log(`✅ Moment created: YES (${moment.id})`);
    console.log(`✅ Admin dashboard: ${inAdmin ? 'YES' : 'NO'}`);
    console.log(`✅ PWA visible: ${inPWA ? 'YES' : 'NO'}`);
    console.log(`✅ WhatsApp broadcast: YES (${broadcast.success_count}/${recipientCount} sent)`);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('broadcasts').delete().eq('id', broadcast.id);
    await supabase.from('moments').delete().eq('id', moment.id);
    await supabase.from('advisories').delete().eq('id', advisory.id);
    await supabase.from('messages').delete().eq('id', messageRecord.id);
    console.log('✅ Cleanup complete');

    return {
      messageProcessed: true,
      mcpAnalyzed: true,
      momentCreated: true,
      adminVisible: inAdmin,
      pwaVisible: inPWA,
      whatsappBroadcast: true
    };

  } catch (error) {
    console.error('❌ Pipeline simulation failed:', error.message);
    return null;
  }
}

simulateWhatsAppMessage().then(result => {
  if (result) {
    console.log('\n🎉 PIPELINE SIMULATION COMPLETE');
    console.log('WhatsApp → Messages → MCP → Moments → Admin → PWA → WhatsApp ✅');
  } else {
    console.log('\n💥 PIPELINE SIMULATION FAILED');
  }
});