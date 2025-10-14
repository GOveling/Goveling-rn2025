import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
}

export type UserRole = 'owner' | 'editor' | 'viewer';

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
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
  try {
    const { data: collaborators } = await supabase
      .from('trip_collaborators')
      .select(`
        user_id,
        role,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('trip_id', tripId);

    return collaborators?.map(collab => ({
      id: collab.user_id,
      full_name: (collab.profiles as any)?.full_name,
      avatar_url: (collab.profiles as any)?.avatar_url,
      role: collab.role,
    })) || [];
  } catch (error) {
    console.error('Error getting trip collaborators:', error);
    return [];
  }
};

export const getTripOwner = async (tripId: string): Promise<UserProfile | null> => {
  try {
    const { data: trip } = await supabase
      .from('trips')
      .select(`
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
      `)
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
