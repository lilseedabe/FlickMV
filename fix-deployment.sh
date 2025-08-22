#!/bin/bash

# ===========================
# FlickMV VPS Deployment Fix Script
# ===========================

echo "🔄 FlickMV VPS デプロイ修正スクリプトを開始します..."

# プロジェクトディレクトリに移動
cd /var/www/flickmv

# Gitから最新の変更を取得
echo "📥 Gitから最新の変更を取得中..."
git fetch --all
git reset --hard origin/main

# クライアントディレクトリに移動
cd client

echo "🧹 既存のnode_modulesとlock fileを削除中..."
rm -rf node_modules
rm -f package-lock.json

# npm cacheをクリア
echo "🗑️ npm cacheをクリア中..."
npm cache clean --force

# Node.jsとnpmのバージョンを確認
echo "📋 Node.js/npm バージョン情報:"
node --version
npm --version

# 依存関係を特定のバージョンで固定してインストール
echo "📦 依存関係を特定バージョンで固定インストール中..."

# 重要なパッケージを明示的にインストール
npm install schema-utils@3.3.0 --save-exact
npm install ajv@6.12.6 --save-exact  
npm install ajv-keywords@3.5.2 --save-exact
npm install fork-ts-checker-webpack-plugin@6.5.3 --save-exact

# その他の依存関係をインストール
npm install --legacy-peer-deps --no-optional

# 依存関係の確認
echo "🔍 重要な依存関係の確認:"
npm ls schema-utils
npm ls ajv
npm ls ajv-keywords  
npm ls fork-ts-checker-webpack-plugin

# TypeScript型チェック
echo "🔧 TypeScript型チェック中..."
npm run type-check

# ビルド実行
echo "🚀 ビルド実行中..."
npm run build

echo "✅ デプロイ修正スクリプトが完了しました！"