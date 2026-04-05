import { extractHtmlDocument } from '@/lib/previewContent';

export interface ValidationIssue {
  severity: 'critical' | 'warning';
  category: 'contrast' | 'responsive' | 'accessibility' | 'structure' | 'images';
  message: string;
  fix: string;
}

export interface ValidationResult {
  passed: boolean;
  score: number;
  issues: ValidationIssue[];
}

// Pastel / light Tailwind text classes that are unreadable on light backgrounds
const LIGHT_TEXT_CLASSES = [
  /text-(purple|blue|indigo|pink|violet|rose|cyan|teal|emerald|green|yellow|red|orange|amber|lime|sky|fuchsia)-(200|300|400)\b/g,
  /text-gray-(200|300|400)\b/g,
  /text-white\b/g,
];

const LIGHT_BG_CLASSES = [
  /bg-white\b/,
  /bg-gray-(50|100|200)\b/,
  /bg-slate-(50|100|200)\b/,
  /bg-neutral-(50|100)\b/,
  /bg-zinc-(50|100)\b/,
  /bg-stone-(50|100)\b/,
];

// Known bad hex values (light pastel text)
const LIGHT_HEX_COLORS = [
  '#A78BFA', '#C4B5FD', '#DDD6FE', // purple
  '#93C5FD', '#BFDBFE', '#DBEAFE', // blue
  '#A5B4FC', '#C7D2FE', '#E0E7FF', // indigo
  '#F9A8D4', '#FBCFE8', '#FCE7F3', // pink
  '#C4B5FD', '#DDD6FE',            // violet
  '#D1D5DB', '#E5E7EB', '#F3F4F6', // gray
];

function hexLightness(hex: string): number {
  const h = hex.replace('#', '');
  if (h.length < 6) return 50;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return ((max + min) / 2) * 100;
}

function hslLightness(match: string): number | null {
  const m = match.match(/hsl[a]?\(\s*[\d.]+\s*[,\s]+\s*[\d.]+%?\s*[,\s]+\s*([\d.]+)%/i);
  return m ? parseFloat(m[1]) : null;
}

export function validateWebsite(html: string, css: string = '', js: string = ''): ValidationResult {
  const issues: ValidationIssue[] = [];
  const combined = html + '\n' + css;

  // ===== CONTRAST CHECKS (critical) =====

  // Check Tailwind class combos
  const hasLightBg = LIGHT_BG_CLASSES.some(r => r.test(combined)) || /background:\s*(white|#fff|#ffffff)/i.test(combined);
  
  for (const pattern of LIGHT_TEXT_CLASSES) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(combined)) !== null) {
      if (hasLightBg || !combined.includes('bg-gray-9') && !combined.includes('bg-black') && !combined.includes('bg-slate-9')) {
        issues.push({
          severity: 'critical',
          category: 'contrast',
          message: `Light text class "${m[0]}" likely unreadable on light background`,
          fix: `Replace with a darker shade (e.g., text-gray-900, text-foreground) or use var(--foreground)`,
        });
      }
    }
  }

  // Check inline color declarations for light text
  const inlineColorRegex = /color:\s*(#[0-9a-fA-F]{3,8})/gi;
  let colorMatch;
  while ((colorMatch = inlineColorRegex.exec(combined)) !== null) {
    const hex = colorMatch[1].toUpperCase();
    if (LIGHT_HEX_COLORS.includes(hex) || (hex.length >= 7 && hexLightness(hex) > 65)) {
      issues.push({
        severity: 'critical',
        category: 'contrast',
        message: `Light text color ${hex} may be unreadable on light backgrounds`,
        fix: `Use a darker color like #1F2937 or var(--foreground)`,
      });
    }
  }

  // Check HSL text colors with high lightness
  const hslColorRegex = /color:\s*(hsl[a]?\([^)]+\))/gi;
  let hslMatch;
  while ((hslMatch = hslColorRegex.exec(combined)) !== null) {
    const l = hslLightness(hslMatch[1]);
    if (l !== null && l > 60) {
      issues.push({
        severity: 'critical',
        category: 'contrast',
        message: `HSL text color with lightness ${l.toFixed(0)}% is too light for readability`,
        fix: `Reduce lightness below 45% or use var(--foreground)`,
      });
    }
  }

  // ===== RESPONSIVE CHECKS (warning) =====
  if (!html.includes('viewport') && !html.includes('width=device-width')) {
    issues.push({
      severity: 'warning',
      category: 'responsive',
      message: 'Missing viewport meta tag',
      fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    });
  }

  const hasResponsive = /(@media|sm:|md:|lg:|xl:)/.test(combined);
  if (!hasResponsive && combined.length > 500) {
    issues.push({
      severity: 'warning',
      category: 'responsive',
      message: 'No responsive breakpoints detected',
      fix: 'Add responsive classes (md:, lg:) or @media queries for mobile support',
    });
  }

  const fixedWidthRegex = /width:\s*(\d+)px/g;
  let fw;
  while ((fw = fixedWidthRegex.exec(combined)) !== null) {
    if (parseInt(fw[1]) > 600) {
      issues.push({
        severity: 'warning',
        category: 'responsive',
        message: `Fixed width ${fw[1]}px may break on mobile`,
        fix: `Use max-width or responsive units instead`,
      });
      break; // one is enough
    }
  }

  // ===== ACCESSIBILITY CHECKS (warning) =====
  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  const missingAlt = imgTags.filter(t => !t.includes('alt='));
  if (missingAlt.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'accessibility',
      message: `${missingAlt.length} image(s) missing alt attributes`,
      fix: 'Add descriptive alt="..." to all <img> tags',
    });
  }

  if (!/<h1[\s>]/i.test(html)) {
    issues.push({
      severity: 'warning',
      category: 'accessibility',
      message: 'No H1 heading found',
      fix: 'Add an <h1> tag for the main page heading',
    });
  }

  // ===== STRUCTURE CHECKS (warning) =====
  const sectionCount = (html.match(/<(section|header|main|article)\b/gi) || []).length;
  if (sectionCount < 2 && html.length > 300) {
    issues.push({
      severity: 'warning',
      category: 'structure',
      message: 'Page has very few semantic sections',
      fix: 'Add distinct <section> elements for hero, features, CTA, etc.',
    });
  }

  const hasButton = /<button\b/i.test(html) || /btn|button|cta/i.test(combined);
  if (!hasButton && html.length > 300) {
    issues.push({
      severity: 'warning',
      category: 'structure',
      message: 'No call-to-action button found',
      fix: 'Add at least one CTA button',
    });
  }

  // ===== IMAGES CHECKS (warning) =====
  if (/placeholder\.co|placehold\.co/i.test(html)) {
    issues.push({
      severity: 'warning',
      category: 'images',
      message: 'Using placeholder image services',
      fix: 'Replace with actual images or user-uploaded images if available',
    });
  }

  // Calculate score
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const score = Math.max(0, 100 - criticalCount * 20 - warningCount * 5);
  const passed = criticalCount === 0;

  return { passed, score, issues };
}

export function hasCodeBlocks(content: string): boolean {
  return /```(html|css|javascript|js|tsx|jsx)\s*\n/i.test(content) || Boolean(extractHtmlDocument(content));
}

export function extractCodeFromResponse(content: string): { html: string; css: string; js: string } {
  let html = '', css = '', js = '';
  const codeBlockRegex = /```([\w-]+)?\s*\n([\s\S]*?)```/gi;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const lang = (match[1] || '').toLowerCase();
    const code = match[2].trim();
    if (lang === 'html') html = code;
    else if (lang === 'css') css = code;
    else if (lang === 'javascript' || lang === 'js') js = code;
  }
  if (!html) {
    html = extractHtmlDocument(content) || '';
  }
  return { html, css, js };
}
