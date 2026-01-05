#!/bin/bash

# n8n Startup Script for Unami Foundation Moments
# This script starts n8n with proper environment configuration

set -e

echo "🔧 Starting n8n for Unami Foundation Moments..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    echo "📋 Loading environment variables..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  No .env file found. Using default configuration."
fi

# Navigate to n8n directory
cd n8n-local

# Stop existing containers
echo "🛑 Stopping existing n8n containers..."
docker-compose down

# Start n8n
echo "🚀 Starting n8n..."
docker-compose up -d

# Wait for n8n to be ready
echo "⏳ Waiting for n8n to start..."
sleep 10

# Check if n8n is running
if docker-compose ps | grep -q "Up"; then
    echo "✅ n8n started successfully!"
    echo ""
    echo "📊 n8n Access:"
    echo "   - URL: http://localhost:5678"
    echo "   - Username: admin"
    echo "   - Password: UnAmI2024!N8N"
    echo ""
    echo "🔗 Webhook Endpoints:"
    echo "   - WhatsApp Inbound: http://localhost:5678/webhook/whatsapp-inbound"
    echo "   - Retry Workflow: http://localhost:5678/webhook/retry"
    echo ""
    echo "📁 Workflows:"
    echo "   - Import workflows from /n8n/ directory"
    echo "   - Configure Supabase credentials in n8n"
    echo ""
    echo "🎯 Next Steps:"
    echo "   1. Access n8n at http://localhost:5678"
    echo "   2. Import workflow files from /n8n/ directory"
    echo "   3. Configure Supabase credentials"
    echo "   4. Test webhook endpoints"
else
    echo "❌ n8n failed to start. Check logs:"
    docker-compose logs
    exit 1
fi