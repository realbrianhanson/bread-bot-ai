import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";
import { encryptSecret, decryptSecret } from "../_shared/crypto.ts";
import { fetchWithTimeout, TIMEOUT_DEFAULT_MS } from "../_shared/config.ts";

async function encryptToken(t: string | null | undefined): Promise<string | null> {
  if (!t) return null;
  return await encryptSecret(t);
}
async function readToken(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  try { return await decryptSecret(stored); }
  catch { return stored; } // legacy plaintext row — treat as-is; caller will re-save encrypted
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'Google OAuth credentials not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const pathname = url.pathname;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // POST /google-oauth/authorize — start OAuth flow.
  // Accepts the user's JWT via the Authorization header so it never appears in
  // the URL / logs / referrers. Returns a Google auth URL the client can open.
  if (req.method === 'POST' && (pathname.endsWith('/authorize') || pathname.endsWith('/authorize/'))) {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication token required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userToken = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(userToken);
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = authUser.id;

    // Persist a single-use CSRF nonce; the callback must present the same value.
    const nonce = crypto.randomUUID();
    const { error: nonceErr } = await supabaseAdmin
      .from('oauth_states')
      .insert({ nonce, user_id: userId, provider: 'google' });
    if (nonceErr) {
      console.error('[GOOGLE-OAUTH] Failed to persist state nonce:', nonceErr);
      return new Response(JSON.stringify({ error: 'Failed to start OAuth flow' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const redirectUri = `${supabaseUrl}/functions/v1/google-oauth/callback`;
    const scopes = [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');

    // state carries only the nonce — the user id is looked up server-side.
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', nonce);

    return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // GET /google-oauth/callback — handle OAuth callback
  if (req.method === 'GET' && (pathname.endsWith('/callback') || pathname.endsWith('/callback/'))) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // CSRF nonce
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(`<html><body><h2>OAuth Error</h2><p>${error}</p><script>window.close();</script></body></html>`, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (!code || !state) {
      return new Response(`<html><body><h2>Missing parameters</h2><script>window.close();</script></body></html>`, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Validate the CSRF nonce and derive the user id from the persisted row
    // (single-use: we delete the row on successful lookup).
    const { data: stateRow, error: stateLookupErr } = await supabaseAdmin
      .from('oauth_states')
      .select('user_id, expires_at')
      .eq('nonce', state)
      .eq('provider', 'google')
      .maybeSingle();
    if (stateLookupErr || !stateRow) {
      return new Response(`<html><body><h2>Invalid or expired state</h2><script>window.close();</script></body></html>`, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    if (new Date(stateRow.expires_at).getTime() < Date.now()) {
      await supabaseAdmin.from('oauth_states').delete().eq('nonce', state);
      return new Response(`<html><body><h2>State expired — please try again</h2><script>window.close();</script></body></html>`, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    const userId = stateRow.user_id;
    // Consume the nonce so it can't be replayed.
    await supabaseAdmin.from('oauth_states').delete().eq('nonce', state);
    try {
      const redirectUri = `${supabaseUrl}/functions/v1/google-oauth/callback`;

      // Exchange code for tokens
      const tokenRes = await fetchWithTimeout(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      }, TIMEOUT_DEFAULT_MS);

      const tokenData = await tokenRes.json();
      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      // Get user email
      const userInfoRes = await fetchWithTimeout(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }, TIMEOUT_DEFAULT_MS);
      const userInfo = await userInfoRes.json();

      // Calculate token expiry
      const expiresIn = tokenData.expires_in || 3600;
      const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Upsert into user_integrations
      const encAccess = await encryptToken(tokenData.access_token);
      const encRefresh = await encryptToken(tokenData.refresh_token || null);
      const { error: dbError } = await supabaseAdmin
        .from('user_integrations')
        .upsert({
          user_id: userId,
          provider: 'google',
          access_token: encAccess,
          refresh_token: encRefresh,
          token_expiry: tokenExpiry,
          scopes: ['documents', 'spreadsheets', 'drive.file', 'userinfo.email'],
          provider_email: userInfo.email || null,
        }, { onConflict: 'user_id,provider' });

      if (dbError) {
        console.error('DB error storing tokens:', dbError);
        throw new Error('Failed to store tokens');
      }

      // Return success page that closes the popup
      return new Response(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #111;">
            <div style="text-align: center; color: white;">
              <h2>✅ Google Account Connected!</h2>
              <p>You can close this window.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'google-oauth-success' }, '*');
                }
                setTimeout(() => window.close(), 2000);
              </script>
            </div>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    } catch (err) {
      console.error('OAuth callback error:', err);
      return new Response(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #111;">
            <div style="text-align: center; color: white;">
              <h2>❌ Connection Failed</h2>
              <p>Please try again or contact support.</p>
              <script>setTimeout(() => window.close(), 3000);</script>
            </div>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }
  }

  // POST /google-oauth/refresh — refresh access token
  if (req.method === 'POST') {
    try {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: integration } = await supabaseAdmin
        .from('user_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .single();

      if (!integration?.refresh_token) {
        return new Response(JSON.stringify({ error: 'No Google refresh token found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const refreshTokenPlain = await readToken(integration.refresh_token);
      if (!refreshTokenPlain) {
        return new Response(JSON.stringify({ error: 'No Google refresh token found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const refreshRes = await fetchWithTimeout(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshTokenPlain,
          grant_type: 'refresh_token',
        }),
      }, TIMEOUT_DEFAULT_MS);

      const refreshData = await refreshRes.json();
      if (refreshData.error) {
        throw new Error(refreshData.error_description || refreshData.error);
      }

      const expiresIn = refreshData.expires_in || 3600;
      const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

      const encAccess = await encryptToken(refreshData.access_token);
      // Re-encrypt refresh_token if it was stored as legacy plaintext
      const needsReEncrypt = !(integration.refresh_token as string).includes(':');
      const refreshUpdate = needsReEncrypt
        ? { access_token: encAccess, refresh_token: await encryptToken(refreshTokenPlain), token_expiry: tokenExpiry }
        : { access_token: encAccess, token_expiry: tokenExpiry };
      await supabaseAdmin
        .from('user_integrations')
        .update(refreshUpdate)
        .eq('user_id', user.id)
        .eq('provider', 'google');

      return new Response(JSON.stringify({
        access_token: refreshData.access_token,
        expires_in: expiresIn,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Token refresh error:', err);
      return new Response(JSON.stringify({
        error: 'Token refresh failed. Please reconnect your Google account.',
      }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
