/**
 * Post-generation contrast fixer.
 * Scans generated HTML for light-on-light text issues and auto-fixes them.
 */

// Parse a CSS color string to [r,g,b] or null
function parseColor(color: string): [number, number, number] | null {
  color = color.trim().toLowerCase();

  // Named colors (common ones that cause problems)
  const named: Record<string, [number, number, number]> = {
    white: [255, 255, 255], snow: [255, 250, 250], ghostwhite: [248, 248, 255],
    whitesmoke: [245, 245, 245], lavender: [230, 230, 250], lavenderblush: [255, 240, 245],
    aliceblue: [240, 248, 255], floralwhite: [255, 250, 240], ivory: [255, 255, 240],
    linen: [250, 240, 230], seashell: [255, 245, 238], mintcream: [245, 255, 250],
    honeydew: [240, 255, 240], azure: [240, 255, 255], lightyellow: [255, 255, 224],
    lightcyan: [224, 255, 255], lightgoldenrodyellow: [250, 250, 210],
    lightgray: [211, 211, 211], lightgrey: [211, 211, 211], silver: [192, 192, 192],
    gainsboro: [220, 220, 220], mistyrose: [255, 228, 225], antiquewhite: [250, 235, 215],
    oldlace: [253, 245, 230], papayawhip: [255, 239, 213], blanchedalmond: [255, 235, 205],
    bisque: [255, 228, 196], peachpuff: [255, 218, 185], cornsilk: [255, 248, 220],
    lemonchiffon: [255, 250, 205], beige: [245, 245, 220], lightskyblue: [135, 206, 250],
    lightblue: [173, 216, 230], lightsteelblue: [176, 196, 222], powderblue: [176, 224, 230],
    paleturquoise: [175, 238, 238], palegreen: [152, 251, 152], thistle: [216, 191, 216],
    plum: [221, 160, 221], orchid: [218, 112, 214], violet: [238, 130, 238],
    mediumpurple: [147, 111, 219], mediumslateblue: [123, 104, 238],
    black: [0, 0, 0], darkslategray: [47, 79, 79],
  };

  if (named[color]) return named[color];

  // #rgb, #rrggbb
  const hex = color.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    const h = hex[1];
    if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
    if (h.length >= 6) return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];

  // hsl(h, s%, l%)
  const hsl = color.match(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/);
  if (hsl) {
    return hslToRgb(+hsl[1], +hsl[2], +hsl[3]);
  }

  return null;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [Math.round((r+m)*255), Math.round((g+m)*255), Math.round((b+m)*255)];
}

// Relative luminance per WCAG 2.0
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function isLightColor(rgb: [number, number, number]): boolean {
  return relativeLuminance(...rgb) > 0.4;
}

function isVeryLightColor(rgb: [number, number, number]): boolean {
  return relativeLuminance(...rgb) > 0.6;
}

/**
 * Scans inline styles in HTML for light-text-on-light-background issues
 * and returns a fixed version. This is a best-effort fix that catches
 * the most common problems (inline color styles).
 */
export function fixContrastIssues(html: string): { html: string; issuesFound: number } {
  let issuesFound = 0;

  // Fix inline style color declarations that are too light
  // Pattern: elements with light text colors (via inline style)
  const fixed = html.replace(
    /style="([^"]*)"/gi,
    (match, styleStr: string) => {
      const colorMatch = styleStr.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
      const bgMatch = styleStr.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i);

      if (!colorMatch) return match;

      const textColor = parseColor(colorMatch[1]);
      if (!textColor) return match;

      // If text is light
      if (!isLightColor(textColor)) return match;

      // Check if there's a dark background explicitly set
      if (bgMatch) {
        const bgColor = parseColor(bgMatch[1]);
        if (bgColor && !isLightColor(bgColor)) return match; // dark bg + light text = OK
      }

      // Light text with no dark background or light background = BAD
      // Check if background contains gradient keywords suggesting light bg
      const bgStr = bgMatch?.[1] || '';
      const hasLightGradient = /white|#f[0-9a-f]{5}|#fff|rgba?\(2[0-4]\d|25[0-5]|hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*[89]\d%/i.test(bgStr);
      const hasDarkBg = bgMatch && !hasLightGradient && parseColor(bgStr) && !isLightColor(parseColor(bgStr)!);

      if (hasDarkBg) return match;

      // This is a problem: light text, no confirmed dark background
      issuesFound++;
      const isHeading = false; // we'll handle heading detection separately
      const darkColor = '#1E293B'; // slate-800
      const newStyle = styleStr.replace(
        /color\s*:\s*[^;]+/i,
        `color: ${darkColor}`
      );
      return `style="${newStyle}"`;
    }
  );

  // Fix Tailwind text color classes that are too light on elements without dark bg classes
  let tailwindFixed = fixed;
  const lightTextClasses = [
    'text-white', 'text-gray-100', 'text-gray-200', 'text-gray-300',
    'text-slate-100', 'text-slate-200', 'text-slate-300',
    'text-purple-200', 'text-purple-300', 'text-indigo-200', 'text-indigo-300',
    'text-blue-200', 'text-blue-300', 'text-violet-200', 'text-violet-300',
    'text-pink-200', 'text-pink-300', 'text-lavender',
  ];
  const darkBgClasses = /bg-(?:slate|gray|zinc|neutral|stone)-(?:[7-9]00|950)|bg-black|bg-\[#[0-3]/;

  // Find class attributes and check for light text without dark bg
  tailwindFixed = tailwindFixed.replace(
    /class="([^"]*)"/gi,
    (match, classList: string) => {
      const hasDarkBg = darkBgClasses.test(classList);
      if (hasDarkBg) return match;

      let changed = false;
      let newClassList = classList;

      for (const lightClass of lightTextClasses) {
        if (classList.includes(lightClass)) {
          // Check if there's a gradient bg that might be dark
          if (classList.includes('from-slate-8') || classList.includes('from-slate-9') ||
              classList.includes('from-gray-8') || classList.includes('from-gray-9')) {
            continue;
          }
          newClassList = newClassList.replace(lightClass, 'text-slate-800');
          changed = true;
        }
      }

      if (changed) {
        issuesFound++;
        return `class="${newClassList}"`;
      }
      return match;
    }
  );

  return { html: tailwindFixed, issuesFound };
}

/**
 * Quick check: does this HTML have potential contrast issues?
 * Returns a human-readable report.
 */
export function auditContrast(html: string): string[] {
  const issues: string[] = [];

  // Check for light text colors in inline styles without dark backgrounds
  const lightColorPatterns = [
    /color\s*:\s*(?:white|#fff(?:fff)?|#f[8-f][a-f0-9]{4}|rgba?\(\s*2[0-4]\d|25[0-5])/gi,
    /color\s*:\s*(?:lavender|thistle|plum|lightgr[ae]y|silver|gainsboro)/gi,
  ];

  for (const pattern of lightColorPatterns) {
    const matches = html.match(pattern);
    if (matches) {
      issues.push(`Found ${matches.length} instance(s) of light text colors that may have contrast issues`);
    }
  }

  // Check for light Tailwind text classes
  const lightTwMatches = html.match(/text-(?:white|gray-[123]00|slate-[123]00|purple-[23]00|indigo-[23]00|violet-[23]00)/g);
  if (lightTwMatches) {
    issues.push(`Found ${lightTwMatches.length} light Tailwind text classes that may be unreadable on light backgrounds`);
  }

  return issues;
}
