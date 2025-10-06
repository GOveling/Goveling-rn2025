import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Solo permitir método POST
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Crear cliente con service role key para DDL operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log('🔧 Applying mobile_phone migration...');

    // Verificar si la columna ya existe
    const { data: existingColumns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles')
      .eq('column_name', 'mobile_phone');

    if (checkError) {
      console.error('❌ Error checking existing columns:', checkError);
      throw new Error('Error checking table structure');
    }

    if (existingColumns && existingColumns.length > 0) {
      console.log('✅ Column mobile_phone already exists');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Column mobile_phone already exists',
        action: 'skipped'
      }), { 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Aplicar la migración usando SQL directo
    const migrationSQL = `
      ALTER TABLE public.profiles ADD COLUMN mobile_phone text;
      COMMENT ON COLUMN public.profiles.mobile_phone IS 'Mobile phone number with country code (e.g., +34 123 456 789)';
    `;

    console.log('📝 Executing SQL:', migrationSQL);

    // Ejecutar SQL usando rpc con función sql
    const { data, error } = await supabase.rpc('sql', { 
      query: migrationSQL 
    });

    if (error) {
      console.error('❌ Migration error:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }

    console.log('✅ Migration applied successfully!');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Column mobile_phone added successfully',
      action: 'created'
    }), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (e) {
    console.error('❌ Migration error:', e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: e.message 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
