// One-time admin tool to create a pre-approved user account.
// Restricted to a fixed allowlist; safe to leave deployed but should be removed once used.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED = new Set(['adeline.verdesoto@gmail.com']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password || !ALLOWED.has(String(email).toLowerCase().trim())) {
    return new Response(JSON.stringify({ error: 'invalid' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, userId: data.user?.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
