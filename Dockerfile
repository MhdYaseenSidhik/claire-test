# syntax=docker/dockerfile:1

# --- Stage 1: build the production bundle -------------------------------------
# claire-dashboard is a static Vite + React + TS SPA. `npm run build` runs
# `tsc --noEmit && vite build`, emitting the site (including public/data/*.csv)
# into dist/. We build on Node 20 (README prerequisite) with a reproducible
# install from the committed package-lock.json.
FROM node:20.18-alpine AS build
WORKDIR /app

# Install dependencies first so this layer is cached until the lockfile changes.
# A code-only edit reuses this layer and skips the (slow) reinstall.
COPY package.json package-lock.json ./
RUN npm ci

# Build the bundle. public/ (the committed CSVs) is copied into dist/ by Vite.
COPY . .
RUN npm run build

# --- Stage 2: serve dist/ behind nginx ----------------------------------------
# No Node, no build tools in the final image — just nginx and the static bundle.
FROM nginx:1.27-alpine AS runtime

# Replace the default site config with one that adds an SPA history fallback
# and listens on an unprivileged port (8080) so nginx can run as a non-root user.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# The production bundle, including data/*.csv, becomes the web root.
COPY --from=build /app/dist /usr/share/nginx/html

# Run as the unprivileged "nginx" user (uid 101) that ships in the image.
# A non-root master cannot bind :80 or write nginx's default pid path, so:
#   - relocate the pid file to /tmp (the base image's default is `pid
#     /run/nginx.pid`, which is root-owned and not writable by uid 101);
#   - grant the nginx user ownership of the writable working directories;
#   - drop the main config's `user` directive (it only applies when the master
#     runs as root) to silence the startup warning.
# The pid path is rewritten in nginx.conf to a non-root-writable location,
# matching any of the paths the base image has shipped over time
# (/run/nginx.pid on nginx:1.27-alpine, /var/run/nginx.pid on older tags).
RUN set -eux; \
    sed -i 's|^user  *nginx;|# user directive removed: container runs as non-root|' /etc/nginx/nginx.conf; \
    sed -i -E 's|^[[:space:]]*pid[[:space:]]+/(var/)?run/nginx\.pid;|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf; \
    grep -q '^pid /tmp/nginx.pid;' /etc/nginx/nginx.conf; \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx; \
    touch /tmp/nginx.pid && chown nginx:nginx /tmp/nginx.pid

USER nginx

# Liveness: nginx must answer 200 for the app shell AND the committed dataset,
# so a healthy container guarantees the CSV the SPA fetches at runtime is served.
# wget ships in the nginx:alpine busybox, so no extra packages are needed.
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -q --spider http://localhost:8080/ \
      && wget -q --spider http://localhost:8080/data/sales_weekly.csv \
      || exit 1

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
