// Debug script to test TripSelectorModal functionality
// Run this with: node scripts/debug-trip-selector.js

const { supabase } = require('../src/lib/supabase');

async function debugTripSelector() {
  console.log('🔍 Testing TripSelectorModal logic...');

  try {
    // Test user authentication
    const { data: user, error: userError } = await supabase.auth.getUser();

    if (userError || !user?.user?.id) {
      console.error('❌ Usuario no autenticado');
      return;
    }

    console.log('✅ Usuario autenticado:', user.user.email);

    // 1. Test owned trips query
    const { data: ownedTrips, error: ownedError } = await supabase
      .from('trips')
      .select('*')
      .eq('owner_id', user.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    console.log('📋 Viajes propios:', ownedTrips?.length || 0);
    if (ownedError) console.error('❌ Error owned trips:', ownedError);

    // 2. Test collaborative trips query
    const { data: collaborativeTrips, error: collabError } = await supabase
      .from('trip_collaborators')
      .select(
        `
        trip_id,
        role,
        trips:trip_id (
          id,
          title,
          description,
          start_date,
          end_date,
          status,
          owner_id,
          created_at
        )
      `
      )
      .eq('user_id', user.user.id)
      .eq('role', 'editor');

    console.log('🤝 Viajes colaborativos (Editor):', collaborativeTrips?.length || 0);
    if (collabError) console.error('❌ Error collaborative trips:', collabError);

    // 3. Combine results
    const combinedTrips = [];

    if (ownedTrips) {
      combinedTrips.push(...ownedTrips);
    }

    if (collaborativeTrips) {
      for (const collab of collaborativeTrips) {
        const trip = collab.trips;
        if (trip && trip.status === 'active') {
          const isDuplicate = combinedTrips.some((existingTrip) => existingTrip.id === trip.id);
          if (!isDuplicate) {
            combinedTrips.push(trip);
          }
        }
      }
    }

    console.log('📊 Total viajes disponibles:', combinedTrips.length);
    console.log('📝 Viajes:');
    combinedTrips.forEach((trip, index) => {
      console.log(`  ${index + 1}. ${trip.title} (${trip.id})`);
    });
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
}

// Only run if called directly
if (require.main === module) {
  debugTripSelector()
    .then(() => {
      console.log('🎯 Debug completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { debugTripSelector };
