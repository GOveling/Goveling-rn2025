#!/bin/bash

# Script to apply migrations to new Supabase project
# Usage: ./apply-migrations.sh

echo "🚀 Applying Supabase migrations to new project..."
echo "Project: iwsuyrlrbmnbfyfkqowl"
echo "URL: https://iwsuyrlrbmnbfyfkqowl.supabase.co"
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Apply migrations
echo "📋 Applying migrations..."
supabase db push --linked

if [ $? -eq 0 ]; then
    echo "✅ Migrations applied successfully!"
    echo "🎯 Your database is ready to use."
else
    echo "❌ Error applying migrations."
    echo "💡 Try connecting to your project first:"
    echo "supabase link --project-ref iwsuyrlrbmnbfyfkqowl"
fi

echo ""
echo "🔗 You can view your database at:"
echo "https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl"
