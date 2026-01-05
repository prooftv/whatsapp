# n8n Workflows (Repository-Based)

This directory contains n8n workflow templates stored as JSON files. These workflows are **NOT deployed** in production.

## Purpose
- **Version control**: Workflows tracked with application code
- **Templates**: Available for manual import if needed
- **Development**: Optional local testing with Docker

## Production Behavior
- **Core system**: Works without n8n
- **Webhook processing**: Handled by Express.js
- **No deployment**: n8n not required in production

## Development Usage (Optional)
```bash
# Only if you want to test workflows locally
cd ../n8n-local
docker-compose up -d
# Access: http://localhost:5678
# Import workflows from this directory
```

## Workflow Files
- `inbound-message-workflow.json` - Message processing template
- `campaign-workflow.json` - Campaign automation template
- `retry-workflow.json` - Retry logic template