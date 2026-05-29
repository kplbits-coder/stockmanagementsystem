# Deploy schema to Aiven databases (Windows PowerShell)
# Usage: .\scripts\deploy-db.ps1
# Make sure .env.production has your Aiven credentials

Write-Host "🚀 Deploying schema to production databases..." -ForegroundColor Cyan
Write-Host ""

# Read .env.production values
# Replace these with your actual Aiven URLs:
$SCOOPMANDU_URL = "postgresql://avnadmin:PASSWORD@HOST:PORT/scoopmandu_db?sslmode=require"
$RKT_URL = "postgresql://avnadmin:PASSWORD@HOST:PORT/rkt_tradings_db?sslmode=require"

Write-Host "📦 Pushing schema to Scoopmandu DB..." -ForegroundColor Yellow
$env:DATABASE_URL = $SCOOPMANDU_URL
npx prisma db push --accept-data-loss
Write-Host ""

Write-Host "📦 Pushing schema to RKT Tradings DB..." -ForegroundColor Yellow
$env:DATABASE_URL = $RKT_URL
npx prisma db push --accept-data-loss
Write-Host ""

Write-Host "🌱 Seeding Scoopmandu..." -ForegroundColor Yellow
$env:DATABASE_URL = $SCOOPMANDU_URL
npx prisma db seed
Write-Host ""

Write-Host "🌱 Seeding RKT Tradings..." -ForegroundColor Yellow
$env:DATABASE_URL = $RKT_URL
npx prisma db seed
Write-Host ""

Write-Host "✅ Done! Both databases are ready." -ForegroundColor Green
