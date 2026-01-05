#!/bin/bash

echo "🚀 Deploying Unami Foundation Moments - Railway-Free Architecture"

# Deploy Supabase Edge Functions
echo "📡 Deploying Supabase Edge Functions..."
supabase functions deploy webhook --project-ref arqeiadudzwbmzdhqkit
supabase functions deploy admin-api --project-ref arqeiadudzwbmzdhqkit

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment Complete!"
echo ""
echo "🔗 URLs:"
echo "  Public PWA: https://moments.unamifoundation.org"
echo "  Webhook: https://moments.unamifoundation.org/webhook"
echo "  Admin API: https://moments.unamifoundation.org/admin/*"
echo ""
echo "📋 Next Steps:"
echo "  1. Update WhatsApp webhook URL in Meta dashboard"
echo "  2. Test webhook verification"
echo "  3. Verify admin dashboard functionality"
echo "  4. Remove Railway deployment"