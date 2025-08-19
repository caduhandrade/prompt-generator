# Dockerfile for vertical-ai (Next.js app)
FROM node:18-alpine AS builder

WORKDIR /app

COPY . .

# Install dependencies (use --legacy-peer-deps to avoid peer conflicts)
RUN npm install --legacy-peer-deps

# Build Next.js app
RUN npm run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built files and node_modules from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
