import { supabase } from '~/lib/supabase';
import { sendPush } from '~/lib/push_send';

/** Invite a user by email. If the user exists, send push; always send email separately (Resend path). */
export async function inviteToTrip(trip_id:string, email:string, role:'viewer'|'editor'){
  // Insert invitation
  const { data: inv, error } = await supabase.from('trip_invitations').insert({ trip_id, email, role }).select('id, trip_id, email, role').single();
  if (error) throw error;

  // Try to find an existing user by email to push
  const { data: userProfile } = await supabase.from('profiles').select('id, display_name').ilike('email', email).maybeSingle();
  if (userProfile?.id){
    // Notify user
    await sendPush([userProfile.id], 'Invitation to collaborate', 'You have been invited to a trip', { type:'trip_invite', trip_id, role });
  }
  return inv;
}

export async function acceptInvitation(invitation_id:number){
  // Move invitation → collaborators
  const { data: inv } = await supabase.from('trip_invitations').select('trip_id, email, role, owner_id').eq('id', invitation_id).single();
  if (!inv) throw new Error('Invitation not found');

  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id!;

  await supabase.from('trip_collaborators').insert({ trip_id: inv.trip_id, user_id: uid, role: inv.role });
  await supabase.from('trip_invitations').delete().eq('id', invitation_id);

  // Notify owner
  if (inv.owner_id){
    await sendPush([inv.owner_id], 'Invitation accepted', 'A collaborator accepted your invitation', { type:'invite_accepted', trip_id: inv.trip_id });
  }
}

export async function rejectInvitation(invitation_id:number){
  const { data: inv } = await supabase.from('trip_invitations').select('trip_id, owner_id').eq('id', invitation_id).single();
  await supabase.from('trip_invitations').delete().eq('id', invitation_id);
  if (inv?.owner_id){
    await sendPush([inv.owner_id], 'Invitation declined', 'A collaborator declined your invitation', { type:'invite_declined', trip_id: inv.trip_id });
  }
}

export async function removeCollaborator(trip_id:string, user_id:string){
  await supabase.from('trip_collaborators').delete().eq('trip_id', trip_id).eq('user_id', user_id);
  await sendPush([user_id], 'Removed from trip', 'You were removed from a collaborative trip', { type:'removed', trip_id });
}
