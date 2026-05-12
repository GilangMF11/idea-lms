#!/bin/bash
# Deploy script untuk IDEA-SPACE di VPS Biznet GIO
# Jalankan di server: bash deploy.sh

set -e

APP_DIR="/var/www/idea-space"
REPO_URL="YOUR_GIT_REPO_URL"  # Ganti dengan URL repo kamu

echo "=== IDEA-SPACE Deployment ==="

# 1. Pull latest code
echo "[1/6] Pulling latest code..."
cd $APP_DIR
git pull origin main

# 2. Install dependencies
echo "[2/6] Installing dependencies..."
npm ci --production=false

# 3. Generate Prisma client
echo "[3/6] Generating Prisma client..."
npx prisma generate

# 4. Build application
echo "[4/6] Building application..."
npm run build

# 5. Run database migrations (jika ada)
echo "[5/6] Running database migrations..."
npx prisma db push --accept-data-loss || true

# 6. Restart application
echo "[6/6] Restarting application..."
pm2 restart idea-space || pm2 start deploy/ecosystem.config.cjs

echo ""
echo "=== Deployment complete! ==="
echo ""
echo "PENTING: Pastikan folder uploads TIDAK dihapus saat deploy!"
echo "Folder uploads: $APP_DIR/static/uploads/"
echo ""
echo "Cek status: pm2 status"
echo "Cek logs: pm2 logs idea-space"
