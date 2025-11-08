# syntax = docker/dockerfile:1

# Use Node 20 LTS for better Next.js + native module compatibility
ARG NODE_VERSION=20.18.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"
WORKDIR /app

FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies (including devDependencies for build)
COPY package-lock.json package.json ./
RUN npm ci --include=dev

# Copy source and build
COPY . .
RUN npm run build

# Prune dev dependencies
RUN npm prune --omit=dev

FROM base

# Copy built app and production dependencies
COPY --from=build /app /app

EXPOSE 8080

# Run custom server.js (handles Next.js + WebSocket)
CMD [ "node", "server.js" ]