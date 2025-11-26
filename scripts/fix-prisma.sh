#!/bin/bash

echo "🔧 Fixing Prisma Client..."

# Remove old Prisma Client
echo "📦 Removing old Prisma Client..."
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

# Generate new Prisma Client
echo "🔄 Generating new Prisma Client..."
npm run db:generate

# Push schema to database
echo "💾 Pushing schema to database..."
npx prisma db push --accept-data-loss

echo "✅ Prisma Client fixed! Please restart your dev server."
echo "   Run: npm run dev"

