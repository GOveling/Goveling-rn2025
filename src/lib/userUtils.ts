import { supabase } from './supabase';

// Forzar reload de Metro - versión 2.0
const FORCE_RELOAD_V2 = Date.now();

export interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
  role?: string; // Para colaboradores
}

export type UserRole = 'owner' | 'editor' | 'viewer';

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name,
      avatar_url: profile?.avatar_url,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const getTripCollaborators = async (tripId: string): Promise<UserProfile[]> => {
  console.log('🚀🚀🚀 UPDATED VERSION 2.0 - getTripCollaborators FUNCTION STARTED!!!', {
    tripId,
    timestamp: Date.now(),
  });
  console.log('🆕🆕🆕 THIS IS THE NEW FUNCTION - CHECK IF YOU SEE THIS LOG!!!');
  console.log('🔥🔥🔥 FORCE_RELOAD_V2:', FORCE_RELOAD_V2);

  try {
    console.log('🔍 getTripCollaborators: Starting query for trip:', tripId);
    console.log('🔍 getTripCollaborators: Trip ID length:', tripId?.length);
    console.log('🔍 getTripCollaborators: Trip ID type:', typeof tripId);
    console.log('🔍 getTripCollaborators: Function called at:', new Date().toISOString());

    // Primero obtenemos los IDs de los colaboradores
    console.log('🔍 getTripCollaborators: About to query trip_collaborators table');
    const { data: collaboratorIds, error: collabError } = await supabase
      .from('trip_collaborators')
      .select('user_id, role')
      .eq('trip_id', tripId);

    console.log('🔍 getTripCollaborators: Query completed, checking results...');

    if (collabError) {
      console.error('❌ getTripCollaborators: Collaborators query error:', collabError);
      console.error(
        '❌ getTripCollaborators: Error details:',
        JSON.stringify(collabError, null, 2)
      );
      return [];
    }

    console.log('🔍 getTripCollaborators: Collaborator IDs:', collaboratorIds);
    console.log('🔍 getTripCollaborators: Collaborator IDs count:', collaboratorIds?.length || 0);

    if (!collaboratorIds || collaboratorIds.length === 0) {
      console.log('❌ getTripCollaborators: No collaborators found');
      return [];
    }

    // Luego obtenemos los perfiles de esos usuarios
    const userIds = collaboratorIds.map((c) => c.user_id);
    console.log('🔍 getTripCollaborators: User IDs to fetch:', userIds);

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', userIds);

    if (profilesError) {
      console.error('❌ getTripCollaborators: Profiles query error:', profilesError);
      return [];
    }

    console.log('🔍 getTripCollaborators: Raw profiles:', profiles);
    console.log(
      '🔍 getTripCollaborators: Raw profiles stringified:',
      JSON.stringify(profiles, null, 2)
    );

    // CAMBIO: No retornar array vacío si no hay perfiles
    // En su lugar, crear colaboradores con IDs aunque no tengan perfil completo
    if (!profiles || profiles.length === 0) {
      console.log(
        '⚠️ getTripCollaborators: No profiles found, but creating collaborators with IDs only'
      );
      const resultWithoutProfiles = collaboratorIds.map((collab) => ({
        id: collab.user_id,
        full_name: null,
        avatar_url: null,
        email: null,
        role: collab.role,
      }));
      console.log('✅ getTripCollaborators: Result without profiles:', resultWithoutProfiles);
      return resultWithoutProfiles;
    }

    // Combinar la información de colaboradores con perfiles (incluyendo los que no tienen perfil)
    const result = collaboratorIds.map((collab) => {
      const profile = profiles.find((p) => p.id === collab.user_id);

      if (!profile) {
        console.log(
          `⚠️ getTripCollaborators: No profile found for collaborator ${collab.user_id}, including anyway`
        );
        return {
          id: collab.user_id,
          full_name: null,
          avatar_url: null,
          email: null,
          role: collab.role,
        };
      }

      const minimal = !profile?.full_name && !profile?.avatar_url;
      if (minimal) {
        console.log(
          '🩺 getTripCollaborators: Minimal/incomplete profile detected (likely backfill).',
          {
            user_id: collab.user_id,
            has_profile_row: !!profile,
            email: profile?.email,
            role: collab.role,
          }
        );
      }

      console.log(`👤 getTripCollaborators: Processing collaborator ${collab.user_id}:`, {
        profile_data: profile,
        has_profile: !!profile,
        full_name: profile?.full_name,
        email: profile?.email,
        role: collab.role,
      });

      return {
        id: collab.user_id,
        full_name: profile?.full_name || profile?.email?.split('@')[0] || null,
        avatar_url: profile?.avatar_url || null,
        email: profile?.email || null,
        role: collab.role,
      };
    });

    console.log('✅ getTripCollaborators: Final result:', result);
    return result;
  } catch (error) {
    console.error('❌ getTripCollaborators: CATCH ERROR:', error);
    console.error('❌ getTripCollaborators: Error details:', JSON.stringify(error, null, 2));
    console.error(
      '❌ getTripCollaborators: Stack trace:',
      error instanceof Error ? error.stack : 'No stack'
    );
    return [];
  }
};

export const getTripOwner = async (tripId: string): Promise<UserProfile | null> => {
  try {
    const { data: trip } = await supabase
      .from('trips')
      .select(
        `
        owner_id,
        user_id,
        profiles_owner:owner_id (
          id,
          full_name,
          avatar_url
        ),
        profiles_user:user_id (
          id,
          full_name,
          avatar_url
        )
      `
      )
      .eq('id', tripId)
      .single();

    if (!trip) return null;

    // Priorizar owner_id sobre user_id
    const ownerId = trip.owner_id || trip.user_id;
    const ownerProfile = (trip.profiles_owner as any) || (trip.profiles_user as any);

    // Si tenemos ownerId pero no pudimos traer el perfil (por RLS o datos faltantes),
    // igual devolvemos el ownerId para permitir resolver correctamente el rol "Owner".
    if (!ownerId) return null;

    return {
      id: ownerId,
      full_name: ownerProfile?.full_name,
      avatar_url: ownerProfile?.avatar_url,
    };
  } catch (error) {
    console.error('Error getting trip owner:', error);
    return null;
  }
};

/**
 * Resolve the current user's role for a given trip.
 * Contract:
 * - Inputs: userId (string|null|undefined), trip { id, owner_id?, user_id }
 * - Output: 'owner' | 'editor' | 'viewer'
 * - Owner takes precedence over collaborator role. If userId is missing, defaults to 'viewer'.
 */
export const resolveUserRoleForTrip = async (
  userId: string | null | undefined,
  trip: { id: string; owner_id?: string | null; user_id?: string | null }
): Promise<UserRole> => {
  try {
    if (!userId) return 'viewer';
    const ownerId = trip.owner_id || trip.user_id || null;
    if (ownerId && userId === ownerId) return 'owner';

    const { data, error } = await supabase
      .from('trip_collaborators')
      .select('role')
      .eq('trip_id', trip.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('resolveUserRoleForTrip: collaborators lookup error', error);
      return 'viewer';
    }

    const r = (data as any)?.role;
    return r === 'editor' || r === 'viewer' ? r : 'viewer';
  } catch (e) {
    console.warn('resolveUserRoleForTrip: unexpected error', e);
    return 'viewer';
  }
};

/**
 * Convenience helper: resolves the current authenticated user's role for a trip id.
 * Uses a minimal select on trips (id, owner_id, user_id) + resolveUserRoleForTrip.
 * Falls back to 'viewer' if user not logged in or trip not found.
 */
export async function resolveCurrentUserRoleForTripId(tripId: string): Promise<UserRole> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return 'viewer';

    const { data: tripRow, error: tripErr } = await supabase
      .from('trips')
      .select('id, owner_id, user_id')
      .eq('id', tripId)
      .maybeSingle();
    if (tripErr || !tripRow) return 'viewer';

    return resolveUserRoleForTrip(uid, {
      id: (tripRow as any).id,
      owner_id: (tripRow as any).owner_id,
      user_id: (tripRow as any).user_id,
    });
  } catch (e) {
    console.warn('resolveCurrentUserRoleForTripId unexpected error', e);
    return 'viewer';
  }
}
