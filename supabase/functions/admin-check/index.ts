import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'OPTIONS, GET, POST',
  };
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Server not configured' }), { status: 500, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
  }

  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing Authorization header' }), { status: 401, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
  }

  try {
    // Use service role key but set the incoming token as a global header so auth.getUser() resolves the JWT
    const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
    }

    const uid = userData.user.id;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: profile, error: profileErr } = await supabase.from('user_profiles').select('is_admin').eq('id', uid).maybeSingle();
    if (profileErr) {
      console.error('Profile lookup failed', profileErr);
      return new Response(JSON.stringify({ ok: false, error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
    }

    const isAdmin = !!profile?.is_admin;
    // If POST with action=revoke and caller is admin, revoke target user's sessions
    if (req.method === 'POST') {
      try {
        const body = await req.json().catch(() => ({}));
        if (body && body.action === 'revoke') {
          if (!isAdmin) {
            return new Response(JSON.stringify({ ok: false, error: 'Admin required' }), { status: 403, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
          }
          const targetUid = String(body.targetUid || '').trim();
          if (!targetUid) {
            return new Response(JSON.stringify({ ok: false, error: 'targetUid required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
          }

          // Use the service role client to call admin revoke API
          try {
            // @ts-ignore
            const revokeResult = await (supabase.auth.admin as any).revokeUserSessions(targetUid);
            return new Response(JSON.stringify({ ok: true, revoked: true, result: revokeResult }), { status: 200, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
          } catch (revokeErr) {
            console.error('Revoke failed', revokeErr);
            return new Response(JSON.stringify({ ok: false, error: 'Revoke failed', details: String(revokeErr) }), { status: 500, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
          }
        }
      } catch (e) {
        console.warn('Failed to parse POST body for admin-check revoke', e);
      }
    }

    return new Response(JSON.stringify({ ok: true, isAdmin, userId: uid }), { status: 200, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
  } catch (e) {
    console.error('admin-check error', e);
    return new Response(JSON.stringify({ ok: false, error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
  }
});
