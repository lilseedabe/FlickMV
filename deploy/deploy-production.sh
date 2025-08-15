#!/bin/bash
# ===========================
# FlickMV Production Deploy Script
# VPS自動デプロイスクリプト
# ===========================

set -e

echo "🚀 FlickMV Production Deploy Starting..."

# 色付きメッセージ用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 設定変数
APP_DIR="/var/www/flickmv"
DOMAIN="flick.jp"  # 設定完了

echo -e "${YELLOW}📋 Step 1: Environment Check${NC}"

# Node.js バージョン確認
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Installing...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# PM2 確認
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Installing PM2...${NC}"
    sudo npm install -g pm2
fi

# FFmpeg 確認
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}🎬 Installing FFmpeg...${NC}"
    sudo apt update
    sudo apt install -y ffmpeg
fi

echo -e "${YELLOW}📋 Step 2: Project Setup${NC}"

# アプリディレクトリ作成
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# ログディレクトリ作成
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/uploads
mkdir -p $APP_DIR/exports

echo -e "${YELLOW}📋 Step 3: Install Dependencies${NC}"

# プロジェクトルートで依存関係インストール
cd $APP_DIR
npm install

# クライアント依存関係
cd $APP_DIR/client
npm install

# サーバー依存関係
cd $APP_DIR/server
npm install

echo -e "${YELLOW}📋 Step 4: Build Frontend${NC}"

# React フロントエンドビルド
cd $APP_DIR/client
npm run build

echo -e "${YELLOW}📋 Step 5: Database Setup${NC}"

# Prisma設定
cd $APP_DIR/server
npx prisma generate

# マイグレーション実行（本番環境）
npx prisma migrate deploy

echo -e "${YELLOW}📋 Step 6: Environment Configuration${NC}"

# 本番用環境変数ファイルをコピー
if [ -f "$APP_DIR/deploy/vps-production.env" ]; then
    cp $APP_DIR/deploy/vps-production.env $APP_DIR/server/.env
    echo -e "${GREEN}✅ Environment file configured${NC}"
else
    echo -e "${RED}❌ Environment file not found. Please create .env manually${NC}"
fi

echo -e "${YELLOW}📋 Step 7: PM2 Configuration${NC}"

# PM2設定
cd $APP_DIR
pm2 delete flickmv-api 2>/dev/null || true
pm2 start deploy/ecosystem.config.json

# PM2自動起動設定
pm2 save
pm2 startup

echo -e "${YELLOW}📋 Step 8: Nginx Configuration${NC}"

# Nginx設定ファイルコピー
if [ -f "$APP_DIR/deploy/nginx-production.conf" ]; then
    sudo cp $APP_DIR/deploy/nginx-production.conf /etc/nginx/sites-available/flickmv
    
    # ドメイン置換
    sudo sed -i "s/your-domain.com/$DOMAIN/g" /etc/nginx/sites-available/flickmv
    
    # サイト有効化
    sudo ln -sf /etc/nginx/sites-available/flickmv /etc/nginx/sites-enabled/
    
    # Nginx設定テスト
    sudo nginx -t
    
    # Nginx再起動
    sudo systemctl reload nginx
    
    echo -e "${GREEN}✅ Nginx configured${NC}"
else
    echo -e "${RED}❌ Nginx config file not found${NC}"
fi

echo -e "${YELLOW}📋 Step 9: SSL Certificate${NC}"

# SSL証明書取得（Let's Encrypt）
if [ "$DOMAIN" != "your-domain.com" ]; then
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN
    echo -e "${GREEN}✅ SSL Certificate configured${NC}"
else
    echo -e "${YELLOW}⚠️  Please set your actual domain in this script${NC}"
fi

echo -e "${YELLOW}📋 Step 10: Final Check${NC}"

# サービス状態確認
pm2 status
sudo systemctl status nginx

echo -e "${GREEN}🎉 FlickMV Deploy Complete!${NC}"
echo -e "${GREEN}✅ Frontend: https://$DOMAIN${NC}"
echo -e "${GREEN}✅ API: https://$DOMAIN/api/health${NC}"
echo -e "${GREEN}✅ Logs: pm2 logs flickmv-api${NC}"

echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "1. Update domain in deploy script: $0"
echo -e "2. Configure DNS A record: $DOMAIN -> VPS IP"
echo -e "3. Test application: https://$DOMAIN"
echo -e "4. Monitor logs: pm2 monit"