## Decision 009: Complete Railway Elimination
**Date**: 2024-12-19
**Status**: Implemented
**Context**: Playbook requires "Remove Railway dependencies" but we only deprecated Railway MCP while keeping Railway for main API.

**Decision**:
- Migrate Express.js webhook to Supabase Edge Function (`/functions/webhook`)
- Migrate Express.js admin API to Supabase Edge Function (`/functions/admin-api`)
- Deploy static files (PWA, admin dashboard) to Vercel
- Update WhatsApp webhook URL from Railway to Vercel domain
- Complete Railway service elimination

**Implementation**:
- Created `/supabase/functions/webhook/index.ts` - WhatsApp webhook processing
- Created `/supabase/functions/admin-api/index.ts` - Admin dashboard API
- Updated `vercel.json` to proxy `/webhook` and `/admin/*` to Supabase Edge Functions
- Created `deploy-railway-free.sh` for complete deployment
- Updated environment variables in `.env.railway-free`

**New Architecture**:
```
WhatsApp → Vercel (moments.unamifoundation.org/webhook) → Supabase Edge Functions → Database
Admin Dashboard → Vercel (static) → Supabase Edge Functions → Database
Public PWA → Vercel (static) → Supabase Edge Functions → Database
```

**Consequences**:
- ✅ **Full playbook compliance** - Zero Railway dependencies
- ✅ **Simplified infrastructure** - Only Supabase + Vercel
- ✅ **Cost reduction** - No Railway hosting costs
- ✅ **Better performance** - Edge Functions closer to users
- ✅ **Unified backend** - All logic in Supabase ecosystem

**Migration Steps**:
1. Deploy Supabase Edge Functions
2. Deploy to Vercel with proxy configuration
3. Update WhatsApp webhook URL in Meta dashboard
4. Test all functionality
5. Remove Railway deployment