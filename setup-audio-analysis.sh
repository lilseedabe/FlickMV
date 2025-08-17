#!/bin/bash
# FlickMV Audio Analysis Setup Script
# このスクリプトは音声解析機能のセットアップを自動化します

echo "🚀 FlickMV Audio Analysis Setup"
echo "================================="

# 環境チェック
echo "📋 環境チェック中..."

# Node.jsバージョンチェック
if ! command -v node &> /dev/null; then
  echo "❌ Node.jsがインストールされていません"
  echo "💡 https://nodejs.org から Node.js 18+ をインストールしてください"
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt "18" ]; then
  echo "❌ Node.js 18以上が必要です (現在: $(node -v))"
  exit 1
fi

echo "✅ Node.js $(node -v) 検出"

# パッケージインストール
echo ""
echo "📦 依存関係のインストール..."

# サーバー側
echo "🔧 サーバー側パッケージをインストール中..."
pushd server >/dev/null
npm install axios form-data
if [ $? -ne 0 ]; then
  echo "❌ サーバー側パッケージのインストールに失敗しました"
  exit 1
fi
echo "✅ サーバー側パッケージ完了"
popd >/dev/null

# クライアント側
echo "🎨 クライアント側パッケージを確認中..."
pushd client >/dev/null
npm install
if [ $? -ne 0 ]; then
  echo "❌ クライアント側パッケージのインストールに失敗しました"
  exit 1
fi
echo "✅ クライアント側パッケージ完了"
popd >/dev/null

# 環境変数の設定確認
echo ""
echo "🔑 環境変数の設定確認..."

if [ ! -f "server/.env" ]; then
  echo "⚠️  .envファイルが見つかりません"
  echo "📝 .env.exampleから.envファイルを作成中..."
  cp server/.env.example server/.env
  echo "✅ .envファイルを作成しました"
fi

# Groq APIキーチェック
if grep -q "your-groq-api-key" server/.env; then
  echo "⚠️  Groq APIキーが設定されていません"
  echo "💡 以下の手順でAPIキーを設定してください:"
  echo "   1. https://console.groq.com でAPIキーを取得"
  echo "   2. server/.env ファイルの GROQ_API_KEY を更新"
else
  echo "✅ Groq APIキーが設定されています"
fi

# データベース設定チェック
if grep -q "postgres://USER:PASSWORD@HOST" server/.env; then
  echo "⚠️  データベース接続が設定されていません"
  echo "💡 server/.env ファイルの DATABASE_URL を実際の値に更新してください"
else
  echo "✅ データベース接続が設定されています"
fi

# Prismaセットアップ
echo ""
echo "🗄️  Prismaセットアップ..."
pushd server >/dev/null

# Prisma生成
echo "🔄 Prisma clientを生成中..."
npm run prisma:generate
if [ $? -ne 0 ]; then
  echo "❌ Prisma client生成に失敗しました"
  echo "💡 DATABASE_URLが正しく設定されているか確認してください"
else
  echo "✅ Prisma client生成完了"
fi

# テスト実行（存在する場合のみ）
if [ -f "test-audio-analysis.js" ]; then
  echo ""
  echo "🧪 基本機能テスト..."
  node test-audio-analysis.js
fi

popd >/dev/null

# 完了メッセージ
echo ""
echo "🎉 セットアップ完了!"
echo "================================="
echo "📚 次のステップ:"
echo "   1. server/.env ファイルでGroq APIキーを設定"
echo "   2. データベース接続情報を設定"
echo "   3. npm run dev でサーバーを起動"
echo "   4. 別ターミナルでクライアントを起動 (cd client && npm start)"
echo ""
echo "📖 詳細ガイド: AUDIO_ANALYSIS_GUIDE.md"
echo "🐛 問題がある場合: GitHub Issues または Discord"