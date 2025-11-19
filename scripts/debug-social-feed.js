const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://iwsuyrlrbmnbfyfkqowl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c3V5cmxyYm1uYmZ5Zmtxb3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjM4NTcsImV4cCI6MjA3MzgzOTg1N30.qC14nN1H4JcsubN31he9Y9VUWa3Dl1sDY28iAyKcIPg'
);

const userId = '8d8d65a0-c92f-42bf-9450-22964a3640e3';

async function debugFeed() {
  console.log('=== DEBUG SOCIAL FEED ===\n');

  // 1. Contar todos los posts
  const { count: totalPosts } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true });

  console.log(`Total posts en DB: ${totalPosts}`);

  // 2. Ver posts con detalles
  const { data: allPosts } = await supabase
    .from('posts')
    .select(
      `
      id,
      user_id,
      caption,
      user_profiles!inner(username, display_name)
    `
    )
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('\nPosts encontrados:');
  allPosts?.forEach((post, idx) => {
    console.log(
      `${idx + 1}. @${post.user_profiles.username}: ${post.caption?.substring(0, 40)}...`
    );
  });

  // 3. Test get_my_posts
  console.log('\n--- get_my_posts ---');
  const { data: myPosts, error: myError } = await supabase.rpc('get_my_posts', {
    p_user_id: userId,
    p_limit: 10,
    p_offset: 0,
  });

  if (myError) {
    console.error('Error:', myError.message);
  } else {
    console.log(`Mis posts: ${myPosts?.length || 0}`);
    myPosts?.forEach((p, i) => console.log(`  ${i + 1}. ${p.caption?.substring(0, 30)}`));
  }

  // 4. Test get_global_random_posts
  console.log('\n--- get_global_random_posts ---');
  const { data: randomPosts, error: randomError } = await supabase.rpc('get_global_random_posts', {
    current_user_id: userId,
    limit_count: 10,
  });

  if (randomError) {
    console.error('Error:', randomError.message);
  } else {
    console.log(`Random posts: ${randomPosts?.length || 0}`);
    randomPosts?.forEach((p, i) =>
      console.log(`  ${i + 1}. @${p.username}: ${p.caption?.substring(0, 30)}`)
    );
  }

  // 5. Test get_dynamic_social_feed
  console.log('\n--- get_dynamic_social_feed ---');
  const { data: feedPosts, error: feedError } = await supabase.rpc('get_dynamic_social_feed', {
    p_user_id: userId,
    p_limit: 10,
    p_offset: 0,
  });

  if (feedError) {
    console.error('Error:', feedError.message);
  } else {
    console.log(`Feed posts: ${feedPosts?.length || 0}`);
    feedPosts?.forEach((p, i) =>
      console.log(`  ${i + 1}. @${p.username}: ${p.caption?.substring(0, 30)}`)
    );
  }
}

debugFeed().catch(console.error);
