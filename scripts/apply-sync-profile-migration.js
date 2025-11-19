/**
 * Script para aplicar migración de sincronización automática de perfiles
 * Ejecutar: node scripts/apply-sync-profile-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function applyMigration() {
  console.log('🚀 Aplicando migración de sincronización de perfiles...\n');

  try {
    // Paso 1: Crear función de sincronización
    console.log('📝 Paso 1: Creando función sync_profile_to_user_profiles...');

    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION sync_profile_to_user_profiles()
        RETURNS TRIGGER AS $$
        BEGIN
          IF (TG_OP = 'UPDATE' AND (
              OLD.avatar_url IS DISTINCT FROM NEW.avatar_url OR
              OLD.full_name IS DISTINCT FROM NEW.full_name
            )) OR (TG_OP = 'INSERT') THEN
            
            INSERT INTO user_profiles (
              id, 
              username, 
              display_name, 
              avatar_url, 
              updated_at
            )
            VALUES (
              NEW.id, 
              COALESCE(NEW.full_name, 'Usuario'),
              COALESCE(NEW.full_name, 'Usuario'),
              NEW.avatar_url,
              NOW()
            )
            ON CONFLICT (id) 
            DO UPDATE SET
              display_name = COALESCE(EXCLUDED.display_name, user_profiles.username),
              avatar_url = EXCLUDED.avatar_url,
              updated_at = NOW();
            
            RAISE NOTICE 'Perfil sincronizado para user_id: % - Nombre: % - Avatar: %', 
              NEW.id, NEW.full_name, NEW.avatar_url;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `,
    });

    if (funcError) {
      console.log('⚠️  Error creando función (puede que ya exista):', funcError.message);
    } else {
      console.log('✅ Función creada exitosamente\n');
    }

    // Paso 2: Crear trigger
    console.log('📝 Paso 2: Creando trigger...');

    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS trigger_sync_avatar_to_user_profiles ON profiles;
        DROP TRIGGER IF EXISTS trigger_sync_profile_to_user_profiles ON profiles;
        
        CREATE TRIGGER trigger_sync_profile_to_user_profiles
          AFTER INSERT OR UPDATE OF avatar_url, full_name ON profiles
          FOR EACH ROW
          EXECUTE FUNCTION sync_profile_to_user_profiles();
      `,
    });

    if (triggerError) {
      console.log('⚠️  Error creando trigger:', triggerError.message);
    } else {
      console.log('✅ Trigger creado exitosamente\n');
    }

    // Paso 3: Sincronización inicial
    console.log('📝 Paso 3: Sincronizando datos existentes...');

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url');

    if (profilesError) {
      throw profilesError;
    }

    console.log(`   Encontrados ${profiles.length} perfiles para sincronizar`);

    for (const profile of profiles) {
      const { error: upsertError } = await supabase.from('user_profiles').upsert(
        {
          id: profile.id,
          username: profile.full_name || 'Usuario',
          display_name: profile.full_name || 'Usuario',
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      );

      if (upsertError) {
        console.log(`   ⚠️  Error sincronizando ${profile.id}:`, upsertError.message);
      } else {
        console.log(`   ✓ Sincronizado: ${profile.full_name || 'Usuario'}`);
      }
    }

    console.log('\n✅ Migración completada exitosamente!\n');

    // Verificación
    console.log('📊 Verificación:');
    const { data: syncData } = await supabase
      .from('user_profiles')
      .select('id, username, display_name, avatar_url')
      .limit(5);

    console.table(syncData);
  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    process.exit(1);
  }
}

applyMigration();
