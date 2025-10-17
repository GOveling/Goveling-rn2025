const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function findNotification() {
  try {
    console.log('🔍 Buscando notificaciones recientes con rol "editor"...\n');

    const { data: notifications, error } = await supabase
      .from('notifications_inbox')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`✅ Encontradas ${notifications.length} notificaciones recientes\n`);

    // Filtrar las que tienen rol "editor"
    const editorNotifs = notifications.filter((n) => {
      const data = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
      return data?.role === 'editor';
    });

    console.log(`📝 Notificaciones con rol "editor": ${editorNotifs.length}\n`);

    for (const notif of editorNotifs) {
      const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
      const tripId = data?.trip_id || data?.tripId;
      const role = data?.role;

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📧 Notificación ID: ${notif.id}`);
      console.log(`👤 Usuario destinatario ID: ${notif.user_id}`);
      console.log(`📅 Fecha: ${new Date(notif.created_at).toLocaleString('es-ES')}`);
      console.log(`📖 Leída: ${notif.is_read ? 'Sí' : 'No'}`);
      console.log(`🔔 Tipo: ${data?.type || 'N/A'}`);
      console.log(`📝 Rol: ${role || 'N/A'}`);
      console.log(`🗂️ Trip ID: ${tripId || 'N/A'}`);
      console.log(`📦 Data completa:`, JSON.stringify(data, null, 2));

      // Si hay trip_id, obtener información del viaje
      if (tripId) {
        const { data: trip, error: tripError } = await supabase
          .from('trips')
          .select('id, title, status, created_at, updated_at')
          .eq('id', tripId)
          .single();

        if (!tripError && trip) {
          console.log(`\n🗺️  INFORMACIÓN DEL VIAJE:`);
          console.log(`   - Título: "${trip.title}"`);
          console.log(`   - Estado: ${trip.status}`);
          console.log(`   - Creado: ${new Date(trip.created_at).toLocaleString('es-ES')}`);
          console.log(`   - Actualizado: ${new Date(trip.updated_at).toLocaleString('es-ES')}`);
        }

        // Obtener información del propietario/invitador
        const inviterId = data?.inviter_id || data?.owner_id || data?.actor_id || data?.added_by;
        if (inviterId) {
          const { data: inviter, error: inviterError } = await supabase
            .from('profiles')
            .select('id, email, display_name')
            .eq('id', inviterId)
            .single();

          if (!inviterError && inviter) {
            console.log(`\n👥 QUIEN AGREGÓ:`);
            console.log(`   - ID: ${inviter.id}`);
            console.log(`   - Email: ${inviter.email}`);
            console.log(`   - Nombre: ${inviter.display_name || 'Sin nombre'}`);
          }
        }

        // Obtener información del usuario destinatario
        const { data: recipient, error: recipientError } = await supabase
          .from('profiles')
          .select('id, email, display_name')
          .eq('id', notif.user_id)
          .single();

        if (!recipientError && recipient) {
          console.log(`\n📨 DESTINATARIO (quien recibió la notificación):`);
          console.log(`   - ID: ${recipient.id}`);
          console.log(`   - Email: ${recipient.email}`);
          console.log(`   - Nombre: ${recipient.display_name || 'Sin nombre'}`);
        }
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // También buscar invitaciones recientes con rol editor
    console.log('\n🔍 Buscando invitaciones recientes con rol "editor"...\n');
    const { data: invitations, error: invError } = await supabase
      .from('trip_invitations')
      .select('*')
      .eq('role', 'editor')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!invError && invitations.length > 0) {
      console.log(`✅ Encontradas ${invitations.length} invitaciones\n`);
      for (const inv of invitations) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📨 Invitación ID: ${inv.id}`);
        console.log(`📧 Email invitado: ${inv.email}`);
        console.log(`📝 Rol: ${inv.role}`);
        console.log(`🗂️ Trip ID: ${inv.trip_id}`);
        console.log(`📊 Estado: ${inv.status}`);
        console.log(`📅 Creada: ${new Date(inv.created_at).toLocaleString('es-ES')}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }
    }
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

findNotification();
