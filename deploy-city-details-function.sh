#!/bin/bash

# Deploy google-places-city-details Edge Function to Supabase

echo "🚀 Deploying google-places-city-details Edge Function..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if logged in
echo "📝 Checking Supabase login status..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please login first:"
    echo "   supabase login"
    exit 1
fi

# Deploy the function
echo "📤 Deploying function..."
supabase functions deploy google-places-city-details \
    --project-ref iwsuyrlrbmnbfyfkqowl \
    --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Ensure GOOGLE_PLACES_API_KEY is set in Supabase secrets:"
    echo "      supabase secrets set GOOGLE_PLACES_API_KEY=your_key_here --project-ref iwsuyrlrbmnbfyfkqowl"
    echo ""
    echo "   2. Test the function in your app by visiting a city"
    echo "   3. Check logs: supabase functions logs google-places-city-details --project-ref iwsuyrlrbmnbfyfkqowl"
else
    echo "❌ Deployment failed. Check the error above."
    exit 1
fi
