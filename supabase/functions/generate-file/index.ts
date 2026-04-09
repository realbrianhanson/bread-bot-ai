import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  LevelFormat,
  ExternalHyperlink,
  BorderStyle,
} from "npm:docx@9.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

/** Parse markdown content into docx Paragraph elements */
function markdownToDocxParagraphs(markdown: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  // Numbering config references will be set on the document
  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Code block — collect until closing ```
    if (line.trim().startsWith('```')) {
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      paragraphs.push(
        new Paragraph({
          border: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          },
          shading: { fill: "F1F5F9" },
          spacing: { before: 120, after: 120 },
          children: [
            new TextRun({
              text: codeLines.join('\n'),
              font: "Courier New",
              size: 20,
            }),
          ],
        })
      );
      continue;
    }

    // Headings
    const h1Match = line.match(/^# (.+)$/);
    if (h1Match) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 200 },
        children: parseInlineFormatting(h1Match[1]),
      }));
      i++;
      continue;
    }

    const h2Match = line.match(/^## (.+)$/);
    if (h2Match) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 280, after: 160 },
        children: parseInlineFormatting(h2Match[1]),
      }));
      i++;
      continue;
    }

    const h3Match = line.match(/^### (.+)$/);
    if (h3Match) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: parseInlineFormatting(h3Match[1]),
      }));
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim() === '---' || line.trim() === '***') {
      paragraphs.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "E2E8F0", space: 1 } },
        spacing: { before: 200, after: 200 },
        children: [],
      }));
      i++;
      continue;
    }

    // Bullet list item
    const bulletMatch = line.match(/^[\-\*] (.+)$/);
    if (bulletMatch) {
      paragraphs.push(new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { before: 60, after: 60 },
        children: parseInlineFormatting(bulletMatch[1]),
      }));
      i++;
      continue;
    }

    // Numbered list item
    const numMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numMatch) {
      paragraphs.push(new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        spacing: { before: 60, after: 60 },
        children: parseInlineFormatting(numMatch[1]),
      }));
      i++;
      continue;
    }

    // Regular paragraph
    paragraphs.push(new Paragraph({
      spacing: { before: 80, after: 80 },
      children: parseInlineFormatting(line),
    }));
    i++;
  }

  return paragraphs;
}

/** Parse inline markdown formatting (**bold**, *italic*, `code`, [links](url)) */
function parseInlineFormatting(text: string): (TextRun | ExternalHyperlink)[] {
  const children: (TextRun | ExternalHyperlink)[] = [];
  // Regex to match bold, italic, code, and links
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before match
    if (match.index > lastIndex) {
      children.push(new TextRun({ text: text.slice(lastIndex, match.index), size: 22 }));
    }

    if (match[2]) {
      // Bold + italic
      children.push(new TextRun({ text: match[2], bold: true, italics: true, size: 22 }));
    } else if (match[3]) {
      // Bold
      children.push(new TextRun({ text: match[3], bold: true, size: 22 }));
    } else if (match[4]) {
      // Italic
      children.push(new TextRun({ text: match[4], italics: true, size: 22 }));
    } else if (match[5]) {
      // Code
      children.push(new TextRun({ text: match[5], font: "Courier New", size: 20, shading: { fill: "F1F5F9" } }));
    } else if (match[6] && match[7]) {
      // Link
      children.push(new ExternalHyperlink({
        children: [new TextRun({ text: match[6], style: "Hyperlink", size: 22 })],
        link: match[7],
      }));
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    children.push(new TextRun({ text: text.slice(lastIndex), size: 22 }));
  }

  if (children.length === 0) {
    children.push(new TextRun({ text, size: 22 }));
  }

  return children;
}

async function generateDocx(title: string, content: string): Promise<Uint8Array> {
  const bodyParagraphs = markdownToDocxParagraphs(content);

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Arial", size: 22 } },
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 36, bold: true, font: "Arial", color: "0F172A" },
          paragraph: { spacing: { before: 360, after: 200 } },
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: "Arial", color: "0F172A" },
          paragraph: { spacing: { before: 280, after: 160 } },
        },
        {
          id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, font: "Arial", color: "1E293B" },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [{
            level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
        {
          reference: "numbers",
          levels: [{
            level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: [
          // Title
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: title, bold: true, size: 48, font: "Arial" })],
          }),
          // Date
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [new TextRun({
              text: `Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
              size: 22, color: "64748B",
            })],
          }),
          // Body
          ...bodyParagraphs,
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
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

    let fileBytes: Uint8Array;
    let ext: string;
    let contentType: string;

    switch (type) {
      case 'docx': {
        fileBytes = await generateDocx(title || filename, content || '');
        ext = 'docx';
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      }
      case 'csv': {
        if (!data || !Array.isArray(data)) {
          return new Response(JSON.stringify({ error: 'data array required for CSV' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        fileBytes = new TextEncoder().encode(generateCsv(data));
        ext = 'csv';
        contentType = 'text/csv; charset=utf-8';
        break;
      }
      case 'xlsx': {
        if (!data || !Array.isArray(data)) {
          return new Response(JSON.stringify({ error: 'data array required for XLSX' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        fileBytes = new TextEncoder().encode(generateCsv(data));
        ext = 'csv';
        contentType = 'text/csv; charset=utf-8';
        break;
      }
      case 'json': {
        fileBytes = new TextEncoder().encode(JSON.stringify(data || content || {}, null, 2));
        ext = 'json';
        contentType = 'application/json; charset=utf-8';
        break;
      }
      case 'markdown': {
        fileBytes = new TextEncoder().encode(content || '');
        ext = 'md';
        contentType = 'text/markdown; charset=utf-8';
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unsupported type: ${type}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

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
      .createSignedUrl(storagePath, 86400);

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
