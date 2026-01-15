#!/bin/sh
# =============================================================================
# ROLHACK - Docker Entrypoint
# =============================================================================
# Runs Prisma migrations before starting the application

set -e

echo "🚀 Starting RolHack..."

# Run Prisma migrations
echo "📦 Running database migrations..."
cd /app
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma

echo "✅ Migrations complete"

# Start the application
echo "🌐 Starting Next.js server..."
exec node apps/web/server.js
