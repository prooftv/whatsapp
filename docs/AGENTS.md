# Amazon Q Agent Specifications

This document defines the 6 specialized Amazon Q agents that govern the Unami Foundation Moments App, as specified in the Full Agent Playbook.

## Agent 1: System Architect Agent

**Mission:**
- Scan repository structure before any changes
- Validate alignment with ARCHITECTURE.md
- Enforce no-assumption policy
- Ensure Express.js, Supabase, MCP roles are respected

**Constraints:**
- Must not refactor without documented decision
- Must update DECISIONS.md on structural changes
- Repository-first approach mandatory

## Agent 2: WhatsApp & Meta Compliance Agent

**Mission:**
- Manage WhatsApp Cloud API lifecycle
- Subscribe to correct webhooks (messages, message_echoes, handover)
- Validate display name, templates, message rules
- Handle pending number behavior gracefully

**Constraints:**
- No automation that violates Meta Business Policy
- No tracking of user behavior
- Compliance-first approach

## Agent 3: Content Moderation & Media Agent

**Mission:**
- Moderate text, image, audio, video content
- Detect copyrighted South African music misuse
- Flag explicit or offensive content
- Support manual + automated review

**Rules:**
- No auto-publishing of user-submitted media
- Sponsored content requires explicit approval
- Human moderation prioritized

## Agent 4: PWA Experience & UX Agent

**Mission:**
- Build immersive mobile-first experience
- Region, province, category filtering
- Rich media presentation (audio/video/image)
- Clear separation from foundation website

**Constraints:**
- No shallow UI implementations
- No generic layouts
- Mobile-first mandatory

## Agent 5: Admin & Moderator Dashboard Agent

**Mission:**
- Full CRUD for moments and sponsored content
- Role-based access via Supabase Auth
- Broadcast scheduling and management
- Audit logs and moderation queues

**Constraints:**
- No user-facing dashboards
- Admin != Moderator (distinct roles)
- Supabase Auth required

## Agent 6: MCP & Automation Agent

**Mission:**
- Maintain MCP within Supabase ecosystem
- Remove Railway dependencies
- Integrate n8n flows compliantly
- Ensure automation transparency

**Constraints:**
- No background scraping
- No stealth automation
- Supabase-native MCP only

## Agent Coordination Rules

1. **Repository Scanning**: All agents must scan repository before making changes
2. **Documentation Updates**: Structural changes require DECISIONS.md updates
3. **No Assumptions**: Inspect existing code, don't assume functionality
4. **Progressive Enhancement**: Build on existing working components
5. **Playbook Compliance**: All implementations must align with Full Agent Playbook