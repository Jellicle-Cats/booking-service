# ---- Base Node ----
FROM node:18-alpine AS base
# Set working directory
WORKDIR /usr/src/app

# ---- Dependencies ----
FROM base AS dependencies
# Copy dependency definitions
COPY package*.json ./
# Install production dependencies and build code
RUN npm install --only=production

# ---- Build ----
# Re-copy dependency definitions
FROM base AS build
# Copy application code
COPY . .
# Install ALL node_modules, including 'devDependencies'
RUN npm install && npx prisma generate
RUN npm prune --production

# ---- Release ----
FROM base AS release
# Copy production dependencies
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
# Copy built prisma client from build stage
COPY --from=build /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client
# Copy built application code
COPY --from=build /usr/src/app ./

ENV DATABASE_URL=""
ENV gRPC_URL=""

EXPOSE 30043

CMD ["node", "server.js"]
