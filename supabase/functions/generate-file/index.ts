import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function markdownToHtml(markdown: string): string {
  let html = markdown;
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // Bold & italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Code blocks
  html = html.replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  // Unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  // Paragraphs (lines not already wrapped)
  html = html.replace(/^(?!<[hupol]|<li|<hr|<pre)(.+)$/gm, '<p>$1</p>');
  return html;
}

function generateHtmlDocument(title: string, content: string): string {
  const bodyHtml = markdownToHtml(content);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 11pt; line-height: 1.7; color: #1e293b;
    max-width: 800px; margin: 0 auto; padding: 60px 40px;
  }
  h1 { font-size: 28pt; font-weight: 800; margin: 0 0 8px; color: #0f172a; }
  h2 { font-size: 18pt; font-weight: 700; margin: 40px 0 16px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
  h3 { font-size: 14pt; font-weight: 600; margin: 28px 0 12px; color: #1e293b; }
  p { margin: 0 0 14px; }
  ul, ol { margin: 0 0 16px; padding-left: 24px; }
  li { margin-bottom: 6px; }
  a { color: #4f46e5; text-decoration: none; }
  a:hover { text-decoration: underline; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 10pt; font-family: 'SF Mono', 'Fira Code', monospace; }
  pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 0 0 16px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 32px 0; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 16px; }
  th, td { padding: 10px 14px; border: 1px solid #e2e8f0; text-align: left; font-size: 10pt; }
  th { background: #f8fafc; font-weight: 600; }
  .title-page { text-align: center; padding: 120px 0 80px; }
  .title-page .date { color: #64748b; font-size: 11pt; margin-top: 12px; }
  @media print {
    body { padding: 0; max-width: none; }
    .title-page { page-break-after: always; }
    h2 { page-break-before: auto; }
    pre, table { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="title-page">
  <h1>${escapeHtml(title)}</h1>
  <p class="date">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
</div>
${bodyHtml}
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateCsv(data: Record<string, unknown>[]): string {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const escapeCsv = (val: unknown) => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [headers.map(escapeCsv).join(',')];
  for (const row of data) {
    rows.push(headers.map(h => escapeCsv(row[h])).join(','));
  }
  return rows.join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, content, data, title, filename, taskId } = await req.json();

    if (!type || !filename) {
      return new Response(JSON.stringify({ error: 'type and filename are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let fileContent: string;
    let ext: string;
    let contentType: string;

    switch (type) {
      case 'docx': {
        fileContent = generateHtmlDocument(title || filename, content || '');
        ext = 'html';
        contentType = 'text/html; charset=utf-8';
        break;
      }
      case 'csv': {
        if (!data || !Array.isArray(data)) {
          return new Response(JSON.stringify({ error: 'data array required for CSV' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        fileContent = generateCsv(data);
        ext = 'csv';
        contentType = 'text/csv; charset=utf-8';
        break;
      }
      case 'xlsx': {
        // For MVP, generate CSV (universally openable in Excel)
        if (!data || !Array.isArray(data)) {
          return new Response(JSON.stringify({ error: 'data array required for XLSX' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        fileContent = generateCsv(data);
        ext = 'csv';
        contentType = 'text/csv; charset=utf-8';
        break;
      }
      case 'json': {
        fileContent = JSON.stringify(data || content || {}, null, 2);
        ext = 'json';
        contentType = 'application/json; charset=utf-8';
        break;
      }
      case 'markdown': {
        fileContent = content || '';
        ext = 'md';
        contentType = 'text/markdown; charset=utf-8';
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unsupported type: ${type}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const fileBytes = new TextEncoder().encode(fileContent);
    const storagePath = `${user.id}/${taskId || 'direct'}/${filename}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('generated-files')
      .upload(storagePath, fileBytes, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[GENERATE-FILE] Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: signedData, error: signedError } = await supabaseClient.storage
      .from('generated-files')
      .createSignedUrl(storagePath, 86400); // 24 hours

    if (signedError) {
      console.error('[GENERATE-FILE] Signed URL error:', signedError);
      return new Response(JSON.stringify({ error: 'Failed to generate download link' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      fileUrl: signedData.signedUrl,
      filename: `${filename}.${ext}`,
      type,
      size: fileBytes.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[GENERATE-FILE] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
