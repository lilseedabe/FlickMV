# ==========================================
# FlickMV Production VPS Setup Script
# Ubuntu 22.04 LTS用
# ==========================================

#!/bin/bash
set -e

echo "🚀 FlickMV Production Server Setup Starting..."

# システムアップデート
sudo apt update && sudo apt upgrade -y

# 必要なパッケージインストール
sudo apt install -y \
    curl \
    wget \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    htop \
    ufw \
    fail2ban

# Node.js 18.x インストール
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 グローバルインストール
sudo npm install -g pm2

# FFmpeg インストール（動画処理用）
sudo apt install -y ffmpeg

# Docker インストール
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# ファイアウォール設定
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# FlickMVユーザー作成
sudo adduser --disabled-password --gecos "" flickmv
sudo usermod -aG sudo flickmv
sudo usermod -aG docker flickmv

# アプリケーションディレクトリ作成
sudo mkdir -p /var/www/flickmv
sudo chown flickmv:flickmv /var/www/flickmv

# ログディレクトリ作成
sudo mkdir -p /var/log/flickmv
sudo chown flickmv:flickmv /var/log/flickmv

echo "✅ VPS Setup Complete!"
echo "Next steps:"
echo "1. Upload FlickMV code to /var/www/flickmv"
echo "2. Configure environment variables"
echo "3. Setup SSL certificate"
echo "4. Configure Nginx"