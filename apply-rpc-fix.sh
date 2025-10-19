#!/usr/bin/env bash

# Apply the fixed RPC migration
# This script updates the update_trip_details function to accept text dates instead of date types

echo "🔄 Applying RPC fix migration..."
echo "=================================="

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
  echo "❌ supabase CLI not found. Install it first:"
  echo "   npm install -g @supabase/cli"
  exit 1
fi

# Run the migration using supabase CLI
supabase migration up --file supabase/migrations/2025101903_update_trip_details_rpc.sql

if [ $? -eq 0 ]; then
  echo "✅ Migration applied successfully!"
  echo ""
  echo "Next steps:"
  echo "1. In Supabase Dashboard, verify the RPC function:"
  echo "   → Database > Functions > update_trip_details"
  echo "2. Test the save button in the Edit Trip modal"
  echo "3. Check browser console for detailed logs"
else
  echo "❌ Migration failed. See error details above."
  echo ""
  echo "Alternative: Manually apply the SQL in Supabase Dashboard:"
  echo "1. Open Supabase Dashboard → SQL Editor"
  echo "2. Create new query"
  echo "3. Paste contents of: supabase/migrations/2025101903_update_trip_details_rpc.sql"
  echo "4. Run query"
  exit 1
fi
