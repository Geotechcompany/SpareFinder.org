const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSubscribers() {
  console.log('🔍 Checking subscribers in database...');
  
  // Check total count
  const { count, error: countError } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Count error:', countError);
    return;
  }
  
  console.log('📊 Total subscriptions in database:', count);
  
  // Get all subscribers with profiles
  const { data: subscribers, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      profiles(
        id,
        email,
        full_name,
        company,
        created_at,
        updated_at
      )
    `)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Subscribers fetch error:', error);
    return;
  }
  
  console.log('📊 Fetched subscribers:', subscribers?.length || 0);
  console.log('📊 Subscribers data:', JSON.stringify(subscribers, null, 2));
  
  // Check if there are users without subscriptions
  const { data: allUsers, error: usersError } = await supabase
    .from('profiles')
    .select('id, email, full_name, company, created_at')
    .order('created_at', { ascending: false });
  
  if (usersError) {
    console.error('❌ Users fetch error:', usersError);
    return;
  }
  
  console.log('📊 Total users in profiles table:', allUsers?.length || 0);
  console.log('📊 Users without subscriptions:', allUsers?.filter(user => 
    !subscribers?.some(sub => sub.user_id === user.id)
  ).length || 0);
}

checkSubscribers().catch(console.error);
