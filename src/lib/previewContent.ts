export type PreviewTemplate = 'react-ts' | 'vanilla' | 'static';

export interface ExtractedPreviewContent {
  files: Record<string, string>;
  mainFile: string;
  template: PreviewTemplate;
}

const DOCTYPE_HTML_REGEX = /<!doctype html[\s\S]*?(?:<\/html>|$)/i;
const HTML_DOCUMENT_REGEX = /<html[\s\S]*?(?:<\/html>|$)/i;

const looksLikeReactComponent = (code: string) =>
  /export\s+default|function\s+App|const\s+App\s*=|return\s*\(/i.test(code);

export const normalizeStaticHtml = (html: string) => {
  let normalized = html.trim();
  const hasBody = /<body[\s>]/i.test(normalized);
  const hasDoctype = /<!doctype/i.test(normalized);

  if (!hasDoctype || !hasBody) {
    const contentToWrap = normalized
      .replace(/<!DOCTYPE[^>]*>/i, '')
      .replace(/<\/?html[^>]*>/gi, '')
      .replace(/<\/?head[^>]*>/gi, '')
      .replace(/<\/?body[^>]*>/gi, '')
      .trim();

    normalized = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
</head>
<body>
${contentToWrap}
</body>
</html>`;
  }

  return normalized;
};

export const extractHtmlDocument = (content: string) => {
  const doctypeMatch = content.match(DOCTYPE_HTML_REGEX);
  if (doctypeMatch?.[0]) {
    return normalizeStaticHtml(doctypeMatch[0]);
  }

  const htmlMatch = content.match(HTML_DOCUMENT_REGEX);
  if (htmlMatch?.[0]) {
    return normalizeStaticHtml(htmlMatch[0]);
  }

  return null;
};

export const extractPreviewFromContent = (content: string): ExtractedPreviewContent | null => {
  const files: Record<string, string> = {};
  let html = '';
  let css = '';
  let js = '';
  let tsx = '';
  let jsx = '';
  const codeBlockRegex = /```([\w-]+)?\s*\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = (match[1] || '').toLowerCase();
    const code = match[2].trim();

    switch (language) {
      case 'html':
      case 'htm':
        html = code;
        break;
      case 'css':
        css = code;
        break;
      case 'javascript':
      case 'js':
        js = code;
        break;
      case 'typescript':
      case 'tsx':
        if (looksLikeReactComponent(code)) {
          tsx = code;
        }
        break;
      case 'jsx':
        if (looksLikeReactComponent(code)) {
          jsx = code;
        }
        break;
      default:
        break;
    }
  }

  // Tolerate a truncated final code block (stream ended before the closing fence)
  const fenceCount = (content.match(/```/g) || []).length;
  if (fenceCount % 2 === 1) {
    const lastFence = content.lastIndexOf('```');
    const tail = content.slice(lastFence + 3);
    const nl = tail.indexOf('\n');
    if (nl !== -1) {
      const lang = tail.slice(0, nl).trim().toLowerCase();
      const code = tail.slice(nl + 1).trim();
      if (code) {
        if ((lang === 'html' || lang === 'htm') && !html) html = code;
        else if (lang === 'css' && !css) css = code;
        else if ((lang === 'javascript' || lang === 'js') && !js) js = code;
      }
    }
  }

  const htmlDocument = html || extractHtmlDocument(content);

  if (htmlDocument) {
    files['/index.html'] = normalizeStaticHtml(htmlDocument);

    if (css) {
      files['/styles.css'] = css;
    }

    if (js) {
      files['/index.js'] = js;
    }

    return {
      files,
      mainFile: '/index.html',
      template: 'static',
    };
  }

  if (tsx) {
    return {
      files: { '/App.tsx': tsx },
      mainFile: '/App.tsx',
      template: 'react-ts',
    };
  }

  if (jsx) {
    return {
      files: { '/App.jsx': jsx },
      mainFile: '/App.jsx',
      template: 'react-ts',
    };
  }

  return null;
};

export const hasRenderablePreviewContent = (content: string) => Boolean(extractPreviewFromContent(content));

export const isPreviewPlaceholder = (files: Record<string, string>, mainFile: string) => {
  const fileKeys = Object.keys(files);
  return fileKeys.length === 0 || (fileKeys.length === 1 && files[mainFile]?.includes('Start chatting'));
};