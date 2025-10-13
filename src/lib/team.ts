import { supabase } from '~/lib/supabase';
import { sendPush } from '~/lib/push_send';

/** Invite a user by email. If the user exists, send push; always send email separately (Resend path). */
export async function inviteToTrip(trip_id: string, email: string, role: 'viewer' | 'editor') {
  // Insert invitation
  const { data: inv, error } = await supabase.from('trip_invitations').insert({ trip_id, email, role }).select('id, trip_id, email, role').single();
  if (error) throw error;

  // Resolve inviter name and trip title for richer notifications/emails
  const { data: me } = await supabase.auth.getUser();
  const inviterName = me?.user?.user_metadata?.full_name || me?.user?.email || 'Goveling user';
  const { data: tripRow } = await supabase
    .from('trips')
    .select('title')
    .eq('id', trip_id)
    .maybeSingle();
  const tripName = (tripRow as any)?.title as string | undefined;

  // Try to find an existing user by email to push
  const { data: userProfile } = await supabase.from('profiles').select('id, display_name').ilike('email', email).maybeSingle();
  if (userProfile?.id) {
    // Notify user with richer payload including inviter and trip
    await sendPush(
      [userProfile.id],
      'Invitation to collaborate',
      tripName && inviterName ? `${inviterName} invited you to "${tripName}"` : (tripName ? `You have been invited to "${tripName}"` : 'You have been invited to a trip'),
      { type: 'trip_invite', trip_id, role, trip_name: tripName, inviter_name: inviterName }
    );
  }

  // Send email via Edge Function (Resend) with SQL RPC fallback
  try {
    // Deep link to the trip inside the app (scheme defined in app.json)
    const inviteLink = `goveling://trips/${trip_id}`;
    const edgeRes = await supabase.functions.invoke('send-invite-email', {
      body: { email, role, inviterName, tripName, inviteLink }
    });
    if ((edgeRes as any)?.error) throw (edgeRes as any).error;
  } catch (e) {
    console.log('Edge function send-invite-email failed, trying SQL RPC fallback:', e);
    try {
      await supabase.rpc('send_invite_email', {
        email,
        role,
        inviter_name: undefined, // Use server-side default if not provided
        trip_name: undefined,
        invite_link: undefined,
      });
    } catch (rpcErr) {
      // Do not block the UX on email failure
      console.log('send_invite_email RPC failed (non-blocking):', rpcErr);
    }
  }
  return inv;
}

export async function acceptInvitation(invitation_id: number) {
  // Move invitation → collaborators
  const { data: inv } = await supabase.from('trip_invitations').select('trip_id, email, role, owner_id').eq('id', invitation_id).single();
  if (!inv) throw new Error('Invitation not found');

  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id!;

  await supabase.from('trip_collaborators').insert({ trip_id: inv.trip_id, user_id: uid, role: inv.role });
  await supabase.from('trip_invitations').delete().eq('id', invitation_id);

  // Notify owner
  if (inv.owner_id) {
    // Fetch trip title for richer payload
    const { data: tripRow } = await supabase.from('trips').select('title').eq('id', inv.trip_id).maybeSingle();
    const tripName = (tripRow as any)?.title as string | undefined;
    await sendPush([inv.owner_id], 'Invitation accepted', tripName ? `Accepted for "${tripName}"` : 'A collaborator accepted your invitation', { type: 'invite_accepted', trip_id: inv.trip_id, trip_name: tripName });
  }
}

export async function rejectInvitation(invitation_id: number) {
  const { data: inv } = await supabase.from('trip_invitations').select('trip_id, owner_id').eq('id', invitation_id).single();
  await supabase.from('trip_invitations').delete().eq('id', invitation_id);
  if (inv?.owner_id) {
    const { data: tripRow } = await supabase.from('trips').select('title').eq('id', inv.trip_id).maybeSingle();
    const tripName = (tripRow as any)?.title as string | undefined;
    await sendPush([inv.owner_id], 'Invitation declined', tripName ? `Declined for "${tripName}"` : 'A collaborator declined your invitation', { type: 'invite_declined', trip_id: inv.trip_id, trip_name: tripName });
  }
}

export async function removeCollaborator(trip_id: string, user_id: string) {
  console.log('removeCollaborator called with:', { trip_id, user_id });

  // Get trip details and all participants before removing
  const [tripRes, removedUserRes, allParticipantsRes] = await Promise.all([
    supabase.from('trips').select('title, owner_id').eq('id', trip_id).maybeSingle(),
    supabase.from('profiles').select('display_name, email').eq('id', user_id).maybeSingle(),
    supabase.from('trip_collaborators').select('user_id').eq('trip_id', trip_id)
  ]);

  console.log('removeCollaborator - fetched data:', {
    trip: tripRes.data,
    removedUser: removedUserRes.data,
    participants: allParticipantsRes.data
  });

  const tripName = (tripRes.data as any)?.title;
  const ownerId = (tripRes.data as any)?.owner_id;
  const removedUserName = (removedUserRes.data as any)?.display_name || (removedUserRes.data as any)?.email || 'User';
  const allParticipants = (allParticipantsRes.data || []).map((p: any) => p.user_id).filter((id: string) => id !== user_id);

  // Add owner to participants if not already included
  if (ownerId && !allParticipants.includes(ownerId)) {
    allParticipants.push(ownerId);
  }

  console.log('removeCollaborator - processed data:', {
    tripName,
    ownerId,
    removedUserName,
    allParticipants
  });

  // Remove the collaborator
  const { error } = await supabase.from('trip_collaborators').delete().eq('trip_id', trip_id).eq('user_id', user_id);
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
      tripName ? `${removedUserName} was removed from "${tripName}"` : `${removedUserName} was removed from the trip`,
      { type: 'member_removed', trip_id, trip_name: tripName, removed_user: removedUserName }
    );
  }

  console.log('removeCollaborator - notifications sent, operation complete');
}
