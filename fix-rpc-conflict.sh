#!/usr/bin/env bash

# URGENT: Fix RPC Conflict - Drop old function and recreate with correct signature
# 
# Problem: PGRST203 error - Two versions of update_trip_details exist in DB
# - Old version: (uuid, text, text, date, date, numeric, text, text)
# - New version: (uuid, text, text, text, text, numeric, text, text)
#
# Solution: Drop old version and keep only the new one

set -e

echo "=================================="
echo "🔧 RPC Function Conflict Fix"
echo "=================================="
echo ""
echo "Error PGRST203 detected:"
echo "  • Two versions of update_trip_details exist"
echo "  • PostgreSQL cannot choose which one to use"
echo ""
echo "Solution: Drop old version (with date params)"
echo "          Recreate with correct version (with text params)"
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
  echo "⚠️  supabase CLI not found."
  echo ""
  echo "Manual Fix Instructions:"
  echo "========================"
  echo ""
  echo "1. Open Supabase Dashboard → SQL Editor"
  echo ""
  echo "2. Run the following SQL:"
  echo ""
  cat <<'EOF'
-- DROP old version first
drop function if exists public.update_trip_details(
  p_trip_id uuid,
  p_title text,
  p_description text,
  p_start_date date,
  p_end_date date,
  p_budget numeric,
  p_accommodation text,
  p_transport text
) cascade;

-- Now create the corrected version
create or replace function public.update_trip_details(
  p_trip_id uuid,
  p_title text,
  p_description text,
  p_start_date text,
  p_end_date text,
  p_budget numeric,
  p_accommodation text,
  p_transport text
)
returns public.trips
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
  v_trip public.trips;
  v_start_date date;
  v_end_date date;
begin
  v_start_date := case 
    when p_start_date is null or p_start_date = '' then null
    else p_start_date::date
  end;
  
  v_end_date := case 
    when p_end_date is null or p_end_date = '' then null
    else p_end_date::date
  end;

  select exists (
    select 1
    from public.trips t
    where t.id = p_trip_id
      and (t.user_id = auth.uid() or t.owner_id = auth.uid())
  )
  or exists (
    select 1
    from public.trip_collaborators tc
    where tc.trip_id = p_trip_id
      and tc.user_id = auth.uid()
      and coalesce(tc.status, 'active') = 'active'
      and coalesce(tc.role, 'viewer') in ('editor')
  ) into v_allowed;

  if not v_allowed then
    raise exception 'not authorized to update this trip' using errcode = '42501';
  end if;

  update public.trips t
  set 
    title = p_title,
    description = p_description,
    start_date = v_start_date,
    end_date = v_end_date,
    budget = p_budget,
    accommodation_preference = p_accommodation,
    transport_preference = p_transport,
    updated_at = now()
  where t.id = p_trip_id
  returning t.* into v_trip;

  return v_trip;
end;
$$;

grant execute on function public.update_trip_details(uuid, text, text, text, text, numeric, text, text) to authenticated;
EOF
  echo ""
  echo "3. Execute the query"
  echo "4. You should see: 'CREATE FUNCTION' or similar success message"
  echo ""
  exit 1
fi

echo "✅ supabase CLI found, applying migration..."
echo ""

# Try to apply the migration using CLI
if supabase db push --file supabase/migrations/2025101904_drop_old_rpc_recreate_fixed.sql 2>&1; then
  echo ""
  echo "✅ Migration applied successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Restart Expo: Press 'R' in terminal or restart the app"
  echo "2. Try saving a trip again as Owner"
  echo "3. Check console for: ✅ EditTripModal.handleSave: RPC succeeded"
  echo ""
else
  echo ""
  echo "⚠️  CLI migration failed. Try manual method above."
  exit 1
fi
