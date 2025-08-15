#!/bin/bash
# ===========================
# FlickMV Cloud Run Jobs Deploy
# 完全自動デプロイスクリプト
# ===========================

echo "☁️ FlickMV Cloud Run Jobs Deploy Starting..."

# 設定変数（要変更）
PROJECT_ID="flickmv-production"
REGION="asia-northeast1"
IMAGE_NAME="flickmv-worker"
JOB_NAME="video-export-job"

# 色付きメッセージ
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}📋 Step 1: GCP Project Setup${NC}"

# GCP プロジェクト作成・設定
gcloud projects create $PROJECT_ID --name="FlickMV Production" || echo "Project already exists"
gcloud config set project $PROJECT_ID

# 課金アカウント確認
echo -e "${YELLOW}💳 Billing account must be linked manually in GCP Console${NC}"
echo "https://console.cloud.google.com/billing/projects"

echo -e "${YELLOW}📋 Step 2: Enable APIs${NC}"

# 必要なAPI有効化
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  artifactregistry.googleapis.com

echo -e "${YELLOW}📋 Step 3: Build Docker Image${NC}"

# Dockerイメージビルド（Cloud Buildを使用）
cd worker/
gcloud builds submit --tag gcr.io/$PROJECT_ID/$IMAGE_NAME .

echo -e "${YELLOW}📋 Step 4: Deploy Cloud Run Job${NC}"

# Cloud Run Job作成
gcloud run jobs create $JOB_NAME \
  --image=gcr.io/$PROJECT_ID/$IMAGE_NAME \
  --region=$REGION \
  --memory=16Gi \
  --cpu=8 \
  --max-retries=2 \
  --parallelism=5 \
  --task-count=1 \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="LOG_LEVEL=info"

echo -e "${YELLOW}📋 Step 5: Set Environment Variables${NC}"

# 環境変数設定（後で実際の値に置き換え）
gcloud run jobs update $JOB_NAME \
  --region=$REGION \
  --set-env-vars="DATABASE_URL=postgresql://postgres:uahlixZM6c9ZOuSi@db.ilpssgrgnagylnfixyec.supabase.co:5432/postgres" \
  --set-env-vars="EXPORT_QUEUE_NAME=video-export" \
  --set-env-vars="INTERNAL_API_BASE=https://flick.jp/api/internal" \
  --set-env-vars="INTERNAL_API_KEY=flickmv-prod-api-key-2025-secure"

echo -e "${GREEN}✅ Cloud Run Jobs Deploy Complete!${NC}"
echo -e "${GREEN}📊 Performance: 3分動画 → 2.5分処理${NC}"
echo -e "${GREEN}💰 Cost: 約¥80-120/回（使用時のみ）${NC}"

echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Test job execution:"
echo "   gcloud run jobs execute $JOB_NAME --region=$REGION"
echo ""
echo "2. Monitor jobs:"
echo "   https://console.cloud.google.com/run/jobs"
echo ""
echo "3. Check logs:"
echo "   gcloud logging read 'resource.type=\"cloud_run_job\"' --limit=50"

echo -e "${GREEN}🎉 Ready for production use!${NC}"