# 📄 Travel Documents - Phase 1 Setup Guide

## ✅ Phase 1.1: Types and Interfaces (COMPLETED)
- ✅ Created `src/types/travelDocuments.ts`
- All TypeScript interfaces and types defined

---

## ✅ Phase 1.2: Edge Functions (COMPLETED)
- ✅ Created `supabase/functions/encrypt-document/index.ts`
- ✅ Created `supabase/functions/decrypt-document/index.ts`
- ✅ Configured Deno runtime with `deno.json` and `import_map.json`

### Deploying Edge Functions

```bash
# Asegúrate de tener Supabase CLI instalado
npm install -g supabase

# Login (si no lo has hecho)
supabase login

# Vincular proyecto
supabase link --project-ref YOUR_PROJECT_REF

# Deploy encrypt-document
supabase functions deploy encrypt-document

# Deploy decrypt-document
supabase functions deploy decrypt-document
```

---

## ✅ Phase 1.3: Database Migration (COMPLETED)
- ✅ Created `supabase/migrations/20250115_travel_documents.sql`
- ✅ Created migration script `apply-travel-documents-migration.sh`

### Tables Created:
1. **travel_documents**: Documentos con encriptación dual
2. **recovery_codes**: Códigos de recuperación temporales (15min)
3. **document_access_logs**: Auditoría de accesos

### Apply Migration

**Option A: Using Supabase CLI (Recommended)**
```bash
supabase db push
```

**Option B: Manual (Dashboard)**
1. Go to: https://YOUR_PROJECT.supabase.co/project/_/sql/new
2. Copy contents of `supabase/migrations/20250115_travel_documents.sql`
3. Execute SQL

**Option C: Using provided script**
```bash
export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
./apply-travel-documents-migration.sh
```

---

## ⏳ Phase 1.4: Storage Bucket Configuration (PENDING)

### Manual Setup in Supabase Dashboard

1. **Navigate to Storage**
   - Go to: https://YOUR_PROJECT.supabase.co/project/_/storage/buckets

2. **Create Bucket**
   - Click "Create bucket"
   - Name: `travel-documents`
   - Public: **NO** (keep private)
   - File size limit: 10 MB
   - Allowed MIME types: 
     - `image/jpeg`
     - `image/png`
     - `image/heic`
     - `application/pdf`

3. **Configure RLS Policies**

   Go to the bucket's policies section and add:

   **Policy 1: Users can upload own images**
   ```sql
   CREATE POLICY "Users can upload own document images"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'travel-documents' 
     AND auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

   **Policy 2: Users can view own images**
   ```sql
   CREATE POLICY "Users can view own document images"
   ON storage.objects FOR SELECT
   USING (
     bucket_id = 'travel-documents' 
     AND auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

   **Policy 3: Users can update own images**
   ```sql
   CREATE POLICY "Users can update own document images"
   ON storage.objects FOR UPDATE
   USING (
     bucket_id = 'travel-documents' 
     AND auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

   **Policy 4: Users can delete own images**
   ```sql
   CREATE POLICY "Users can delete own document images"
   ON storage.objects FOR DELETE
   USING (
     bucket_id = 'travel-documents' 
     AND auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

4. **Folder Structure**
   
   Files will be organized as:
   ```
   travel-documents/
   ├── {userId}/
   │   ├── {documentId}.jpg
   │   ├── {documentId}.png
   │   └── ...
   ```

---

## 🔐 Security Architecture

### Dual-Key Encryption System
- **Primary Key**: Derived from user's PIN using PBKDF2 (50,000 iterations)
- **Recovery Key**: Derived from userID (for email recovery)
- **Algorithm**: AES-256-GCM (military-grade)
- **Storage**: 
  - PIN → SecureStore (encrypted keychain)
  - Documents → AsyncStorage (encrypted)
  - Recovery codes → Supabase (hashed)

### Recovery Flow
1. User requests recovery via email
2. System generates 6-digit code (15min expiry, 3 max attempts)
3. Code sent via Resend API
4. User enters code → receives recovery key
5. Documents decrypted with recovery key → re-encrypted with new PIN

---

## 📋 Testing Checklist

### Phase 1 Validation
- [ ] Edge Functions deployed successfully
- [ ] Database migration applied without errors
- [ ] Storage bucket created with correct policies
- [ ] RLS policies prevent unauthorized access
- [ ] Can create/read/update/delete test documents
- [ ] Recovery codes can be generated and validated
- [ ] Expired codes are cleaned up automatically

---

## 🚨 Important Notes

1. **Backup Before Migration**: Always backup your database before applying migrations
2. **Service Role Key**: Never commit your service role key to git
3. **Edge Functions**: Test encryption/decryption locally before deploying
4. **Image Compression**: Images > 10MB will be automatically compressed client-side
5. **Biometric Auth**: iOS Face ID requires NSFaceIDUsageDescription in Info.plist

---

## 🔄 Next Steps

After completing Phase 1, proceed to:
- **Phase 2**: Server-side encryption implementation (Days 3-4)
- **Phase 3**: Local storage and encryption (Days 5-6)
- **Phase 4**: UI components (Days 7-9)
- **Phase 5**: Synchronization system (Days 10-11)
- **Phase 6**: Testing and security audit (Days 12-13)
- **Phase 7**: Optimizations (Day 14)

---

## 📞 Support

If you encounter issues:
1. Check Supabase logs: https://YOUR_PROJECT.supabase.co/project/_/logs
2. Verify environment variables are set correctly
3. Ensure Supabase CLI is up to date: `npm install -g supabase@latest`

---

**Created**: January 15, 2025  
**Status**: Phase 1.1, 1.2, 1.3 ✅ | Phase 1.4 ⏳
