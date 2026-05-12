#!/bin/bash
# Setup awal server VPS Biznet GIO untuk IDEA-SPACE
# Jalankan sekali saat pertama kali setup server

set -e

APP_DIR="/var/www/idea-space"

echo "=== Setup Server IDEA-SPACE ==="

# 1. Update system
echo "[1/7] Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js (v20 LTS)
echo "[2/7] Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PM2
echo "[3/7] Installing PM2..."
sudo npm install -g pm2

# 4. Install Nginx
echo "[4/7] Installing Nginx..."
sudo apt install -y nginx

# 5. Create app directory & uploads folder (PERSISTEN)
echo "[5/7] Creating directories..."
sudo mkdir -p $APP_DIR/static/uploads/reading-texts
sudo mkdir -p $APP_DIR/static/uploads/audio
sudo mkdir -p $APP_DIR/static/uploads/images
sudo mkdir -p $APP_DIR/static/uploads/documents
sudo mkdir -p $APP_DIR/static/uploads/avatars
sudo mkdir -p $APP_DIR/static/uploads/attachments
sudo chown -R $USER:$USER $APP_DIR

# 6. Setup Nginx config
echo "[6/7] Setting up Nginx..."
sudo cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/idea-space
sudo ln -sf /etc/nginx/sites-available/idea-space /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 7. Setup PM2 startup
echo "[7/7] Setting up PM2 startup..."
pm2 startup systemd -u $USER --hp /home/$USER
pm2 save

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Langkah selanjutnya:"
echo "1. Edit /etc/nginx/sites-available/idea-space → ganti 'yourdomain.com' dengan domain kamu"
echo "2. Copy file .env ke $APP_DIR/.env"
echo "3. Jalankan: bash $APP_DIR/deploy/deploy.sh"
echo ""
echo "Untuk SSL (HTTPS):"
echo "  sudo apt install certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d yourdomain.com"
