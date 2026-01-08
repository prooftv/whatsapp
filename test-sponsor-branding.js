// Test script for sponsor branding endpoints
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const ADMIN_TOKEN = 'test-token'; // Replace with actual admin token

async function testSponsorBrandingEndpoints() {
  console.log('🧪 Testing Sponsor Branding Endpoints...\n');

  // Test 1: Enhanced sponsors endpoint
  console.log('1. Testing enhanced sponsors endpoint...');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-api/sponsors`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Enhanced sponsors endpoint working');
      console.log(`   Found ${data.sponsors?.length || 0} sponsors`);
      
      // Check if sponsor_assets are included
      const hasAssets = data.sponsors?.some(s => s.sponsor_assets !== undefined);
      console.log(`   Sponsor assets included: ${hasAssets ? '✅' : '❌'}`);
    } else {
      console.log('❌ Enhanced sponsors endpoint failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Enhanced sponsors endpoint error:', error.message);
  }

  // Test 2: Sponsor assets endpoint (if we have a sponsor)
  console.log('\n2. Testing sponsor assets endpoint...');
  try {
    // First get a sponsor ID
    const sponsorsResponse = await fetch(`${SUPABASE_URL}/functions/v1/admin-api/sponsors`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    
    if (sponsorsResponse.ok) {
      const sponsorsData = await sponsorsResponse.json();
      const firstSponsor = sponsorsData.sponsors?.[0];
      
      if (firstSponsor) {
        const assetsResponse = await fetch(`${SUPABASE_URL}/functions/v1/admin-api/sponsors/${firstSponsor.id}/assets`, {
          headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
        });
        
        if (assetsResponse.ok) {
          const assetsData = await assetsResponse.json();
          console.log('✅ Sponsor assets endpoint working');
          console.log(`   Found ${assetsData.assets?.length || 0} assets for sponsor: ${firstSponsor.display_name}`);
        } else {
          console.log('❌ Sponsor assets endpoint failed:', assetsResponse.status);
        }
      } else {
        console.log('⚠️  No sponsors found to test assets endpoint');
      }
    }
  } catch (error) {
    console.log('❌ Sponsor assets endpoint error:', error.message);
  }

  // Test 3: Upload sponsor asset (mock test)
  console.log('\n3. Testing sponsor asset upload endpoint...');
  try {
    const sponsorsResponse = await fetch(`${SUPABASE_URL}/functions/v1/admin-api/sponsors`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    
    if (sponsorsResponse.ok) {
      const sponsorsData = await sponsorsResponse.json();
      const firstSponsor = sponsorsData.sponsors?.[0];
      
      if (firstSponsor) {
        const uploadResponse = await fetch(`${SUPABASE_URL}/functions/v1/admin-api/sponsors/${firstSponsor.id}/assets`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            asset_type: 'logo',
            asset_url: 'https://example.com/test-logo.png',
            dimensions: '200x200',
            file_size: 15000
          })
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          console.log('✅ Sponsor asset upload endpoint working');
          console.log(`   Created asset: ${uploadData.asset?.asset_type} for ${firstSponsor.display_name}`);
        } else {
          console.log('❌ Sponsor asset upload failed:', uploadResponse.status);
          const errorText = await uploadResponse.text();
          console.log('   Error:', errorText);
        }
      } else {
        console.log('⚠️  No sponsors found to test upload endpoint');
      }
    }
  } catch (error) {
    console.log('❌ Sponsor asset upload error:', error.message);
  }

  console.log('\n🏁 Sponsor branding endpoint tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testSponsorBrandingEndpoints();
}

module.exports = { testSponsorBrandingEndpoints };