#!/bin/sh
set -e

echo "==> AHP Platform Starting on NAS..."
echo "==> Ensuring SQLite database is synced..."

# Set default database URL if not set
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/data/ahp.db"
fi

# Run prisma db push if npx/prisma is available, or ensure directory exists
mkdir -p /app/data

# Sync schema to SQLite DB
npx prisma db push --skip-generate || echo "Prisma push completed or using existing database."

echo "==> Starting Next.js Server on port ${PORT:-3000}..."
exec node server.js
