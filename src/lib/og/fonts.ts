/**
 * Fonts for the generated share images, from the project itself.
 *
 * sharp draws the cards' text with the fonts installed on the machine running
 * `astro build`, found through fontconfig. A hosted builder has Latin fonts,
 * but whether it has Chinese, Japanese, Korean, Arabic or other scripts is up
 * to the host, not the site, and a letter no installed font has comes out as
 * a box. A font file in `src/fonts/` is added to what fontconfig searches, so
 * the cards have those letters on any machine.
 *
 * fontconfig reads its configuration once, the first time anything in the
 * process draws text, so `registerProjectFonts()` is called from the top of
 * `astro.config.mjs`, before any favicon or card is drawn. It writes a
 * configuration that includes the machine's own and adds the folder, and
 * points `FONTCONFIG_FILE` at it.
 *
 * This file imports nothing native, so the config can load it on any adapter.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Where a site keeps extra fonts for its share images. */
export const PROJECT_FONT_DIR = 'src/fonts';

const FONT_FILE = /\.(ttf|otf|ttc|woff)$/i;

/** The font files in `src/fonts/`, by name. */
export function projectFontFiles(root = process.cwd()): string[] {
  const dir = resolve(root, PROJECT_FONT_DIR);
  return existsSync(dir) ? readdirSync(dir).filter((file) => FONT_FILE.test(file)) : [];
}

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Add `src/fonts/` to the fonts sharp can draw with. Returns the files it
 * added, or an empty list when there are none or the machine's own font
 * configuration can't be found (then the system fonts are used as before).
 */
export function registerProjectFonts(root = process.cwd()): string[] {
  const files = projectFontFiles(root);
  if (files.length === 0) return [];

  // The machine's own configuration has to stay in, or its fonts would go,
  // Latin ones included. Linux builders keep it in /etc/fonts.
  const base =
    process.env.FONTCONFIG_FILE ??
    (existsSync('/etc/fonts/fonts.conf') ? '/etc/fonts/fonts.conf' : '');
  if (!base) {
    console.warn(
      `[og] ${PROJECT_FONT_DIR}/ is used where fontconfig keeps its settings in /etc/fonts, as Linux ` +
        `does. On this machine the cards use the installed fonts.`
    );
    return [];
  }

  const cache = resolve(root, 'node_modules/.cache/astro-rocket');
  mkdirSync(join(cache, 'fontconfig'), { recursive: true });
  const config = join(cache, 'fonts.conf');
  writeFileSync(
    config,
    [
      '<?xml version="1.0"?>',
      '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">',
      '<fontconfig>',
      `  <include ignore_missing="yes">${escapeXml(base)}</include>`,
      `  <dir>${escapeXml(resolve(root, PROJECT_FONT_DIR))}</dir>`,
      `  <cachedir>${escapeXml(join(cache, 'fontconfig'))}</cachedir>`,
      '</fontconfig>',
      '',
    ].join('\n')
  );
  process.env.FONTCONFIG_FILE = config;
  return files;
}

// A letter outside the Latin script.
const NOT_LATIN = /[^\P{L}\p{Script=Latin}]/u;

let warned = false;

/**
 * Says once in the build log when a card has letters outside the Latin
 * alphabet and the site brings no font of its own: whether they show then
 * depends on the fonts of the machine that builds it.
 */
export function warnIfScriptNeedsFont(texts: (string | undefined)[], root = process.cwd()): void {
  if (warned || projectFontFiles(root).length > 0) return;
  const text = texts.find((t) => t && NOT_LATIN.test(t));
  if (!text) return;
  warned = true;
  console.warn(
    `[og] "${text}" has letters outside the Latin alphabet. The share image draws them with the fonts ` +
      `of the machine that builds the site, and where it has none, they show as boxes. Put a font with ` +
      `those letters in ${PROJECT_FONT_DIR}/ (.ttf, .otf, .ttc or .woff), for example Noto Sans SC for Chinese.`
  );
}
