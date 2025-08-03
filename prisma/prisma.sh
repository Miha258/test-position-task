#!/bin/sh

echo "⏳ Waiting for PostgreSQL to be ready..."

until pg_isready -h postgres -p 5432 -U postgres > /dev/null 2>&1; do
  sleep 1
done

echo "✅ PostgreSQL is ready!"

echo "📦 Running Prisma generate..."
npx prisma generate

echo "🛠️ Running Prisma migrations..."
npx prisma migrate deploy

echo "✅ Prisma setup complete!"