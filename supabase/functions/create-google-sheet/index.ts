import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GOOGLE_SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

async function getValidAccessToken(supabaseAdmin: any, userId: string): Promise<string> {
  const { data: integration, error } = await supabaseAdmin
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();

  if (error || !integration) {
    throw new Error('Google account not connected. Please connect your Google account in Settings.');
  }

  const expiry = new Date(integration.token_expiry);
  if (expiry.getTime() - Date.now() > 5 * 60 * 1000) {
    return integration.access_token;
  }

  if (!integration.refresh_token) {
    throw new Error('Google refresh token not found. Please reconnect your Google account.');
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';

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
    throw new Error(`Token refresh failed: ${refreshData.error_description || refreshData.error}`);
  }

  const newExpiry = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();

  await supabaseAdmin
    .from('user_integrations')
    .update({ access_token: refreshData.access_token, token_expiry: newExpiry })
    .eq('user_id', userId)
    .eq('provider', 'google');

  return refreshData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { title, headers: sheetHeaders, rows, folderId } = await req.json();
    if (!title) {
      return new Response(JSON.stringify({ error: 'title is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getValidAccessToken(supabaseAdmin, user.id);

    // Step 1: Create the spreadsheet
    const createRes = await fetch(GOOGLE_SHEETS_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title },
        sheets: [{ properties: { title: 'Sheet1' } }],
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error('[CREATE-GOOGLE-SHEET] Create failed:', createRes.status, errText);
      throw new Error(`Failed to create Google Sheet: ${createRes.status}`);
    }

    const sheet = await createRes.json();
    const spreadsheetId = sheet.spreadsheetId;
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // Step 2: Populate data if headers/rows provided
    const values: any[][] = [];
    if (sheetHeaders && Array.isArray(sheetHeaders)) {
      values.push(sheetHeaders);
    }
    if (rows && Array.isArray(rows)) {
      values.push(...rows);
    }

    if (values.length > 0) {
      const range = `Sheet1!A1`;
      const updateRes = await fetch(
        `${GOOGLE_SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
        },
      );

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        console.error('[CREATE-GOOGLE-SHEET] Update failed:', updateRes.status, errText);
      }
    }

    // Step 3: Move to folder if specified
    if (folderId) {
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${folderId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (e) {
        console.error('[CREATE-GOOGLE-SHEET] Move to folder failed:', e);
      }
    }

    // Track usage
    await supabaseAdmin.from('usage_tracking').insert({
      user_id: user.id,
      usage_type: 'chat_message',
      quantity: 1,
      metadata: { tool: 'create_google_sheet', spreadsheetId },
    });

    return new Response(JSON.stringify({
      success: true,
      spreadsheetId,
      url: sheetUrl,
      title,
      rowCount: values.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[CREATE-GOOGLE-SHEET] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
