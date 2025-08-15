# ===========================
# FlickMV VPS Deploy Script
# Domain: flickmv.jp
# IP: 162.43.72.195
# ===========================

#!/bin/bash
set -e

# 設定変数
DOMAIN="flickmv.jp"
VPS_IP="162.43.72.195"
APP_DIR="/var/www/flickmv"

echo "🚀 FlickMV Deploy to $DOMAIN ($VPS_IP)"

# システム更新
echo "📦 System Update..."
sudo apt update && sudo apt upgrade -y

# 必要なパッケージインストール
echo "📦 Installing packages..."
sudo apt install -y \
    curl \
    wget \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    nodejs \
    npm \
    ffmpeg \
    htop \
    ufw

# Node.js 18.x インストール
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2インストール
echo "📦 Installing PM2..."
sudo npm install -g pm2

# ファイアウォール設定
echo "🔒 Firewall setup..."
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# アプリディレクトリ作成
echo "📁 Creating app directory..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# ログディレクトリ
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/uploads
mkdir -p $APP_DIR/exports

echo "✅ VPS preparation complete!"
echo "Next: Upload FlickMV code and deploy"