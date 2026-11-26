import { join, dirname } from 'node:path';
import { writeFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import i18nConfig from './src/config/i18n.config.ts';
import { SITE_URL_FALLBACK } from './src/config/site-url.ts';
import {
  canonicalOf,
  jsonLdUrlOf,
  siteUrlDisagreement,
  disagreementMessage,
} from './scripts/site-url-agreement.mjs';
import { SITE_NAME, THEME_COLOR } from './src/config/branding.ts';

/**
 * Load `.env` into `process.env` before anything below reads it.
 *
 * Astro loads `.env` files for `astro:env` and for `import.meta.env`, but this
 * file runs before any of that — Vite evaluates it as plain Node, where only
 * real environment variables exist. So `SITE_URL` in `.env` reached
 * `site.config.ts` and not `site` below, and a site configured the way
 * `.env.example` describes shipped canonical tags for the fallback domain
 * while its JSON-LD named the real one (#643).
 *
 * `.env.local` is loaded first on purpose. `process.loadEnvFile` does not
 * overwrite a variable that is already set, so whichever file is read first
 * wins — and Astro gives `.env.local` precedence over `.env`. Reading them in
 * this order matches that.
 *
 * Real environment variables are set before any of this runs, so they still
 * beat both files and a host's own configuration keeps precedence.
 *
 * Only these two: mode-specific files (`.env.production` and the like) would
 * need the mode, which Astro has not decided yet at this point. Anyone using
 * one of those still gets the mismatch — and `verifySiteUrl()` below stops the
 * build and says so, rather than letting it ship.
 */
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Not present. Nothing to load.
  }
}

/**
 * Deploy-target adapter selection. Vercel is the default; set
 * `DEPLOY_TARGET=netlify` or `DEPLOY_TARGET=cloudflare` to build for those
 * platforms instead. All three keep `output: 'static'`, so every page is
 * prerendered and only the `prerender = false` API routes (the contact form
 * and newsletter) ship as the platform's serverless/edge function — on
 * Cloudflare Pages, as a Pages Function.
 */
const deployTarget = process.env.DEPLOY_TARGET;

/**
 * Only the adapter being built for is loaded, and only Vercel's is a
 * dependency of the theme.
 *
 * All three used to be imported at the top of this file, so every clone
 * installed all three — and with them the whole of Netlify's and Cloudflare's
 * build tooling, whichever platform the site was actually going to. That is
 * nearly half of the theme's dependency surface: a production install goes
 * from 1,154 packages to 673, and `pnpm audit --prod` from 206 findings to
 * 118. The two
 * critical findings are not among the ones that go; both are the same node-tar
 * advisory, reached through Vercel's own adapter and through astro-icon, and
 * both are build-time tools that no deployed site runs.
 *
 * `pnpm add -D @astrojs/netlify` (or `@astrojs/cloudflare`) before building
 * for those targets; the error below says so when it is missing. The import
 * specifier is a variable, which Vite cannot follow, and the comment tells it
 * not to try rather than warn on every build.
 */
async function resolveAdapter() {
  const optional = { netlify: '@astrojs/netlify', cloudflare: '@astrojs/cloudflare' };
  const pkg = optional[deployTarget];
  if (!pkg) return vercel();

  try {
    const mod = await import(/* @vite-ignore */ pkg);
    return mod.default();
  } catch (error) {
    throw new Error(
      `DEPLOY_TARGET=${deployTarget} needs ${pkg}, which is not installed. ` +
        `Run \`pnpm add -D ${pkg}\` and build again. Only the Vercel adapter ` +
        `ships as a dependency, so a site deploying to one platform does not ` +
        `carry the build tooling of the others.\n\n${error.message}`
    );
  }
}

/**
 * Build-time check that the site knows its own address.
 *
 * With `SITE_URL` unset the build still succeeds, and every canonical tag,
 * `og:url`, `og:image`, RSS link and sitemap entry is written against the
 * placeholder above — pointing search engines and social crawlers at a domain
 * that isn't yours. Nothing in the output looks broken, so it survives to
 * production easily. Warn where it will be read: the build log.
 */
function siteUrlCheck() {
  return {
    name: 'site-url-check',
    hooks: {
      'astro:build:start': ({ logger }) => {
        if (process.env.SITE_URL) return;
        logger.warn(
          `SITE_URL is not set, so canonical URLs, og:image, RSS and the sitemap ` +
            `will all be written against ${SITE_URL_FALLBACK}. Set SITE_URL in ` +
            `your host's environment variables to your own domain.`
        );
      },
    },
  };
}

/**
 * Pagefind static search index, generated after every `astro build`.
 *
 * Runs in the `astro:build:done` hook so it indexes the *actual* output
 * directory — the Vercel adapter writes to `.vercel/output/static`, Netlify,
 * Cloudflare, and plain static builds to `dist/` — without the build command
 * needing to know which. The index is served from `/pagefind/` and loaded lazily by
 * `src/components/layout/SearchModal.astro`; `astro dev` has no index, and
 * the search modal explains that instead of erroring.
 */
function pagefind() {
  return {
    name: 'pagefind',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const sitePath = fileURLToPath(dir);
        const outputPath = join(sitePath, 'pagefind');
        const { createIndex, close } = await import('pagefind');
        const { index } = await createIndex();
        const { page_count } = await index.addDirectory({ path: sitePath });
        await index.writeFiles({ outputPath });
        await close();
        logger.info(`indexed ${page_count} pages into ${outputPath}`);
      },
    },
  };
}

/**
 * Favicon PNG/ICO files, written after every `astro build`.
 *
 * These used to be prerendered endpoints under `src/pages/`. That worked on
 * Vercel and Netlify but broke on Cloudflare: `@astrojs/cloudflare` prerenders
 * routes inside workerd, and the renderer needs `sharp`, a native Node module
 * that cannot load there. Every favicon route failed with
 * `No such module "…/chunks/sharp"` and the build died — so Cloudflare users
 * got no site at all. Reported in #600.
 *
 * `astro:build:done` always runs in Node, whichever adapter is active, and
 * `dir` already points at that adapter's real output directory. So the same
 * files land in the same place on all three targets, with no native module
 * anywhere near a page.
 *
 * `favicon.svg` is written here too, rather than staying a route. It needs no
 * *native* module, so keeping it as a route looked safe — but `buildFaviconSvg`
 * decodes an embedded font subset with `Buffer` and parses it with fontkit,
 * and neither exists in workerd without `nodejs_compat`. As a route it emitted
 * a 0-byte file on Cloudflare while the build reported success. The cost is
 * that `astro dev` has no favicon, since build hooks do not run there.
 */
function faviconAssets() {
  const letter = SITE_NAME.charAt(0).toUpperCase();
  const pngSizes = {
    'favicon-32x32.png': 32,
    'apple-touch-icon.png': 180,
    'pwa-192x192.png': 192,
    'pwa-512x512.png': 512,
  };

  return {
    name: 'favicon-assets',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        // Imported here rather than at the top of this file: a static import
        // of the sharp-backed module makes pagefind's own dynamic import above
        // fail with "Vite module runner has been closed" (#600).
        const { buildFaviconSvg } = await import('./src/lib/favicon/svg.ts');
        const { renderFaviconPng, renderFaviconIco } = await import('./src/lib/favicon/raster.ts');
        const out = fileURLToPath(dir);

        await writeFile(join(out, 'favicon.svg'), buildFaviconSvg(letter, THEME_COLOR));

        for (const [name, size] of Object.entries(pngSizes)) {
          await writeFile(join(out, name), await renderFaviconPng(letter, THEME_COLOR, size));
        }
        await writeFile(join(out, 'favicon.ico'), await renderFaviconIco(letter, THEME_COLOR));

        logger.info(`wrote ${Object.keys(pngSizes).length + 2} favicon files to ${out}`);
      },
    },
  };
}

/**
 * OG share cards, drawn after every `astro build`.
 *
 * These used to be prerendered endpoints under `src/pages/og/`, and they hit
 * the same wall as the favicons in #600: rasterising needs `sharp`, which
 * cannot load in the workerd runtime the Cloudflare adapter prerenders in.
 * Worse than the favicons, `src/lib/og.ts` also held the `getBlogOgPath`
 * helpers that `BlogLayout` and `ProjectLayout` import — so `sharp` was
 * reachable from every blog and project page, not just from the card routes.
 * The library is split in two now: `og/svg.ts` is safe anywhere, `og/raster.ts`
 * is Node-only and reached only from here.
 *
 * Rather than re-deriving which cards to draw from the content collections —
 * which this file cannot read — the hook scans the built HTML for the
 * `og:image` each page declares, and draws exactly those. Cards therefore
 * match what the pages ask for by construction, and a page using its own cover
 * photo silently produces no card, which is correct. Title and subtitle come
 * from the same page's `og:title` and `og:description`.
 */
function ogCards() {
  const KINDS = [
    [/^\/og\/blog\/tag\//, 'BLOG'],
    [/^\/og\/blog\//, 'BLOG'],
    [/^\/og\/projects\//, 'PROJECTS'],
  ];

  async function htmlFiles(directory) {
    const found = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) found.push(...(await htmlFiles(path)));
      else if (entry.name.endsWith('.html')) found.push(path);
    }
    return found;
  }

  const meta = (html, property) => {
    const m = html.match(new RegExp(`<meta property="${property}" content="([^"]*)"`));
    return m ? m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
                   .replace(/&lt;/g, '<').replace(/&gt;/g, '>') : undefined;
  };

  return {
    name: 'og-cards',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const { renderOgPng } = await import('./src/lib/og/raster.ts');
        const out = fileURLToPath(dir);
        const siteUrl = process.env.SITE_URL || SITE_URL_FALLBACK;
        const domain = new URL(siteUrl).host;

        // Collect one entry per distinct card path; several pages can point at
        // the same card (the default one, most obviously).
        const wanted = new Map();
        for (const file of await htmlFiles(out)) {
          const html = await readFile(file, 'utf8');
          const image = meta(html, 'og:image');
          if (!image) continue;
          let path;
          try {
            path = new URL(image, siteUrl).pathname;
          } catch {
            continue;
          }
          if (!path.startsWith('/og/') || !path.endsWith('.png') || wanted.has(path)) continue;
          wanted.set(path, {
            title: meta(html, 'og:title') || SITE_NAME,
            subtitle: meta(html, 'og:description'),
            kind: KINDS.find(([re]) => re.test(path))?.[1],
          });
        }

        for (const [path, card] of wanted) {
          const png = await renderOgPng({
            ...card,
            brandColor: THEME_COLOR,
            domain,
            siteName: SITE_NAME,
          });
          const target = join(out, path.replace(/^\//, ''));
          await mkdir(dirname(target), { recursive: true });
          await writeFile(target, png);
        }

        logger.info(`drew ${wanted.size} OG cards into ${out}`);
      },
    },
  };
}

/**
 * Stops a build whose pages disagree about the site's own address.
 *
 * The address is read from two places that cannot share code: `site` here,
 * from `process.env`, which writes the canonical tags, the sitemap, the RSS
 * links and robots.txt; and `url` in `src/config/site.config.ts`, from
 * `astro:env/server`, which writes the JSON-LD, the share cards and the
 * footer. See `scripts/site-url-agreement.mjs` for why neither can do the
 * other's job.
 *
 * They do not read the same places. `astro:env` loads `.env` files and this
 * file does not, so a user who follows `.env.example` and sets SITE_URL in
 * `.env` configures one of the two. Their pages then carry canonical tags for
 * the fallback domain and JSON-LD for their own (#643).
 *
 * This runs in `astro:build:done` rather than in `scripts/verify-build.mjs`,
 * where the theme's other output checks live, because that script runs on
 * `pnpm verify` and a deploy runs `astro build`. A misconfiguration that only
 * a local audit catches is one that reaches production.
 *
 * One page is enough: both values are global, so if they agree anywhere they
 * agree everywhere.
 */
function verifySiteUrl() {
  return {
    name: 'verify-site-url',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);

        async function htmlFiles(directory) {
          const found = [];
          for (const entry of await readdir(directory, { withFileTypes: true })) {
            const path = join(directory, entry.name);
            if (entry.isDirectory()) found.push(...(await htmlFiles(path)));
            else if (entry.name.endsWith('.html')) found.push(path);
          }
          return found;
        }

        // index.html first: it is the page most likely to carry both, and
        // finding it there avoids reading the rest of the site.
        const pages = await htmlFiles(root);
        pages.sort((a, b) => Number(b.endsWith('index.html')) - Number(a.endsWith('index.html')));

        for (const page of pages) {
          const html = await readFile(page, 'utf8');
          const canonical = canonicalOf(html);
          const jsonLd = jsonLdUrlOf(html);
          if (!canonical || !jsonLd) continue; // proves nothing either way

          const found = siteUrlDisagreement(html);
          if (found) throw new Error(disagreementMessage(page.replace(`${root}`, ''), found));

          logger.info(`site address agrees in canonical and JSON-LD: ${canonical}`);
          return;
        }

        logger.info('no page carries both a canonical tag and JSON-LD — nothing to compare');
      },
    },
  };
}

/**
 * Native Astro i18n is only wired up when the user opts in *and* has
 * more than one locale configured. With i18n off (the default) this
 * block is undefined and the build emits the exact same routes as
 * before — no /en/ prefix, no extra pages.
 */
const i18nEnabled = i18nConfig.enabled === true && i18nConfig.locales.length > 1;
const astroI18nOptions = i18nEnabled
  ? {
      defaultLocale: i18nConfig.defaultLocale,
      locales: i18nConfig.locales,
      routing: {
        prefixDefaultLocale: false,
        redirectToDefaultLocale: false,
      },
    }
  : undefined;

export default defineConfig({
  output: 'static',
  adapter: await resolveAdapter(),
  site: process.env.SITE_URL || SITE_URL_FALLBACK,
  ...(astroI18nOptions ? { i18n: astroI18nOptions } : {}),

  // Astro 7 changed the default to 'jsx', which strips whitespace between
  // inline elements (React-style). Pin to `true` to keep this theme's v6
  // rendering — significant whitespace between inline tags is preserved.
  compressHTML: true,

  build: {
    inlineStylesheets: 'auto',
  },

  env: {
    schema: {
      SITE_URL: envField.string({ context: 'server', access: 'public', optional: true }),
      PUBLIC_GA_MEASUREMENT_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_GTM_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      // Umami — privacy-friendly, cookieless analytics. Set the website ID to
      // enable it; the src defaults to Umami Cloud, override it when self-hosting.
      PUBLIC_UMAMI_WEBSITE_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_UMAMI_SRC: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
        default: 'https://cloud.umami.is/script.js',
      }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_FROM_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_AUDIENCE_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      GOOGLE_SITE_VERIFICATION: envField.string({ context: 'server', access: 'public', optional: true }),
      BING_SITE_VERIFICATION: envField.string({ context: 'server', access: 'public', optional: true }),
      PUBLIC_GOOGLE_MAPS_API_KEY: envField.string({ context: 'client', access: 'public', optional: true, default: '' }),
      PUBLIC_CONSENT_ENABLED: envField.boolean({ context: 'client', access: 'public', optional: true, default: false }),
      PUBLIC_PRIVACY_POLICY_URL: envField.string({ context: 'client', access: 'public', optional: true, default: '' }),
      // The theme's own demo (astrorocket.dev) only: dark mode always, and no
      // light/dark/system menu in the header. Unset on every other site, where
      // the three modes work as documented.
      DEMO_DARK_MODE: envField.boolean({ context: 'server', access: 'public', optional: true, default: false }),
    },
  },

  image: {
    layout: 'constrained',
  },

  integrations: [
    react(),
    mdx(),
    sitemap(),
    icon(),
    siteUrlCheck(),
    pagefind(),
    faviconAssets(),
    ogCards(),
    verifySiteUrl(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  security: {
    checkOrigin: true,
  },

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },

});
