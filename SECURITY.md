# Security policy

## Supported versions

Security fixes are released for the latest published version of Astro Rocket.
The theme is distributed by cloning the repository, so the way to receive a fix
is to update from upstream — see the update guide on the theme blog.

| Version | Supported |
|---------|-----------|
| 2.x     | Yes       |
| 1.x     | No        |

## Reporting a vulnerability

**Please do not open a public issue for a security problem.** A public report
tells everyone running the theme about the weakness before there is a fix.

Report it privately in one of two ways:

1. **GitHub Security Advisories** — preferred. Go to the repository's
   **Security** tab and choose **Report a vulnerability**. This keeps the
   report private and creates a place to discuss the fix.
2. **Email** — `hello@hansmartens.dev`, if you would rather not use GitHub.

Useful things to include, as far as you can:

- what the problem is, and what an attacker could achieve with it
- the affected file, route or component
- steps to reproduce, or a proof of concept
- the version or commit you found it on

## What to expect

- An acknowledgement that the report arrived, within a few days.
- An assessment of whether it is reproducible and how serious it is.
- A fix released as soon as it is ready, with the problem described in the
  changelog once users have had the chance to update.
- Credit for the report, unless you prefer not to be named.

This is a free, MIT-licensed project maintained by one person, so there is no
bug bounty and no guaranteed response time. Reports are taken seriously
regardless.

## Notes for people running a site on this theme

A few things are your responsibility rather than the theme's:

- **Keep secrets out of the repository.** API keys belong in environment
  variables, not in committed files. `.env` is gitignored for that reason.
- **Server-side keys stay server-side.** Anything named `PUBLIC_` is visible to
  every visitor. Never put a private key behind that prefix.
- **Update your dependencies.** Most vulnerabilities in a site built on this
  theme will come from packages, not from the theme's own code.
- **Install only the adapter you deploy with.** The theme ships Vercel's; the
  README says how to add Netlify's or Cloudflare's. Each one brings a
  platform's whole build toolchain, so installing the two you do not deploy to
  roughly doubles the packages you are responsible for updating.
- **Check your own additions.** Forms, API routes and third-party embeds you add
  are outside the theme's control and its testing.
- **Put a rate limiter in front of the site.** `/api/contact` and
  `/api/newsletter` are unauthenticated routes that spend your Resend account:
  one sends mail from your domain, the other writes into your audience. The
  theme counts requests per address in each server instance's memory and
  answers `429` past five in a minute, which stops one client hammering one
  warm instance. It cannot stop a request spread across many addresses, and on
  a serverless host the real ceiling is that limit times however many instances
  are warm, with a cold start beginning again at zero. Your platform's own
  limiter — Vercel's firewall, Cloudflare's rate limiting, Netlify's — sees the
  request before any of the theme's code runs and holds one count for every
  instance. If your site attracts real abuse, that is the control that will
  hold.
