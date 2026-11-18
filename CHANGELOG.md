# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

## [2.7.0] — 2026-11-18

### Changed

- **Astro 7.4.12**, up from 7.3.1. Nothing in the theme needed changing and no API moved, but this release carries one requirement that does reach every site built on it, so it is a minor rather than a patch.
- **Node.js 22.23.4 is the new floor**, up from 22.12.0 — Astro's own `engines` field raised it. A site on Node 22.12 through 22.22 that merges this will not build until its runtime moves. The README's prerequisite and the `engines` field both follow, and `readme-claims.test.ts` compares the two.
- **7.4 replaces the bundler.** `esbuild` leaves the dependency tree and `rolldown` enters it, Vite moves from ^8.0.13 to ^8.3.6, and `@astrojs/compiler-rs` from ^0.4.0 to ^0.5.2. `@astrojs/runtime` and `@astrojs/vite-plugin-astro` are new; `clsx`, `common-ancestor-path`, `find-proc`, `js-yaml`, `semver` and `yargs-parser` are gone. The lockfile grows from 1297 resolutions to 1364.
- **No integration needed upgrading.** Astro's `peerDependencies` are unchanged between 7.3.1 and 7.4.12, so `@astrojs/mdx` 8.0.0, the Vercel, Netlify and Cloudflare adapters, `@astrojs/react`, `@astrojs/sitemap` and `@astrojs/check` all stay where they are.
- **The built bytes change on every page, and the rendering does not.** Two causes, both from the new compiler and bundler. Whitespace between an HTML comment and the element after it is no longer emitted — 1173 occurrences across the site's 89 pages — and the minifier rewrites inline scripts differently, turning `!r||!s||(…)` into `r&&s&&(…)` and the like. Anyone who diffs their built output against a previous build will see it move everywhere; nothing about what a visitor sees moves with it.
- Verified by building the site on both versions and comparing the rendered pages pixel for pixel, in both colour modes: every page is identical apart from the component showcase, where comparing 7.3.1 against *itself* produces differences of the same size, because that page animates. Build output is 88 pages either way, `astro check` reports 0 errors and 0 warnings, and all 168 tests pass.


## [2.6.0] — 2026-09-03

### Changed

- **Astro 7.3.1**, up from 7.2.0 — nothing is deprecated and no migration is required, so a site built on this theme needs no changes when it merges this. 7.3.1 rather than 7.3.0: 7.3.0 carried an error that stopped projects using `astro:assets` from starting or building, and this theme uses `astro:assets` in four places. What 7.3 adds is opt-in or for authors of custom services — an `--ignore-lock` flag for `astro preview` so several preview servers can run at once, and a `logger` argument for custom image services and for cache providers, so their messages go through the configured logger and respect the log level instead of going straight to the console. Astro's own Sharp service and `memoryCache()` now use it; this theme defines neither a custom image service nor a cache provider.
- Two of 7.3's fixes reach this theme: Astro's remaining internal warnings and errors now go through the configured logger rather than the console, and build performance improves for sites with many pages drawn from many modules. Three do not — the server-island fix for styles, links and scripts missing from content-collection entries, the `experimental.incrementalBuild` concurrency work, and the `memoryCache()` fix for `Vary: Cookie` — because the theme uses none of those. One is worth knowing for anyone who turns i18n on with a fallback: a page such as `src/pages/en/enterprise.astro` under `fallback: { es: 'en' }` used to generate `/es/esterprise`, since the locale code was rewritten wherever it appeared rather than only at the front. The theme ships i18n without a `fallback`, so it was never affected; a site that adds one was.
- **`@astrojs/mdx` 8.0.0**, up from 7.0.3. The major moves MDX file processing into the Markdown processors, and upstream's migration note is short: a project that has not explicitly installed a Markdown processor needs to do nothing. This theme sets `markdown.shikiConfig` and no `processor`, so it falls through to Sätteri and the requirement that applies is `@astrojs/markdown-satteri` 0.4.0 or later — which Astro 7.3.1 already brings. A fork that has configured `processor: unified()` needs `@astrojs/markdown-remark` 7.3.0 or later; both packages declare that one as an optional peer, required only when `unified()` is in use.
- The upgrade takes weight out rather than adding it. mdx no longer carries its own processing chain: the install removed 117 packages, the lockfile went from 1420 resolutions to 1297, `@astrojs/markdown-remark` leaves the tree altogether — it was present only because mdx 7.0.3 pinned it at 7.2.1 — and `@astrojs/markdown-satteri` collapses from two copies to one. Neither of mdx 8's two patch fixes applies here: this theme does not set `extendMarkdownConfig`, and it configures no `remarkPlugins`, `rehypePlugins`, `recmaPlugins` or `remarkRehype`.
- Verified by rendering the whole site on both versions and comparing all 90 pages: every one is identical apart from Astro's per-build random component ids and the generator meta tag. Lighthouse over three runs of each build holds performance, accessibility, best practices and SEO at 100, with CLS 0 and TBT 0 on both.
- The README's Astro badge follows the pin, which `readme-claims.test.ts` enforces. Node.js 22.12.0+ is still the floor.

### Fixed

- Dark-mode contrast figure for the primary button corrected to 4.56:1 (amber, at rest). All twelve themes clear WCAG AA.
- The README and the configuration guide now point at `colourThemes` in `src/lib/themes.ts` for the list of themes.

## [2.5.3] — 2026-08-14

### Fixed

- All build-time variables now reach a Docker build. Only `SITE_URL` was passed in, so a site built with `docker compose up --build`, or exported with `docker compose run --rm export`, carried no analytics, consent banner or verification tags. Reported by [@0Ky](https://github.com/0Ky) in [#652](https://github.com/hansmartensdev/astro-rocket/issues/652).
- `PUBLIC_GOOGLE_MAPS_API_KEY` added to `.env.example`, which also now states which variables reach a Docker build.
- `AGENTS.md` gave the wrong number of colour themes.

### Changed

- A rule for accepting a feature into the theme: does a general user need it, and does the theme need it.

## [2.5.2] — 2026-08-13

### Fixed

- **`docker compose run --rm export` wrote `http://localhost:4321` into every canonical tag.** The export service builds the files people put on a host, and it was the one service in `compose.yml` with no `SITE_URL` build argument, so it took the Dockerfile's preview default. A site exported that way told search engines its canonical home was `localhost:4321`, and said so in the sitemap and `og:image` too. Nothing warned: `[site-url-check]` only speaks when `SITE_URL` is unset, and it was set — to the wrong thing — while `verify-site-url` compares the canonical against the JSON-LD, and both agreed. The service now takes `SITE_URL` the way the preview does, defaulting to empty rather than to localhost, so a build with no address falls back to the placeholder domain and warns instead of shipping a wrong one in silence. `docker compose up --build` was never affected.
- **The container CI job could not fail.** Its readiness step tried thirty times to reach the container and then ended on `sleep`, which succeeds — so a container that never served passed the step that exists to notice. It now prints the compose logs and exits 1. The job also runs through `docker compose` rather than `docker build`, so it exercises what the README documents, and it reads the canonical tag and the sitemap out of both the served preview and the exported files: the guards inside the build cannot see a wrong address, only the output can.

## [2.5.1] — 2026-08-12

### Fixed

- **The README asked for the wrong pnpm.** Its prerequisites said pnpm 9.x while `packageManager` pins 10.33.0 — the first instruction a newcomer follows, and it was wrong. The Astro and Tailwind badges named 7.0 and 4.0 against the 7.2.0 and ^4.3.1 that `package.json` declares. A test now compares the two: every `pnpm` command the README documents has to be a script that exists, the Node and pnpm versions have to match `engines` and `packageManager`, and each version badge has to match the dependency it names. `component-count.test.ts` already guarded the component figure; this covers the rest of what can be checked against the repository, and each of its six checks was confirmed to fail when the claim it guards is broken.
- **`pnpm test:e2e` had no tests to run.** The README documented it and `@playwright/test` was a dependency, but there was no Playwright configuration and no spec file anywhere in the repository, so the documented command failed with "No tests found". A starter theme handing somebody a command that errors is worse than not offering one, and what end-to-end tests would have covered is covered: 142 unit tests, and a CI job that exercises the built site over HTTP through the preview container. The script, the dependency and Playwright's output directories are gone, and every command the README documents is now a script that exists.
- **`.gitignore` named seven things that do not exist.** Six were files that have never appeared in this repository's history — two documents from the boilerplate this theme's ancestor was forked from, and four screenshots belonging to another site. They arrived with the file when the theme was cloned. The seventh was `public/pagefind/`: the search integration writes its index into whichever directory the active adapter builds into, so nothing has ever written there. A `.gitignore` is read by anyone working out how a repository is laid out, and entries pointing at absent files describe a project that is not this one.

### Added

- **Two sections at the top of the README.** "Run it" gives both ways to start in six lines — clone and `pnpm dev`, or `docker compose up --build` with nothing else installed — rather than leaving Quick Start a hundred and fifty lines below the feature table. "Good to know" names the three things people reasonably expect and do not get: there is no CMS or admin, the contact form and newsletter need a Resend key before they deliver, and search is indexed at build time so `astro dev` has none.

## [2.5.0] — 2026-08-12

### Added

- **A Docker preview of the built site.** `docker compose up --build` serves the theme on `localhost:4321` without Node, pnpm or a dependency tree on your own machine, and `docker compose run --rm export` writes the build into `./dist` instead. Two stages: the build stage installs and runs `astro build`, and the runtime image is nginx carrying the generated files and nothing else — no Node, no pnpm, no Astro. It answers two things at once. Somebody weighing up the theme can see it running with only Docker installed, and somebody wary of what a dependency tree's install scripts might read can keep that install inside a container that sees this repository and nothing else of theirs. The contact form and the newsletter are the theme's only routes that are not prerendered, so they are absent from the static build the container serves; rather than a bare 404 — which reaches the form as unparseable text and surfaces as "Failed to send message", reading like a fault in the theme — nginx answers `/api/` with a 501 and a JSON body in the shape the form already parses, so the reason appears in the form itself. pnpm comes from the `packageManager` field rather than a version pinned in the Dockerfile, and `dist/client` is served because that is what Astro writes before any adapter copies it into its own layout, so the container is not tied to one deploy target. A CI job builds the image on every push and exercises it — the home page, a nested page, a 404, and a `POST` to `/api/contact` that has to answer 501 with a parseable body — because nothing else here would notice it breaking. Proposed, with a complete working setup, by [@0Ky](https://github.com/0Ky) in [#652](https://github.com/hansmartensdev/astro-rocket/issues/652).

### Fixed

- **The LetterGlitch tutorial publishes the component the theme actually ships.** That post hands a reader two whole files to copy, and both had fallen behind. The React component was two versions old: it still read the canvas size on every frame, and it carried the off-screen animation loop and per-frame colour parsing that were reported as [#646](https://github.com/hansmartensdev/astro-rocket/issues/646) and fixed in 2.4.1. The Astro wrapper had no `maxWidth` prop and none of the shadow treatment, so anyone following the post built a near-black band with no shadow in either colour mode and no way to know what was missing. Both blocks are now the files, character for character, and the notes under the component explain the two faults rather than describing the code that had them. A note at the top tells anyone who copied the old version to copy it again.
- **A test checks every file a tutorial tells a reader to save.** The drift above went unnoticed for three months because nothing compared a published code block against the file it claimed to be. Any post that writes "Save this as `some/path`" and follows it with a code block is now making a promise the suite checks, so a new tutorial is covered the day it is written. It fails three ways, each one confirmed: the file changes and the post does not, the post names a path the theme does not have, and the phrasing drifts so nothing is found at all — the last guarding the check itself, which would otherwise pass by finding nothing.

### Changed

- **CI runs the tests.** The workflow ran the linter and the type checker and never the test suite, and neither did `validate`, so 136 tests only ran when somebody typed the command — leaving every guarantee they encode unenforced between commits, including the site-address agreement added in 2.4.0 and the tutorial check added here. A new `test:run` script is vitest without the watcher, so CI and `validate` both terminate; `validate` runs it before the build, because two seconds of tests should fail ahead of twenty seconds of building. pnpm is pinned once in `packageManager` and the workflow's own version pin is gone, so the container, CI and a developer's machine read the same value — CI had been on 9 while the lockfile was written by 10.33. The README's badge row gains the build status, which now means the tests passed rather than only the linter.

## [2.4.1] — 2026-08-11

### Fixed

- **The LetterGlitch effect no longer runs while it is off screen, and no longer parses colours on every frame.** Two faults, one visible symptom: frames long enough to make other animations stutter as scrolling revealed them. The first is that the animation loop started at mount and ran until unmount, with no pause when the canvas left the viewport — and the effect usually sits at the foot of a page, so it consumed frames for an entire visit while the reader was somewhere else. An `IntersectionObserver` now starts the loop on entry and cancels it on exit, with the glitch timer reset on restart so returning to it does not fire a burst of catch-up frames; where `IntersectionObserver` is unavailable the loop runs as before. The second is that `handleSmoothTransitions` walked the whole grid each frame to find the cells whose colour was still moving, then parsed two CSS colour strings per cell with regular expressions — and by the component's own constants around 40% of a grid is mid-transition at any moment, which on a full-width band is well over a thousand parses per frame, each one failing both hex patterns first because an interpolated colour is an `rgb()` string. The palette is now parsed once at mount into numbers, cells carry their channels alongside a cached CSS string, and interpolation is arithmetic, so no colour is parsed after mount. Cells whose colour is moving are tracked in a list rather than found by scanning. The animation is unchanged — same interpolation, same timing, same palette — so a site on this theme needs no changes. Reported with a profile trace and a screen recording by [@0Ky](https://github.com/0Ky) in [#646](https://github.com/hansmartensdev/astro-rocket/issues/646).

## [2.4.0] — 2026-08-08

> **This release can stop a build that used to succeed.** If your pages'
> canonical tags and their JSON-LD name different domains, `verify-site-url`
> now fails the build and prints both. That output was always wrong; it never
> announced itself. The usual cause is `SITE_URL` reaching one of the two and
> not the other — set it in your host's environment variables, where both read
> it, and the build passes.

### Fixed

- **`SITE_URL` in a `.env` file now reaches the whole build.** `.env.example` lists it under "Required" and tells you to copy the file to `.env`, and doing that configured half the site: the JSON-LD, share cards and footer took the value, while the canonical tags, sitemap, RSS links and robots.txt kept the `https://example.com` fallback. `astro.config.mjs` runs before Astro loads any `.env` file, so `process.env.SITE_URL` was empty there however the file was written. Nothing failed and nothing looked wrong — and search engines act on canonical tags, so a site could lose its own pages to a domain nobody owns while its author saw a green deploy. The config now loads `.env.local` and `.env` itself before reading anything, in that order, because `process.loadEnvFile` leaves an already-set variable alone and Astro gives `.env.local` precedence. Real environment variables are set before any of it runs, so a host's own configuration still wins. Reported with a full diagnosis and a working fix by [@Mohamed3nan](https://github.com/Mohamed3nan) in [#643](https://github.com/hansmartensdev/astro-rocket/issues/643).

### Added

- **The build stops when a site's pages disagree about its own address.** Two files decide it and neither can do the other's job: `astro.config.mjs` sets `site` — the canonical tags, sitemap, RSS links and robots.txt — and runs before `astro:env` exists, while `src/config/site.config.ts` sets `url` — the JSON-LD, share cards and footer — and cannot use `process.env`, because Cloudflare Workers have none at runtime. The `.env` fix above closes the case that was reported; it cannot close every case, since mode-specific files such as `.env.production` need a mode the config does not know yet. So a new `verify-site-url` integration reads the built output, compares the canonical origin against the JSON-LD origin, and fails the build with both values and where each came from. It runs in `astro:build:done` rather than in `scripts/verify-build.mjs`, where the theme's other output checks live, because that script runs on `pnpm verify` and a deploy runs `astro build`.

### Changed

- **Astro 7.2.0**, up from 7.1.0 — nothing is deprecated and no migration is required, so a site built on this theme needs no changes when it merges this. What 7.2 adds is opt-in and off until you ask for it: background preview servers, a project-relative `logger.entrypoint`, `session: false` to drop the session runtime from serverless bundles, `experimental.incrementalBuild`, and a `digest` property on content entries. The bump also carries the 7.1.1–7.1.6 fixes, three of which reach this theme — duplicate CSS emitted in hybrid mode, stale CSS after a component edit, and scoped styles going missing inside `client:only` islands. Every `@astrojs/*` integration here declares `astro: ^7.0.0`, so none of them moved. Node.js 22.12.0+ is still the floor.

## [2.3.0] — 2026-08-03

> **The footer changes on every page.** All five layouts now use the `columns`
> footer instead of `centered`. Nothing breaks and nothing needs configuring,
> but the foot of your site will look different after this update. To keep the
> old one, pass `layout="centered"` to `<Footer>` in whichever layouts you use
> — they are in `src/layouts/`.

### Added

- **The columns footer fills itself** — it used to render a logo and empty space, because `linkGroups` defaulted to an empty array and nothing supplied one. With nothing configured it now derives three columns from the site it is on: **Site** from `footerNavItems`, **Topics** from the six most-used blog tags, and **Projects** from the visible projects. Each column is dropped when it is empty, so a new site with no posts and no projects shows the Site column alone — close to the old single-row footer — and fills out as the site grows. The grid counts what is actually there rather than a fixed number, unless a caller passes `columns`.
- **`footerLinkGroups` in `nav.config.ts`** — adds a column the theme cannot work out, such as support or a second product. Added to the derived columns rather than replacing them; `titleKey` translates the heading through the locale files and internal hrefs go through the same resolver the nav uses. Passing `linkGroups` to `<Footer>` still replaces the derived set entirely.
- **Projects with no page are listed without a link** — an entry marked `placeholder: true` has no detail route, which `ProjectCard` already knew on the projects index. The footer now agrees: the name appears as plain text. Projects that do have pages sort first, so the column leads with what can be followed.
- **A feed per locale** — there was one feed. It carried the default locale's posts and declared `<language>` to match, yet every page in every locale linked to it, so a reader on a translated page was offered a feed in a language they had not asked for, pointing at pages in that language. `src/pages/[locale]/rss.xml.ts` adds the secondary-locale feeds, `getRssUrl(locale)` joins the other URL helpers, and the XML lives in `src/lib/rss.ts` so the two routes cannot drift. Guarded by `getSecondaryLocales()`, so single-locale builds are unchanged.
- **The email forms report their own state** — `/api/contact` returned "Email service is not configured" with a 500, but only after a visitor had typed a name, an address and a message. Both forms read that state when the page renders instead. They still render in every case, so the theme looks complete out of the box: in development a line names the variables to set and says only the developer can see it, and in production without keys the submit is disabled with one plain explanation.
- **`getRoutableProjects`** in `src/lib/projects.ts` — the `!placeholder` filter was written inline in both detail routes and missing anywhere else. One copy now, used by the routes and the footer.
- **`NewsletterForm` on the components page** — the patterns section showed `SearchInput` but not the newsletter form, which left the component hard to find. Both layouts are shown: the default, which puts the field and button side by side from `sm` up, and the stacked one for narrow columns.
- **A large-site footer on the components page** — the Columns showcase was three short link groups and a tagline, which is not what the layout can do. A second showcase arranges the same components at the size a medium or large site needs.
- **`RESEND_AUDIENCE_ID` in the environment schema** — the newsletter endpoint read it through `import.meta.env`, skipping the typing and validation every other secret gets. It is now declared in `astro.config.mjs` alongside `RESEND_API_KEY`.

### Changed

- **The columns footer is the default** — see the note above. It carries the newsletter signup in its brand column, the link groups beside it, and a bottom bar with the copyright, the credit line, the feed and the social icons.
- **The newsletter ships on** — `newsletter.enabled` defaults to `true`. The form knows whether it has keys and says so itself, so a theme cloned on a Friday looks finished rather than half-configured. Set it to `false` to drop the block; the footer then shows the logo and tagline in that column.
- **The blog closes with a CTA rather than "Follow along"** — that block offered RSS, the social accounts, an email link and a signup form, every one of which now sits in the footer on every page. It was repeating what a reader already had a screen below it. The closing block asks for something instead, using the about page's wording, from `blog.cta` in the locale files.
- **Every blog surface carries the same closing block** — it lived inline in three files as five copies and had drifted: `/blog/page/2` had no desktop band and no newsletter form, and `/blog/tag/…` had nothing at all. Which options a reader was offered depended on how they had arrived. One component now serves the index, a post, the paginated pages and the tag pages.
- **The table of contents now sits on the right** — `articleFeatures.toc.sidebarPosition` ships as `'right'`, the usual side for an article and the side the layouts already fell back to when the setting was omitted. Set it back to `'left'` in `site.config.ts` to keep the previous placement.
- **Blog posts and project pages have a framed reading surface** — the article sits in a card with a neutral border, matching the TOC card beside it. The border stays neutral rather than brand-tinted: an accent suits a small card, while the same tint around a full-length article reads as decoration. The frame starts at the `sm` breakpoint, so a phone held upright keeps the full screen width for the text.
- **`NewsletterForm` redesigned to sit anywhere** — a mail icon in the field, a button that goes full width on a phone and keeps its natural width from `sm` up, and a reserved line for the status message so nothing below the form jumps when it appears. New optional `heading`, `description` and `note` props make it a complete block on its own; `size` and `layout` (`'auto'` or `'stacked'`) cover narrow columns and footers, and `buttonClass` lets a section pass the theme's `cta-btn-brand` / `hero-btn-brand` so the submit button matches the other actions around it in both colour modes. The field now carries an accessible name, and the status line is announced with `role="status"`.
- **`llms.txt` lists the pages your nav lists** — the Pages section was five hardcoded lines under a comment claiming nothing in the file needed updating by hand. It had drifted: it named Home, About, Projects, Blog and Contact while the nav also carried Services, and it never mentioned the components page, so an assistant asked about this theme could not learn that the page documenting every component exists. It comes from `getNavItems` now, and names `/components` separately, guarded so a site that deletes that page drops the link with it.

### Fixed

- **The footer's social icons were unreachable** — `socialLinks` is a prop defaulting to an empty array, and no layout ever passed it, so that markup could not render in any of the five layouts. It falls back to `siteConfig.socialLinks`, which is where they are already configured and where every other component reads them from.
- **The theme credit only appeared on one layout** — `footer.credit` was wired into `centered` alone, so any site using another layout lost it without anything saying so. Every layout renders it now.
- **The demo's LinkedIn link pointed at linkedin.com** — the site's homepage rather than a profile, live in the footer and on every blog page.
- **Two i18n tests described content that no longer existed** — the nav test expected five Dutch hrefs after `navItems` gained a Home entry, and the `tData()` test read `pages.about.intro.facts` after the about page was restructured, so a correct `undefined` was read as a broken helper. The second asserts the shape of an entry rather than its wording, so rewording the page cannot fail it again.
- **Light screenshots in a project hero had no visible edge** — the hero frame's light-mode ring was 5% black, which against a white page is close to invisible. A screenshot of a light interface therefore ended where its shadow began, and the shadow read as the outline rather than as depth. The ring now uses the standard border colour. Dark screenshots and dark mode are unchanged, and the shadow itself was not touched.
- **The newsletter honeypot never ran** — the form rendered no hidden field, and the endpoint read `website` while the contact endpoint uses `honeypot`. The form now carries a `honeypot` field and the endpoint reads that name, so the bot check happens before validation as it was meant to.
- **Cloudflare deploy secrets** — the deployment section named `NEWSLETTER_API_KEY`, which nothing in the theme reads. It now names `RESEND_AUDIENCE_ID`, which is what the newsletter endpoint actually needs.

## [2.2.0] — 2026-07-27

### Added

- **Umami analytics, built in** — Umami joins Google Analytics 4 and Google Tag Manager as a supported provider. Set `PUBLIC_UMAMI_WEBSITE_ID` and the tracking script loads itself; `PUBLIC_UMAMI_SRC` defaults to Umami Cloud and can point at a self-hosted instance instead. Umami sets no cookies, so it loads directly and is not gated by the cookie-consent flow.
- **`/llms.txt`** — a short, plain-Markdown map of the site for language models, following the [llmstxt.org](https://llmstxt.org) proposal. Generated at build time from `site.config.ts` and the content collections, so it describes the site you built and never drifts from the real pages. `robots.txt` points at it.
- **`AGENTS.md`** — documentation of this codebase for an AI agent helping someone build a site on the theme: where settings, content and interface text live, that page copy sits in the locale files rather than the page files, the conventions worth keeping, and the mistakes that are easy to make.
- **`SECURITY.md`** — supported versions and a private route for reporting vulnerabilities, through GitHub Security Advisories or email rather than a public issue.
- **A Security section in the README** — the theme's static-by-design attack surface, how the contact and newsletter endpoints handle input, and why `pnpm audit` reports advisories that live only in the deploy adapters' build tooling and never reach the deployed site.
- **"Work with me" homepage section** — a new four-card section (custom design, a lightning-fast website, found by Google and AI, zero maintenance) between the services cards and the portfolio, closing with a "Read my services page" button. Driven by new `pages.home.workWithMe` keys in `en.json`/`nl.json`. The homepage zebra rebalances around it: the sections below flip shade and the landing footer returns to the default background.
- **Questions & answers on the services page** — a two-card FAQ accordion with ten buying questions (pricing, timelines, ownership, maintenance) between the process and the closing CTA, in the same pattern as the About page FAQ. New `pages.services.faq` keys in both locale files, and the services footer flips to `secondary` to keep the page's alternation intact.
- **Two guides on the theme blog** — one on the Umami integration, and one on updating the theme without losing your content (the git-based upstream-remote workflow, which folders hold your own content, and how to read a merge conflict).

### Fixed

- **Single project images are no longer cropped** — a project hero with one image renders at its natural aspect ratio instead of being cut to a fixed 16:9 frame, so nothing important, such as the browser header of a screenshot, is sliced off. Video slides and multi-image galleries keep the uniform 16:9 frame for consistent swiping.
- **About-teaser tiles invisible in light mode on secondary sections** — the light-mode surface swap (tertiary tiles turn page-white inside secondary sections) also fired for tiles nested inside an elevated card, leaving white tiles on the card's white surface. A scoped exception keeps the tertiary tint one nesting level deeper, verified across all 13 colour themes in both modes.
- **The services Design section animated off-screen** — it carried `data-reveal-eager`, which reveals shortly after load regardless of scroll position. On mobile the tall hero pushes the section below the fold, so the animation played unseen and the section looked dead once reached. It now reveals on entering the viewport, like the sections below it, and its two blocks stagger left-to-right to match them.
- **Services hero bottom spacing** — the hero ends with three jump buttons, which carry no trailing margin, leaving it around 32px tighter than heroes that end with a description. It now lines up with the contact, blog, projects and about heroes at every width.

### Changed

- **The demo speaks as a complete freelance business** — the services page and the homepage services cards are rewritten with the full content of a real freelance Astro practice: three service deep-dives with concrete "what you get" lists, a four-step project process with fixed-price framing, and honest buying answers. All copy ships in English and Dutch. Sites pulling this update should take the view files and the locale dictionaries together, since the views read the new keys.

### Security

- **Contact form email escaping** — user-submitted name, email, and message are now HTML-escaped before they're placed in the notification email, preventing injected markup (links, tracking pixels, spoofed content) from rendering in the site owner's inbox.

## [2.1.0] — 2026-07-16

### Added

- **Community showcase in the README** — a new **Showcase** section listing real sites built and shipped with Astro Rocket, opening with [LinkPress](https://linkpress.app/) by Mithun A. Sridharan. Submissions come in through a new structured issue form (`.github/ISSUE_TEMPLATE/showcase_submission.yml` — live URL, project description, credit line, and opt-in checkboxes for screenshot/testimonial use). The showcase deliberately lives in the README only: no `/showcase` page ships in the theme, so user sites are completely unaffected.
- **About page → showcase button** — the "Built in the open" section gained an optional second button ("See what others built") next to "View on GitHub", pointing at the README's Showcase anchor on GitHub. Driven by a new `pages.about.openSource.showcaseButton` key in `en.json`/`nl.json`; the button only renders when the key exists, so removing the key hides it with no template edit.
- **Artalk comment provider** — the pluggable blog-comments system gained a third option alongside Giscus and Cusdis: [Artalk](https://artalk.js.org), a self-hosted comment system, wired with the same care as the existing providers and hardened in a follow-up pass. Existing sites are unaffected; the provider defaults stay unchanged.
- **Cloudflare as a first-class deploy target** — alongside Vercel (default) and Netlify, the theme now ships a Cloudflare deploy path via `@astrojs/cloudflare`.
- **Built-in i18n for the main pages** — the home, About, Services, and Contact pages moved their copy into the locale dictionaries, the remaining hardcoded chrome strings and blog/projects UI strings were localized, and blog/article dates now follow the active locale.
- **Brand-outline button variant** — a new `Button` variant with a brand border and brand text on a transparent fill, used for secondary actions across the demo. Text shades chosen to hold WCAG AA in both modes.
- **Section pill icons** — every section badge pill across the demo pages now carries a matching icon.
- **Theme-picker curation flag** — `src/lib/themes.ts` now single-sources the picker list for both the swatch row and the dropdown. A `showInSelector` flag per theme lets a site offer a subset of the pickers while all twelve palettes keep shipping (and keep working for visitors who saved one earlier).
- **Official design variants as archive branches** — two documented, frozen branches now accompany `main`: `archive/original-design` (the design before the #551 consistency system) and `archive/brand-consistency-design` (the full #551 brand look). Each carries a `DESIGN-ARCHIVE.md` explaining what it holds and how to build on it.
- **Configurable consent-banner aria-labels** — the cookie-consent banner's accessibility labels are now driven from config.

### Changed

- **Updated to Astro 7.1.0** — `astro` `7.0.0` → `7.1.0` (a purely additive minor release: opt-in `deferRender` for large collections, experimental chunked collection storage, finer-grained CSP directives, a `format()` option for `paginate`, plus the 7.0.1–7.0.9 patch fixes in between). Integrations updated alongside: `@astrojs/mdx` `7.0.0` → `7.0.3`, `@astrojs/react` `6.0.0` → `6.0.1`. No breaking changes; the full site builds clean and key pages were smoke-tested in a rendered build.
- **Deeper card elevation** — cards drop the brand ring for a cleaner `shadow-lg` resting state with a `shadow-xl` hover; blog hero images and project screenshots float on a new media shadow; the stack marquee cards and the LetterGlitch band received matching treatments (including a dark-mode brand glow for the band, where grey shadows can't register).
- **Primary buttons read brand** — the primary button uses a brand-600 fill in light mode (the four cooler hues — cyan, emerald, sky, teal — sit on brand-700/800 so white label text keeps WCAG AA), and the project hero's live-site button and the mobile menu CTA are solid brand in dark mode too.
- **Unified tag pills** — project-card, blog-card, and archive tags share one pill design.
- **Services page rebalance** — restructured sections with five points per service card and the per-section CTA buttons removed in favour of one closing CTA.
- **Sharper positioning and the true origin story** — the theme copy settles on "a lightning-fast Astro 7 starter theme to build anything on", Velocity is credited as the fork origin the theme evolved beyond, and the demo's own project page now tells the full story: the fork became a personal website first, the theme split off before that site was finished, and the two evolved side by side.
- **The #551 design-consistency round trip** — the brand-consistency system proposed in #551 (thank you @Dixin) shipped as the default, and after user feedback the default returned to the original look the same day the feedback arrived. The system lives on in full as the `archive/brand-consistency-design` variant. Kept in the default permanently: the hand cursor on every enabled control and the centered footer on project pages.
- **Footer refinements** — the designer credit merged into the copyright line, and the footer menu and legal links settled on muted grey with a foreground hover.

### Fixed

- **Build crash when the default locale is not `"en"`** — the build no longer assumes an English default locale.
- **Blog reading time** — computed from the real post body, counts CJK text correctly, and the label is localized.
- **Doubled site name in page titles** — page titles no longer repeat the site name; the About page keeps a descriptive title.
- **Light hairline on the LetterGlitch band** — the band showed a 1px line of the page background through its transparent border in light mode; it now paints its own background.

## [2.0.0] — 2026-06-22

### Changed

- **Upgraded to Astro 7.0** — bumped `astro` from `6.4.4` to `7.0.0`, the new major release. Astro 7 ships the **Rust compiler** as the default (and only) compiler — faster builds and stricter, spec-compliant HTML parsing — and moves the build pipeline to **Vite 8** (now bundling with the Rust-based Rolldown). This theme's templates are all valid HTML, so the stricter compiler needed no markup changes: the full site builds clean on both the Vercel (default) and Netlify (`DEPLOY_TARGET=netlify`) targets, `astro check` reports 0 errors, ESLint is clean, and all 78 Vitest unit tests pass. The rendered HTML was diffed page-by-page against the 6.4.4 output and is equivalent — the only differences are cosmetic (the Rust compiler emits HTML entities and scoped-style hashes differently, e.g. `&#39;`↔`'` and `&lt;`↔`&#x3C;` inside code blocks, which render identically).
- **Astro integrations updated for v7** — `@astrojs/mdx` `6.0.2` → `7.0.0`, `@astrojs/react` `5.0.7` → `6.0.0`, `@astrojs/vercel` `^10.0.8` → `^11.0.0`, and `@astrojs/netlify` `^7.0.12` → `^8.0.0` (each declares Astro 7 as its peer). `@astrojs/sitemap` (`^3.7.3`) and `@astrojs/check` (`0.9.9`) were already current. `eslint-plugin-astro` stays on `^1.3.0` — its v2 line requires ESLint 10, a separate upgrade out of scope here, and the `.astro` template syntax is unchanged, so linting is clean on v7.
- **Tailwind bumped to v4.3.1 for Vite 8** — `@tailwindcss/vite` and `tailwindcss` `^4.0.0` → `^4.3.1`, the first 4.x to list Vite 8 in its peer range, clearing the sole install-time peer warning. The newer Tailwind/Lightning CSS reorders a few CSS declarations and adds its standard license banner to the inlined stylesheet — both cosmetic.
- **`compressHTML` pinned to `true`** — Astro 7 changed the `compressHTML` default to `'jsx'`, which strips whitespace between inline elements the way React does (`<span>a</span> <em>b</em>` → `<span>a</span><em>b</em>`). Pinning it back to `true` in `astro.config.mjs` keeps this theme's v6 whitespace rendering unchanged.
- **Markdown stays on Shiki + `github-dark`** — Astro 7 makes the Rust-based **Sätteri** processor the default Markdown engine, replacing the bundled remark/rehype `unified()` pipeline that 1.5.0 kept. Sätteri honours the existing `markdown.shikiConfig` (`theme: 'github-dark'`, `wrap: true`), so every code block still renders with the same Shiki theme, the same `.astro-code github-dark` markup, and the same soft-wrapping — verified against the 6.4.4 build (identical token spans, identical smart-quote and em-dash output). No remark/rehype plugins were in use, so the faster default engine is kept and `@astrojs/markdown-remark` is not needed.

### Fixed

- **Post hero SVGs no longer render as `[object Module]`** — `BlogImageSVG.astro` inlined each post's hero illustration with `import.meta.glob('…/*.svg', { as: 'raw', eager: true })`. Vite 8 (new in Astro 7) **removed** the deprecated `as: 'raw'` glob option, so the import resolved to a module object instead of a string and `set:html` stringified it to the literal text `[object Module]` on every blog post, card, and tag page (185 occurrences). Switched to the Vite 8 replacement — `{ query: '?raw', import: 'default', eager: true }` — restoring the inlined SVG markup. Caught by diffing the v7 build against 6.4.4.
- **ESLint now ignores the Netlify adapter's build output** — `eslint.config.js` excluded the Vercel adapter's `.vercel/` directory but not Netlify's `.netlify/`, so running `pnpm lint`/`pnpm validate` after a local `DEPLOY_TARGET=netlify pnpm build` flagged hundreds of false positives in the generated SSR bundle. Added `.netlify/` alongside `.vercel/` in the ignore list. CI was unaffected (it builds the default Vercel target), but the local Netlify path — now on `@astrojs/netlify` v8 — lints clean.

## [1.8.0] — 2026-06-21

### Added

- **Blog comments are now pluggable — added a [Cusdis](https://cusdis.com) provider alongside Giscus** — `articleFeatures.comments` gained a `provider` switch (`'giscus' | 'cusdis'`) and a `cusdis` config block (`appId`, optional `host` for self-hosting, `theme`, `lang`). Cusdis is a lightweight, privacy-friendly, optionally self-hosted comment system; it's wired with the same care as the existing Giscus integration — server-rendered placeholder with reserved height (no CLS), **lazy-loaded** on scroll so readers who don't reach the comments pay zero network cost, and theme/locale that follow the site by default. The `Comments` component is now a thin dispatcher that renders one of `CommentsGiscus`/`CommentsCusdis`, so only the selected provider's client script ships, and `BaseLayout`'s `preconnect` points at the active provider's host. Existing sites are unaffected: `provider` defaults to `'giscus'`. Note: Cusdis has no live theme API (unlike Giscus's `postMessage`), so in adaptive mode a light/dark toggle re-renders the thread (a brief reload) — set `theme` to `'auto'`/`'light'`/`'dark'` to opt out. Requested in #423. (#423)
- **Header social icons are now toggleable from config** — the `<Header>` has always supported a `showSocialLinks` prop that renders an icon link (GitHub, X, LinkedIn, etc., inferred from the URL) for each entry in `siteConfig.socialLinks`, but it was off by default and only changeable by editing a layout. A new `siteConfig.header.showSocialLinks` option drives that default, so enabling the top-right GitHub/social icons is now a one-line config change rather than a layout edit. Defaults to `false`, so existing sites are visually unchanged; an explicit `<Header showSocialLinks>` prop still overrides per-usage. (#423)
- **Localized blog routing for non-default locales** — with i18n enabled, every secondary locale now gets its own fully-functional blog: the index (`/<locale>/blog`), individual posts (`/<locale>/blog/<slug>`), pagination (`/<locale>/blog/page/N`), and tag archives (`/<locale>/blog/tag/<tag>`) are all generated, and every in-locale link (post cards, tag chips, pagination, breadcrumbs, related posts) now resolves **within** that locale instead of falling back to the default-locale URL — fixing post links that previously rendered as `/blog/<locale>/<slug>` and 404'd. The `defaultLocale` keeps its prefix-free URLs, and the new `src/pages/[locale]/blog/*` routes emit nothing when i18n is off, so single-locale and default-locale output stays byte-for-byte unchanged. The index, pagination, and tag-archive bodies were extracted into shared views (`src/components/blog/views/`) so the default and locale-prefixed routes can't drift apart, and URL construction is centralised in new `lib/blog` helpers (`getBlogBaseUrl`, `getBlogPageUrl`, `getTagUrl`, `getSecondaryLocales`) with unit tests in `src/__tests__/blog-urls.test.ts` and `blog-urls-i18n.test.ts`. A locale with no posts yet still renders a `/<locale>/blog` index (empty state) so the `LanguageSwitcher` never lands on a 404. All build-time only — no client JS. Builds on the locale-centralisation from #419. (#422)
- **Localized project routing for non-default locales** — projects now have the same built-in locale support the blog got in #422: with i18n enabled, every secondary locale gets its own fully-functional projects section — the index (`/<locale>/projects`), individual projects (`/<locale>/projects/<slug>`), pagination (`/<locale>/projects/page/N`), and tag archives (`/<locale>/projects/tag/<tag>`) — and every in-locale link (project cards, tag chips, pagination, breadcrumbs, related projects, the `LanguageSwitcher`, and `hreflang`) resolves **within** that locale. The `projects` collection gained a `locale` field (validated against `i18n.config.ts` like every other collection) and content now lives under a per-locale folder (`src/content/projects/<locale>/`), mirroring `src/content/blog/<locale>/` — the bundled projects moved to `src/content/projects/en/`. The index, pagination, and tag-archive bodies were extracted into shared views (`src/components/projects/views/`) so the default and locale-prefixed routes can't drift apart, and URL construction is centralised in new `lib/projects` helpers (`getProjectUrl`, `getProjectsBaseUrl`, `getProjectsPageUrl`, `getProjectTagUrl`, `getSecondaryLocales`, `getProjectTranslations`) with unit tests in `src/__tests__/projects-urls-i18n.test.ts`. The build-time slug-collision guard now covers projects too. Projects share one slug across locales (same filename per locale folder), so translations are matched by slug rather than the blog's canonical `uid`. The new `src/pages/[locale]/projects/*` routes emit nothing when i18n is off, so single-locale and default-locale output stays byte-for-byte unchanged. All build-time only — no client JS. (#437)
- **Localized header & footer navigation, legal links, and logo** — with i18n enabled, the header nav, footer nav, legal links, and the logo now keep visitors **inside** their locale instead of always pointing at the default-locale URLs. Each link is still written once in `nav.config.ts`; the Header and Footer localize it for the active locale at render time — the `href` is locale-prefixed via `localizedPath` (`/blog` → `/<locale>/blog`, while external, `mailto:`/`tel:`, and `#anchor` hrefs are left untouched) and the `label` is translated when the item carries a `labelKey` into `src/i18n/<locale>.json` (resolved with `t()`). The bundled `navItems`/`footerNavItems` now ship `labelKey`s, with `nav.items.*` strings added to `en.json` and `nl.json`, and the logo links to the locale home (`/` or `/<locale>`). For the rare case of a structurally different label or path per locale (e.g. a localized slug), items accept an optional `locales` override map. The header's active-link highlighting now works on secondary locales too (it previously compared against unprefixed hrefs). This is the chrome-link counterpart to the localized blog (#422) and project (#437) routing — written the theme's way (existing `localizedPath`/`t()` helpers, dictionary-backed labels) rather than as duplicated per-locale config. With i18n off (the default), `localizedPath` is a no-op and `t()` returns the default-locale string, so output is byte-for-byte unchanged. Resolution is unit-tested in `src/__tests__/nav-i18n.test.ts`. Requested in #438. (#438)

### Fixed

- **Cross-locale links on blog posts now resolve to the real translation, with accurate `hreflang`** — the `LanguageSwitcher` and the SEO `hreflang`/`x-default` tags previously swapped the locale segment of the current URL, which 404'd whenever a translated post used a different slug (`/blog/hello` → `/nl/blog/hello` when the Dutch post is actually `/nl/blog/hallo`) and advertised `hreflang` alternates for locales that had no translation at all. Blog posts now resolve their true per-locale URLs at build time — matched by canonical `uid` when present (so a translation can live at a different slug), otherwise by an identical slug — via the new `getPostTranslations()` helper in `src/lib/post-links.ts` (unit-tested in `src/__tests__/post-translations.test.ts`). `hreflang` lists only locales that actually have the post; the `LanguageSwitcher` still shows every locale but sends those without a translation to that locale's blog index rather than a dead URL. `SEO`, `BaseLayout`, `Header`, and `LanguageSwitcher` gained optional alternates props; non-blog pages keep the path-swap behaviour (correct when slugs match) and single-locale output is unchanged. (#422)

### Changed

- **Post & project tags now sit directly below the abstract** — the tag chips previously rendered *above* the title on a blog post, and *below* the meta line on a project page; both detail heroes (`ArticleHero` and `ProjectHero`) now place the `TagList` immediately beneath the intro/abstract paragraph (above the meta row), so the single-post and single-project pages share one consistent layout. Purely presentational. (#423)
- **Global UI chrome now uses the i18n dictionary instead of hard-coded English** — the always-on, server-rendered chrome that appears on every page across locales now reads its strings from `src/i18n/<locale>.json` via `t()` rather than literal English: the skip-to-content link and back-to-top button (`BaseLayout`), the blog `Pagination` aria-labels, the "Related Posts" heading (`RelatedPosts`), the `ShareButtons` label and per-network share/copy aria-labels, and the Footer's "Follow us on …" social aria-label. New keys (`blog.relatedPosts`, `blog.share`, `blog.shareOn`, `blog.copyLink`, `pagination.label`, `footer.followOn`) were added to both `en.json` and `nl.json`, so default-locale output is byte-for-byte unchanged while translated locales now get localized chrome. This is the first pass of #414 (building on the locale-aware footer copyright from #413); the client-JS-driven strings (the contact/newsletter forms' submit + status text, search-modal results, theme mode/selector live states) and the unused-key audit are tracked as a follow-up. (#414)
- **Contact & newsletter forms are now localized** — `ContactForm` and `NewsletterForm` read their field labels, submit/placeholder text, and client-side status messages (sending/subscribing, success, and error states) from the i18n dictionary. Server-rendered strings use `t()` directly; the strings the submit handler needs are passed through `data-*` attributes (extending the form's existing `data-success-message` pattern) and read at runtime, so no dictionary ships to the browser. The `contact.*` / `newsletter.*` values were aligned to the forms' previous English text (and `genericError` keys added) in both `en.json` and `nl.json`, so default-locale output is unchanged. Second pass of #414; the search-modal results, theme mode/selector live states, the 404 copy, and the unused-key prune remain. (#414)
- **404 page is now localized** — the visible copy on the 404 page (the "404 — page not found" badge, the "Page not found." heading, the lead paragraph, the "Back to home" / "Browse the blog" buttons, the "Try one of these instead" heading, and the three recovery cards) now comes from the i18n dictionary via `t()`, with new `errors.*` keys added to `en.json` and `nl.json`. The page's `<title>`/meta `description` are deliberately left for a separate, site-wide meta-title pass. Default-locale output is byte-for-byte unchanged. This wraps the high-value surface of #414; the theme-mode/selector and search-modal **client-side** live strings and an unused-key prune are intentionally out of scope (low-traffic, JS-only, and — for a distributed theme — removing dictionary keys is mildly breaking). (#414)
- **Listing config consolidated into `siteConfig`, and the duplicated tag-cloud limit removed** — the per-page and tag-cloud counts that were hard-coded across `lib/` and the route files are now tunable in one place: `siteConfig.blog.postsPerPage` / `blog.tagCloudLimit` and `siteConfig.projects.perPage` / `projects.tagCloudLimit` (defaults 12 / 10, so existing sites render identically). `lib/blog.ts` and `lib/projects.ts` source their constants from config, and the blog tag-cloud limit — previously copy-pasted into four files (both tag routes plus `BlogIndexView` and `BlogPageView`) — is now a single exported `BLOG_TAG_CLOUD_LIMIT`; the projects tag route likewise stops re-inlining its own copy and uses `PROJECT_TAG_CLOUD_LIMIT`. The dead `TAG_POSTS_PER_PAGE` constant was removed. The existing `blogImageOverlay` / `articleFeatures` keys are intentionally left where they are (folding them under `blog` is a breaking rename better suited to a major), and client-only knobs like the search modal's result cap are deferred. A `vitest` alias stubs `astro:env/server` so the config-importing libs stay unit-testable. (#421)

## [1.7.0] — 2026-06-16

### Added

- **Video slides in project galleries** — a gallery slide can now be a self-hosted video (`video: "/videos/demo.mp4"` + required `poster` image + `alt`) alongside image slides, in both the frontmatter hero carousel (`ProjectCarousel.astro`) and the in-body `<ProjectGallery>` component (where videos also play inside the lightbox). Built to be Lighthouse-neutral: `preload="none"` means zero video bytes until the visitor presses play, the poster goes through the `astro:assets` pipeline like any other slide, there is no autoplay, and swiping away from a playing video pauses it. The slide union is validated in `src/content.config.ts`, the shared `GallerySlide` type lives in the new `src/lib/gallery.ts`, and YouTube/Vimeo embeds are deliberately out of scope. Documented in the README and in a new blog post (`src/content/blog/en/project-gallery-video-slides.mdx`). (#396)

- **Header search powered by Pagefind** — a search button in the header (next to the colour-mode pill, on by default, `showSearch={false}` to hide) opens a ⌘K / Ctrl+K command-palette modal (`src/components/layout/SearchModal.astro`). The static index is generated automatically at the end of every `astro build` by a new `pagefind()` hook in `astro.config.mjs`, which indexes the actual output directory on every deploy target (Vercel, Netlify, Cloudflare). The Pagefind bundle is lazy-loaded on first open, so initial page loads ship zero extra JavaScript; under `astro dev` (where no index exists) the modal explains how to build one instead of failing. Header and Footer now carry `data-pagefind-ignore` so navigation chrome stays out of results. The `pagefind` and `@pagefind/default-ui` packages were already dependencies — this wires the long-advertised feature up for real. (#395)
- **Project gallery documentation + living example** — the multi-image project features were undocumented: the README now covers both the `gallery: [{ src, alt }]` frontmatter array (hero carousel, added in 1.4.0) and the in-body `<ProjectGallery>` MDX component with its click-to-zoom lightbox. `src/content/projects/ecommerce-store.mdx` demonstrates both in one file, with three placeholder storefront wireframes in `src/assets/projects/`. (#396)

### Changed

- **Removed `@pagefind/default-ui` dependency** — the search modal is a theme-native UI on the Pagefind JS API, so the prebuilt widget package is no longer needed.

### Fixed

- **Blog now follows the configured locale instead of a hard-coded `en`** — the blog index, pagination, individual posts, tag archives, RSS feed, dynamic OG images, and the homepage "from the blog" section now read `defaultLocale` from `src/config/i18n.config.ts` rather than the literal `'en'`, and slug generation strips each post's own locale folder. Setting `defaultLocale` to a non-English locale (and moving content into the matching folder) now renders that locale's blog at the site root instead of 404ing. The locale/slug logic is centralised in `src/lib/blog.ts` so the routes can't drift apart again. All resolution is build-time only — no client JS and no change to the shipped payload for the default (English) site. (#419)
- **Adding a locale no longer breaks the build** — the `locale` field on the blog, pages, and faqs collections is now validated against the `locales` list in `src/config/i18n.config.ts` instead of a hard-coded `z.enum(['en', 'es', 'fr'])`, so any locale you register in the i18n config is accepted by the content schema automatically. (#418)

---

## [1.6.0] — 2026-06-07

### Added

- **Durable internal links via `<PostLink>` (canonical ids)** — blog posts can declare an optional, stable `uid` in frontmatter (lowercase kebab-case, format-validated in `src/content.config.ts`) and reference one another by that id with the new `<PostLink>` component (`src/components/blog/PostLink.astro`), available globally in blog MDX — e.g. `<PostLink uid="configuration-guide">…</PostLink>` (a `post:` prefix is also accepted). The id resolves to the correct locale-aware URL at build time and **a broken reference fails the build** instead of shipping a silent 404, so renaming a post (and its slug) never breaks inbound links. Index/resolution helpers and an `assertValidPostUids()` guard — which also rejects duplicate canonical ids within a locale — live in `src/lib/post-links.ts`, with unit tests in `src/__tests__/post-links.test.ts`. When no link text is given, the target post's title is used. All resolution is build-time only — no client JS and no change to the shipped payload. (#377, point #5)
- **Build-time duplicate-slug validation** — `astro build` now fails with an actionable error if any two pieces of content resolve to the same URL within a locale (checked across blog posts and pages), catching a silent content bug where one entry quietly shadows another. The pure, unit-tested helpers (`findSlugCollisions`, `formatSlugCollisions`) and the `assertNoSlugCollisions()` build guard live in `src/lib/content-validation.ts` (tests in `src/__tests__/content-validation.test.ts`), wired into the blog route's `getStaticPaths`. (#377, point #4)

---

## [1.5.0] — 2026-06-06

### Changed

- **Upgraded to Astro 6.4.4** — bumped `astro` from `6.0.0` to the latest `6.4.4`, picking up the new pluggable Markdown pipeline, resilient island hydration, finer-grained image-optimization controls, and the bug fixes and security/performance work shipped across the 6.1–6.4 minor releases. These minor releases contain no breaking changes, so the upgrade is drop-in for this theme and required no code changes.
- **Astro integrations updated to latest** — `@astrojs/mdx` `5.0.0` → `6.0.2`, `@astrojs/react` `5.0.0` → `5.0.7`, `@astrojs/sitemap` `^3.7.1` → `^3.7.3`, `@astrojs/vercel` `^10.0.0` → `^10.0.8`, `@astrojs/netlify` `^7.0.2` → `^7.0.12`, and `@astrojs/check` `0.9.7` → `0.9.9`. Both the Vercel (default) and Netlify (`DEPLOY_TARGET=netlify`) build paths were verified.
- **`@astrojs/mdx` v6 note** — v6 adds an *optional* Rust-based Markdown processor (`@astrojs/markdown-satteri`) and deprecates the top-level `markdown.remarkPlugins` / `markdown.rehypePlugins` config. This theme uses neither, so the optional Rust engine is not installed, the default `unified()` processor stays in use, and rendered output is unchanged.

---

## [1.4.1] — 2026-05-20

### Fixed

- **i18n: `<html lang>` and related-posts locale no longer hardcoded to `en`** — `src/layouts/BaseLayout.astro` and `src/layouts/BlogLayout.astro` now resolve the active locale from the URL via `getLocaleFromPath(Astro.url.pathname)`, so sites with i18n enabled emit the correct `lang` attribute and pull related posts from the matching content folder. Thanks @vespeng for the report (#323).

### Added

- **i18n README note** — clarified that `defaultLocale` is a routing label and that the content folder name under `src/content/blog/` must match for the root URL to serve a different default language.
- **i18n blog post update** — added a matching caveat to the 1.3.0 i18n launch post (`src/content/blog/en/i18n-in-astro-rocket.mdx`) so the `defaultLocale` vs content-folder distinction is documented in two places.
- **i18n tests** — added unit-test coverage for `getLocaleFromPath`, `stripLocaleFromPath`, and `swapLocaleInPath` to prevent regressions on locale resolution.

---

## [1.4.0] — 2026-05-19

### Added

- **Services page** — new top-level `/services` route (`src/pages/services.astro`) with three anchored sections (`#design`, `#development`, `#performance`), brand-coloured hero badges, bullet lists, and scroll-reveal animations. Added to both the header `navItems` and `footerNavItems` in `src/config/nav.config.ts` (now ordered Services → Projects → Blog → About → Contact). The mobile dropdown uses the `sparkles` icon. Homepage service cards link to the matching anchors on the Services page.
- **Project gallery + carousel** — `ProjectCarousel.astro` swipeable image carousel that replaces the single `image` in `ProjectHero` when a `gallery: [{ src, alt }]` array is present in project frontmatter. Schema added in `src/content.config.ts`.
- **Project `meta` tagline** — optional `meta: string[]` array in project frontmatter renders as a single line under the hero description with brand-coloured dot separators.
- **Project `placeholder` flag** — `placeholder: true` in frontmatter renders a branded SVG placeholder in the project hero instead of an image, for image-less starter project cards.
- **Per-project TOC override** — `toc: false` in project frontmatter, mirroring the existing blog post override.
- **Blog FAQ schema** — optional `faqs: [{ question, answer }]` array in blog frontmatter emits an additional FAQ JSON-LD block alongside the existing `BlogPosting` schema.
- **Blog pagination, tag archives, and dynamic OG images** — new routes `blog/page/[page].astro` and `blog/tag/[tag].astro`, plus dynamic OG image endpoints `og/blog/[slug].svg.ts`, `og/blog/tag/[tag].svg.ts`, and `og/projects/[slug].svg.ts`. New `Pagination.astro`, `TagList.astro`, and `ShareButtons.astro` components, with shared helpers in `src/lib/blog.ts` and `src/lib/og.ts`.
- **`Callout.astro` pattern** — new pattern component for pull-quotes and inline callouts; the existing pull-quote icon now lives inside the Callout card.
- **Global arrow-slide hover pattern** — `arrow-right` / `arrow-left` icons now slide on hover everywhere via a standardised CSS pattern in `src/styles/global.css`.
- **New project + blog content** — `src/content/projects/hans-martens.mdx`, expanded `astro-rocket.mdx` with a multi-image gallery, and a new post `src/content/blog/en/i18n-in-astro-rocket.mdx`.

### Changed

- **Header rework** (`src/components/layout/Header.astro`) — desktop breakpoint raised from `md` to `lg` to prevent tablet squeeze; theme-mode (light/dark) toggle promoted from the mobile menu to the header itself at every breakpoint; brand-coloured chrome neutralised in light mode so the header reads as neutral while keeping brand accents on hover/active states.
- **Project hero redesign** (`ProjectHero.astro`, `ProjectLayout.astro`) — synced from the live `hansmartens.dev` site: cleaner meta line, brand placeholder fallback, back-nav button, optional FAQ schema, and dropped brand glow.
- **Project cards aligned with homepage selected-work layout** — image-less grid restored as the default, `arrow-up-right` icon now shows on every card (not just hover-active), and related-project cards on `projects/[slug]` are equalised in height with three cards instead of two.
- **Blog index + post pages synced from `hansmartens.dev`** — refreshed `ArticleHero`, `BlogCard`, `BlogImageSVG`, `TableOfContents`, and the new "Follow along" section now matches between the blog index and individual posts.
- **Layout max-width** — single project pages, blog post pages, and the projects index now share the same `max-w-7xl` section width as the rest of the site.
- **Contact copy** — homepage CTA + contact hero clarified to scope work to new builds only; contact form heading "Send a message" → "Project details".
- **Homepage projects section** — replaced placeholder projects with Astro Rocket + Hans Martens Dev; redesigned section to mirror the projects-index layout 1:1.
- **`global.css` + all 12 theme tokens** (`amber`, `blue`, `cyan`, `emerald`, `green`, `indigo`, `lime`, `magenta`, `orange`, `purple`, `sky`, `teal`, `violet`) received small token tweaks for header neutrality and the new arrow-slide pattern.
- **404 page rewritten** with the same hero pattern as the rest of the marketing pages.

### Fixed

- **Reveal-animation overshoot** on contact-page slide-ins and other horizontal slide reveals — animations no longer overshoot their resting position.
- **Services-card 3-column grid** — moved the responsive snap point from `md` to `lg` so the three service cards no longer squeeze on tablet widths. `components.astro` showcase grids reverted to their original breakpoints.
- **Services "Web Development" card reveal direction** corrected to slide in from the matching side as its siblings.
- **LCP on the homepage hero** — `scrollHeight` reads deferred off the LCP critical path in `BaseLayout`; H1 opacity animation kept after a brief revert experiment.
- **Long tag titles** wrap correctly on narrow mobile screens on the `blog/tag/[tag]` page.
- **Mobile project-card images** — tightened the `sizes` hint to avoid downloading desktop-resolution images on phones.

### Removed

- **Brand glow** removed from project hero, project carousel, and blog article hero (a dark-mode hero halo was added then reverted).
- **Lighthouse score section** removed from the README in favour of pointing at the live demo.

### Upgrade notes

- **Navigation order changed** — `Services` was inserted as the first item in both `navItems` and `footerNavItems`, pushing Blog from order 1 to order 3. If you've customised `src/config/nav.config.ts`, re-apply your overrides on top of the new defaults rather than copying the file verbatim.
- **Project frontmatter additions are all optional** — existing `.mdx` projects continue to work unchanged. To opt into the new features, add `gallery: [...]`, `meta: [...]`, `placeholder: true`, or `toc: false` as needed (see `src/content/projects/astro-rocket.mdx` for examples).
- **Blog `faqs` frontmatter is optional** — set `faqs: [{ question, answer }]` to emit FAQ JSON-LD; existing posts emit only `BlogPosting` as before.
- **Header desktop breakpoint raised to `lg`** — if you've customised `Header.astro` or `header.variants.ts` against the previous `md` breakpoint, expect the desktop layout to engage one breakpoint later than before.

---

## [1.3.0] — 2026-05-11

### Added

- **Native opt-in i18n** — internationalization is now built into the theme itself, no upstream CLI required. Locale-prefixed routes, a `LanguageSwitcher` dropdown in the header and mobile menu, `hreflang` alternates emitted from the SEO component, and a `t()` translation helper backed by JSON dictionaries (`src/i18n/<locale>.json`). English and Dutch ship out of the box; add more locales by editing `src/config/i18n.config.ts` and creating `src/i18n/<code>.json`. Resolves [#207](https://github.com/hansmartensdev/Astro-Rocket/issues/207).
- **`src/i18n/` module** with `t()`, `localizedPath()`, `swapLocaleInPath()`, `stripLocaleFromPath()`, `getLocaleFromPath()`, `isEnabled()`, and locale helpers. `t()` supports `{name}` placeholder interpolation and falls back to the default locale, then to the key itself, so partial translations are visible but non-fatal.
- **`src/config/i18n.config.ts`** — new config file with master switch (`enabled`), `defaultLocale`, `locales[]`, `localeNames`, and `detectBrowserLocale`. Lives separately from `site.config.ts` so the i18n module can be unit-tested without pulling in `astro:env/server`.
- **`LanguageSwitcher.astro`** — accessible pill dropdown with a globe icon, BCP 47 locale code, and full locale names. Pure HTML `<a hreflang lang>` links built via `swapLocaleInPath()` — no framework hydration, ~1 KB of inline JS for open/close. Renders nothing when i18n is disabled.
- 10 new unit tests covering `t()` lookup, fallback, interpolation, locale validation, and `localizedPath()`.

### Changed

- `Header` now shows `LanguageSwitcher` by default when i18n is enabled (the existing `showLanguageSwitcher` prop now defaults to `i18nIsEnabled()` instead of `undefined`, so it auto-shows on multi-locale sites).
- `MarketingLayout` drops the hardcoded `showLanguageSwitcher={false}` override so it inherits the new smart default.
- `astro.config.mjs` conditionally enables Astro's native `i18n` option only when the flag is on and at least two locales are configured. Default routing matches existing behavior (`prefixDefaultLocale: false`).
- README's i18n section rewritten: the Velocity CLI is no longer the recommended path. The warning that it overwrites existing directories remains, as a footnote for anyone who still wants to try it.

### Performance

Verified zero output-size delta with i18n disabled (the default):

|                | i18n off (1.3.0)  | i18n off (1.2.1)  |
|----------------|-------------------|-------------------|
| `dist/` size   | 12 M              | 12 M              |
| Files          | 80                | 80                |
| `hreflang`     | 0                 | 0 (didn't exist)  |
| LanguageSwitcher | 0 instances     | n/a               |

The new code paths are gated on `i18nIsEnabled()`, which returns `false` whenever the flag is off OR `locales.length === 1`. When that returns false, the LanguageSwitcher wrapping `<div>` is skipped, the `hreflang` block compiles to an empty fragment, and `astro.config.mjs` omits the `i18n` option entirely.

---

## [1.2.1] — 2026-05-10

### Fixed

Six rounds of mobile Lighthouse forced-reflow fixes. The 1.2.0 release introduced the table-of-contents sidebar layout, but mobile performance dropped from 100 to 90-95 due to several layout-read sources surfacing under throttled mobile CPU. Each of the following sources was identified by Lighthouse Insights and addressed:

- **TOC scroll-spy** — replaced `entry.target.getBoundingClientRect()` inside the `IntersectionObserver` callback with the cached `entry.boundingClientRect`, which the entry already exposes. Eliminated ~200ms of forced reflow on blog post pages. (#258)
- **Hero H1 font-swap CLS** — added explicit `@font-face` declarations after the `@fontsource-variable` imports overriding `font-display` to `optional`. With the existing `<link rel="preload">` in `BaseLayout` the font usually arrives in the 100ms block window; otherwise the fallback stays for the page lifetime, eliminating the swap-induced shift. Reduced CLS from 0.197 → near zero on the homepage H1. (#258)
- **Back-to-top progress ring** — cached `docMaxScrollY` instead of reading `document.documentElement.scrollHeight` on every scroll frame. (#258, #259)
- **LetterGlitch CTA** — cached canvas width/height in a ref instead of calling `getBoundingClientRect()` on every animation frame. Removed ~215ms of per-frame reflow. (#260)
- **`docMaxScrollY` cache strategy** — initial round wrapped the `ResizeObserver`-driven read in `requestAnimationFrame` (#261), then dropped the `ResizeObserver` entirely (#262) once it became clear that other scripts queue layout writes between the observer firing and rAF execution. resize + load events are sufficient.
- **Initial `scrollHeight` read at script init** — deferred to `DOMContentLoaded` instead of running during HTML parsing, when the document hasn't been fully laid out and the read forces a synchronous layout for the partial DOM. (#263)

After all six fixes the mobile Lighthouse score returns to **100** (with normal 92-100 run-to-run variance from CPU throttling); desktop stays at a steady **100/100/100/100**.

---

## [1.2.0] — 2026-05-09

### Added

- **Table of contents layout option** — `articleFeatures.toc.layout` accepts `'inline'` (current default — card at top of article), `'sidebar'` (sticky sidebar to the right on `xl+` viewports, hidden below), or `'auto'` (sidebar on `xl+`, inline card below `xl`). The article column stays at `max-w-4xl` in every layout, so reading width never changes when the sidebar appears or disappears. Per-post `toc: false` override and `IntersectionObserver` scroll-spy work identically across all three layouts. Default stays `'inline'` so existing sites are unchanged on upgrade. See [Table of Contents — Reading Anchors for Long Posts](src/content/blog/en/table-of-contents.mdx) for setup. The Astro Rocket demo site uses `'auto'`.
- Conditional `<link rel="preconnect" href="https://giscus.app">` in `BaseLayout` when `articleFeatures.comments.enabled` is `true` — warms the DNS+TLS handshake before the lazy-loaded Giscus iframe fires.

### Changed

- **Brand accent shifted from `brand-700` to `brand-600` in light mode** for the blog SVG hero background and the mobile hamburger / close icon — completes the 1.1.0 brand-color refresh that previously covered header + footer site name, hero H1, and primary button. Dark mode unchanged.
- Header scroll behaviour and scroll-progress bar are now driven by a single `requestAnimationFrame` callback. All layout reads (`window.scrollY`, etc.) happen before any DOM writes, and `docMaxScrollY` is cached via `ResizeObserver` so the scroll path never reads `scrollHeight` after attribute writes.

### Fixed

- **Forced reflow (~537 ms)** in `Header.astro` flagged by Lighthouse Insights. Two scroll scripts (header scroll-watcher + scroll-progress bar) were running on the same frame: the first wrote attributes, the second then read `scrollHeight` and forced a synchronous layout recompute. Merging the scripts and caching `docMaxScrollY` eliminates the reflow. After the fix the live demo scores 100/100/100/100 on both mobile and desktop.
- **TOC scroll-spy + duplicate `id` in `'auto'` layout** — when both the inline and sidebar TOC are mounted (one hidden via CSS per breakpoint), the scroll-spy script previously bound to the first instance only, leaving the visible TOC without active-section highlighting on desktop. The script now iterates all `[data-toc]` instances and each instance gets a unique `aria-labelledby` heading id.

### Removed

- **Dead `morphToBar` code path.** The prop on `<Header>` and `<LandingLayout>` defaulted to `false` everywhere and was never set to `true`; the entire `initNavMorph` script (~30 lines) ran on every page load only to bail on a failing `querySelector`. Removed the prop from both components, the `data-morph-to-bar` attribute, the `initNavMorph` script + `astro:transitions/client` import, and two associated CSS rules. After removal the Header script bundle is small enough that Astro inlines it directly into the HTML, eliminating the 1.3 s critical-path fetch Lighthouse previously flagged for `Header.astro_ast_…js`.

### Upgrade notes

`articleFeatures.toc.layout` is an additive setting — existing sites pick up the default (`'inline'`) and render exactly as before. To try the new sidebar mode, set `layout: 'sidebar'` (desktop only) or `layout: 'auto'` (sidebar on `xl+`, inline card on phones/tablets) in `site.config.ts`. The brand-color tweaks are visible in light mode on blog index / post pages and the mobile menu — review the diff if you've customized either area.

---

## [1.1.0] — 2026-05-09

### Added

- **Table of contents** on blog posts — auto-generated from MDX headings, with scroll-spy that highlights the active section. Off by default; enable via `articleFeatures.toc.enabled` in `site.config.ts`. Per-post override with `toc: false` in frontmatter. See [Table of Contents — Reading Anchors for Long Posts](src/content/blog/en/table-of-contents.mdx)
- **Comments on blog posts** powered by [Giscus](https://giscus.app) and GitHub Discussions. Off by default; enable via `articleFeatures.comments.enabled` plus four IDs from giscus.app. Lazy-loaded with an IntersectionObserver — readers who don't scroll to the comments pay zero network cost. Per-post override with `comments: false` in frontmatter. See [Comments on Blog Posts — Giscus, Lazy-Loaded](src/content/blog/en/giscus-comments.mdx)
- **Independent footer menu** — `nav.config.ts` now exports `footerNavItems` and `legalLinks` separately from the header `navItems`, so the footer can show different links (Privacy, Imprint, etc.) without touching the main nav. Defaults mirror the existing nav, so existing sites are unchanged. See [Independent Footer Menu — Different Links in Header and Footer](src/content/blog/en/independent-footer-menu.mdx)
- "View all projects" outline button below the project cards on the homepage
- Arrow-right icon on the "More about me" button (homepage about section)

### Changed

- **Brand accent shifted from `brand-700` to `brand-600` in light mode** across header site name, footer site name, hero H1, and the primary button. Header and footer logo backgrounds now use `bg-brand-600` in both light and dark mode. Primary button hover shifted from `brand-800` to `brand-700` to keep the one-step-darker progression.
- Floating header (homepage) nav links now render at full opacity instead of `opacity-80` with a hover bump.
- Homepage Blog section header is now centered (matching Services, Testimonials, etc.); the inline desktop "View all posts" link was removed and replaced with a single always-visible "View all posts" outline button below the blog cards.
- "Read the full story" button on the About page is now an outline button.

### Removed

- "My Stack" section on the homepage. The `TechStack` component itself is still available for users who want to drop it into their own pages. The four sections that followed (Lighthouse, About Teaser, Blog, CTA) had their backgrounds flipped so the alternating zebra pattern continues unbroken.

### Upgrade notes

The brand-color refresh and homepage layout changes are visible after upgrading. If you've customized either, review the diff before merging — the new opt-in features (TOC, comments, footer config) are all off by default and won't change anything until you flip the switch in `site.config.ts`.

---

## [1.0.0] — 2026-04-04

Initial public release of Astro Rocket.

### Added

- Production-ready Astro 6 starter theme built on Tailwind CSS v4 and TypeScript
- 57 UI and pattern components (buttons, forms, cards, badges, inputs, selects, etc.)
- 12 live colour themes (Orange, Amber, Lime, Emerald, Teal, Cyan, Sky, Blue, Indigo, Violet, Purple, Magenta) switchable at runtime without a rebuild
- Full blog with MDX support, syntax highlighting (Shiki), and RSS feed
- Auto-generated SVG favicon and monogram logo badge from `site.config.ts`
- Unified `Icon` component via Iconify (350+ Lucide icons + 3000+ Simple Icons)
- Animated typing effect in hero section
- Contact form with Zod validation, honeypot bot detection, and Resend integration
- Newsletter signup form with Resend Audiences integration
- Cookie consent banner with Google Consent Mode v2 support
- Google Analytics 4 and Google Tag Manager integration (consent-aware)
- Built-in SEO layer: JSON-LD structured data, Open Graph, sitemap, robots.txt
- Dark mode via `sessionStorage` (resets to dark on each new session)
- Search powered by Pagefind
- Multiple deployment targets: Vercel, Netlify, Cloudflare Pages
- Security headers configured for all deployment targets
- GitHub Actions CI/CD workflow (lint, type-check, build)
- Vitest unit tests for API endpoint validation schemas

### Changed (from Velocity)

- Forked and extended [Velocity](https://github.com/southwellmedia/velocity) by Southwell Media
- Added theme switching, 12 colour themes, typed logo badge, auto favicon
- Replaced localStorage with sessionStorage for dark mode preference
- Added blog image gradients that update with the active theme
- Upgraded icon system to Iconify
- Targeted at complete, ready-to-launch sites rather than a bare boilerplate
