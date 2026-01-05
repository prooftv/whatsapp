# Unami Foundation Moments - Architecture

## Core Principles (Playbook Aligned)

1. **PWA is a first-class immersive product** - Public PWA for community engagement
2. **Supabase is the system of record** - All data and MCP hosted in Supabase
3. **Railway MCP is permanently deprecated** - MCP migrated to Supabase Edge Functions
4. **WhatsApp is a distribution layer, not a UI** - Community receives content via WhatsApp
5. **Compliance-first, zero-budget aware** - Meta policies and privacy protection

## Component Architecture

### Gateway Server (Port 3000)
- **Location**: `/src/server.js`
- **Purpose**: WhatsApp webhook handling, message processing
- **Dependencies**: Supabase, n8n-local, MCP-Railway
- **Failure Mode**: Graceful degradation, messages always logged

### n8n Orchestration (Port 5678)
- **Location**: `/n8n-local/` (Docker Compose)
- **Purpose**: Workflow orchestration as source code
- **Rationale**: Deterministic, versioned, replayable workflows
- **Failure Mode**: Messages continue flowing, workflows replay on restart

### MCP Advisory Service (Railway)
- **Location**: `/mcp-railway/` (deployed separately)
- **Purpose**: Content analysis and advisory intelligence
- **Rationale**: Resource isolation, elastic scaling, independent updates
- **Failure Mode**: Gateway continues, advisory calls timeout gracefully

### Supabase Backend
- **Purpose**: Message storage, media assets, advisory logs
- **Tables**: messages, media, advisories, flags
- **Storage**: audio, images, videos, documents buckets

## Data Flow

```
WhatsApp → Gateway → Supabase → n8n → MCP → Advisory Logs
                  ↓
               Media Pipeline → Storage Buckets
```

## Deployment Strategy

1. **Gateway**: Single server deployment (Codespaces/VPS)
2. **n8n**: Local Docker container (source code approach)
3. **MCP**: Railway service (isolated scaling)
4. **Supabase**: Managed service

## Failure Resilience

- **MCP down**: Messages processed, advisory skipped, logged
- **n8n down**: Messages stored, workflows replay on restart  
- **Gateway down**: WhatsApp queues messages, replay on restart
- **Supabase down**: System stops (acceptable single point of failure)

## Admin & Public Interfaces

### Admin Dashboard PWA
- Role-based content management at `/admin-dashboard.html`
- Moments CRUD, sponsor management, broadcast analytics
- Content moderation queue and system settings
- Supabase Auth integration

### Public PWA (Planned)
- Immersive community moments experience
- Province and category filtering
- Rich media presentation
- Mobile-first responsive design

**Note**: See `/docs/ARCHITECTURE_UPDATED.md` for complete architectural details.