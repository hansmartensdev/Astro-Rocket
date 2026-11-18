import { describe, it, expect, beforeEach } from 'vitest';
import {
  allowRequest,
  clientKey,
  resetRateLimit,
  trackedAddresses,
  LIMIT,
  WINDOW_SECONDS,
} from '@/lib/rate-limit';

const req = (headers: Record<string, string> = {}) =>
  new Request('https://example.com/api/contact', { method: 'POST', headers });

describe('the brake on the public form endpoints', () => {
  beforeEach(() => resetRateLimit());

  it('allows up to the limit and refuses the one after it', () => {
    const now = 1_000_000;
    for (let i = 0; i < LIMIT; i++) {
      expect(allowRequest('1.2.3.4', now).allowed).toBe(true);
    }
    expect(allowRequest('1.2.3.4', now).allowed).toBe(false);
  });

  it('says how long to wait, in whole seconds within the window', () => {
    const now = 1_000_000;
    for (let i = 0; i < LIMIT; i++) allowRequest('1.2.3.4', now);
    const refused = allowRequest('1.2.3.4', now + 10_000);
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfter).toBeGreaterThan(0);
    expect(refused.retryAfter).toBeLessThanOrEqual(WINDOW_SECONDS);
  });

  it('starts the count again once the window has passed', () => {
    const now = 1_000_000;
    for (let i = 0; i < LIMIT; i++) allowRequest('1.2.3.4', now);
    expect(allowRequest('1.2.3.4', now).allowed).toBe(false);
    expect(allowRequest('1.2.3.4', now + WINDOW_SECONDS * 1000 + 1).allowed).toBe(true);
  });

  it('counts each address separately, so one caller cannot refuse another', () => {
    const now = 1_000_000;
    for (let i = 0; i < LIMIT + 1; i++) allowRequest('1.2.3.4', now);
    expect(allowRequest('5.6.7.8', now).allowed).toBe(true);
  });

  /**
   * The opposite of what the members-area limiter does, and deliberately: a
   * contact form that silently refuses real enquiries is a worse failure than
   * one that is occasionally spammed.
   */
  it('allows the request when no address can be read', () => {
    const now = 1_000_000;
    for (let i = 0; i < LIMIT * 10; i++) {
      expect(allowRequest(null, now).allowed).toBe(true);
    }
  });

  it('reads the address Astro supplies', () => {
    expect(clientKey(req(), '9.9.9.9')).toBe('9.9.9.9');
  });

  it('falls back to the Cloudflare header when Astro has no address', () => {
    expect(clientKey(req({ 'cf-connecting-ip': '7.7.7.7' }), undefined)).toBe('7.7.7.7');
  });

  it('takes the first hop of x-forwarded-for, not the whole chain', () => {
    expect(clientKey(req({ 'x-forwarded-for': '3.3.3.3, 4.4.4.4' }), undefined)).toBe('3.3.3.3');
  });

  it('returns null when nothing identifies the caller', () => {
    expect(clientKey(req(), undefined)).toBeNull();
  });

  /**
   * The map is a target in its own right: somebody rotating addresses would
   * grow it until the instance runs out of memory. Past the cap new addresses
   * go uncounted rather than unbounded, and they are allowed through, because
   * refusing them would turn a full map into an outage.
   */
  it('stops growing under rotating addresses, and keeps answering', () => {
    const now = 1_000_000;
    for (let i = 0; i < 12_000; i++) {
      expect(allowRequest(`10.${Math.floor(i / 65536)}.${Math.floor(i / 256) % 256}.${i % 256}`, now).allowed).toBe(true);
    }
    // The cap is the point: without it the map would hold all 12,000.
    expect(trackedAddresses()).toBeLessThanOrEqual(10_000);

    // Past the cap a new address is admitted uncounted rather than unbounded,
    // so it is never refused however often it posts. Without the cap it would
    // be counted and refused after the limit.
    for (let i = 0; i < LIMIT + 3; i++) {
      expect(allowRequest('203.0.113.9', now).allowed).toBe(true);
    }
  });

  it('forgets ended windows rather than holding a slot for ever', () => {
    const now = 1_000_000;
    for (let i = 0; i < 500; i++) allowRequest(`192.0.2.${i % 256}-${i}`, now);
    const before = trackedAddresses();
    expect(before).toBe(500);

    // A write after the windows have ended sweeps them. Without the sweep the
    // map would still hold all 500 alongside the new one.
    allowRequest('198.51.100.1', now + WINDOW_SECONDS * 1000 + 1);
    expect(trackedAddresses()).toBeLessThan(before);
  });
});
