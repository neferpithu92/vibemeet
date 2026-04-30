const https = require('https');

const SUPABASE_URL = 'wxykpghfcnfkxafqzvwc.supabase.co';
const ANON_KEY = 'sb_publishable_mfLFjNICMP64csfiB8jajg_sMmAbpWX';

// Query information_schema for FK constraint names
const sqlQuery = encodeURIComponent(`
  SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
  FROM information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND ccu.table_name = 'users'
  ORDER BY tc.table_name, tc.constraint_name;
`);

const options = {
  hostname: SUPABASE_URL,
  path: `/rest/v1/rpc/exec_sql?query=${sqlQuery}`,
  headers: {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json'
  }
};

// Use Supabase REST API to query information_schema directly
const postOptions = {
  hostname: SUPABASE_URL,
  path: '/rest/v1/information_schema_foreign_keys?select=*',
  method: 'GET',
  headers: {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`
  }
};

// Actually just query the table_constraints view via SQL
const sql = {
  method: 'POST',
  hostname: SUPABASE_URL,
  path: '/rest/v1/rpc/exec_sql',
  headers: {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
};

// Use the pg_constraint catalog instead - simpler query via Supabase SQL endpoint
const body = JSON.stringify({
  query: `SELECT conname, conrelid::regclass as table_name FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace ORDER BY conrelid::regclass::text`
});

const req = https.request(sql, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(body);
req.end();
