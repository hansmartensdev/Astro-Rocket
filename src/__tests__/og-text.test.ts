import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { layoutTitle, truncate } from '@/lib/og/svg';
import { projectFontFiles, registerProjectFonts } from '@/lib/og/fonts';

/** Width of a line in average Latin letters, the unit the card is laid out in. */
const width = (line: string) =>
  [...line].reduce(
    (w, ch) => w + (/[\u3000-\u9fff\uac00-\ud7a3\uff00-\uff60]/.test(ch) ? 2 : 1),
    0
  );

describe('layoutTitle', () => {
  // The expected lines are what the layout gave before it knew about wide
  // characters: Latin titles are laid out exactly as they were.
  it('wraps a Latin title at spaces, as before', () => {
    expect(layoutTitle('Getting Started: From Install to Live')).toEqual({
      lines: ['Getting Started: From', 'Install to Live'],
      fontSize: 76,
    });
    expect(
      layoutTitle('The Astro Rocket Configuration Guide: Every Setting in site.config.ts Explained')
    ).toEqual({
      lines: [
        'The Astro Rocket Configuration',
        'Guide: Every Setting in',
        'site.config.ts Explained',
      ],
      fontSize: 64,
    });
  });

  it('wraps a Chinese title between characters, inside the card', () => {
    const title = '使用 Astro Rocket 构建一个快速而美观的个人网站的完整指南';
    const { lines, fontSize } = layoutTitle(title);
    expect(lines.length).toBeGreaterThan(1);
    const maxUnits = Math.floor(1040 / (fontSize * 0.5));
    for (const line of lines) expect(width(line)).toBeLessThanOrEqual(maxUnits);
    // Nothing is lost or doubled: the lines put together are the title.
    expect(lines.join('').replace(/\s/g, '')).toBe(title.replace(/\s/g, ''));
  });

  it("doesn't start a line with closing punctuation", () => {
    // Thirteen characters fill a line at the largest size, so the comma
    // falls exactly where the line would break.
    const { lines } = layoutTitle('我们一起来学习怎样建立网站，然后发布到网上');
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines.slice(1)) expect('，。、：；！？').not.toContain(line[0]);
  });
});

describe('truncate', () => {
  it('cuts Latin text at a word, as before', () => {
    expect(truncate('Install, configure and deploy Astro Rocket in an afternoon', 30)).toBe(
      'Install, configure and…'
    );
    expect(
      truncate(
        'How to install, configure, and deploy Astro Rocket — covering site.config.ts, brand colours, navigation, writing posts, and deploying to Vercel.',
        74
      )
    ).toBe('How to install, configure, and deploy Astro Rocket — covering…');
  });

  it('cuts Chinese text by width', () => {
    const cut = truncate(
      '从安装到上线：如何安装、配置和部署 Astro Rocket，包括站点配置、品牌颜色、导航和写文章。',
      40
    );
    expect(cut.endsWith('…')).toBe(true);
    expect(width(cut)).toBeLessThanOrEqual(40);
  });
});

describe('registerProjectFonts', () => {
  const saved = process.env.FONTCONFIG_FILE;
  afterEach(() => {
    if (saved === undefined) delete process.env.FONTCONFIG_FILE;
    else process.env.FONTCONFIG_FILE = saved;
  });

  it('does nothing without src/fonts', () => {
    const root = mkdtempSync(join(tmpdir(), 'rocket-fonts-'));
    expect(registerProjectFonts(root)).toEqual([]);
    expect(process.env.FONTCONFIG_FILE).toBe(saved);
  });

  it('adds src/fonts to a configuration that keeps the machine’s own', () => {
    const root = mkdtempSync(join(tmpdir(), 'rocket-fonts-'));
    mkdirSync(join(root, 'src/fonts'), { recursive: true });
    writeFileSync(join(root, 'src/fonts/NotoSansSC-Regular.ttf'), '');
    writeFileSync(join(root, 'src/fonts/readme.txt'), '');
    const base = join(root, 'base.conf');
    writeFileSync(base, '<fontconfig/>');
    process.env.FONTCONFIG_FILE = base;

    expect(projectFontFiles(root)).toEqual(['NotoSansSC-Regular.ttf']);
    expect(registerProjectFonts(root)).toEqual(['NotoSansSC-Regular.ttf']);
    const written = process.env.FONTCONFIG_FILE!;
    expect(written).not.toBe(base);
    expect(existsSync(written)).toBe(true);
    const conf = readFileSync(written, 'utf8');
    expect(conf).toContain(`<include ignore_missing="yes">${base}</include>`);
    expect(conf).toContain(`<dir>${join(root, 'src/fonts')}</dir>`);
  });
});
