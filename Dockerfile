# Security hardened Next.js production container

# Stage 1: Dependencies
FROM node:22-alpine AS deps
# Security: Use minimal Alpine image and pin version
RUN apk add --no-cache libc6-compat python3 make g++ \
    && rm -rf /var/cache/apk/*
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci \
    && npm cache clean --force

# Stage 2: Builder  
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Security: Remove any potential malicious files
RUN find . -name "*.sh" -type f -delete \
    && find . -name "bot" -type f -delete \
    && find . -name "wget" -type f -delete \
    && find . -name "curl" -type f -delete

# Build the application
RUN npm run build

# Stage 3: Secure Runtime
FROM node:22-alpine AS runner
WORKDIR /app

# Security: Set secure environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Security: Remove package managers and unnecessary tools
RUN apk del --no-cache npm yarn \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/* \
    && rm -rf /usr/local/lib/node_modules/npm

# Create secure non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy only necessary files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Security: Set strict permissions and remove write access
RUN chmod -R 755 /app \
    && chmod -R 644 /app/public \
    && find /app -type d -exec chmod 755 {} \; \
    && find /app -type f -exec chmod 644 {} \; \
    && chmod +x /app/server.js

# Security: Switch to non-root user
USER nextjs

# Security: Use specific port and interface
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Security: Use healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "server.js"]
