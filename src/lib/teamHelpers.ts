import { supabase } from './supabase';
import { getTripCollaborators, getTripOwner, UserProfile } from './userUtils';

export interface TripWithTeamResult {
  trip: {
    id: string;
    title?: string;
    owner_id?: string | null;
    user_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    status?: string | null;
  } | null;
  owner: UserProfile | null;
  collaborators: UserProfile[];
  collaboratorsCount: number; // incluye owner
}

/**
 * getTripWithTeam
 * Single entry point to fetch: trip row, resolved owner profile, collaborators (profiles), and total count.
 * This centralizes logic to prevent divergence between cards, modals y listados.
 */
export async function getTripWithTeam(tripId: string): Promise<TripWithTeamResult> {
  try {
    console.log('🧩 getTripWithTeam: Fetching trip + team for', tripId);
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, title, owner_id, user_id, start_date, end_date, status')
      .eq('id', tripId)
      .maybeSingle();

    if (tripError) {
      console.error('❌ getTripWithTeam: trip query error', tripError);
      return { trip: null, owner: null, collaborators: [], collaboratorsCount: 0 };
    }

    if (!trip) {
      console.warn('⚠️ getTripWithTeam: trip not found', tripId);
      return { trip: null, owner: null, collaborators: [], collaboratorsCount: 0 };
    }

    const [owner, collaborators] = await Promise.all([
      getTripOwner(trip.id),
      getTripCollaborators(trip.id),
    ]);

    const collaboratorsCount = collaborators.length + 1; // +1 owner

    if (!trip.title) {
      console.warn('🧪 getTripWithTeam: Trip has no title (could affect UI)', { trip_id: trip.id });
    }
    if (!trip.owner_id && !trip.user_id) {
      console.warn('🧪 getTripWithTeam: Trip missing both owner_id and user_id fields!', {
        trip_id: trip.id,
      });
    }
    if (!owner) {
      console.warn('🧪 getTripWithTeam: Owner profile not resolved', {
        trip_owner_id: trip.owner_id,
        fallback_user_id: trip.user_id,
      });
    }
    if (collaborators.length === 0) {
      console.log(
        '🧪 getTripWithTeam: No collaborators found (this may still be valid if individual trip)'
      );
    }

    console.log('🧩 getTripWithTeam: Done', {
      trip_id: trip.id,
      owner_id: owner?.id || trip.owner_id || trip.user_id,
      collaborators: collaborators.map((c) => ({ id: c.id, name: c.full_name, role: c.role })),
      collaboratorsCount,
    });

    return { trip, owner, collaborators, collaboratorsCount };
  } catch (e) {
    console.error('❌ getTripWithTeam: unexpected error', e);
    return { trip: null, owner: null, collaborators: [], collaboratorsCount: 0 };
  }
}

/**
 * Optional RPC-based fetch (if SQL function deployed). Falls back to getTripWithTeam if RPC fails.
 */
export async function getTripWithTeamRPC(tripId: string): Promise<TripWithTeamResult> {
  try {
    console.log('🧩 getTripWithTeamRPC: Attempting RPC fetch for', tripId);
    const { data, error } = await supabase.rpc('get_trip_with_team', { p_trip_id: tripId });
    if (error) throw error;
    if (!data || data.length === 0) {
      console.warn('⚠️ getTripWithTeamRPC: No data returned, falling back');
      return getTripWithTeam(tripId);
    }
    const row = data[0];
    if (!row.title) {
      console.warn('🧪 getTripWithTeamRPC: Row without title', { trip_id: row.trip_id });
    }
    if (!row.owner_id) {
      console.warn(
        '🧪 getTripWithTeamRPC: Row without owner_id (will rely on original trip.user_id or UI fallback)',
        { trip_id: row.trip_id }
      );
    }
    const ownerProfile = row.owner_profile || null;
    const collabsRaw = Array.isArray(row.collaborators) ? row.collaborators : [];
    const collaborators: UserProfile[] = collabsRaw.map((c: any) => ({
      id: c.user_id,
      full_name: c.full_name,
      avatar_url: c.avatar_url,
      email: c.email,
      role: c.role,
    }));
    if (collaborators.length === 0) {
      console.log('🧪 getTripWithTeamRPC: No collaborators array entries');
    }
    return {
      trip: {
        id: row.trip_id,
        title: row.title,
        owner_id: row.owner_id,
        start_date: row.start_date,
        end_date: row.end_date,
        status: row.status,
      },
      owner: ownerProfile
        ? {
            id: ownerProfile.id,
            full_name: ownerProfile.full_name,
            avatar_url: ownerProfile.avatar_url,
            email: ownerProfile.email,
          }
        : null,
      collaborators,
      collaboratorsCount: row.collaborators_count || collaborators.length + 1,
    };
  } catch (e) {
    console.warn('⚠️ getTripWithTeamRPC: RPC failed, falling back to standard method', e);
    return getTripWithTeam(tripId);
  }
}
