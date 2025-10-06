#!/bin/bash

# Manual migration application script
echo "🔄 Applying database migration manually..."

# Set the access token
export SUPABASE_ACCESS_TOKEN="sbp_457b13bbe793ef1c117726faabce557a31549978"

# Project details
PROJECT_REF="iwsuyrlrbmnbfyfkqowl"
PROJECT_URL="https://iwsuyrlrbmnbfyfkqowl.supabase.co"

echo "📍 Project: $PROJECT_URL"
echo "🔑 Token: ${SUPABASE_ACCESS_TOKEN:0:10}..."

# Try different approaches to apply migration
echo ""
echo "1️⃣ Attempting supabase db push..."
supabase db push --project-ref $PROJECT_REF

echo ""
echo "2️⃣ Attempting supabase migration up..."
supabase migration up --project-ref $PROJECT_REF

echo ""
echo "3️⃣ Attempting direct migration application..."
supabase db remote commit --project-ref $PROJECT_REF

echo ""
echo "4️⃣ Checking migration status..."
supabase migration list --project-ref $PROJECT_REF

echo ""
echo "✅ Migration application attempts completed!"
echo "💡 If the above didn't work, you may need to:"
echo "   1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF"
echo "   2. Navigate to SQL Editor"
echo "   3. Run the migration SQL manually"
echo ""
echo "📄 Migration SQL to run manually:"
echo "------------------------------------------------"
cat supabase/migrations/20251006_onboarding_fields.sql
echo "------------------------------------------------"
