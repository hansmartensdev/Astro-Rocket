import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/**
 * The server secrets have to be read through `astro:env/server`, never through
 * `import.meta.env`.
 *
 * Both reach the same value, and the difference does not show up in testing.
 * `import.meta.env.RESEND_API_KEY` is replaced by the key's text when the
 * bundle is built, so the secret ends up written into the built server chunks —
 * and changing it on the host does nothing until the site is rebuilt, which
 * looks exactly like a successful rotation and is not one. An import from
 * `astro:env/server` is a lookup at request time.
 *
 * That is what the two API routes used to do, and `src/lib/email.ts` beside
 * them did it the other way, so the correct pattern was already in the tree
 * while the routes went around it. `import.meta.env` is the obvious thing to
 * reach for, which is why this reads the source rather than trusting that
 * nobody will.
 *
 * `import.meta.env.DEV` and `PROD` are Vite's own build-time flags and are
 * meant to be inlined; only the secrets in the env schema are checked here.
 */
const SECRETS = ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'RESEND_AUDIENCE_ID'];

const SRC = fileURLToPath(new URL('../', import.meta.url));

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return entry === '__tests__' ? [] : sourceFiles(full);
    return /\.(ts|tsx|astro|mjs)$/.test(entry) ? [full] : [];
  });

describe('how the server secrets are read', () => {
  const files = sourceFiles(SRC);

  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(SECRETS)('reads %s through astro:env/server, not import.meta.env', (secret) => {
    const offenders = files
      .filter((file) => readFileSync(file, 'utf8').includes(`import.meta.env.${secret}`))
      .map((file) => file.slice(SRC.length));

    expect(
      offenders,
      `${secret} is read through import.meta.env in: ${offenders.join(', ')}. ` +
        `Import it from 'astro:env/server' instead, so it is not written into the build.`
    ).toEqual([]);
  });

  it('imports each secret from astro:env/server somewhere', () => {
    const imports = files
      .map((file) => readFileSync(file, 'utf8'))
      .filter((text) => text.includes("from 'astro:env/server'"))
      .join('\n');

    // Guards the test itself: if the secrets were renamed or dropped, the
    // checks above would pass against source that no longer reads them at all.
    for (const secret of SECRETS) {
      expect(imports, `no file imports ${secret} from astro:env/server`).toContain(secret);
    }
  });
});
