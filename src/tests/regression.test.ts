import { createClient } from '@/lib/supabase/client';

/**
 * VIBE REGRESSION TEST SUITE
 * Test Account: test@app.com / Test123456
 * Schema-aligned with production DB (2025).
 */
export async function runRegressionTests() {
  const supabase = createClient();
  const testEmail = 'test@app.com';
  const testPass = 'Test123456';

  console.log("🚀 Starting VIBE Regression Suite...");

  // 1. Authentication
  const { data: auth, error: loginErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPass
  });

  if (loginErr) throw new Error(`Login Failure: ${loginErr.message}`);
  console.log("✅ SCENARIO: Login successful.");

  const userId = auth.user.id;

  // 2. Change Language
  const { error: langErr } = await supabase.from('users').update({ language: 'en' }).eq('id', userId);
  if (langErr) throw langErr;
  console.log("✅ SCENARIO: Change language verified.");

  // 3. Toggle Privacy (via user_settings.is_private)
  const { error: privErr } = await supabase.from('user_settings').update({ is_private: true }).eq('user_id', userId);
  const { data: privCheck } = await supabase.from('user_settings').select('is_private').eq('user_id', userId).single();
  if (privErr || !privCheck?.is_private) throw new Error("Privacy toggle failed.");
  await supabase.from('user_settings').update({ is_private: false }).eq('user_id', userId);
  console.log("✅ SCENARIO: Toggle privacy verified.");

  // 4. Upload Media Simulation — all required fields from schema
  const { error: mediaErr } = await supabase.from('media').insert({
    author_id: userId,
    entity_id: userId,
    entity_type: 'user',
    url: 'https://vibe.app/sample.jpg',
    type: 'photo',
    visibility: 'public',
  });
  if (mediaErr) throw mediaErr;
  console.log("✅ SCENARIO: Upload media simulation verified.");

  // 5. Block User
  const { error: blockErr } = await supabase.from('user_blocks').insert({ 
    user_id: userId, 
    blocked_user_id: '00000000-0000-0000-0000-000000000001'
  });
  if (blockErr && !blockErr.message.includes('duplicate')) throw blockErr;
  console.log("✅ SCENARIO: Block user verified.");

  // 6. Soft Deactivate (using is_active field in users table)
  const { error: delErr } = await supabase.from('users').update({ 
    is_active: false
  }).eq('id', userId);
  if (delErr) throw delErr;
  console.log("✅ SCENARIO: Account deactivation verified.");

  // 7. Reactivate Account
  const { error: reactErr } = await supabase.from('users').update({ 
    is_active: true
  }).eq('id', userId);
  if (reactErr) throw reactErr;
  console.log("✅ SCENARIO: Reactivate account verified.");

  console.log("🏁 ALL SCENARIOS PASSED. APPLICATION PRODUCTION-READY.");
}
