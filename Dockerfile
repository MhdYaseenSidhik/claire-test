# syntax=docker/dockerfile:1

# --- Stage 1: build the production bundle -------------------------------------
# claire-dashboard is a static Vite + React + TS SPA. `npm run build` runs
# `tsc --noEmit && vite build`, emitting the site (including public/data/*.csv)
# into dist/. We build on Node 20 (README prerequisite) with a reproducible
# install from the committed package-lock.json.
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first so this layer is cached until the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci

# Build the bundle. public/ (the committed CSVs) is copied into dist/ by Vite.
COPY . .
RUN npm run build

# --- Stage 2: serve dist/ behind nginx ----------------------------------------
# No Node, no build tools in the final image — just nginx and the static bundle.
FROM nginx:1.27-alpine AS runtime

# Replace the default site config with one that adds an SPA history fallback.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# The production bundle, including data/*.csv, becomes the web root.
COPY --from=build /app/dist /usr/share/nginx/html

# Liveness: nginx must answer 200 for the app shell AND the committed dataset,
# so a healthy container guarantees the CSV the SPA fetches at runtime is served.
# wget ships in the nginx:alpine busybox, so no extra packages are needed.
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -q --spider http://localhost/ \
      && wget -q --spider http://localhost/data/sales_weekly.csv \
      || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
