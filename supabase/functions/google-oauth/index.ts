import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

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

  // GET /google-oauth/authorize — start OAuth flow
  if (req.method === 'GET' && (pathname.endsWith('/authorize') || pathname.endsWith('/authorize/'))) {
    const authHeader = req.headers.get('Authorization');
    // User ID passed as query param since this is a redirect
    const userId = url.searchParams.get('user_id');
    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const redirectUri = `${supabaseUrl}/functions/v1/google-oauth/callback`;
    const scopes = [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', userId);

    return Response.redirect(authUrl.toString(), 302);
  }

  // GET /google-oauth/callback — handle OAuth callback
  if (req.method === 'GET' && (pathname.endsWith('/callback') || pathname.endsWith('/callback/'))) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // user_id
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

    try {
      const redirectUri = `${supabaseUrl}/functions/v1/google-oauth/callback`;

      // Exchange code for tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();
      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      // Get user email
      const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userInfoRes.json();

      // Calculate token expiry
      const expiresIn = tokenData.expires_in || 3600;
      const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Upsert into user_integrations
      const { error: dbError } = await supabaseAdmin
        .from('user_integrations')
        .upsert({
          user_id: state,
          provider: 'google',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
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
              <p>${err instanceof Error ? err.message : 'Unknown error'}</p>
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

      const refreshRes = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: integration.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshRes.json();
      if (refreshData.error) {
        throw new Error(refreshData.error_description || refreshData.error);
      }

      const expiresIn = refreshData.expires_in || 3600;
      const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

      await supabaseAdmin
        .from('user_integrations')
        .update({
          access_token: refreshData.access_token,
          token_expiry: tokenExpiry,
        })
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
        error: err instanceof Error ? err.message : 'Refresh failed',
      }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
