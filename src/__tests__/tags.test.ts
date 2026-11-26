import { describe, expect, it } from 'vitest';
import { findTagBySlug, tagToSlug } from '@/lib/tags';

describe('tagToSlug', () => {
  it('lower-cases Latin tags and joins words with a hyphen', () => {
    expect(tagToSlug('Web Performance')).toBe('web-performance');
    expect(tagToSlug('astro-rocket')).toBe('astro-rocket');
    expect(tagToSlug('Astro 7.0')).toBe('astro-7-0');
  });

  it('drops accents on Latin letters', () => {
    expect(tagToSlug('Café')).toBe('cafe');
    expect(tagToSlug('Ångström')).toBe('angstrom');
  });

  it('keeps letters of other scripts', () => {
    expect(tagToSlug('中文')).toBe('中文');
    expect(tagToSlug('Astro 中文')).toBe('astro-中文');
    expect(tagToSlug('日本語')).toBe('日本語');
    expect(tagToSlug('한국어')).toBe('한국어');
    expect(tagToSlug('Привет мир')).toBe('привет-мир');
    expect(tagToSlug('Ελληνικά')).toBe('ελληνικα');
  });

  it('never gives a tag made of letters an empty slug', () => {
    for (const tag of ['中文', 'Русский', 'العربية', 'हिन्दी', 'ไทย']) {
      expect(tagToSlug(tag)).not.toBe('');
    }
  });

  it('finds the tag again from its slug', () => {
    const tags = ['Web Performance', '中文', 'Astro 中文'];
    for (const tag of tags) expect(findTagBySlug(tagToSlug(tag), tags)).toBe(tag);
  });
});
