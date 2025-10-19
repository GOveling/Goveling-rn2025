# 🚀 SQL Migration Execution Guide

## ⚡ Quick Start

The database migration for group features is ready to deploy.

### Step 1: Verify Migration File

Location: `/supabase/migrations/202510197_group_features_expenses_decisions.sql`

Contents:
- ✅ `trip_expenses` table with arrays for paid_by/split_between
- ✅ `trip_decisions` table with voting options
- ✅ `trip_decision_votes` table with UNIQUE constraint
- ✅ Complete RLS policies (3 tables × 4 policies each)
- ✅ Auto-update triggers for timestamps
- ✅ Performance indexes

### Step 2: Deploy to Supabase

**Option A: Supabase Dashboard (Recommended)**
1. Go to: https://app.supabase.com/project/[YOUR-PROJECT-ID]/sql/new
2. Click "New Query"
3. Open file: `/supabase/migrations/202510197_group_features_expenses_decisions.sql`
4. Copy entire content
5. Paste into Supabase SQL Editor
6. Click "Run" button
7. Verify: Check "Tables" section to see new tables

**Option B: Terminal (if Supabase CLI is installed)**
```bash
cd /Users/sebastianaraos/Desktop/Goveling-rn2025

# Push migration to Supabase
supabase db push

# Verify tables were created
supabase db remote diff
```

**Option C: Direct psql (if you have database credentials)**
```bash
psql "postgresql://[user]:[password]@[host]:[port]/[database]" \
  -f supabase/migrations/202510197_group_features_expenses_decisions.sql
```

---

## ✅ Verification Checklist

After executing the migration, verify in Supabase Dashboard:

### Tables Created
- [ ] `trip_expenses` table exists
- [ ] `trip_decisions` table exists
- [ ] `trip_decision_votes` table exists

### Columns Correct
**trip_expenses**:
- [ ] `id` (uuid, primary key)
- [ ] `trip_id` (uuid, foreign key)
- [ ] `description` (text)
- [ ] `amount` (numeric)
- [ ] `paid_by` (uuid[])
- [ ] `split_between` (uuid[])
- [ ] `created_by` (uuid)
- [ ] `created_at` (timestamp)
- [ ] `updated_at` (timestamp)

**trip_decisions**:
- [ ] `id` (uuid, primary key)
- [ ] `trip_id` (uuid, foreign key)
- [ ] `title` (text)
- [ ] `description` (text)
- [ ] `options` (text[])
- [ ] `end_date` (timestamp)
- [ ] `status` (text)
- [ ] `selected_participants` (uuid[])
- [ ] `created_by` (uuid)
- [ ] `created_at` (timestamp)
- [ ] `updated_at` (timestamp)

**trip_decision_votes**:
- [ ] `id` (uuid, primary key)
- [ ] `decision_id` (uuid, foreign key)
- [ ] `user_id` (uuid, foreign key)
- [ ] `option_index` (integer)
- [ ] `created_at` (timestamp)
- [ ] `updated_at` (timestamp)

### RLS Policies
- [ ] `trip_expenses` has 4 policies (SELECT, INSERT, UPDATE, DELETE)
- [ ] `trip_decisions` has 4 policies (SELECT, INSERT, UPDATE, DELETE)
- [ ] `trip_decision_votes` has 4 policies (SELECT, INSERT, UPDATE, DELETE)

### Triggers
- [ ] `update_trip_expenses_updated_at` trigger exists
- [ ] `update_trip_decisions_updated_at` trigger exists
- [ ] `update_trip_decision_votes_updated_at` trigger exists

### Indexes
- [ ] Index on `trip_expenses(trip_id)`
- [ ] Index on `trip_decisions(trip_id)`
- [ ] Index on `trip_decision_votes(decision_id)`

---

## 🧪 Test the Migration

After deployment, test with a sample INSERT:

```sql
-- Test 1: Insert a sample expense
INSERT INTO public.trip_expenses (trip_id, description, amount, paid_by, split_between, created_by)
VALUES (
  'your-trip-uuid-here', 
  'Test expense',
  100,
  ARRAY['user-id-1'],
  ARRAY['user-id-1', 'user-id-2'],
  'user-id-1'
);

-- Test 2: Insert a sample decision
INSERT INTO public.trip_decisions (trip_id, title, options, status, selected_participants, created_by)
VALUES (
  'your-trip-uuid-here',
  'Where to eat?',
  ARRAY['Pizza', 'Sushi', 'Tacos'],
  'open',
  ARRAY['user-id-1', 'user-id-2'],
  'user-id-1'
);

-- Test 3: Check RLS by querying as different user
SELECT * FROM public.trip_expenses;

-- Test 4: Insert a vote
INSERT INTO public.trip_decision_votes (decision_id, user_id, option_index)
VALUES ('decision-uuid-here', 'user-id-1', 0);
```

---

## 🔍 Troubleshooting

### Error: "Permission denied"
**Cause**: RLS policies blocking access
**Solution**: Make sure you're logged in as the trip owner or collaborator

### Error: "Duplicate key value violates unique constraint"
**Cause**: Trying to vote twice in same decision
**Solution**: This is expected! Update your vote instead of inserting new one

### Error: "Foreign key constraint violated"
**Cause**: Referenced trip/user doesn't exist
**Solution**: Use real trip_id and user_id values from your database

### Tables don't appear after execution
**Solution**: 
1. Refresh Supabase dashboard (F5)
2. Check "All tables" filter at bottom left
3. Verify you executed the entire SQL file (all 300+ lines)

---

## 📊 Migration Statistics

| Item | Count |
|------|-------|
| Tables Created | 3 |
| Columns Total | 25 |
| RLS Policies | 12 |
| Triggers | 3 |
| Indexes | 4 |
| Lines of SQL | 312 |

---

## ⏭️ Next Steps

After migration is deployed:

1. **Verify**: Use checklist above to confirm tables exist
2. **Test**: Run sample INSERT queries to verify RLS
3. **Implement**: Start building ExpensesTab component
4. **Deploy**: Components are already ready to use the hooks

---

## 💡 Pro Tips

- **Backup**: Consider exporting a backup before migration
- **Test env**: Test on a dev Supabase project first
- **Monitoring**: Check Supabase logs for any migration errors
- **Rollback**: If needed, you can drop tables with:
  ```sql
  DROP TABLE IF EXISTS public.trip_decision_votes CASCADE;
  DROP TABLE IF EXISTS public.trip_decisions CASCADE;
  DROP TABLE IF EXISTS public.trip_expenses CASCADE;
  ```

---

**Status**: ✅ Migration Ready for Deployment
**Created**: 2025-01-27
**Next Step**: Execute in Supabase SQL Editor
