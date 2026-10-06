# Production image for the API: `npm run docker:up` runs it with Postgres.

# --- Build stage: full install, generate the Prisma client, compile ---
FROM node:24-slim AS build
WORKDIR /app

# Prisma picks its engine build by the OpenSSL version, which slim leaves out.
RUN apt-get update -y   && apt-get install -y --no-install-recommends openssl   && rm -rf /var/lib/apt/lists/*

# Copy the dependency list and Prisma schema first. `npm ci` runs
# `prisma generate` (postinstall), which needs the schema, and this layer is
# cached until package*.json or the schema change.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
# Download the migration engine now: npm may skip Prisma's own install script,
# and at runtime the app runs as a user who can't write to node_modules.
RUN npx prisma version

COPY . .
RUN npm run build && npm prune --omit=dev

# --- Runtime stage: only what's needed to run ---
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# Prisma's migration engine needs OpenSSL, which the slim image leaves out.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json /app/prisma.config.ts ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Don't run as root inside the container.
USER node
EXPOSE 3001

# Same as on Render: apply pending migrations, then start the server.
CMD ["npm", "run", "start:prod"]
