import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const url = new URL(req.url)
    const path = url.pathname

    // Public stats endpoint
    if (path === '/stats') {
      const [moments, campaigns, subscribers, broadcasts] = await Promise.all([
        supabase.from('moments').select('*', { count: 'exact' }).eq('status', 'broadcasted'),
        supabase.from('campaigns').select('*', { count: 'exact' }).eq('status', 'published'),
        supabase.from('subscriptions').select('*', { count: 'exact' }).eq('opted_in', true),
        supabase.from('broadcasts').select('*', { count: 'exact' })
      ])

      return new Response(JSON.stringify({
        totalMoments: (moments.count || 0) + (campaigns.count || 0),
        activeSubscribers: subscribers.count || 0,
        totalBroadcasts: broadcasts.count || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Public moments endpoint - includes both moments and approved campaigns
    if (path === '/moments') {
      const region = url.searchParams.get('region')
      const category = url.searchParams.get('category')
      const source = url.searchParams.get('source')

      // Fetch moments
      let momentsQuery = supabase
        .from('moments')
        .select('*, sponsors(*)')
        .eq('status', 'broadcasted')
        .order('broadcasted_at', { ascending: false })
        .limit(25)

      if (region) momentsQuery = momentsQuery.eq('region', region)
      if (category) momentsQuery = momentsQuery.eq('category', category)
      if (source && source === 'community') momentsQuery = momentsQuery.eq('content_source', 'community')

      // Fetch approved campaigns
      let campaignsQuery = supabase
        .from('campaigns')
        .select('*, sponsors(*)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(25)

      if (region) campaignsQuery = campaignsQuery.contains('target_regions', [region])
      if (category) campaignsQuery = campaignsQuery.contains('target_categories', [category])
      if (source && source === 'admin') {
        // Only show campaigns when filtering for admin content
      } else if (source && source === 'community') {
        // Skip campaigns when filtering for community content
        campaignsQuery = supabase.from('campaigns').select('*').limit(0)
      }

      const [momentsResult, campaignsResult] = await Promise.all([
        momentsQuery,
        campaignsQuery
      ])

      // Transform campaigns to match moments structure
      const transformedCampaigns = (campaignsResult.data || []).map(campaign => ({
        ...campaign,
        region: campaign.target_regions?.[0] || 'National',
        category: campaign.target_categories?.[0] || 'Campaign',
        content_source: 'campaign',
        is_sponsored: !!campaign.sponsor_id,
        broadcasted_at: campaign.created_at,
        media_urls: campaign.media_urls || []
      }))

      // Combine and sort by date
      const allContent = [
        ...(momentsResult.data || []),
        ...transformedCampaigns
      ].sort((a, b) => new Date(b.broadcasted_at || b.created_at) - new Date(a.broadcasted_at || a.created_at))
        .slice(0, 50)

      return new Response(JSON.stringify({
        moments: allContent
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})