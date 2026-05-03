import { createClient } from 'npm:@supabase/supabase-js@2';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing default Supabase service role environment variables.');
}

const adminClient = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Authentication required.' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const { error } = await adminClient.auth.admin.deleteUser(user.id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: jsonHeaders,
  });
});
