#!/usr/bin/env node
/*
  Debug trip team composition (owner, collaborators, invites)
  - Uses SUPABASE_SERVICE_ROLE_KEY if available for full access (bypasses RLS)
  - Falls back to EXPO_PUBLIC_SUPABASE_ANON_KEY (results may be limited by RLS)

  Usage examples:
    node scripts/debug-trip-team.js --title "chile test"
    node scripts/debug-trip-team.js --id 00000000-0000-0000-0000-000000000000

  Optional flags:
    --email <userEmail>   Print user id for this email to compare with owner/collaborators
*/

const { createClient } = require('@supabase/supabase-js');
const { hideBin } = require('yargs/helpers');
const yargs = require('yargs/yargs');
require('dotenv').config();

(async () => {
  const argv = yargs(hideBin(process.argv))
    .option('id', { type: 'string', describe: 'Trip UUID' })
    .option('title', { type: 'string', describe: 'Trip title (ILIKE search if not exact match)' })
    .option('email', { type: 'string', describe: 'User email to resolve id (optional)' })
    .demandOption(
      ['id', 'title'].filter(() => false),
      'Provide either --id or --title'
    )
    .help()
    .parse();

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL in .env');
    process.exit(1);
  }
  if (!service && !anon) {
    console.error(
      '❌ Missing SUPABASE keys. Provide SUPABASE_SERVICE_ROLE_KEY (preferred) or EXPO_PUBLIC_SUPABASE_ANON_KEY'
    );
    process.exit(1);
  }

  const keyInUse = service || anon;
  const mode = service ? 'service-role' : 'anon';
  const supabase = createClient(url, keyInUse, { auth: { persistSession: false } });

  console.log(`🔌 Supabase URL: ${url}`);
  console.log(`🔐 Using key mode: ${mode}`);

  async function resolveTrip() {
    if (argv.id) {
      const { data, error } = await supabase
        .from('trips')
        .select('id, title, owner_id, user_id, status, start_date, end_date, created_at')
        .eq('id', argv.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    if (argv.title) {
      // Try exact first, then partial ILIKE
      let { data, error } = await supabase
        .from('trips')
        .select('id, title, owner_id, user_id, status, start_date, end_date, created_at')
        .eq('title', argv.title)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      if (data && data.length > 0) return data[0];

      const resp = await supabase
        .from('trips')
        .select('id, title, owner_id, user_id, status, start_date, end_date, created_at')
        .ilike('title', `%${argv.title}%`)
        .order('created_at', { ascending: false })
        .limit(5);
      if (resp.error) throw resp.error;
      if (!resp.data || resp.data.length === 0) return null;
      if (resp.data.length > 1) {
        console.log('ℹ️ Multiple trips matched by title (showing first):');
        resp.data.forEach((t, i) => console.log(`  [${i}] ${t.title}  id=${t.id}`));
      }
      return resp.data[0];
    }
    return null;
  }

  try {
    const trip = await resolveTrip();
    if (!trip) {
      console.log('⚠️ No trip found for provided id/title');
      process.exit(0);
    }

    console.log('\n🗺️ Trip');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log({
      id: trip.id,
      title: trip.title,
      status: trip.status,
      owner_id: trip.owner_id || trip.user_id,
      legacy_user_id: trip.user_id,
      created_at: trip.created_at,
    });

    if (argv.email) {
      const { data: ownerByEmail } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', argv.email)
        .maybeSingle();
      console.log('\n👤 Email lookup');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(ownerByEmail || '(not found)');
    }

    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('id', trip.owner_id || trip.user_id)
      .maybeSingle();

    console.log('\n👑 Owner');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(ownerProfile || '(owner profile not found)');

    const { data: collabs, error: collabErr } = await supabase
      .from('trip_collaborators')
      .select('user_id, role, status, added_by, added_at')
      .eq('trip_id', trip.id)
      .order('added_at', { ascending: true });
    if (collabErr) console.error('⚠️ trip_collaborators error:', collabErr.message);

    // Join collaborator profiles
    let collaborators = [];
    if (collabs && collabs.length) {
      const ids = [...new Set(collabs.map((c) => c.user_id))];
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', ids);
      if (profErr) console.error('⚠️ profiles join error:', profErr.message);
      const map = new Map((profiles || []).map((p) => [p.id, p]));
      collaborators = collabs.map((c) => ({ ...c, profile: map.get(c.user_id) || null }));
    }

    console.log('\n👥 Collaborators');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (!collaborators.length) {
      console.log('(none)');
    } else {
      collaborators.forEach((c, i) => {
        console.log(`[${i}]`, {
          user_id: c.user_id,
          role: c.role,
          status: c.status,
          added_by: c.added_by,
          name: c.profile?.full_name || null,
          email: c.profile?.email || null,
        });
      });
    }

    // Select a broad set of columns to be schema-tolerant across environments
    const { data: invites, error: invErr } = await supabase
      .from('trip_invitations')
      .select('*')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: true });
    if (invErr) console.error('⚠️ invitations error:', invErr.message);

    console.log('\n✉️ Invitations');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (!invites || !invites.length) {
      console.log('(none)');
    } else {
      invites.forEach((i, idx) => {
        // Print commonly expected fields if present
        const row = {
          id: i.id,
          status: i.status,
          email: i.email,
          role: i.role,
          inviter_id: i.inviter_id,
          created_at: i.created_at,
          expires_at: i.expires_at,
        };
        console.log(`[${idx}]`, row);
      });
    }

    // Quick conclusions
    console.log('\n✅ Summary & Likely Cause');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const collabActive = collaborators.filter((c) => (c.status || 'active') === 'active');
    console.log({
      owner_present: !!ownerProfile,
      collaborators_total: collaborators.length,
      collaborators_active: collabActive.length,
      invitations_total: invites?.length || 0,
    });

    if (mode === 'anon') {
      console.log('\n⚠️ You are using ANON key. Results may be filtered by RLS.');
      console.log(
        '   To get authoritative results, set SUPABASE_SERVICE_ROLE_KEY in your .env and re-run.'
      );
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err?.message || err);
    process.exit(1);
  }
})();
