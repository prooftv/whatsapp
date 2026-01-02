# Vercel Environment Variables Configuration

## Required Environment Variables

Copy these environment variables to your Vercel project settings:

### Database Configuration
```
SUPABASE_URL=https://arqeiadudzbmzdhqkit.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

### WhatsApp Business API
```
WHATSAPP_TOKEN=your_whatsapp_business_token
WHATSAPP_PHONE_ID=your_phone_number_id
WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token
```

### External Services
```
MCP_ENDPOINT=https://moments-api.unamifoundation.org/advisory
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
```

### Application Settings
```
PORT=3000
NODE_ENV=production
```

## Vercel CLI Setup

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login and link project:
```bash
vercel login
vercel link
```

3. Set environment variables:
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add WHATSAPP_TOKEN
vercel env add WHATSAPP_PHONE_ID
vercel env add WEBHOOK_VERIFY_TOKEN
vercel env add MCP_ENDPOINT
```

4. Deploy:
```bash
vercel --prod
```

## Vercel Dashboard Setup

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable with values for Production, Preview, and Development

## Environment Variable Sources

- **SUPABASE_URL**: From your Supabase project settings
- **SUPABASE_SERVICE_KEY**: From Supabase → Settings → API → service_role key
- **WHATSAPP_TOKEN**: From Meta Business → WhatsApp Business API
- **WHATSAPP_PHONE_ID**: From WhatsApp Business API setup
- **WEBHOOK_VERIFY_TOKEN**: Custom token you create for webhook verification
- **MCP_ENDPOINT**: Railway deployment URL + /advisory

## Deployment Status

✅ **Railway**: Active at https://moments-api.unamifoundation.org
🔄 **Vercel**: Ready for deployment with environment variables
📊 **Supabase**: Database schema ready for migration
🔗 **WhatsApp**: Webhook endpoint ready for configuration