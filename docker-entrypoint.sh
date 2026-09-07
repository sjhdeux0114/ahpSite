#!/bin/sh
set -e

echo "==> AHP Platform Starting on NAS..."
echo "==> Ensuring SQLite database is synced..."

# Set default database URL if not set
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/data/ahp.db"
fi

# Ensure SQLite data directory exists with full read/write permissions
mkdir -p /app/data
chmod 777 /app/data || true

# Attempt prisma db push if available (fails gracefully in standalone runner where ensureDbSchema handles it)
npx prisma db push --skip-generate 2>/dev/null || echo "Native schema migration will be handled by Next.js application at startup."

echo "==> Starting Next.js Server on port ${PORT:-3000}..."
exec node server.js
