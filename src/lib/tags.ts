/**
 * Tag-slug conventions shared across content types (blog, projects).
 *
 * Kept here — rather than inside `lib/blog` — so blog and project tag
 * archives derive identical, collision-free slugs from the same rules.
 */

/**
 * Convert a human-readable tag (e.g. "Web Performance") to a URL slug
 * (e.g. "web-performance"). Two-way deterministic — pair with `findTagBySlug`.
 *
 * Letters of every script are kept ("中文" stays "中文", "Привет" becomes
 * "привет"); accents on Latin letters are dropped ("Café" → "cafe"), and
 * anything that is not a letter, mark or digit becomes a hyphen. Keeping only
 * a-z and 0-9 turned a tag in Chinese, Russian or Greek into an empty slug,
 * which stopped the build at the tag pages.
 */
export function tagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/** Find the original tag string given its slug, from a list of known tags. */
export function findTagBySlug(slug: string, allTags: string[]): string | undefined {
  return allTags.find((tag) => tagToSlug(tag) === slug);
}
