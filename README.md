# FlickMV - AI音楽ビデオ作成プラットフォーム

## 🎬 概要

FlickMVは、AIの力で誰でも簡単にプロレベルのミュージックビデオを作成できるWebプラットフォームです。初心者でも直感的に操作でき、上級者には高度な機能を提供します。

## ✨ 主な機能

### 🤖 AI支援機能
- **自動編集:** 音楽に合わせたビート同期編集
- **インテリジェントエフェクト:** AIによる最適エフェクト提案
- **自動カラーマッチング:** 統一感のある色調補正

### 🎨 エディター機能
- **タイムライン編集:** 直感的なドラッグ&ドロップ
- **豊富なエフェクト:** 100+ プロ品質エフェクト
- **リアルタイムプレビュー:** 即座に結果確認

### 👥 初心者サポート
- **ステップバイステップチュートリアル:** 段階的学習
- **テンプレートライブラリ:** すぐに使える高品質テンプレート
- **24時間サポート:** 困ったときのヘルプ

## 🏗️ 技術スタック

### Frontend
- **React 18** + **TypeScript 5.3**
- **Tailwind CSS** for スタイリング
- **Framer Motion** for アニメーション
- **React Query** for 状態管理
- **Vite** for 高速ビルド

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Prisma** + **PostgreSQL** for データベース
- **pg-boss** for ジョブキュー
- **Winston** for ログ

### Infrastructure
- **Docker** for コンテナ化
- **Cloud Run** for スケーラブルワーカー
- **Cloudflare R2** for ストレージ
- **Supabase** for データベースホスティング

## 📦 インストール & セットアップ

### 必要な環境
- Node.js 18+
- npm または yarn
- Docker (オプション)

### クイックスタート

```bash
# リポジトリをクローン
git clone https://github.com/your-org/flickmv.git
cd flickmv

# 全依存関係をインストール
npm run install-all

# 環境変数を設定
cp .env.example .env
# .env ファイルを編集して必要な値を設定

# 開発サーバーを起動
npm run dev
```

### 環境変数設定

```bash
# データベース
DATABASE_URL=postgresql://user:password@localhost:5432/flickmv

# API設定  
INTERNAL_API_KEY=your-secret-key
CLIENT_URL=http://localhost:3000

# クラウドストレージ (オプション)
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
R2_BUCKET=flickmv-exports
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
```

## 🚀 開発

### 利用可能なスクリプト

```bash
# 開発モード (フロントエンド + バックエンド)
npm run dev

# 型チェック
npm run type-check

# コード品質チェック
npm run lint
npm run lint:fix

# フォーマット
npm run format

# テスト実行
npm run test

# プロダクションビルド
npm run build

# プロダクション起動
npm start
```

### プロジェクト構造

```
FlickMV/
├── client/                 # React フロントエンド
│   ├── src/
│   │   ├── components/     # 再利用可能コンポーネント
│   │   ├── pages/         # ページコンポーネント
│   │   ├── hooks/         # カスタムフック
│   │   ├── contexts/      # React Context
│   │   ├── services/      # API クライアント
│   │   ├── types/         # TypeScript 型定義
│   │   └── utils/         # ユーティリティ関数
│   └── package.json
├── server/                # Node.js バックエンド
│   ├── src/
│   │   ├── routes/        # API ルート
│   │   ├── services/      # ビジネスロジック
│   │   ├── middleware/    # Express ミドルウェア
│   │   ├── models/        # データモデル
│   │   └── utils/         # ユーティリティ
│   └── package.json
├── worker/                # 動画処理ワーカー
│   ├── src/
│   │   ├── services/      # FFmpeg 処理
│   │   └── utils/         # ワーカーユーティリティ
│   └── package.json
└── README.md
```

## 🎯 機能詳細

### チュートリアルシステム
初心者でも安心して始められる段階的学習システム：

1. **ウェルカムモーダル** - 機能紹介とガイド
2. **インタラクティブチュートリアル** - 実際の操作を学習
3. **コンテキストヘルプ** - いつでもアクセス可能
4. **プログレストラッキング** - 学習進捗の可視化

### プラン・課金システム
4段階のプランで様々なニーズに対応：

| プラン | 料金 | 出力制限 | 解像度 | 透かし |
|--------|------|----------|--------|--------|
| フリー | ¥0 | 5回/月 | 720p | あり |
| ベーシック | ¥980 | 25回/月 | 1080p | あり |
| プロ | ¥1,980 | 100回/月 | 4K | 削除可能 |
| プレミアム | ¥2,980 | 無制限 | 4K | 削除可能 |

## 🔧 デプロイメント

### 本番環境デプロイ

#### VPSへのデプロイ
```bash
# サーバーにSSH接続
ssh user@your-server.com

# プロジェクトをクローン
git clone https://github.com/your-org/flickmv.git
cd flickmv

# 依存関係インストール
npm run install-all

# 環境変数設定
cp .env.example .env
# 本番環境の値を設定

# ビルド
npm run build

# PM2で起動
pm2 start ecosystem.config.js
pm2 save
```

#### Dockerデプロイ
```bash
# Dockerイメージビルド
docker build -t flickmv .

# コンテナ起動
docker run -d \
  --name flickmv \
  -p 3000:3000 \
  -p 5000:5000 \
  --env-file .env \
  flickmv
```

### ワーカーデプロイ (Cloud Run Jobs)
```bash
# イメージビルド & プッシュ
gcloud builds submit --tag gcr.io/PROJECT_ID/flickmv-worker ./worker

# Cloud Run Jobs作成
gcloud beta run jobs create flickmv-worker-job \
  --image gcr.io/PROJECT_ID/flickmv-worker \
  --region=asia-northeast1 \
  --memory=8Gi \
  --set-env-vars="DATABASE_URL=${DATABASE_URL}"
```

## 📊 監視・メンテナンス

### ヘルスチェック
```bash
# APIヘルス確認
curl http://localhost:5000/health

# レスポンス例
{
  "success": true,
  "status": "OK",
  "db": "ok",
  "timestamp": "2025-08-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.2.0"
}
```

### ログ監視
```bash
# サーバーログ
pm2 logs flickmv-api

# ワーカーログ (Cloud Run)
gcloud logging read "resource.type=cloud_run_job" --limit=50
```

### パフォーマンス監視
- **Lighthouse CI** - パフォーマンススコア
- **Sentry** - エラートラッキング  
- **Google Analytics** - ユーザー行動分析

## 🤝 貢献方法

### 開発フロー
1. **Issue** を作成または選択
2. **Feature branch** を作成
3. **開発・テスト** を実施
4. **Pull Request** を作成
5. **コードレビュー** を受ける
6. **main branch** にマージ

### コーディング規約
- **TypeScript** を使用
- **ESLint + Prettier** でコード品質維持
- **Conventional Commits** でコミットメッセージ統一
- **100% 型安全** を目指す

### テスト方針
- **単体テスト**: Jest + Testing Library
- **統合テスト**: API エンドポイント
- **E2Eテスト**: Playwright (今後追加予定)

## 📚 ドキュメント

### 開発者向け
- [API ドキュメント](./docs/api.md)
- [デプロイガイド](./docs/deployment.md)
- [開発環境構築](./docs/development.md)
- [トラブルシューティング](./docs/troubleshooting.md)

### ユーザー向け
- [ユーザーガイド](./docs/user-guide.md)
- [チュートリアル](./docs/tutorials.md)
- [FAQ](./docs/faq.md)
- [リリースノート](./CHANGELOG.md)

## 📄 ライセンス

MIT License - 詳細は [LICENSE](./LICENSE) ファイルを参照

## 🔗 リンク

- **本番サイト**: https://flickmv.com
- **ステージング**: https://staging.flickmv.com  
- **API ドキュメント**: https://api.flickmv.com/docs
- **サポート**: support@flickmv.com

## 👥 チーム

- **Product Owner**: プロダクトオーナー
- **Tech Lead**: テクニカルリード  
- **Frontend Team**: フロントエンド開発チーム
- **Backend Team**: バックエンド開発チーム
- **DevOps**: インフラ・運用チーム

---

## 🙏 謝辞

FlickMVの開発にご協力いただいた全ての方々に感謝いたします。

**Made with ❤️ by FlickMV Team**

---

*最終更新: 2025年8月15日*
