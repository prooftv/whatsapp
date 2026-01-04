import { supabase } from './config/supabase.js';

async function verifyCampaignTables() {
  console.log('🔍 Verifying campaign tables...');
  
  try {
    // Check campaigns table
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('count')
      .limit(1);
    
    if (campaignsError) {
      console.log('❌ campaigns table:', campaignsError.message);
    } else {
      console.log('✅ campaigns table exists');
    }

    // Check campaign_advisories table
    const { data: advisories, error: advisoriesError } = await supabase
      .from('campaign_advisories')
      .select('count')
      .limit(1);
    
    if (advisoriesError) {
      console.log('❌ campaign_advisories table:', advisoriesError.message);
    } else {
      console.log('✅ campaign_advisories table exists');
    }

    // Test campaign risk assessment function
    const { data: riskData, error: riskError } = await supabase
      .rpc('get_campaign_risk_assessment', { p_campaign_id: '00000000-0000-0000-0000-000000000000' });
    
    if (riskError) {
      console.log('❌ get_campaign_risk_assessment function:', riskError.message);
    } else {
      console.log('✅ get_campaign_risk_assessment function works');
      console.log('📊 Sample result:', riskData);
    }

    // Test campaign creation
    const { data: testCampaign, error: createError } = await supabase
      .from('campaigns')
      .insert({
        title: 'Test Campaign Verification',
        content: 'Testing campaign table functionality',
        status: 'pending_review'
      })
      .select()
      .single();

    if (createError) {
      console.log('❌ Campaign creation test:', createError.message);
    } else {
      console.log('✅ Campaign creation works');
      
      // Test advisory creation
      const { data: testAdvisory, error: advisoryCreateError } = await supabase
        .from('campaign_advisories')
        .insert({
          campaign_id: testCampaign.id,
          advisory_data: { test: true, screening: 'verification' },
          confidence: 0.3,
          escalation_suggested: false
        })
        .select()
        .single();

      if (advisoryCreateError) {
        console.log('❌ Advisory creation test:', advisoryCreateError.message);
      } else {
        console.log('✅ Advisory creation works');
        
        // Test risk assessment with real data
        const { data: realRisk, error: realRiskError } = await supabase
          .rpc('get_campaign_risk_assessment', { p_campaign_id: testCampaign.id });
        
        if (!realRiskError) {
          console.log('✅ Risk assessment with data:', realRisk);
        }

        // Cleanup
        await supabase.from('campaign_advisories').delete().eq('id', testAdvisory.id);
      }
      
      await supabase.from('campaigns').delete().eq('id', testCampaign.id);
    }

    console.log('\n🎯 Campaign system verification complete');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyCampaignTables();