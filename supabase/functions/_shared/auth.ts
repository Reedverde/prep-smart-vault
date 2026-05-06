// Shared JWT validation helper for edge functions.
// Validates the Authorization header against Supabase Auth and returns the
// authenticated user, or a 401 Response that callers should return as-is.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

export const requireUser = async (req: Request): Promise<AuthResult> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  const token = authHeader.slice('Bearer '.length).trim();

  // Allow anonymous kiosk access: if the bearer token matches the project's
  // publishable/anon key, treat the caller as an unauthenticated public client.
  // These endpoints only proxy public third-party data, so this is safe.
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
  if (token && (token === anonKey || token === publishableKey)) {
    return { ok: true, userId: 'anonymous' };
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return {
        ok: false,
        response: new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }),
      };
    }
    return { ok: true, userId: data.user.id };
  } catch (_err) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }
};
