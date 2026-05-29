#!/bin/bash
# Deploy schema to Aiven databases
# Run this after setting up .env.production with Aiven credentials
# Usage: bash scripts/deploy-db.sh

echo "🚀 Deploying schema to production databases..."
echo ""

# Load production env
export $(grep -v '^#' .env.production | xargs)

echo "📦 Pushing schema to Scoopmandu DB..."
DATABASE_URL=$DATABASE_URL_SCOOPMANDU npx prisma db push --accept-data-loss
echo ""

echo "📦 Pushing schema to RKT Tradings DB..."
DATABASE_URL=$DATABASE_URL_RKT npx prisma db push --accept-data-loss
echo ""

echo "🌱 Seeding Scoopmandu..."
DATABASE_URL=$DATABASE_URL_SCOOPMANDU npx prisma db seed
echo ""

echo "🌱 Seeding RKT Tradings..."
DATABASE_URL=$DATABASE_URL_RKT npx prisma db seed
echo ""

echo "✅ Done! Both databases are ready."
