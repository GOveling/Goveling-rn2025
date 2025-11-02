#!/bin/bash

# ============================================================================
# Script: Apply Shared Cache Migration
# Purpose: Create places_search_cache table in Supabase
# Expected Impact: 77% additional cost reduction
# ============================================================================

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║    🚀 APPLYING SHARED CACHE MIGRATION                       ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Load environment variables
if [ -f .env ]; then
  echo "📄 Loading environment variables..."
  export $(grep -v '^#' .env | xargs)
else
  echo "⚠️  Warning: .env file not found"
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "   Install it with: brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if we're linked to a project
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Not linked to a Supabase project"
    echo "   Run: supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo "📊 Migration: places_search_cache"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This migration will create:"
echo "  • Table: places_search_cache (for shared caching)"
echo "  • Indexes: For fast lookups and cleanup"
echo "  • RLS Policies: Secure access for all users"
echo "  • RPC Functions: increment_cache_hit, clean_expired_cache, get_cache_stats"
echo ""
echo "Expected impact:"
echo "  💰 Cost reduction: 77% additional (from \$139 → \$32/month)"
echo "  📈 Cache hit rate: 60-80% for popular searches"
echo "  💵 Additional cost: \$0/month (within free tier)"
echo ""

read -p "Do you want to apply this migration? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 1
fi

echo ""
echo "🚀 Applying migration..."
echo ""

# Apply the migration
supabase db push

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║    ✅ MIGRATION APPLIED SUCCESSFULLY                        ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Next steps:"
echo ""
echo "1. Deploy edge function with cache support:"
echo "   supabase functions deploy google-places-enhanced"
echo ""
echo "2. Monitor cache performance:"
echo "   - Check Supabase Dashboard > Database > places_search_cache"
echo "   - Run: SELECT * FROM get_cache_stats();"
echo ""
echo "3. (Optional) Set up cron job for cache cleanup:"
echo "   - Add to pg_cron: SELECT clean_expired_cache();"
echo "   - Or run manually when needed"
echo ""
echo "4. Test the cache:"
echo "   - Make a search in Explore tab"
echo "   - Make the same search again (should be from cache)"
echo "   - Check logs for 'L2 Cache HIT' messages"
echo ""
echo "🎉 Cache implementation complete!"
echo "💰 Expected savings: \$107/month for 100 users"
echo ""
