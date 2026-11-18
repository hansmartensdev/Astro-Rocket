# Local preview of the built site, in two stages.
#
# The build stage installs dependencies and runs `astro build`. The runtime
# stage is nginx with the generated files copied in — no Node, no pnpm, no
# Astro, and none of the dependency tree.
#
# Two things this is good for:
#
#   Trying the theme without installing anything but Docker. `docker compose
#   up --build` and the site is on localhost:4321.
#
#   Keeping `pnpm install` away from your own machine. Installing a
#   dependency tree runs other people's install scripts; here they run in a
#   container that can see this repository and nothing else of yours.
#
# It is not how you deploy. See the README for that — the theme builds for
# Vercel, Netlify and Cloudflare, and only those builds carry the API routes.

# ── Build ────────────────────────────────────────────────────────────────────
# Node 22 matches .nvmrc and satisfies the `engines` floor of 22.23.4.
FROM node:22 AS build

WORKDIR /app

# pnpm comes from the `packageManager` field rather than a version pinned
# here, so the container, CI and a developer's machine cannot drift apart.
RUN corepack enable

# Dependency manifests first: this layer is cached until they change, so
# editing a page does not reinstall the tree.
COPY package.json pnpm-lock.yaml ./
RUN corepack install && pnpm install --frozen-lockfile

COPY . .

# SITE_URL is what canonical tags, og:image, RSS and the sitemap are written
# against. A preview is not the deployed site, so it says so plainly rather
# than baking in a domain that is not yours.
ARG SITE_URL=http://localhost:4321
ENV SITE_URL=$SITE_URL

# The rest of the build-time configuration. Astro inlines each of these into
# the generated files, so a value that does not reach this stage is one the
# built site does not have.
#
# Empty is the default and behaves as unset: no measurement id injects no
# gtag, and an empty PUBLIC_CONSENT_ENABLED resolves to false.
#
# RESEND_API_KEY, RESEND_FROM_EMAIL and RESEND_AUDIENCE_ID are not here: they
# are read by the API routes, and the runtime image is nginx serving static
# files.
ARG PUBLIC_GA_MEASUREMENT_ID=
ARG PUBLIC_GTM_ID=
ARG PUBLIC_UMAMI_WEBSITE_ID=
ARG PUBLIC_UMAMI_SRC=
ARG PUBLIC_GOOGLE_MAPS_API_KEY=
ARG PUBLIC_CONSENT_ENABLED=
ARG PUBLIC_PRIVACY_POLICY_URL=
ARG GOOGLE_SITE_VERIFICATION=
ARG BING_SITE_VERIFICATION=
ENV PUBLIC_GA_MEASUREMENT_ID=$PUBLIC_GA_MEASUREMENT_ID \
    PUBLIC_GTM_ID=$PUBLIC_GTM_ID \
    PUBLIC_UMAMI_WEBSITE_ID=$PUBLIC_UMAMI_WEBSITE_ID \
    PUBLIC_UMAMI_SRC=$PUBLIC_UMAMI_SRC \
    PUBLIC_GOOGLE_MAPS_API_KEY=$PUBLIC_GOOGLE_MAPS_API_KEY \
    PUBLIC_CONSENT_ENABLED=$PUBLIC_CONSENT_ENABLED \
    PUBLIC_PRIVACY_POLICY_URL=$PUBLIC_PRIVACY_POLICY_URL \
    GOOGLE_SITE_VERIFICATION=$GOOGLE_SITE_VERIFICATION \
    BING_SITE_VERIFICATION=$BING_SITE_VERIFICATION

RUN pnpm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM nginx:alpine AS runtime

# `dist/client` is what Astro writes for every deploy target. The adapters
# then copy it into their own layout — .vercel/output/static and so on — so
# this is the one path that does not depend on which target was built.
COPY --from=build /app/dist/client /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-security-headers.conf /etc/nginx/security-headers.conf

# 8080 rather than 80, so the image runs as a non-root user if you ask it to.
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
