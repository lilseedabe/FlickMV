# 新しいSupabaseプロジェクト作成・設定ガイド

## 🎯 Step 1: Supabaseプロジェクト作成

1. **Supabaseにアクセス**
   - https://supabase.com にアクセス
   - GitHubアカウントでログイン

2. **新しいプロジェクト作成**
   - "New Project" をクリック
   - Organization: 個人アカウント選択
   - Project name: `flickmv-db`
   - Database Password: 強力なパスワード設定（推奨: 16文字以上）
   - Region: `Northeast Asia (Tokyo)` 選択
   - Pricing plan: `Free` 選択

3. **プロジェクト作成完了まで待機**
   - 約2-3分で完了

## 🔑 Step 2: 接続情報取得

1. **Settings → Database**に移動

2. **Connection string**セクションで以下をコピー:
   ```
   URI: postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

3. **Settings → API**に移動

4. **以下の情報をコピー:**
   - Project URL
   - anon public key
   - service_role key (secret)

## 🛠️ Step 3: .env設定更新

```env
# Supabase Database Connection
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SUPABASE_POSTGRES_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase Project Settings  
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=[ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE-ROLE-KEY]
```

## ✅ Step 4: 接続テスト・マイグレーション

```bash
# 1. 接続テスト
node test-db-connection.js

# 2. マイグレーション実行
npm run prisma:migrate:dev

# 3. Prismaクライアント生成
npm run prisma:generate

# 4. サーバー再起動テスト
npm run dev
```

## 🔍 トラブルシューティング

### エラー: "database does not exist"
- Supabaseプロジェクトの作成が完了していない
- 数分待ってから再試行

### エラー: "connection timeout"
- DATABASE_URLが間違っている
- パスワードが間違っている
- ファイアウォールの問題

### エラー: "authentication failed"
- パスワードが間違っている
- URLの[YOUR-PASSWORD]部分を実際のパスワードに置換していない

## 🎯 完了確認

✅ `node test-db-connection.js` が成功
✅ Prismaマイグレーションが成功
✅ ユーザーテーブルが作成されている
✅ APIサーバーが正常起動
