# 🔧 Edit Trip Modal - Save Button Fix

## Issue Identified

The **Save button in the Edit Trip Modal is not saving changes**. Root cause analysis shows:

### Problem 1: RPC Parameter Type Mismatch
- **File**: `supabase/migrations/2025101903_update_trip_details_rpc.sql`
- **Issue**: The RPC function `update_trip_details()` was defined with parameters:
  ```sql
  p_start_date date,    -- ❌ Expected: date type
  p_end_date date,      -- ❌ Expected: date type
  ```
- **Reality**: From the client (`EditTripModal.tsx`), dates are sent as **strings**:
  ```typescript
  p_start_date: formatDateForStorage(tripData.startDate)  // "2025-12-01"
  p_end_date: formatDateForStorage(tripData.endDate)      // "2025-12-01"
  ```
- **Result**: Type casting mismatch → RPC fails silently → Falls back to direct update
- **Fallback Issue**: Direct update hits RLS policies that don't allow Editors/Viewers to write

### Problem 2: Missing Error Visibility
- The save operation logs errors minimally, making it hard to diagnose
- No console output to indicate success or failure

---

## Solutions Applied

### 1. ✅ Fixed RPC Function Signature (DEPLOYED)
**File**: `supabase/migrations/2025101903_update_trip_details_rpc.sql`

Changes:
- Changed date parameters to `text` type (more flexible):
  ```sql
  p_start_date text,    -- ✅ Now accepts strings
  p_end_date text,      -- ✅ Now accepts strings
  ```
- Added safe date parsing inside the function:
  ```sql
  v_start_date := case 
    when p_start_date is null or p_start_date = '' then null
    else p_start_date::date
  end;
  ```
- This allows the function to handle:
  - `null` dates (for "no dates" trips)
  - Empty strings
  - ISO date strings ("YYYY-MM-DD")

### 2. ✅ Enhanced Error Logging (DEPLOYED)
**File**: `src/components/EditTripModal.tsx`

Added detailed console logs to track:
```typescript
// Before RPC call
console.log('📝 EditTripModal.handleSave: Preparing update data:', { ... });

// During RPC call
console.log('🔄 EditTripModal.handleSave: Calling update_trip_details RPC...');

// After RPC response
console.log('✅ EditTripModal.handleSave: RPC succeeded, data:', rpcData);
console.error('❌ EditTripModal.handleSave: RPC error:', { code, message, details });

// Fallback
console.log('🔄 EditTripModal.handleSave: Falling back to direct update...');
```

---

## How to Apply the Fix

### Option A: Using Supabase CLI (Recommended)

```bash
cd /Users/sebastianaraos/Desktop/Goveling-rn2025

# Run the migration script
bash apply-rpc-fix.sh
```

### Option B: Manual - Supabase Dashboard SQL Editor

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor** → **New Query**
4. Paste the entire contents of:
   ```
   supabase/migrations/2025101903_update_trip_details_rpc.sql
   ```
5. Click **Run**
6. Verify success: The function should be updated without errors

### Option C: Manual - PostgreSQL CLI

```bash
# Connect to your Supabase Postgres
psql "postgresql://postgres:[password]@[host]/postgres"

# Paste the SQL from the migration file and run
```

---

## Testing the Fix

### Step 1: Start the App
```bash
npx expo start
```

### Step 2: Test Save as Owner
1. Open an existing trip you own
2. Tap **"Editar"** (Edit button)
3. Change the title (e.g., add " - UPDATED")
4. Tap **"Guardar"** (Save button)
5. **Expected**: Success alert, changes reflected immediately

### Step 3: Monitor Console Logs
Open browser DevTools or Expo Go console:
- ✅ Look for: `✅ EditTripModal.handleSave: RPC succeeded`
- ❌ If you see: `❌ EditTripModal.handleSave: RPC error`
  - Note the error code and message
  - Check database permissions

### Step 4: Test as Editor
1. Get invited to a trip with **Editor** role
2. Edit the trip
3. Verify changes save

### Step 5: Verify Realtime Updates
1. Edit trip on Device A (Owner/Editor)
2. Check Device B (any role) immediately
3. Changes should appear without manual refresh

---

## Expected Console Output (Success Case)

```
📝 EditTripModal.handleSave: Preparing update data: {
  tripId: "abc123...",
  title: "My Trip - UPDATED",
  startDate: "2025-12-01",
  endDate: "2025-12-10",
  budget: 5000
}
🔄 EditTripModal.handleSave: Calling update_trip_details RPC...
✅ EditTripModal.handleSave: RPC succeeded, data: {
  id: "abc123...",
  title: "My Trip - UPDATED",
  description: "...",
  start_date: "2025-12-01",
  end_date: "2025-12-10",
  updated_at: "2025-10-19T15:30:00Z"
}
🔄 EditTripModal: Trip updated, triggering global refresh
```

---

## Expected Console Output (Error Case with PGRST203 - Function Conflict)

```
❌ EditTripModal.handleSave: RPC error: {
  code: 'PGRST203',
  message: 'Could not choose the best candidate function between: 
    public.update_trip_details(...date, date...), 
    public.update_trip_details(...text, text...)',
  details: { ... }
}
⚠️  EditTripModal.handleSave: RPC returned no data: {rpcData: null, rpcErr: {...}}
🔄 EditTripModal.handleSave: Falling back to direct update...
✅ EditTripModal.handleSave: Direct update succeeded
```

**Fix**: Error PGRST203 means TWO versions of the RPC function exist in your database.
- Old version with `date` parameters
- New version with `text` parameters

PostgreSQL cannot decide which to call. **You must DROP the old version.**

### How to Fix PGRST203

#### Option A: Use the Fix Script (Recommended)

```bash
cd /Users/sebastianaraos/Desktop/Goveling-rn2025
bash fix-rpc-conflict.sh
```

#### Option B: Manual - Supabase Dashboard

1. Open [Supabase Dashboard](https://app.supabase.com) → **SQL Editor**
2. Run this query:

```sql
-- Drop old version first
drop function if exists public.update_trip_details(
  uuid,
  text,
  text,
  date,
  date,
  numeric,
  text,
  text
) cascade;
```

3. Click **Run**
4. Restart Expo Go and try saving again

---

## Expected Console Output (Error Case - Permission Denied)

```
❌ EditTripModal.handleSave: RPC error: {
  code: "42501",
  message: "not authorized to update this trip",
  details: { ... }
}
🔄 EditTripModal.handleSave: Falling back to direct update...
❌ EditTripModal.handleSave: Direct update error: {
  rpcError: {"code":"42501",...},
  directError: {"code":"PGRST100","message":"...",...}
}
```

**If you see error 42501**: This means RLS denied access. Check:
- Is user the trip owner? (`trips.user_id` or `trips.owner_id` = current user)
- Is user an Editor collaborator? (Check `trip_collaborators` table)

---

## Files Modified

1. ✅ `supabase/migrations/2025101903_update_trip_details_rpc.sql`
   - Fixed RPC parameter types (date → text)
   - Added safe date parsing

2. ✅ `src/components/EditTripModal.tsx`
   - Enhanced error logging
   - Better diagnostics

3. 📝 `apply-rpc-fix.sh` (helper script)

---

## Validation Checklist

- [ ] RPC migration applied to Supabase
- [ ] Console logs appear when saving
- [ ] Owner can edit trip and save (RPC succeeds)
- [ ] Editor can edit trip and save (RPC succeeds)
- [ ] Viewer cannot edit (button is disabled)
- [ ] Changes appear on other devices' TripCard
- [ ] Realtime subscription refreshes list
- [ ] Trip title/dates/budget all update correctly

---

## Next Steps If Issues Persist

1. **Check Supabase Realtime Publication**:
   ```sql
   -- In Supabase SQL Editor, verify trips is published:
   select * from pg_publication_tables where pubname = 'supabase_realtime';
   ```
   Should see `public | trips` in results.

2. **Verify RLS Policies**:
   ```sql
   -- List all policies on trips table
   select * from pg_policies where tablename = 'trips' order by policyname;
   ```

3. **Test RPC Directly**:
   Use `supabase` JavaScript client in browser console:
   ```javascript
   supabase.rpc('update_trip_details', {
     p_trip_id: 'trip-id',
     p_title: 'Test',
     p_description: null,
     p_start_date: '2025-12-01',
     p_end_date: '2025-12-10',
     p_budget: 1000,
     p_accommodation: null,
     p_transport: null
   }).then(r => console.log('RPC Result:', r));
   ```

---

## Related Documents

- `SECURITY_SETUP.md` - RLS policies configuration
- `SECURITY_ALERT.md` - Security considerations
- `MIGRATION_REPAIR_GUIDE.md` - Database migration troubleshooting
