const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkCancelledTrips() {
  try {
    console.log('🔍 Verificando viajes cancelados y sus notificaciones...\n');

    // 1. Buscar viajes cancelados
    const { data: cancelledTrips, error: tripsError } = await supabase
      .from('trips')
      .select('id, title, status, created_at, updated_at')
      .eq('status', 'cancelled')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (tripsError) {
      console.error('❌ Error buscando viajes cancelados:', tripsError);
      return;
    }

    console.log(`📊 VIAJES CANCELADOS: ${cancelledTrips.length}\n`);

    for (const trip of cancelledTrips) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🗺️  Viaje: "${trip.title}"`);
      console.log(`   ID: ${trip.id}`);
      console.log(`   Estado: ${trip.status}`);
      console.log(`   Creado: ${new Date(trip.created_at).toLocaleString('es-ES')}`);
      console.log(`   Eliminado: ${new Date(trip.updated_at).toLocaleString('es-ES')}`);

      // Buscar notificaciones relacionadas con este viaje
      const { data: notifications, error: notifError } = await supabase
        .from('notifications_inbox')
        .select('*')
        .order('created_at', { ascending: false });

      if (!notifError && notifications) {
        const tripNotifications = notifications.filter((n) => {
          const data = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
          const tripId = data?.trip_id || data?.tripId;
          return tripId === trip.id;
        });

        console.log(`\n   📬 Notificaciones relacionadas: ${tripNotifications.length}`);

        for (const notif of tripNotifications) {
          const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
          console.log(`\n   ├─ Notificación ID: ${notif.id}`);
          console.log(`   │  Tipo: ${data?.type || 'N/A'}`);
          console.log(`   │  Rol: ${data?.role || 'N/A'}`);
          console.log(`   │  Usuario: ${notif.user_id}`);
          console.log(`   │  Fecha: ${new Date(notif.created_at).toLocaleString('es-ES')}`);
          console.log(`   │  Leída: ${notif.is_read ? 'Sí' : 'No'}`);

          // Obtener info del usuario
          const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('email, display_name')
            .eq('id', notif.user_id)
            .single();

          if (!userError && user) {
            console.log(`   │  Email usuario: ${user.email}`);
            console.log(`   │  Nombre: ${user.display_name || 'N/A'}`);
          }

          // Si hay inviter, obtener info
          const inviterId = data?.inviter_id || data?.owner_id || data?.actor_id || data?.added_by;
          if (inviterId) {
            const { data: inviter, error: inviterError } = await supabase
              .from('profiles')
              .select('email, display_name')
              .eq('id', inviterId)
              .single();

            if (!inviterError && inviter) {
              console.log(`   │  Invitador: ${inviter.display_name || inviter.email}`);
            }
          }
        }
      }

      // Buscar miembros del viaje
      const { data: members, error: membersError } = await supabase
        .from('trip_members')
        .select('user_id, role, joined_at')
        .eq('trip_id', trip.id);

      if (!membersError && members && members.length > 0) {
        console.log(`\n   👥 Miembros del viaje: ${members.length}`);
        for (const member of members) {
          const { data: user } = await supabase
            .from('profiles')
            .select('email, display_name')
            .eq('id', member.user_id)
            .single();

          console.log(`   ├─ ${user?.email || member.user_id}`);
          console.log(`   │  Rol: ${member.role}`);
          console.log(`   │  Se unió: ${new Date(member.joined_at).toLocaleString('es-ES')}`);
        }
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // 2. Buscar TODAS las notificaciones recientes
    console.log('\n📋 TODAS LAS NOTIFICACIONES RECIENTES (últimas 20):\n');

    const { data: allNotifications, error: allError } = await supabase
      .from('notifications_inbox')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!allError && allNotifications) {
      for (const notif of allNotifications) {
        const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
        const tripId = data?.trip_id || data?.tripId;

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📧 Notificación ID: ${notif.id}`);
        console.log(`   Tipo: ${data?.type || 'N/A'}`);
        console.log(`   Rol: ${data?.role || 'N/A'}`);
        console.log(`   Trip ID: ${tripId || 'N/A'}`);
        console.log(`   Usuario: ${notif.user_id}`);
        console.log(`   Fecha: ${new Date(notif.created_at).toLocaleString('es-ES')}`);
        console.log(`   Leída: ${notif.is_read ? 'Sí' : 'No'}`);

        // Verificar si el viaje existe y su estado
        if (tripId) {
          const { data: trip, error: tripCheckError } = await supabase
            .from('trips')
            .select('title, status')
            .eq('id', tripId)
            .single();

          if (!tripCheckError && trip) {
            console.log(`   ✅ Viaje existe: "${trip.title}" (${trip.status})`);
          } else {
            console.log(`   ❌ Viaje NO EXISTE o fue eliminado`);
          }

          // Obtener usuario
          const { data: user } = await supabase
            .from('profiles')
            .select('email, display_name')
            .eq('id', notif.user_id)
            .single();

          if (user) {
            console.log(`   👤 Usuario: ${user.display_name || user.email}`);
          }
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }
    }

    // 3. Verificar invitaciones pendientes
    console.log('\n📨 INVITACIONES PENDIENTES:\n');

    const { data: invitations, error: invError } = await supabase
      .from('trip_invitations')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!invError && invitations) {
      console.log(`Total: ${invitations.length}\n`);
      for (const inv of invitations) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📨 Invitación ID: ${inv.id}`);
        console.log(`   Email: ${inv.email}`);
        console.log(`   Rol: ${inv.role}`);
        console.log(`   Trip ID: ${inv.trip_id}`);
        console.log(`   Estado: ${inv.status}`);
        console.log(`   Creada: ${new Date(inv.created_at).toLocaleString('es-ES')}`);

        // Verificar si el viaje existe
        const { data: trip } = await supabase
          .from('trips')
          .select('title, status')
          .eq('id', inv.trip_id)
          .single();

        if (trip) {
          console.log(`   Viaje: "${trip.title}" (${trip.status})`);
        } else {
          console.log(`   ⚠️  Viaje no existe`);
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }
    }

    // 4. Resumen final
    console.log('\n📊 RESUMEN:');
    console.log(`   - Viajes cancelados: ${cancelledTrips.length}`);
    console.log(`   - Notificaciones totales: ${allNotifications?.length || 0}`);
    console.log(`   - Invitaciones pendientes: ${invitations?.length || 0}`);

    // Contar notificaciones huérfanas (viaje cancelado)
    let orphanNotifications = 0;
    if (allNotifications) {
      for (const notif of allNotifications) {
        const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
        const tripId = data?.trip_id || data?.tripId;
        if (tripId) {
          const { data: trip } = await supabase
            .from('trips')
            .select('status')
            .eq('id', tripId)
            .single();

          if (!trip || trip.status === 'cancelled') {
            orphanNotifications++;
          }
        }
      }
    }

    console.log(`   - Notificaciones huérfanas (viaje cancelado): ${orphanNotifications}`);
    console.log(`\n✅ Verificación completada\n`);
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkCancelledTrips();
