# 🔧 Guía de Reparación de Migraciones de Supabase

## 📋 Resumen del Problema

Tienes entradas duplicadas en la tabla `schema_migrations` de Supabase, lo que impide que las migraciones se sincronicen correctamente. Esto ocurre cuando archivos de migración con el mismo timestamp se aplican múltiples veces.

## ✅ Trabajo Ya Completado

1. ✅ Proyecto vinculado a Supabase (`project-ref: iwsuyrlrbmnbfyfkqowl`)
2. ✅ Configuración actualizada a PostgreSQL 17
3. ✅ Archivos de migración locales renombrados con timestamps únicos:
   - `202509192_v143_push_queue.sql`
   - `202509193_v144_booking_clickouts.sql`
   - `202510062_onboarding_fields.sql`
   - `202510092_add_photo_url_to_trip_places.sql`
   - `202510093_trip_accommodations.sql`
   - `202510172_add_google_places_fields.sql`
   - `202510173_add_invitation_security_fields.sql`
   - `202510174_create_send_trip_invitation_function.sql`
   - `202510182_create_profiles_table.sql`
   - `202512092_add_country_code_to_trip_places.sql`

## 🔨 Pasos para Resolver

### Opción 1: Limpiar Duplicados (Recomendado)

1. **Abre el SQL Editor de Supabase**
   - Ve a: https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/sql/new

2. **Ejecuta el script de limpieza**
   - Copia y pega el contenido de `fix_schema_migrations.sql`
   - Ejecuta cada sección paso a paso
   - **IMPORTANTE**: El script eliminará duplicados manteniendo solo una entrada por versión

3. **Sincroniza las migraciones locales**
   ```bash
   SUPABASE_ACCESS_TOKEN=sbp_457b13bbe793ef1c117726faabce557a31549978 supabase db pull
   ```

4. **Verifica el estado**
   ```bash
   SUPABASE_ACCESS_TOKEN=sbp_457b13bbe793ef1c117726faabce557a31549978 supabase migration list
   ```

### Opción 2: Reseteo Completo (Nuclear)

⚠️ **ADVERTENCIA**: Esto borrará TODO el historial de migraciones. Solo usa esta opción si:
- Tienes un backup de tu base de datos
- O estás seguro de que la estructura actual de tu BD es correcta

1. **Ejecuta en SQL Editor**:
   ```sql
   DELETE FROM supabase_migrations.schema_migrations;
   ```

2. **Reconstruye el historial desde archivos locales**:
   ```bash
   cd /Users/sebastianaraos/Desktop/Goveling-rn2025
   
   # Marca todas las migraciones como aplicadas
   SUPABASE_ACCESS_TOKEN=sbp_457b13bbe793ef1c117726faabce557a31549978 \
   supabase db push --include-all
   ```

## 🚀 Siguiente Paso Después de Limpiar

Una vez que el historial esté limpio y sincronizado, podrás aplicar nuevas migraciones sin problemas:

```bash
# Aplicar migraciones pendientes
SUPABASE_ACCESS_TOKEN=sbp_457b13bbe793ef1c117726faabce557a31549978 \
supabase db push

# Verificar estado final
SUPABASE_ACCESS_TOKEN=sbp_457b13bbe793ef1c117726faabce557a31549978 \
supabase migration list
```

## 🐛 Problema de Conectividad IPv6

**Diagnóstico**: El DNS de Supabase resuelve a IPv6, pero hay problemas de conexión intermitentes.

**Solución**: Los comandos ya están usando IPv4 correctamente después de varios reintentos. Si los problemas persisten:

1. Espera 30-60 segundos entre comandos
2. O usa la variable de entorno:
   ```bash
   GODEBUG=netdns=go SUPABASE_ACCESS_TOKEN=sbp_457b13bbe793ef1c117726faabce557a31549978 supabase <comando>
   ```

## 📝 Archivos a Ignorar en Migraciones

Los siguientes archivos no se aplicarán automáticamente (nombre inválido):
- `FORCE_UPDATE_FUNCTIONS.sql` - Renombra a algo como `20251017150000_force_update_functions.sql`
- `NUCLEAR_FIX.sql` - Renombra a algo como `20251017151000_nuclear_fix.sql`

## ✨ Estado Actual

- **Archivos locales**: Correctamente renombrados con timestamps únicos ✅
- **Base de datos remota**: Tiene entradas duplicadas en `schema_migrations` ❌
- **Siguiente acción**: Ejecutar script SQL de limpieza en Supabase Dashboard

---

**Última actualización**: 17 de octubre de 2025
