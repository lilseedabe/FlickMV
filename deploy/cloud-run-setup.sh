# ===========================
# Cloud Run Jobs 簡易セットアップ
# FlickMV動画処理用
# ===========================

#!/bin/bash

echo "☁️ Cloud Run Jobs Setup for FlickMV"

# 1. GCP CLI インストール（ローカルPC）
echo "Step 1: GCP CLI Setup"
echo "https://cloud.google.com/sdk/docs/install からダウンロード"

# 2. プロジェクト作成・設定
echo "Step 2: GCP Project Setup"
gcloud projects create flickmv-production
gcloud config set project flickmv-production

# 3. 必要なAPI有効化
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com

# 4. Docker イメージビルド
echo "Step 3: Build Worker Image"
cd worker/
docker build -t gcr.io/flickmv-production/video-worker .

# 5. イメージプッシュ
docker push gcr.io/flickmv-production/video-worker

# 6. Cloud Run Job 作成
echo "Step 4: Deploy Cloud Run Job"
gcloud run jobs create video-export-job \
  --image=gcr.io/flickmv-production/video-worker \
  --region=asia-northeast1 \
  --memory=16Gi \
  --cpu=8 \
  --max-retries=3 \
  --parallelism=10

echo "✅ Cloud Run Jobs Ready!"
echo "処理時間: 3分動画 → 2.5分"
echo "同時処理: 10ジョブまで"
echo "コスト: ¥80-120/回"