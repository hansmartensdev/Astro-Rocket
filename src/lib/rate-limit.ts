/**
 * A brake on the public form endpoints.
 *
 * `/api/contact` and `/api/newsletter` are unauthenticated POST routes that
 * spend the site owner's Resend account: one sends mail from their domain, the
 * other writes into their audience. Validation and the honeypot stop a bot that
 * fills every field it finds; neither stops somebody who reads the form once
 * and posts it in a loop. Without a brake that loop drains the day's Resend
 * quota — after which the real contact form fails quietly — fills the owner's
 * inbox, and can get the sending domain flagged, which costs them every email
 * the domain sends and not just the form.
 *
 * WHAT THIS CATCHES, AND WHAT IT DOES NOT
 *
 * The count lives in this module's memory, so it is per server instance. That
 * stops one client hammering one warm instance, which is the common case: a
 * script, a scraper, somebody bored. It does not stop a request spread across
 * many addresses, and on a serverless host the real ceiling is this limit times
 * however many instances are warm, with a cold start beginning again at zero.
 * On Cloudflare Workers it is weakest of all, because an isolate is short-lived.
 *
 * A limiter in front of the site is strictly better and is what a site facing
 * real pressure should use: Vercel's firewall, Cloudflare's rate limiting,
 * Netlify's. Those see the request before any of this runs, hold one count for
 * every instance, and cost no compute. This module is the floor that every
 * clone gets for nothing, not the wall. The README says the same.
 *
 * IT FAILS OPEN, ON PURPOSE
 *
 * When no client address can be read, the request is allowed. A contact form
 * that silently refuses real enquiries is a worse failure than one that is
 * occasionally spammed, and the address is missing exactly when a host does not
 * expose it rather than when somebody is attacking. This is the opposite of
 * what a sign-in endpoint should do, where refusing is the safe answer.
 *
 * KEYED ON ADDRESS, NOT ON THE SUBMITTED EMAIL
 *
 * On a form anyone may post, the email field is chosen by whoever is posting,
 * so keying on it defeats the limit the moment they vary it. The address is the
 * only halfway stable axis. The cost is that an office, a university or a
 * mobile carrier shares one, so a second person behind the same address can be
 * caught; at this rate that is unlikely to reach anybody real.
 */

/** Requests allowed per address within a window. */
export const LIMIT = 5;

/** Length of the window, in seconds. */
export const WINDOW_SECONDS = 60;

/**
 * Most addresses tracked at once.
 *
 * The map is itself a target: somebody rotating source addresses would grow it
 * until the instance runs out of memory, trading a mail problem for a worse
 * one. Expired entries are swept on write, and once the cap is reached no new
 * address is admitted — those requests are allowed through, because refusing
 * them would turn a full map into an outage.
 */
const MAX_KEYS = 10_000;

interface Window {
  count: number;
  /** Epoch milliseconds at which this window ends. */
  reset: number;
}

const windows = new Map<string, Window>();

/** Drop every window that has already ended. */
function sweep(now: number): void {
  for (const [key, window] of windows) {
    if (now > window.reset) windows.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the current window ends. 0 when the request was allowed. */
  retryAfter: number;
}

/**
 * Record an attempt against a key.
 *
 * A null key means no address could be read, which is allowed — see the note on
 * failing open above.
 */
export function allowRequest(key: string | null, now: number = Date.now()): RateLimitResult {
  if (!key) return { allowed: true, retryAfter: 0 };

  const existing = windows.get(key);

  if (!existing || now > existing.reset) {
    if (!existing) {
      sweep(now);
      // Admitting a new address past the cap is what would exhaust memory, so
      // the request goes through uncounted instead.
      if (windows.size >= MAX_KEYS) return { allowed: true, retryAfter: 0 };
    }
    windows.set(key, { count: 1, reset: now + WINDOW_SECONDS * 1000 });
    return { allowed: true, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count <= LIMIT) return { allowed: true, retryAfter: 0 };

  return { allowed: false, retryAfter: Math.ceil((existing.reset - now) / 1000) };
}

/**
 * The address to count against, or null when none can be read.
 *
 * `clientAddress` is what Astro exposes and what the Vercel and Netlify
 * adapters fill in. Reading it throws on an adapter that does not support it,
 * so it is guarded. Cloudflare passes the address as a header instead.
 */
export function clientKey(request: Request, clientAddress: string | undefined): string | null {
  try {
    if (clientAddress) return clientAddress;
  } catch {
    // An adapter that does not support it throws on access rather than
    // returning undefined; fall through to the headers.
  }

  const forwarded =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

  return forwarded || null;
}

/** Reset the counters. Exists for the tests; nothing in the app calls it. */
export function resetRateLimit(): void {
  windows.clear();
}

/**
 * How many addresses are currently tracked.
 *
 * Exists so the tests can see the two properties that are otherwise invisible
 * from outside — that the map is swept and that it is capped. Both are about
 * memory rather than about any answer this module gives, so a test written
 * against the answers alone passes whether or not they are there.
 */
export function trackedAddresses(): number {
  return windows.size;
}
