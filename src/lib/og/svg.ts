/**
 * OG (Open Graph) card drawing — the SVG half.
 *
 * Draws a 1200x630 card: brand-colour background, corner marks, title,
 * wordmark. Rasterising it to PNG lives in `raster.ts`.
 *
 * `og:image` has to point at a raster file: Facebook, X, LinkedIn, WhatsApp
 * and Slack all document JPEG/PNG/GIF/WEBP and none of them render SVG, so an
 * SVG `og:image` shows up as a blank or missing preview. The blog's cover SVGs
 * are worse still — they take their colours from CSS custom properties, which
 * only exist on the page, so fetched on their own every fill resolves to
 * nothing and the file is fully transparent.
 *
 * This file imports nothing native and nothing from `astro:*`, so it is safe
 * in any runtime and can be loaded from `astro.config.mjs`. `sharp` lives in
 * `raster.ts` and must stay there: the Cloudflare adapter prerenders inside
 * workerd, where a native module cannot load. The layouts import the path
 * helpers below, so if those pulled in `sharp` every page would break on
 * Cloudflare — which is exactly what happened before #600.
 *
 * The brand colour, domain and site name are parameters rather than defaults
 * read from `site.config.ts`: that file reads `astro:env/server`, which does
 * not exist at config-load time, and the build hook that draws these cards
 * runs there.
 */

const WIDTH = 1200;
const HEIGHT = 630;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Space between the 80px side margins. */
const CONTENT_WIDTH = WIDTH - 160;
/** Title sizes tried in order; the first that fits without cutting words wins. */
const TITLE_SIZES = [76, 64, 54];
const TITLE_MAX_LINES = 3;
/**
 * Average glyph advance as a fraction of the font size. Mixed-case English text
 * sits near 0.5; the wrap is measured in characters rather than by loading the
 * font, which keeps the whole card a string and needs nothing at runtime.
 */
const AVERAGE_GLYPH_WIDTH = 0.5;

/**
 * Chinese, Japanese and Korean characters (and full-width forms) are set on a
 * square: one is as wide as two average Latin letters. These scripts also put
 * no spaces between words, and a line may break between any two characters.
 */
const WIDE =
  /[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA960-\uA97F\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]|[\u{20000}-\u{3FFFD}]/u;

/** Punctuation that may not start a line in Chinese and Japanese: it stays with the character before it. */
const NO_LINE_START = '，。、：；！？）」』】〉》”’…·';

/** Width in average Latin letters: 1 for most characters, 2 for a wide one. */
function measure(text: string): number {
  let units = 0;
  for (const ch of text) units += WIDE.test(ch) ? 2 : 1;
  return units;
}

/**
 * Split text where a line may break: at spaces, and between wide characters.
 * Each piece records whether a space came before it, so a line put back
 * together keeps the spaces the text had and adds none between characters.
 */
function breakPoints(text: string): { text: string; space: boolean }[] {
  const pieces: { text: string; space: boolean }[] = [];
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    let first = true;
    let run = '';
    const push = (piece: string) => {
      pieces.push({ text: piece, space: first && pieces.length > 0 });
      first = false;
    };
    for (const ch of word) {
      if (NO_LINE_START.includes(ch)) {
        if (run) run += ch;
        else if (pieces.length > 0 && !first) pieces[pieces.length - 1].text += ch;
        else run = ch;
      } else if (WIDE.test(ch)) {
        if (run) push(run);
        run = '';
        push(ch);
      } else {
        run += ch;
      }
    }
    if (run) push(run);
  }
  return pieces;
}

/**
 * Greedy wrap, measured in average Latin letters. Falls back to truncating
 * with an ellipsis if the title still doesn't fit in `maxLines`, and reports
 * whether it had to.
 */
function wrapText(
  text: string,
  maxCharsPerLine: number,
  maxLines: number
): { lines: string[]; truncated: boolean } {
  const pieces = breakPoints(text);
  const lines: string[] = [];
  let line = '';
  let consumed = 0;

  for (let i = 0; i < pieces.length; i++) {
    const { text: piece, space } = pieces[i];
    if (!line) {
      line = piece;
      consumed = i + 1;
      continue;
    }
    const joined = line + (space ? ' ' : '') + piece;
    if (measure(joined) > maxCharsPerLine) {
      lines.push(line);
      if (lines.length === maxLines) break;
      line = piece;
      consumed = i + 1;
    } else {
      line = joined;
      consumed = i + 1;
    }
  }
  if (line && lines.length < maxLines) {
    lines.push(line);
  }

  const truncated = lines.length === maxLines && consumed < pieces.length;
  if (truncated) {
    const last = [...lines[maxLines - 1]];
    // Make room for the ellipsis: three Latin letters' width.
    let cut = 0;
    while (last.length && cut < 3) cut += measure(last.pop()!);
    lines[maxLines - 1] = last.join('') + '…';
  }
  return { lines, truncated };
}

/**
 * Set the title as large as it will go without losing words: try each size in
 * turn, and settle for the smallest if even that has to cut the title short.
 */
export function layoutTitle(title: string): { lines: string[]; fontSize: number } {
  let wrapped = { lines: [title], truncated: true };
  let fontSize = TITLE_SIZES[TITLE_SIZES.length - 1];

  for (const size of TITLE_SIZES) {
    const maxChars = Math.floor(CONTENT_WIDTH / (size * AVERAGE_GLYPH_WIDTH));
    wrapped = wrapText(title, maxChars, TITLE_MAX_LINES);
    fontSize = size;
    if (!wrapped.truncated) break;
  }
  return { lines: wrapped.lines, fontSize };
}

export interface OgImageOptions {
  /** Title shown large in the centre. */
  title: string;
  /** Small uppercase label (e.g. "BLOG", "PROJECTS"). */
  kind?: string;
  /** Optional subtitle line under the title (truncated to one line). */
  subtitle?: string;
  /** Hex brand colour filling the card. */
  brandColor: string;
  /** Domain shown bottom-right. */
  domain: string;
  /** Site name drawn as the wordmark, omitted when it equals the title. */
  siteName: string;
}

export function renderOgSvg({
  title,
  kind,
  subtitle,
  brandColor,
  domain,
  siteName,
}: OgImageOptions): string {
  const { lines, fontSize } = layoutTitle(title);
  const lineHeight = Math.round(fontSize * 1.21);
  const blockHeight = lines.length * lineHeight;
  // Centre the title block vertically; shift up slightly when a subtitle is shown.
  const baseTitleY =
    (HEIGHT - blockHeight) / 2 + lineHeight * 0.78 + (subtitle ? -28 : 0);

  const titleEls = lines
    .map(
      (line, i) =>
        `<text x="80" y="${baseTitleY + i * lineHeight}" font-size="${fontSize}" fill="#ffffff" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-weight="800" letter-spacing="-2.5">${escapeXml(line)}</text>`,
    )
    .join('\n  ');

  const subtitleEl = subtitle
    ? `<text x="80" y="${baseTitleY + blockHeight + 24}" font-size="28" fill="#ffffff" fill-opacity="0.82" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-weight="500">${escapeXml(truncate(subtitle, Math.floor(CONTENT_WIDTH / (28 * AVERAGE_GLYPH_WIDTH))))}</text>`
    : '';

  const kindEl = kind
    ? `<text x="80" y="98" font-size="22" letter-spacing="6" fill="#ffffff" fill-opacity="0.78" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-weight="700">${escapeXml(kind.toUpperCase())}</text>`
    : '';

  // The site-wide card puts the site name in the title, where the wordmark
  // would repeat it back a second time.
  const wordmarkEl =
    title.trim() === siteName.trim()
      ? ''
      : `<text x="80" y="580" font-size="28" fill="#ffffff" fill-opacity="0.92" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-weight="700">${escapeXml(siteName)}</text>`;

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="og-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.28"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${brandColor}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#og-shade)"/>

  ${kindEl}
  ${titleEls}
  ${subtitleEl}

  <line x1="80" y1="538" x2="1120" y2="538" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1"/>

  ${wordmarkEl}
  <text x="1120" y="580" font-size="22" fill="#ffffff" fill-opacity="0.7" text-anchor="end" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" letter-spacing="1">${escapeXml(domain)}</text>

  <path d="M 36 60 L 36 36 L 60 36" stroke="#ffffff" stroke-width="1.5" fill="none" stroke-opacity="0.45"/>
  <path d="M 1140 36 L 1164 36 L 1164 60" stroke="#ffffff" stroke-width="1.5" fill="none" stroke-opacity="0.45"/>
  <path d="M 36 570 L 36 594 L 60 594" stroke="#ffffff" stroke-width="1.5" fill="none" stroke-opacity="0.45"/>
  <path d="M 1140 594 L 1164 594 L 1164 570" stroke="#ffffff" stroke-width="1.5" fill="none" stroke-opacity="0.45"/>
</svg>`;
}

/** Shorten to `max` characters, breaking at a word boundary where there is one. */
/** Shorten text to `max` average Latin letters of width, ending in an ellipsis. */
export function truncate(text: string, max: number): string {
  if (measure(text) <= max) return text;
  let clipped = '';
  for (const ch of text) {
    if (measure(clipped + ch) > max - 1) break;
    clipped += ch;
  }
  const lastSpace = clipped.lastIndexOf(' ');
  const kept = lastSpace >= 0 && measure(clipped.slice(0, lastSpace)) > max * 0.6 ? clipped.slice(0, lastSpace) : clipped;
  return kept.replace(/[\s.,;:—\-，。、：；]+$/, '') + '…';
}


/** Path (relative to site root) for a blog post's generated OG image. */
export function getBlogOgPath(slug: string): string {
  return `/og/blog/${slug}.png`;
}

/** Path (relative to site root) for a blog tag archive's generated OG image. */
export function getBlogTagOgPath(tagSlug: string): string {
  return `/og/blog/tag/${tagSlug}.png`;
}

/** Path (relative to site root) for a project's generated OG image. */
export function getProjectOgPath(slug: string): string {
  return `/og/projects/${slug}.png`;
}

/** Path for the site-wide OG image, used by every page without one of its own. */
export function getDefaultOgPath(): string {
  return '/og/default.png';
}

/**
 * Whether a URL can be used as `og:image` directly.
 *
 * Social platforms accept these four raster formats and nothing else — an SVG
 * cover, however good it looks on the page, has to be replaced by a generated
 * card. AVIF is left out on purpose: browsers read it, the crawlers don't.
 */
export function isShareableImage(url: string): boolean {
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
}
