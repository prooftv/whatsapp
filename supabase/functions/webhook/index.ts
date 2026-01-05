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

    if (req.method === 'GET') {
      // WhatsApp webhook verification
      const url = new URL(req.url)
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')

      if (mode === 'subscribe' && token === Deno.env.get('WEBHOOK_VERIFY_TOKEN')) {
        return new Response(challenge, { 
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
        })
      }
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      
      // Process WhatsApp webhook
      if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
        const messages = body.entry[0].changes[0].value.messages
        
        for (const message of messages) {
          // Store message
          await supabase.from('messages').insert({
            whatsapp_id: message.id,
            from_number: message.from,
            message_type: message.type,
            content: message.text?.body || message.caption || '',
            timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
            raw_data: message
          })

          // Process MCP analysis
          if (message.text?.body || message.caption) {
            const { data: advisory } = await supabase.rpc('mcp_advisory', {
              content: message.text?.body || message.caption,
              metadata: { from: message.from, type: message.type }
            })
          }

          // Handle commands
          const text = (message.text?.body || '').toLowerCase().trim()
          if (['start', 'join'].includes(text)) {
            await supabase.from('subscriptions').upsert({
              phone_number: message.from,
              subscribed: true,
              updated_at: new Date().toISOString()
            })
          } else if (['stop', 'unsubscribe'].includes(text)) {
            await supabase.from('subscriptions').upsert({
              phone_number: message.from,
              subscribed: false,
              updated_at: new Date().toISOString()
            })
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})