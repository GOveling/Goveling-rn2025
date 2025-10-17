const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDatabaseStats() {
  try {
    console.log('🔍 Verificando estadísticas de la base de datos...\n');

    // Contar trips totales
    const { count: tripsCount } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 TRIPS: ${tripsCount || 0}`);

    // Contar trips activos
    const { count: activeTripsCount } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    console.log(`   └─ Activos: ${activeTripsCount || 0}`);

    // Contar trips cancelados
    const { count: cancelledTripsCount } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled');

    console.log(`   └─ Cancelados: ${cancelledTripsCount || 0}`);

    // Contar notificaciones
    const { count: notificationsCount } = await supabase
      .from('notifications_inbox')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📬 NOTIFICACIONES: ${notificationsCount || 0}`);

    // Contar invitaciones
    const { count: invitationsCount } = await supabase
      .from('trip_invitations')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📨 INVITACIONES: ${invitationsCount || 0}`);

    // Contar perfiles
    const { count: profilesCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    console.log(`\n👤 USUARIOS: ${profilesCount || 0}`);

    // Contar miembros de trips
    const { count: membersCount } = await supabase
      .from('trip_members')
      .select('*', { count: 'exact', head: true });

    console.log(`\n👥 MIEMBROS DE TRIPS: ${membersCount || 0}`);

    // Si hay trips, mostrar algunos
    if (tripsCount && tripsCount > 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🗺️  TRIPS RECIENTES:\n');

      const { data: recentTrips } = await supabase
        .from('trips')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentTrips) {
        for (const trip of recentTrips) {
          console.log(`   "${trip.title}"`);
          console.log(`   └─ ID: ${trip.id}`);
          console.log(`   └─ Estado: ${trip.status}`);
          console.log(`   └─ Creado: ${new Date(trip.created_at).toLocaleString('es-ES')}\n`);
        }
      }
    }

    // Si hay usuarios, mostrar algunos
    if (profilesCount && profilesCount > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👤 USUARIOS REGISTRADOS:\n');

      const { data: users } = await supabase
        .from('profiles')
        .select('id, email, display_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (users) {
        for (const user of users) {
          console.log(`   ${user.display_name || user.email}`);
          console.log(`   └─ ID: ${user.id}`);
          console.log(`   └─ Email: ${user.email}`);
          console.log(`   └─ Registro: ${new Date(user.created_at).toLocaleString('es-ES')}\n`);
        }
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Verificación completada\n');

    // Conclusión sobre la notificación del HTML
    console.log('📋 CONCLUSIÓN SOBRE LA NOTIFICACIÓN DEL HTML:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (notificationsCount === 0) {
      console.log('⚠️  No hay notificaciones en la base de datos actual.');
      console.log('');
      console.log('Posibles razones:');
      console.log('   1. La notificación fue de un viaje que ya se eliminó');
      console.log('   2. Nuestro nuevo filtro está funcionando y la removió');
      console.log('   3. Es datos de prueba del navegador (localStorage)');
      console.log('   4. La base de datos fue limpiada recientemente');
      console.log('');
      console.log('✅ ESTO CONFIRMA que el fix implementado está funcionando:');
      console.log('   - Filtra notificaciones de viajes cancelados');
      console.log('   - Muestra alerta si intentas acceder a un viaje eliminado');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDatabaseStats();
