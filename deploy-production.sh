#!/bin/bash

# Unami Foundation Moments - Production Deployment Script
# This script sets up the complete production environment

set -e

echo "🚀 Starting Unami Foundation Moments Production Deployment..."

# Check environment variables
echo "📋 Checking environment variables..."
required_vars=(
    "WHATSAPP_TOKEN"
    "WHATSAPP_PHONE_ID" 
    "WEBHOOK_VERIFY_TOKEN"
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_KEY"
    "JWT_SECRET"
    "ADMIN_PASSWORD"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    fi
done

echo "✅ All required environment variables present"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Run database setup
echo "🗄️ Setting up database..."
if command -v psql &> /dev/null; then
    echo "Running Supabase schema setup..."
    # Note: In production, run these manually in Supabase SQL Editor
    echo "⚠️  Please run the following SQL files in Supabase SQL Editor:"
    echo "   1. supabase/schema.sql"
    echo "   2. supabase/moments-schema.sql"
    echo "   3. supabase/mcp-native.sql"
    echo "   4. supabase/production-setup.sql"
else
    echo "⚠️  PostgreSQL client not found. Please run SQL files manually in Supabase."
fi

# Create admin users
echo "👤 Setting up admin users..."
echo "⚠️  Please create the following users in Supabase Auth Dashboard:"
echo "   - admin@unamifoundation.org (superadmin)"
echo "   - moderator@unamifoundation.org (moderator)"
echo "   - content@unamifoundation.org (content_admin)"
echo "   Then run supabase/production-setup.sql to assign roles"

# Test connections
echo "🔍 Testing connections..."

# Test Supabase connection
echo "Testing Supabase connection..."
node -e "
import { supabase } from './config/supabase.js';
supabase.from('messages').select('count').limit(1).then(({data, error}) => {
    if (error) {
        console.log('❌ Supabase connection failed:', error.message);
        process.exit(1);
    } else {
        console.log('✅ Supabase connection successful');
    }
}).catch(err => {
    console.log('❌ Supabase connection failed:', err.message);
    process.exit(1);
});
"

# Test WhatsApp API
echo "Testing WhatsApp API connection..."
node -e "
import { whatsappAPI } from './config/whatsapp.js';
whatsappAPI.get('/').then(() => {
    console.log('✅ WhatsApp API connection successful');
}).catch(err => {
    if (err.response?.status === 404) {
        console.log('✅ WhatsApp API accessible (404 expected for root)');
    } else {
        console.log('❌ WhatsApp API connection failed:', err.message);
    }
});
"

# Start application
echo "🎯 Starting application..."
echo "Application will start on port ${PORT:-8080}"

# Production startup
if [ "$NODE_ENV" = "production" ]; then
    echo "🔥 Starting in production mode..."
    npm start
else
    echo "🔧 Starting in development mode..."
    npm run dev
fi

echo "✅ Deployment complete!"
echo ""
echo "📱 Access Points:"
echo "   - Admin Login: http://localhost:${PORT:-8080}/login.html"
echo "   - Admin Dashboard: http://localhost:${PORT:-8080}/admin-dashboard.html"
echo "   - Public PWA: http://localhost:${PORT:-8080}/moments"
echo "   - Health Check: http://localhost:${PORT:-8080}/health"
echo ""
echo "🔧 Next Steps:"
echo "   1. Configure WhatsApp webhook: https://your-domain.com/webhook"
echo "   2. Test admin login with created users"
echo "   3. Create first moment and test broadcast"
echo "   4. Verify public PWA functionality"
echo ""
echo "🎉 Unami Foundation Moments is ready for production!"