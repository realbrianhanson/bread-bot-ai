import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GOOGLE_DOCS_API = 'https://docs.googleapis.com/v1/documents';
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

  // Check if token is still valid (with 5 min buffer)
  const expiry = new Date(integration.token_expiry);
  if (expiry.getTime() - Date.now() > 5 * 60 * 1000) {
    return integration.access_token;
  }

  // Token expired — refresh it
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

function markdownToGoogleDocsRequests(content: string): any[] {
  const requests: any[] = [];
  let index = 1; // Google Docs insertion index starts at 1

  const lines = content.split('\n');

  for (const line of lines) {
    if (!line.trim()) {
      requests.push({ insertText: { location: { index }, text: '\n' } });
      index += 1;
      continue;
    }

    // Headers
    const h1Match = line.match(/^# (.+)/);
    const h2Match = line.match(/^## (.+)/);
    const h3Match = line.match(/^### (.+)/);

    if (h1Match) {
      const text = h1Match[1] + '\n';
      requests.push({ insertText: { location: { index }, text } });
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: index, endIndex: index + text.length },
          paragraphStyle: { namedStyleType: 'HEADING_1' },
          fields: 'namedStyleType',
        },
      });
      index += text.length;
    } else if (h2Match) {
      const text = h2Match[1] + '\n';
      requests.push({ insertText: { location: { index }, text } });
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: index, endIndex: index + text.length },
          paragraphStyle: { namedStyleType: 'HEADING_2' },
          fields: 'namedStyleType',
        },
      });
      index += text.length;
    } else if (h3Match) {
      const text = h3Match[1] + '\n';
      requests.push({ insertText: { location: { index }, text } });
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: index, endIndex: index + text.length },
          paragraphStyle: { namedStyleType: 'HEADING_3' },
          fields: 'namedStyleType',
        },
      });
      index += text.length;
    } else if (line.match(/^[-*] /)) {
      // Bullet points
      const text = line.replace(/^[-*] /, '') + '\n';
      requests.push({ insertText: { location: { index }, text } });
      requests.push({
        createParagraphBullets: {
          range: { startIndex: index, endIndex: index + text.length },
          bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
        },
      });
      index += text.length;
    } else if (line.match(/^\d+\. /)) {
      // Numbered list
      const text = line.replace(/^\d+\. /, '') + '\n';
      requests.push({ insertText: { location: { index }, text } });
      requests.push({
        createParagraphBullets: {
          range: { startIndex: index, endIndex: index + text.length },
          bulletPreset: 'NUMBERED_DECIMAL_ALPHA_ROMAN',
        },
      });
      index += text.length;
    } else {
      // Regular paragraph
      const text = line + '\n';
      requests.push({ insertText: { location: { index }, text } });
      index += text.length;
    }
  }

  return requests;
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

    const { title, content, folderId } = await req.json();
    if (!title || !content) {
      return new Response(JSON.stringify({ error: 'title and content are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get valid Google access token
    const accessToken = await getValidAccessToken(supabaseAdmin, user.id);

    // Step 1: Create the document
    const createRes = await fetch(GOOGLE_DOCS_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error('[CREATE-GOOGLE-DOC] Create failed:', createRes.status, errText);
      throw new Error(`Failed to create Google Doc: ${createRes.status}`);
    }

    const doc = await createRes.json();
    const documentId = doc.documentId;
    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

    // Step 2: Insert content
    const requests = markdownToGoogleDocsRequests(content);

    if (requests.length > 0) {
      const updateRes = await fetch(`${GOOGLE_DOCS_API}/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        console.error('[CREATE-GOOGLE-DOC] Update failed:', updateRes.status, errText);
        // Doc was created but content insertion failed — still return the URL
      }
    }

    // Step 3: Move to folder if specified
    if (folderId) {
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${documentId}?addParents=${folderId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (e) {
        console.error('[CREATE-GOOGLE-DOC] Move to folder failed:', e);
      }
    }

    // Track usage
    await supabaseAdmin.from('usage_tracking').insert({
      user_id: user.id,
      usage_type: 'chat_message',
      quantity: 1,
      metadata: { tool: 'create_google_doc', documentId },
    });

    return new Response(JSON.stringify({
      success: true,
      documentId,
      url: docUrl,
      title,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[CREATE-GOOGLE-DOC] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
