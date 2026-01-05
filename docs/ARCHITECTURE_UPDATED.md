# Unami Foundation Moments - System Architecture

## Core Principles (Playbook Aligned)

1. **PWA is a first-class immersive product** - Public PWA for community engagement
2. **Supabase is the system of record** - All data and MCP hosted in Supabase
3. **Railway MCP is permanently deprecated** - MCP migrated to Supabase Edge Functions
4. **WhatsApp is a distribution layer, not a UI** - Community receives content via WhatsApp
5. **Compliance-first, zero-budget aware** - Meta policies and privacy protection

## System Architecture Overview

### Core Components
- **WhatsApp Cloud API (Meta)** - Message distribution and webhook processing
- **Express.js API** - Moments API server at `moments-api.unamifoundation.org`
- **Supabase** - Database, Auth, Storage, Edge Functions (including MCP)
- **Admin Dashboard** - Role-based content management PWA
- **Public PWA** - Immersive community moments experience at `moments.unamifoundation.org`
- **n8n Workflows** - Automation and orchestration (local Docker)

### Data Flow
```
WhatsApp Cloud API
       ↓
Express.js Webhook (/webhook)
       ↓
Supabase MCP Analysis (Edge Functions)
       ↓
Database Storage (messages, advisories)
       ↓
Admin Dashboard (content management)
       ↓
Broadcast System (WhatsApp distribution)
       ↓
Public PWA (community engagement)
```

## Component Details

### Express.js API Server
- **Location**: `/src/server.js`
- **Purpose**: WhatsApp webhook handling, admin API, static file serving
- **Endpoints**:
  - `GET/POST /webhook` - WhatsApp message processing
  - `/admin/*` - Admin dashboard API routes
  - `/public/*` - Public PWA API routes
  - `/health` - System health monitoring
- **Deployment**: Railway platform

### Supabase Backend
- **Database**: Messages, moments, sponsors, broadcasts, subscriptions
- **Storage**: Media files (audio, images, videos, documents)
- **Auth**: Role-based access control (Admin, Moderator, Viewer)
- **Edge Functions**: MCP advisory system (replaces Railway)
- **Real-time**: Live updates for admin dashboard

### Admin Dashboard PWA
- **Location**: `/public/admin-dashboard.html`
- **Purpose**: Content management, moderation, analytics
- **Features**:
  - Moments CRUD with scheduling
  - Sponsor management
  - Broadcast analytics
  - Content moderation queue
  - System settings control
- **Access**: Role-based via Supabase Auth

### Public PWA (To Be Implemented)
- **Location**: `/public/moments/` (planned)
- **Purpose**: Community engagement and moments consumption
- **Features**:
  - Immersive moments feed
  - Province and category filtering
  - Rich media presentation
  - Mobile-first responsive design
- **Access**: Public, no authentication required

### MCP Advisory System
- **Current**: Railway service (to be deprecated)
- **Target**: Supabase Edge Functions
- **Purpose**: Content analysis and moderation intelligence
- **Features**:
  - Language detection (South African context)
  - Harm signal detection
  - Spam pattern recognition
  - Escalation recommendations
- **Integration**: Called from webhook processing

### WhatsApp Integration
- **Business API**: +27 65 829 5041
- **Webhook**: `moments-api.unamifoundation.org/webhook`
- **Message Types**: Text, image, audio, video, document
- **Commands**: START/JOIN (opt-in), STOP/UNSUBSCRIBE (opt-out)
- **Broadcasts**: Sponsored content distribution

## Database Schema

### Core Tables
- `messages` - Incoming WhatsApp messages
- `media` - Media attachments and metadata
- `advisories` - MCP intelligence outputs
- `flags` - Trust and safety markers

### Moments Tables
- `moments` - Content for broadcast
- `sponsors` - Sponsor information
- `broadcasts` - Broadcast logs and analytics
- `subscriptions` - User opt-in/opt-out status

### Admin Tables
- `admin_roles` - Role-based access control
- `system_settings` - Application configuration

## Deployment Architecture

### Single Deployment (Railway)
- **API Server**: Express.js application
- **Admin PWA**: Served as static files
- **Public PWA**: Served as static files (when implemented)
- **Database**: Supabase (external)
- **MCP**: Supabase Edge Functions (when migrated)

### Domain Routing
- `moments.unamifoundation.org` → Public PWA
- `moments-api.unamifoundation.org` → Express.js API
- Admin dashboard accessible via API domain

## Security & Compliance

### WhatsApp Compliance
- Webhook verification with HMAC signatures
- Message processing without user tracking
- Opt-out handling (STOP command)
- Sponsored content disclosure

### Data Protection
- No individual user tracking
- Aggregate analytics only
- GDPR/POPIA compliant data handling
- Phone number masking in admin interfaces

### Content Moderation
- MCP advisory system (non-blocking)
- Human oversight for escalated content
- Audit trail for all moderation decisions
- South African cultural context awareness

## Failure Resilience

- **MCP Unavailable**: Safe defaults, advisory skipped
- **Supabase Down**: System stops (acceptable single point)
- **WhatsApp API Down**: Messages queued, retry on recovery
- **n8n Down**: Workflows replay on restart

## Development Workflow

### Local Development
```bash
npm run dev  # Start Express.js with file watching
```

### Testing
```bash
npm test  # Run all tests
./test-integration.sh  # Integration testing
```

### Deployment
```bash
./deploy-moments.sh  # Deploy to Railway
```

## Migration Status

### Completed
- ✅ Express.js API server
- ✅ Admin dashboard PWA
- ✅ Supabase database and storage
- ✅ WhatsApp webhook processing
- ✅ Basic broadcast system

### In Progress
- 🔄 MCP migration to Supabase Edge Functions
- 🔄 Public PWA implementation
- 🔄 Documentation cleanup

### Planned
- 📋 Railway MCP deprecation
- 📋 Enhanced broadcast scheduling
- 📋 Advanced analytics dashboard

## Agent Responsibilities

This architecture is maintained by 6 specialized Amazon Q agents as defined in `/docs/AGENTS.md`. Each agent has specific responsibilities and constraints to ensure system integrity and playbook compliance.