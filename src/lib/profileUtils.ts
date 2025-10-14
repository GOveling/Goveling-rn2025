import { supabase } from './supabase';

/**
 * Ensure a profile exists for a given user ID, creating a minimal one if missing.
 * This is useful for collaborators who accepted invites but don't have profile rows.
 */
export async function ensureUserProfile(userId: string): Promise<void> {
  try {
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    if (existingProfile) {
      return; // Profile already exists
    }

    // Try to get user metadata from auth (this may not be accessible depending on RLS)
    // For now, create a minimal profile that can be updated later
    await supabase.from('profiles').upsert({
      id: userId,
      email: null, // Could be populated if accessible
      full_name: null, // Could be populated if accessible  
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    console.log('Created minimal profile for user:', userId);
  } catch (error) {
    console.log('Could not ensure profile for user', userId, '- non-blocking:', error);
  }
}

/**
 * Backfill missing profiles for multiple user IDs
 */
export async function ensureMultipleUserProfiles(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  
  try {
    // Get existing profiles
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id')
      .in('id', userIds);
    
    const existingIds = new Set((existingProfiles || []).map(p => p.id));
    const missingIds = userIds.filter(id => !existingIds.has(id));
    
    if (missingIds.length === 0) return;
    
    // Create minimal profiles for missing users
    const now = new Date().toISOString();
    const newProfiles = missingIds.map(userId => ({
      id: userId,
      email: null,
      full_name: null,
      avatar_url: null,
      created_at: now,
      updated_at: now,
    }));
    
    await supabase.from('profiles').upsert(newProfiles, { onConflict: 'id' });
    console.log('Backfilled profiles for users:', missingIds);
  } catch (error) {
    console.log('Could not backfill profiles - non-blocking:', error);
  }
}