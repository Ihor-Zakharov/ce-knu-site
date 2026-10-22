# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
ENV ASTRO_TELEMETRY_DISABLED=1 \
    HUSKY=0 \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false
RUN mkdir -p /app/node_modules && chown -R node:node /app
WORKDIR /app
USER node

FROM base AS deps
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --no-audit \
 && sha256sum package-lock.json | cut -d' ' -f1 > node_modules/.lock-hash

# Dev server with hot reload; the source code is mounted from the host (see compose.yaml).
FROM deps AS dev
EXPOSE 4321
CMD ["sh", "scripts/docker-dev.sh"]

FROM deps AS build
COPY --chown=node:node . .
ARG ASTRO_BASE=/
ARG ASTRO_SITE=https://ce.knu.ua
RUN ASTRO_BASE="$ASTRO_BASE" ASTRO_SITE="$ASTRO_SITE" npm run build

# The built site on Apache with .htaccess enabled, like the department server.
FROM httpd:2.4-alpine AS site
RUN sed -i \
      -e 's/^#\(LoadModule rewrite_module\)/\1/' \
      -e 's/^#\(LoadModule expires_module\)/\1/' \
      -e 's/^#\(LoadModule headers_module\)/\1/' \
      -e '/<Directory "\/usr\/local\/apache2\/htdocs">/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' \
      conf/httpd.conf \
 && rm -f htdocs/index.html
COPY --from=build /app/dist/ htdocs/
