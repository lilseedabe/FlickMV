# FlickMV - AI音楽ビデオ作成プラットフォーム

> 🎉 **Vite移行完了！** より高速な開発体験を提供します

## 🎬 概要

FlickMVは、AIの力で誰でも簡単にプロレベルのミュージックビデオを作成できるWebプラットフォームです。初心者でも直感的に操作でき、上級者には高度な機能を提供します。

## ✨ 主な機能

### 🤖 AI支援機能
- **自動編集:** 音楽に合わせたビート同期編集
- **インテリジェントエフェクト:** AIによる最適エフェクト提案
- **自動カラーマッチング:** 統一感のある色調補正
- **🎵 音声解析・MVプロンプト生成 (NEW!):** Groq Whisper-large-v3による音声テキスト化とAIによるシーン別映像プロンプト自動生成

### 🎨 エディター機能
- **タイムライン編集:** 直感的なドラッグ&ドロップ
- **豊富なエフェクト:** 100+ プロ品質エフェクト
- **リアルタイムプレビュー:** 即座に結果確認

### 👥 初心者サポート
- **ステップバイステップチュートリアル:** 段階的学習
- **テンプレートライブラリ:** すぐに使える高品質テンプレート
- **24時間サポート:** 困ったときのヘルプ
- **🆓 フリープランでも体験可能:** 音声解析機能を月２回まで無料でお試しいただけます

## 🏗️ 技術スタック

### Frontend ⚡ **Vite移行完了！**
- **Vite 7.1.3** for 超高速開発サーバー（180ms起動！）
- **React 19.1.1** + **TypeScript 5.8.3**
- **TailwindCSS 3.4** for スタイリング
- **Framer Motion 12** for アニメーション
- **TanStack React Query 5** for 状態管理

### Backend
- **Node.js** + **Express** + **TypeScript 5.3**
- **Prisma 5.16** + **PostgreSQL** for データベース
- **pg-boss 9.0** for ジョブキュー
- **PM2** for プロセス管理

### Infrastructure
- **Docker** for コンテナ化
- **Cloud Run** for スケーラブルワーカー
- **Cloudflare R2** for ストレージ
- **Supabase** for データベースホスティング
- **Groq API** for 音声解析 (Whisper-large-v3)

## 📦 インストール & セットアップ

### 必要な環境
- Node.js 18+ (推奨: Node.js 20+)
- npm または yarn
- Docker (オプション)

### 🚀 クイックスタート

#### 方法1: 自動スクリプト使用（推奨）
```bash
# プロジェクトディレクトリに移動
cd "C:\Users\mayum\OneDrive\デスクトップ\FlickMV"

# 開発サーバーを起動（自動依存関係チェック付き）
dev-start.bat  # Windows
# または ./dev-start.sh  # macOS/Linux
```

#### 方法2: 手動セットアップ
```bash
# リポジトリをクローン
git clone https://github.com/your-org/flickmv.git
cd flickmv

# 全依存関係をインストール
npm run install-all

# 環境変数を設定
cp server/.env.example server/.env
# .env ファイルを編集して必要な値を設定

# Prismaクライアント生成
cd server && npx prisma generate

# 開発サーバーを起動
npm run dev
```

### アクセスURL
- **🌐 クライアント**: http://localhost:5173/
- **🔧 サーバーAPI**: http://localhost:5000/api/
- **📊 開発情報**: Viteの高速HMRで即座に変更反映

### 環境変数設定

```bash
# server/.env
# データベース
DATABASE_URL=postgresql://user:password@localhost:5432/flickmv

# API設定  
PORT=5000
INTERNAL_API_KEY=your-secret-key
CLIENT_URL=http://localhost:5173

# AI Services
GROQ_API_KEY=your-groq-api-key

# クラウドストレージ (オプション)
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
R2_BUCKET=flickmv-exports
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
```

## 🚀 開発

### ⚡ Vite開発の恩恵
- **超高速起動**: 180ms でサーバー起動
- **瞬間HMR**: 変更が即座に反映
- **最適化ビルド**: 効率的なコードスプリッティング
- **TypeScript統合**: ネイティブサポート

### 利用可能なスクリプト

```bash
# 開発モード (フロントエンド + バックエンド)
npm run dev
# → Viteクライアント: http://localhost:5173/
# → Expressサーバー: http://localhost:5000/

# 型チェック
cd client && npm run type-check
cd server && npm run type-check

# ビルド
cd client && npm run build  # → dist/ フォルダに出力
cd server && npm run build  # → dist/ フォルダに出力

# プレビュー（ビルド結果確認）
cd client && npm run preview

# コード品質
cd client && npm run lint
```

### 🎵 音声解析機能のセットアップ (NEW!)

GroqのWhisper-large-v3を使用した音声解析機能を利用するには:

```bash
# 1. 自動セットアップスクリプトを実行 (推奨)
# Windows
.\setup-audio-analysis.bat

# macOS/Linux  
./setup-audio-analysis.sh

# 2. 手動セットアップ
# Groq APIキーを取得: https://console.groq.com
# .envファイルに追加:
echo "GROQ_API_KEY=your-api-key-here" >> server/.env

# 3. テスト実行
node server/test-audio-analysis.js
```

詳細な使用方法については [音声解析ガイド](./AUDIO_ANALYSIS_GUIDE.md) を参照してください。

### 🛠️ 開発ツール

#### 便利なバッチファイル
```bash
# 開発サーバー起動（依存関係チェック付き）
dev-start.bat

# GitHubプッシュ + VPSデプロイ案内
quick-deploy.bat
```

#### 開発フロー
詳細な開発ワークフローは [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) を参照

### プロジェクト構造

```
FlickMV/
├── client/                      # Vite + React フロントエンド
│   ├── src/
│   │   ├── components/          # 再利用可能コンポーネント
│   │   ├── pages/              # ページコンポーネント
│   │   ├── hooks/              # カスタムフック
│   │   ├── contexts/           # React Context
│   │   ├── services/           # API クライアント
│   │   ├── types/              # TypeScript 型定義
│   │   └── utils/              # ユーティリティ関数
│   ├── dist/                   # ビルド出力 (Vite)
│   ├── vite.config.ts          # Vite設定
│   ├── tailwind.config.js      # TailwindCSS設定
│   └── package.json
├── client-react-scripts-backup/ # 旧CRA版バックアップ
├── server/                     # Node.js + Express バックエンド
│   ├── src/
│   │   ├── routes/             # API ルート
│   │   ├── services/           # ビジネスロジック
│   │   ├── middleware/         # Express ミドルウェア
│   │   ├── models/             # データモデル
│   │   └── utils/              # ユーティリティ
│   ├── dist/                   # TypeScriptビルド出力
│   ├── prisma/                 # Prisma設定・マイグレーション
│   └── package.json
├── worker/                     # 動画処理ワーカー
├── DEVELOPMENT_WORKFLOW.md     # 開発フローガイド
├── dev-start.bat              # 開発サーバー起動
├── quick-deploy.bat           # 簡単デプロイ
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

| プラン | 料金 | 音声解析 | 動画エクスポート | 解像度 | 透かし |
|--------|------|----------|----------|--------|--------|
| フリー | ¥0 | 2回/月 | 3回/月 | 720p | あり |
| ベーシック | ¥980 | 8回/月 | 15回/月 | 1080p | あり |
| プロ | ¥1,980 | 25回/月 | 50回/月 | 4K | 削除可能 |
| プレミアム | ¥2,980 | 無制限 | 無制限 | 4K | 削除可能 |

## 🔧 デプロイメント

### VPS本番環境デプロイ

#### 基本デプロイフロー
```bash
# 1. ローカル開発完了後
cd "C:\Users\mayum\OneDrive\デスクトップ\FlickMV"
git add .
git commit -m "新機能追加"
git push origin main

# 2. VPSにSSH接続
ssh username@your-vps-ip

# 3. 自動デプロイスクリプト実行
cd /var/www/flickmv
./deploy.sh
```

#### 手動デプロイ手順
```bash
# VPSでの手動デプロイ
cd /var/www/flickmv
git pull origin main

# クライアント更新（Vite）
cd client
npm install  # package.json変更時のみ
npm run build  # → dist/ フォルダに出力

# サーバー更新
cd ../server
npm install  # package.json変更時のみ
npm run build

# Prisma更新（必要時）
npx prisma generate
npx prisma migrate deploy

# PM2再起動
pm2 restart flickmv-api
pm2 logs flickmv-api --lines 10
```

#### Nginx設定（Vite対応）
```nginx
# /etc/nginx/sites-available/flickmv-temp
location / {
    root /var/www/flickmv/client/dist;  # Viteビルド出力
    index index.html index.htm;
    try_files $uri $uri/ /index.html;
}

location /api/ {
    proxy_pass http://localhost:5000/api/;
    # ... その他プロキシ設定
}
```

### Docker デプロイ
```bash
# Dockerイメージビルド
docker build -t flickmv .

# コンテナ起動
docker run -d \
  --name flickmv \
  -p 5173:5173 \
  -p 5000:5000 \
  --env-file .env \
  flickmv
```

## 📊 監視・メンテナンス

### ヘルスチェック
```bash
# APIヘルス確認
curl https://flickmv.jp/api/health

# レスポンス例
{
  "success": true,
  "status": "OK",
  "db": "ok",
  "timestamp": "2025-08-24T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.2.0",
  "build": "vite"
}
```

### パフォーマンス指標
- **Lighthouse**: 90+ スコア維持
- **Core Web Vitals**: 全て良好
- **ビルドサイズ**: 最適化済み
- **初回読み込み**: <3秒

### ログ監視
```bash
# VPSでのログ確認
pm2 logs flickmv-api
pm2 monit

# Nginxログ
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🚀 Vite移行の恩恵

### パフォーマンス向上
- **開発サーバー起動**: 数秒 → **180ms**
- **HMR**: より高速な変更反映
- **ビルド時間**: 大幅短縮
- **バンドルサイズ**: 最適化

### 開発体験向上
- **TypeScript統合**: ネイティブサポート
- **プラグインシステム**: 豊富なエコシステム
- **ES modules**: モダンJavaScript
- **Tree shaking**: 未使用コード除去

## 🤝 貢献方法

### 開発フロー
1. **Issue** を作成または選択
2. **Feature branch** を作成 (`git checkout -b feature/new-feature`)
3. **開発・テスト** を実施
4. **Pull Request** を作成
5. **コードレビュー** を受ける
6. **main branch** にマージ

### コーディング規約
- **TypeScript** を使用（strict mode）
- **ESLint + Prettier** でコード品質維持
- **Conventional Commits** でコミットメッセージ統一
- **Vite** 最適化パターンの活用

## 📚 ドキュメント

### 開発者向け
- **[開発ワークフロー](./DEVELOPMENT_WORKFLOW.md)** - 詳細な開発フロー
- [API ドキュメント](./docs/api.md)
- [音声解析ガイド](./AUDIO_ANALYSIS_GUIDE.md)
- [デプロイガイド](./docs/deployment.md)

### ユーザー向け
- [ユーザーガイド](./docs/user-guide.md)
- [チュートリアル](./docs/tutorials.md)
- [FAQ](./docs/faq.md)
- [リリースノート](./CHANGELOG.md)

## 📄 ライセンス

MIT License - 詳細は [LICENSE](./LICENSE) ファイルを参照

## 🔗 リンク

- **本番サイト**: https://flickmv.jp
- **API ドキュメント**: https://flickmv.jp/api/docs
- **サポート**: support@flickmv.com

## 👥 チーム

FlickMV開発チームによる継続的な改善とサポート

---

## 🙏 謝辞

FlickMVの開発・Vite移行にご協力いただいた全ての方々に感謝いたします。

**Made with ❤️ and ⚡ Vite by FlickMV Team**

---

*最終更新: 2025年8月24日 - Vite移行完了*
