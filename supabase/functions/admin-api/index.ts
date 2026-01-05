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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const path = url.pathname.replace('/functions/v1/admin-api', '')

    // Analytics endpoint
    if (path === '/analytics' && req.method === 'GET') {
      const [moments, subscribers, broadcasts] = await Promise.all([
        supabase.from('moments').select('*', { count: 'exact' }),
        supabase.from('subscriptions').select('*', { count: 'exact' }).eq('subscribed', true),
        supabase.from('broadcasts').select('*', { count: 'exact' })
      ])

      return new Response(JSON.stringify({
        totalMoments: moments.count || 0,
        activeSubscribers: subscribers.count || 0,
        totalBroadcasts: broadcasts.count || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Moments CRUD
    if (path === '/moments') {
      if (req.method === 'GET') {
        const { data: moments } = await supabase
          .from('moments')
          .select('*, sponsors(*)')
          .order('created_at', { ascending: false })
        
        return new Response(JSON.stringify(moments), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (req.method === 'POST') {
        const moment = await req.json()
        const { data, error } = await supabase
          .from('moments')
          .insert(moment)
          .select()
          .single()

        if (error) throw error

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Broadcast moment
    if (path.startsWith('/moments/') && path.endsWith('/broadcast') && req.method === 'POST') {
      const momentId = path.split('/')[2]
      
      // Get moment
      const { data: moment } = await supabase
        .from('moments')
        .select('*, sponsors(*)')
        .eq('id', momentId)
        .single()

      if (!moment) {
        return new Response('Moment not found', { status: 404, headers: corsHeaders })
      }

      // Get subscribers
      const { data: subscribers } = await supabase
        .from('subscriptions')
        .select('phone_number')
        .eq('subscribed', true)

      // Format message
      const sponsorText = moment.sponsor_id ? `\nBrought to you by ${moment.sponsors?.name || 'Unami Foundation Partners'}` : ''
      const message = `📢 ${moment.sponsor_id ? '[Sponsored] ' : ''}Moment — ${moment.region}\n${moment.content}\n📍 ${moment.category}${sponsorText}\n🌐 More info: /moments?region=${moment.region}`

      // Send broadcasts (simplified - would need WhatsApp API integration)
      const broadcastPromises = subscribers?.map(async (sub) => {
        return supabase.from('broadcasts').insert({
          moment_id: momentId,
          phone_number: sub.phone_number,
          message_content: message,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
      }) || []

      await Promise.all(broadcastPromises)

      return new Response(JSON.stringify({ 
        success: true, 
        sent: subscribers?.length || 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Sponsors endpoint
    if (path === '/sponsors' && req.method === 'GET') {
      const { data: sponsors } = await supabase
        .from('sponsors')
        .select('*')
        .order('name')
      
      return new Response(JSON.stringify(sponsors), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response('Not found', { status: 404, headers: corsHeaders })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})