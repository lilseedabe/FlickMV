@echo off
chcp 65001 > nul
setlocal EnableDelayedExpansion

REM FlickMV Audio Analysis Setup Script (Windows)
REM このスクリプトは音声解析機能のセットアップを自動化します

echo.
echo ================================
echo  🚀 FlickMV Audio Analysis Setup
echo ================================
echo.

REM 環境チェック
echo 📋 環境チェック中...

REM Node.js バージョンチェック
node -v > nul 2>&1
if errorlevel 1 (
  echo ❌ Node.jsがインストールされていません
  echo 💡 https://nodejs.org から Node.js 18+ をインストールしてください
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%i in ('node -v') do (
  set NODE_MAJOR=%%i
  set NODE_MAJOR=!NODE_MAJOR:v=!
)

if "!NODE_MAJOR!"=="" (
  REM Fallback 取得
  for /f "tokens=1 delims=." %%j in ('node -p "process.versions.node"') do set NODE_MAJOR=%%j
)

if !NODE_MAJOR! LSS 18 (
  echo ❌ Node.js 18以上が必要です（現在: 
  node -v
  echo ）
  pause
  exit /b 1
)

echo ✅ Node.js
node -v
echo.

REM パッケージインストール
echo 📦 依存関係のインストール...
echo.

REM サーバー側
echo 🔧 サーバー側パッケージをインストール中...
pushd server > nul
npm install axios form-data
if errorlevel 1 (
  echo ❌ サーバー側パッケージのインストールに失敗しました
  popd > nul
  pause
  exit /b 1
)
echo ✅ サーバー側パッケージ完了
popd > nul
echo.

REM クライアント側
echo 🎨 クライアント側パッケージを確認中...
pushd client > nul
npm install
if errorlevel 1 (
  echo ❌ クライアント側パッケージのインストールに失敗しました
  popd > nul
  pause
  exit /b 1
)
echo ✅ クライアント側パッケージ完了
popd > nul
echo.

REM 環境変数の設定確認
echo 🔑 環境変数の設定確認...
echo.

if not exist "server\.env" (
  echo ⚠️  .envファイルが見つかりません
  echo 📝 .env.exampleから.envファイルを作成中...
  copy "server\.env.example" "server\.env" > nul
  if errorlevel 1 (
    echo ❌ .envファイルのコピーに失敗しました
  ) else (
    echo ✅ .envファイルを作成しました
  )
  echo.
)

REM Groq APIキーチェック
findstr /C:"your-groq-api-key" "server\.env" > nul
if not errorlevel 1 (
  echo ⚠️  Groq APIキーが設定されていません
  echo 💡 以下の手順でAPIキーを設定してください:
  echo    1. https://console.groq.com でAPIキーを取得
  echo    2. server\.env ファイルの GROQ_API_KEY を更新
  echo.
) else (
  echo ✅ Groq APIキーが設定されています
  echo.
)

REM データベース設定チェック
findstr /C:"postgres://USER:PASSWORD@HOST" "server\.env" > nul
if not errorlevel 1 (
  echo ⚠️  データベース接続が設定されていません
  echo 💡 server\.env ファイルの DATABASE_URL を実際の値に更新してください
  echo.
) else (
  echo ✅ データベース接続が設定されています
  echo.
)

REM Prisma セットアップ
echo 🗄️  Prismaセットアップ...
pushd server > nul

REM Prisma 生成
echo 🔄 Prisma clientを生成中...
npm run prisma:generate
if errorlevel 1 (
  echo ❌ Prisma client生成に失敗しました
  echo 💡 DATABASE_URLが正しく設定されているか確認してください
  echo.
) else (
  echo ✅ Prisma client生成完了
  echo.
)

popd > nul

REM テスト実行（存在する場合のみ）
if exist "server\test-audio-analysis.js" (
  echo 🧪 基本機能テスト...
  pushd server > nul
  node test-audio-analysis.js
  popd > nul
) else (
  echo ℹ️  server\test-audio-analysis.js が見つからないためテストをスキップします
)
echo.

REM 完了メッセージ
echo 🎉 セットアップ完了!
echo ================================
echo 📚 次のステップ:
echo    1. server\.env ファイルで Groq APIキー を設定
echo    2. データベース接続情報を設定
echo    3. npm run dev でサーバーを起動
echo    4. 別ターミナルでクライアントを起動 (cd client ^&^& npm start)
echo.
echo 📖 詳細ガイド: AUDIO_ANALYSIS_GUIDE.md
echo 🐛 問題がある場合: GitHub Issues または Discord
echo.

pause