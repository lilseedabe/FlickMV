# 🚀 FlickMV 開発ワークフロー（Vite版）

> React → Vite移行完了後の標準的な開発フローガイド

## 📋 目次

1. [開発環境セットアップ](#開発環境セットアップ)
2. [ローカル開発](#ローカル開発)
3. [GitHubへの反映](#githubへの反映)
4. [VPSデプロイ](#vpsデプロイ)
5. [トラブルシューティング](#トラブルシューティング)

---

## 🛠️ 開発環境セットアップ

### 初回セットアップ
```powershell
# プロジェクトディレクトリに移動
cd "C:\Users\mayum\OneDrive\デスクトップ\FlickMV"

# 依存関係インストール（初回のみ）
npm run install-all

# 環境確認
node --version  # v18以上推奨
npm --version
```

### 依存関係バージョン
- **Node.js**: v18以上推奨
- **Vite**: 7.1.3
- **React**: 19.1.1
- **TypeScript**: 5.8.3

---

## 💻 ローカル開発

### 1. 開発サーバー起動
```powershell
cd "C:\Users\mayum\OneDrive\デスクトップ\FlickMV"
npm run dev
```

**起動確認:**
- 🌐 **クライアント**: http://localhost:5173/
- 🔧 **サーバー**: http://localhost:5000/
- 📊 **API**: http://localhost:5000/api/

### 2. 開発中のコマンド

#### 型チェック
```powershell
# クライアント側
cd client
npm run type-check

# サーバー側  
cd server
npm run type-check
```

#### ビルドテスト
```powershell
# クライアントビルド
cd client
npm run build
npm run preview  # ビルド結果プレビュー

# サーバービルド
cd server
npm run build
```

#### コード整形・リント
```powershell
cd client
npm run lint      # ESLint実行
npm run lint --fix # 自動修正
```

---

## 📤 GitHubへの反映

### 1. 変更をコミット
```powershell
# 変更ファイル確認
git status

# 変更をステージング
git add .

# コミットメッセージの例
git commit -m "feat: 新機能の追加"
git commit -m "fix: バグ修正"
git commit -m "style: UIデザイン改善"
git commit -m "perf: パフォーマンス向上"
git commit -m "docs: ドキュメント更新"
```

### 2. GitHubにプッシュ
```powershell
# mainブランチにプッシュ
git push origin main

# 新機能開発時（ブランチ運用）
git checkout -b feature/新機能名
git push origin feature/新機能名
# → GitHub上でPull Request作成
```

---

## 🚀 VPSデプロイ

### 方法1: 基本デプロイ
```bash
# VPSにSSH接続
ssh username@your-vps-ip

# プロジェクトディレクトリに移動
cd /var/www/flickmv

# 最新コードを取得
git pull origin main

# クライアント更新・ビルド
cd client
npm install  # package.json変更時のみ
npm run build

# サーバー更新・ビルド
cd ../server
npm install  # package.json変更時のみ
npm run build

# サーバー再起動
pm2 restart flickmv-api

# 動作確認
pm2 logs flickmv-api --lines 10
```

### 方法2: 自動デプロイスクリプト
```bash
# VPSで一括デプロイ実行
cd /var/www/flickmv
./deploy.sh
```

**deploy.shスクリプト内容:**
```bash
#!/bin/bash
echo "🚀 FlickMV デプロイ開始..."
git pull origin main
cd client && npm install && npm run build
cd ../server && npm install && npm run build
pm2 restart flickmv-api
pm2 list
echo "🎉 デプロイ完了！"
```

---

## 🏗️ プロジェクト構成

```
FlickMV/
├── 📁 client/               # Viteクライアント
│   ├── 📁 src/
│   ├── 📁 dist/            # ビルド出力
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── 📁 server/              # Express API
│   ├── 📁 src/
│   ├── 📁 dist/           # TypeScriptビルド出力
│   ├── package.json
│   └── tsconfig.json
├── package.json           # ルート設定
└── README.md
```

---

## 🔧 VPS環境詳細

### PM2プロセス管理
```bash
pm2 list                    # プロセス一覧
pm2 logs flickmv-api        # ログ確認
pm2 restart flickmv-api     # 再起動
pm2 stop flickmv-api        # 停止
pm2 start flickmv-api       # 開始
```

### Nginx設定
- **設定ファイル**: `/etc/nginx/sites-available/flickmv-temp`
- **ドキュメントルート**: `/var/www/flickmv/client/dist/`
- **APIプロキシ**: `localhost:5000` → `/api/`

---

## 🚨 トラブルシューティング

### よくある問題と解決法

#### 1. ローカル開発サーバーが起動しない
```powershell
# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install

# ポート5173が使用中の場合
netstat -ano | findstr :5173
# → プロセスを終了するか、Viteのポートを変更
```

#### 2. VPSデプロイで500エラー
```bash
# サーバーログ確認
pm2 logs flickmv-api --lines 30

# Nginxエラーログ確認
sudo tail -n 20 /var/log/nginx/error.log

# ファイル権限確認
sudo chown -R www-data:www-data /var/www/flickmv/client/dist/
```

#### 3. ビルドエラー
```bash
# TypeScriptエラーの場合
cd client && npm run type-check
cd server && npm run type-check

# 依存関係の問題
rm -rf node_modules package-lock.json
npm install
```

#### 4. データベース接続エラー
```bash
# サーバー環境変数確認
cat server/.env | grep -i database
cat server/.env | grep -i port

# Prisma再生成
cd server
npx prisma generate
```

---

## 📊 パフォーマンス指標

### Vite移行後の改善点
- **開発サーバー起動**: 数秒 → **180ms**
- **ビルド時間**: 大幅短縮
- **HMR**: より高速な更新
- **バンドルサイズ**: 最適化済み

### 監視すべき指標
- ビルドサイズ: `client/dist/` フォルダサイズ
- PM2メモリ使用量: `pm2 monit`
- レスポンス時間: ブラウザ開発者ツール

---

## ✅ デプロイチェックリスト

### プッシュ前
- [ ] ローカルでビルドエラーなし
- [ ] 型チェック通過
- [ ] 主要機能の動作確認
- [ ] コミットメッセージ適切

### デプロイ後
- [ ] https://flickmv.jp/ で正常表示
- [ ] API機能動作確認
- [ ] PM2プロセス正常
- [ ] エラーログなし

---

## 📞 サポート

### 緊急時の復旧
```bash
# VPSで前回の安定版に戻す
cd /var/www/flickmv
git log --oneline -5  # コミット履歴確認
git reset --hard <前回のコミットハッシュ>
./deploy.sh
```

### 開発チーム用
- **Git**: `main` ブランチが本番環境
- **Issue**: GitHubのIssuesで管理
- **ドキュメント**: このファイルと各種MDファイル

---

*最終更新: 2025年8月24日 - Vite移行完了*
