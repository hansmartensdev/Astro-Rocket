/**
 * OG card rasterising — the Node-only half.
 *
 * `sharp` is a native module and cannot load in workerd, so nothing here may
 * be reachable from a page or a prerendered endpoint. The `og-cards`
 * integration in `astro.config.mjs` calls this from `astro:build:done`, which
 * always runs in Node whichever adapter is active.
 */
import sharp from 'sharp';
import { renderOgSvg, type OgImageOptions } from './svg.ts';
import { warnIfScriptNeedsFont } from './fonts.ts';

const WIDTH = 1200;
const HEIGHT = 630;

/**
 * Rasterise the card to an opaque PNG buffer.
 *
 * `flatten` guarantees the background colour survives even if a fill is ever
 * lost — a transparent share image is the one failure mode this whole module
 * exists to prevent.
 */
export async function renderOgPng(options: OgImageOptions): Promise<Buffer> {
  await warnIfTextCannotRender();
  warnIfScriptNeedsFont([options.title, options.subtitle]);

  const svg = renderOgSvg(options);
  const brandColor = options.brandColor;
  return sharp(Buffer.from(svg))
    .resize(WIDTH, HEIGHT)
    .flatten({ background: brandColor })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Warn once per build if the machine has no fonts installed.
 *
 * The card's type is drawn by sharp through the system font stack, so a build
 * environment with an empty font set — a bare `node:*-slim` container is the
 * usual case — produces a card with its background and rules but no words, and
 * does so silently. Hosted builders (Vercel, Netlify, Cloudflare Pages, GitHub
 * Actions) and every desktop OS ship fonts, so this only ever fires on setups
 * that need telling.
 */
let fontProbe: Promise<boolean> | null = null;
let fontWarningShown = false;
async function warnIfTextCannotRender(): Promise<void> {
  fontProbe ??= probeTextRendering();
  if (!(await fontProbe) && !fontWarningShown) {
    fontWarningShown = true;
    console.warn(
      '[og] No usable system font found, so generated OG images will have a ' +
        'background but no text. Install fontconfig and a font family (for ' +
        'example fonts-dejavu) on the machine running `astro build`.'
    );
  }
}

/** Draw white text on black and look for a lit pixel. */
async function probeTextRendering(): Promise<boolean> {
  const probe =
    '<svg width="64" height="32" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="64" height="32" fill="#000000"/>' +
    '<text x="4" y="25" font-size="26" fill="#ffffff" ' +
    'font-family="system-ui, sans-serif" font-weight="700">Hg</text></svg>';
  try {
    const pixels = await sharp(Buffer.from(probe)).flatten().greyscale().raw().toBuffer();
    return pixels.some((value) => value > 40);
  } catch {
    return true; // Never let the probe itself break a build.
  }
}

