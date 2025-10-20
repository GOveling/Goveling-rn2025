import { sendPush } from '~/lib/push_send';
import { supabase } from '~/lib/supabase';

/**
 * Invite a user by email with secure token generation.
 * - Generates cryptographically secure token
 * - Uses RPC function for database validation
 * - Sends push notification if user exists
 * - Sends email with deep link
 */
/**
 * Invite a user to a trip (using secure server-side RPC)
 * All critical validations happen on the server
 */
export async function inviteToTrip(
  trip_id: string,
  email: string,
  role: 'viewer' | 'editor'
): Promise<{
  id: string;
  trip_id: string;
  email: string;
  role: string;
  token: string;
}> {
  // ================================================================
  // CLIENT-SIDE VALIDATION (UX only - server validates security)
  // ================================================================
  if (!trip_id || !email || !role) {
    throw new Error('Missing required parameters');
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // ================================================================
  // CALL SECURE RPC - All critical logic happens on server
  // ================================================================
  const { data, error } = await supabase.rpc('invite_to_trip_rpc', {
    p_trip_id: trip_id,
    p_email: normalizedEmail,
    p_role: role,
  });

  if (error) {
    console.error('RPC invite_to_trip_rpc error:', error);

    // Parse server errors into user-friendly messages
    const errorMessage = error.message || '';
    if (errorMessage.includes('already a collaborator')) {
      throw new Error('This user is already a collaborator on this trip');
    } else if (errorMessage.includes('Only trip owners')) {
      throw new Error('Only trip owners can send invitations');
    } else if (errorMessage.includes('Trip not found')) {
      throw new Error('Trip not found');
    } else if (errorMessage.includes('Authentication required')) {
      throw new Error('You must be logged in to send invitations');
    } else {
      throw new Error('Could not send invitation. Please try again.');
    }
  }

  if (!data || data.length === 0) {
    throw new Error('No invitation data returned from server');
  }

  const invitationData = data[0];
  const invitationId = invitationData.invitation_id;
  const token = invitationData.token;
  const tripName = invitationData.trip_title;
  const inviterName = invitationData.inviter_name;

  // ================================================================
  // STEP 4: Send push notification (if user exists in profiles)
  // ================================================================
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('id, display_name')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (userProfile?.id) {
    await sendPush(
      [userProfile.id],
      'Invitation to collaborate',
      tripName && inviterName
        ? `${inviterName} invited you to "${tripName}"`
        : tripName
          ? `You have been invited to "${tripName}"`
          : 'You have been invited to a trip',
      {
        type: 'trip_invite',
        trip_id,
        role,
        trip_name: tripName,
        inviter_name: inviterName,
        token, // Include token for deep linking
      }
    );
  }

  // STEP 6: Send email with deep link containing token
  try {
    // Deep link with token for secure acceptance
    const inviteLink = `goveling://accept-invitation?token=${token}`;

    const edgeRes = await supabase.functions.invoke('send-invite-email', {
      body: {
        email: normalizedEmail,
        role,
        inviterName,
        tripName,
        inviteLink,
      },
    });

    if ((edgeRes as any)?.error) {
      console.warn('Edge function send-invite-email failed:', (edgeRes as any).error);
    }
  } catch (e) {
    console.log('Email send failed (non-blocking):', e);
  }

  // STEP 7: Return invitation details
  return {
    id: invitationId,
    trip_id,
    email: normalizedEmail,
    role,
    token,
  };
}

/**
 * Accept invitation by ID (legacy) or by token (new secure method)
 * @param invitation_id - The invitation ID
 * @param token - Optional token for token-based acceptance
 */
export async function acceptInvitation(invitation_id: number, token?: string) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error('User not authenticated');

  // Ensure the accepting user has a profile row
  try {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', uid)
      .maybeSingle();

    if (!existingProfile) {
      const full_name =
        (u?.user as any)?.user_metadata?.full_name || (u?.user?.email?.split('@')[0] ?? null);
      const avatar_url =
        (u?.user as any)?.user_metadata?.avatar_url ||
        (u?.user as any)?.user_metadata?.picture ||
        null;
      await supabase.from('profiles').upsert(
        {
          id: uid,
          email: u?.user?.email ?? null,
          full_name,
          avatar_url,
        },
        { onConflict: 'id' }
      );
    }
  } catch (profileErr) {
    console.log('ensure profile for accepting user failed (non-blocking):', profileErr);
  }

  // Accept invitation via secure RPC to avoid client-side recursion issues
  const { data: rpcData, error: rpcError } = await supabase.rpc('accept_invitation_rpc', {
    p_invitation_id: token ? null : invitation_id,
    p_token: token ?? null,
  });
  if (rpcError) {
    throw new Error(rpcError.message || 'Could not accept invitation');
  }
  const trip_id = Array.isArray(rpcData) && rpcData[0]?.trip_id ? rpcData[0].trip_id : null;
  if (!trip_id) {
    throw new Error('No trip id returned after accepting invitation');
  }

  // Notify inviter
  // Fetch inviter from invitation for notification if possible (best-effort)
  let inviter_id: string | null = null;
  try {
    const { data: invFetch } = await supabase
      .from('trip_invitations')
      .select('inviter_id, trip_id')
      .eq(token ? 'token' : 'id', token ? token : invitation_id)
      .maybeSingle();
    inviter_id = (invFetch as { inviter_id?: string | null } | null)?.inviter_id ?? null;
  } catch {}

  if (inviter_id) {
    const { data: tripRow } = await supabase
      .from('trips')
      .select('title')
      .eq('id', trip_id)
      .maybeSingle();
    const tripName = (tripRow as { title?: string | null } | null)?.title ?? undefined;

    await sendPush(
      [inviter_id],
      'Invitation accepted',
      tripName ? `Accepted for "${tripName}"` : 'A collaborator accepted your invitation',
      { type: 'invite_accepted', trip_id, trip_name: tripName }
    );
  }

  // Return trip_id for navigation
  return { trip_id };
}

/**
 * Reject/decline invitation by ID or token
 * @param invitation_id - The invitation ID
 * @param token - Optional token for token-based rejection
 */
export async function rejectInvitation(invitation_id: number, token?: string) {
  // Fetch invitation (by ID or token)
  let invQuery = supabase.from('trip_invitations').select('id, trip_id, inviter_id, status');

  if (token) {
    invQuery = invQuery.eq('token', token);
  } else {
    invQuery = invQuery.eq('id', invitation_id);
  }

  const { data: inv, error: invError } = await invQuery.single();

  if (invError || !inv) {
    throw new Error('Invitation not found');
  }

  // Validate invitation status
  if (inv.status !== 'pending') {
    throw new Error(`This invitation has already been ${inv.status}`);
  }

  // Update status to declined (don't delete, keep for history)
  await supabase
    .from('trip_invitations')
    .update({
      status: 'declined',
      updated_at: new Date().toISOString(),
    })
    .eq('id', inv.id);

  // Notify inviter
  if (inv.inviter_id) {
    const { data: tripRow } = await supabase
      .from('trips')
      .select('title')
      .eq('id', inv.trip_id)
      .maybeSingle();
    const tripName = (tripRow as any)?.title as string | undefined;
    await sendPush(
      [inv.inviter_id],
      'Invitation declined',
      tripName ? `Declined for "${tripName}"` : 'A collaborator declined your invitation',
      { type: 'invite_declined', trip_id: inv.trip_id, trip_name: tripName }
    );
  }
}

export async function removeCollaborator(trip_id: string, user_id: string) {
  console.log('removeCollaborator called with:', { trip_id, user_id });

  // Get trip details and all participants before removing
  const [tripRes, removedUserRes, allParticipantsRes] = await Promise.all([
    supabase.from('trips').select('title, owner_id').eq('id', trip_id).maybeSingle(),
    supabase.from('profiles').select('display_name, email').eq('id', user_id).maybeSingle(),
    supabase.from('trip_collaborators').select('user_id').eq('trip_id', trip_id),
  ]);

  console.log('removeCollaborator - fetched data:', {
    trip: tripRes.data,
    removedUser: removedUserRes.data,
    participants: allParticipantsRes.data,
  });

  const tripName = (tripRes.data as any)?.title;
  const ownerId = (tripRes.data as any)?.owner_id;
  const removedUserName =
    (removedUserRes.data as any)?.display_name || (removedUserRes.data as any)?.email || 'User';
  const allParticipants = (allParticipantsRes.data || [])
    .map((p: any) => p.user_id)
    .filter((id: string) => id !== user_id);

  // Add owner to participants if not already included
  if (ownerId && !allParticipants.includes(ownerId)) {
    allParticipants.push(ownerId);
  }

  console.log('removeCollaborator - processed data:', {
    tripName,
    ownerId,
    removedUserName,
    allParticipants,
  });

  // Remove the collaborator
  const { error } = await supabase
    .from('trip_collaborators')
    .delete()
    .eq('trip_id', trip_id)
    .eq('user_id', user_id);
  if (error) {
    console.error('removeCollaborator - delete failed:', error);
    throw error;
  }

  console.log('removeCollaborator - delete successful, sending notifications...');

  // Notify the removed user
  await sendPush(
    [user_id],
    'Removed from trip',
    tripName ? `You were removed from "${tripName}"` : 'You were removed from a collaborative trip',
    { type: 'removed', trip_id, trip_name: tripName }
  );

  // Notify all remaining participants (owner + other collaborators)
  if (allParticipants.length > 0) {
    await sendPush(
      allParticipants,
      'Team member removed',
      tripName
        ? `${removedUserName} was removed from "${tripName}"`
        : `${removedUserName} was removed from the trip`,
      { type: 'member_removed', trip_id, trip_name: tripName, removed_user: removedUserName }
    );
  }

  console.log('removeCollaborator - notifications sent, operation complete');
}
