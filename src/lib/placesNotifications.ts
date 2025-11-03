import { sendPush } from '~/lib/push_send';
import { supabase } from '~/lib/supabase';
import { getTripCollaborators } from '~/lib/userUtils';

interface PlaceData {
  trip_id: string;
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  photo_url?: string | null;
  added_by: string;
  added_at: string;
  google_rating?: number | null;
  reviews_count?: number | null;
  price_level?: number | null;
  editorial_summary?: string | null;
  opening_hours?: { weekdayDescriptions?: string[] } | null;
  website?: string | null;
  phone?: string | null;
  // Geographic information from Google Places API
  country_code?: string | null;
  country?: string | null;
  city?: string | null;
  full_address?: string | null;
}

/**
 * Add a place to a trip and notify all collaborators (except the one adding)
 */
export async function addPlaceToTripWithNotification(
  tripId: string,
  placeData: PlaceData,
  addedBy: string
): Promise<{ error: Error | null }> {
  try {
    console.log('🏟️ addPlaceToTripWithNotification called:', {
      tripId,
      addedBy,
      placeName: placeData.name,
    });

    // 1. Add the place to the trip
    const { error: insertError } = await supabase.from('trip_places').insert(placeData);

    if (insertError) {
      console.error('❌ Error adding place to trip:', insertError);
      return { error: insertError };
    }

    console.log('✅ Place added successfully, now sending notifications...');

    // 2. Get trip info and collaborators for notifications
    const [tripRes, allCollaboratorsRes] = await Promise.all([
      supabase.from('trips').select('title, owner_id').eq('id', tripId).maybeSingle(),
      getTripCollaborators(tripId),
    ]);

    const tripName = tripRes.data?.title;
    const ownerId = tripRes.data?.owner_id;

    console.log('🏟️ Trip info:', {
      tripName,
      ownerId,
      collaboratorsCount: allCollaboratorsRes.length,
    });

    // 3. Get current user info (who added the place)
    const { data: addedByProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', addedBy)
      .maybeSingle();

    const addedByName = addedByProfile?.full_name || addedByProfile?.email || 'Someone';

    // 4. Build list of users to notify (all collaborators + owner, except the one who added)
    const notifyUsers: string[] = [];

    // Add owner if exists and is not the one adding
    if (ownerId && ownerId !== addedBy) {
      notifyUsers.push(ownerId);
    }

    // Add collaborators (except the one adding)
    allCollaboratorsRes.forEach((collaborator) => {
      if (collaborator.id !== addedBy && !notifyUsers.includes(collaborator.id)) {
        notifyUsers.push(collaborator.id);
      }
    });

    console.log('🔔 Users to notify:', notifyUsers.length, notifyUsers);

    // 5. Send notifications if there are users to notify
    if (notifyUsers.length > 0) {
      await sendPush(
        notifyUsers,
        'Nuevo lugar agregado',
        tripName
          ? `${addedByName} agregó "${placeData.name}" a "${tripName}"`
          : `${addedByName} agregó "${placeData.name}" al viaje`,
        {
          type: 'place_added',
          trip_id: tripId,
          trip_name: tripName,
          place_name: placeData.name,
          added_by: addedBy,
          added_by_name: addedByName,
        }
      );

      console.log('✅ Notifications sent successfully');
    } else {
      console.log('ℹ️ No users to notify (solo trip or only the owner/adder)');
    }

    return { error: null };
  } catch (error) {
    console.error('❌ Error in addPlaceToTripWithNotification:', error);
    return { error: error as Error };
  }
}

/**
 * Remove a place from a trip and notify all collaborators (except the one removing)
 */
export async function removePlaceFromTripWithNotification(
  placeId: string,
  tripId: string,
  placeName: string,
  removedBy: string
): Promise<{ error: Error | null }> {
  try {
    console.log('🗑️🔥 removePlaceFromTripWithNotification STARTED - VERY VERBOSE LOG:', {
      placeId,
      tripId,
      removedBy,
      placeName,
      timestamp: new Date().toISOString(),
    });
    console.log('🗑️🔥 PARAMETERS CHECK:', {
      placeId_type: typeof placeId,
      placeId_length: placeId?.length,
      tripId_type: typeof tripId,
      tripId_length: tripId?.length,
      placeName_type: typeof placeName,
      removedBy_type: typeof removedBy,
    });

    // 1. Remove the place from the trip
    console.log('🗑️🔥 STEP 1: About to delete place from database...');
    const { error: deleteError } = await supabase.from('trip_places').delete().eq('id', placeId);

    if (deleteError) {
      console.error('❌🔥 Error removing place from trip - DATABASE ERROR:', deleteError);
      return { error: deleteError };
    }

    console.log(
      '✅🔥 STEP 1 COMPLETED: Place removed successfully from database, now sending notifications...'
    );

    // 2. Get trip info and collaborators for notifications
    console.log('🗑️🔥 STEP 2: Getting trip info and collaborators...');
    const [tripRes, allCollaboratorsRes] = await Promise.all([
      supabase.from('trips').select('title, owner_id').eq('id', tripId).maybeSingle(),
      getTripCollaborators(tripId),
    ]);

    console.log('🗑️🔥 STEP 2 RESULTS:', {
      tripData: tripRes.data,
      tripError: tripRes.error,
      collaboratorsCount: allCollaboratorsRes.length,
      collaborators: allCollaboratorsRes,
    });

    const tripName = tripRes.data?.title;
    const ownerId = tripRes.data?.owner_id;

    console.log('🗑️🔥 Trip info extracted:', {
      tripName,
      ownerId,
      collaboratorsCount: allCollaboratorsRes.length,
    });

    // 3. Get current user info (who removed the place)
    const { data: removedByProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', removedBy)
      .maybeSingle();

    const removedByName = removedByProfile?.full_name || removedByProfile?.email || 'Someone';

    // 4. Build list of users to notify (all collaborators + owner, except the one who removed)
    const notifyUsers: string[] = [];

    // Add owner if exists and is not the one removing
    if (ownerId && ownerId !== removedBy) {
      notifyUsers.push(ownerId);
    }

    // Add collaborators (except the one removing)
    allCollaboratorsRes.forEach((collaborator) => {
      if (collaborator.id !== removedBy && !notifyUsers.includes(collaborator.id)) {
        notifyUsers.push(collaborator.id);
      }
    });

    console.log('🔔 Users to notify:', notifyUsers.length, notifyUsers);

    // 5. Send notifications if there are users to notify
    console.log('🗑️🔥 STEP 5: About to send notifications...');
    console.log('🗑️🔥 Final notification data:', {
      usersToNotify: notifyUsers,
      usersCount: notifyUsers.length,
      title: 'Lugar eliminado',
      message: tripName
        ? `${removedByName} eliminó "${placeName}" de "${tripName}"`
        : `${removedByName} eliminó "${placeName}" del viaje`,
      data: {
        type: 'place_removed',
        trip_id: tripId,
        trip_name: tripName,
        place_name: placeName,
        removed_by: removedBy,
        removed_by_name: removedByName,
      },
    });

    if (notifyUsers.length > 0) {
      console.log('🗑️🔥 SENDING NOTIFICATIONS...');
      const pushResult = await sendPush(
        notifyUsers,
        'Lugar eliminado',
        tripName
          ? `${removedByName} eliminó "${placeName}" de "${tripName}"`
          : `${removedByName} eliminó "${placeName}" del viaje`,
        {
          type: 'place_removed',
          trip_id: tripId,
          trip_name: tripName,
          place_name: placeName,
          removed_by: removedBy,
          removed_by_name: removedByName,
        }
      );

      console.log('✅🔥 Notifications sent successfully - PUSH RESULT:', pushResult);
    } else {
      console.log('ℹ️🔥 No users to notify (solo trip or only the owner/remover)');
    }

    return { error: null };
  } catch (error) {
    console.error('❌ Error in removePlaceFromTripWithNotification:', error);
    return { error: error as Error };
  }
}
