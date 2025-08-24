@echo off
echo 🚀 FlickMV 開発サーバー起動
echo.

REM プロジェクトディレクトリに移動
cd "C:\Users\mayum\OneDrive\デスクトップ\FlickMV"

echo 📋 開発環境情報:
echo Node.js: 
node --version
echo npm:
npm --version
echo.

echo 🔧 依存関係チェック中...
if not exist "node_modules" (
    echo ⚠️  node_modules が見つかりません。インストール中...
    npm install
    echo.
)

if not exist "client/node_modules" (
    echo ⚠️  client/node_modules が見つかりません。インストール中...
    cd client && npm install && cd ..
    echo.
)

if not exist "server/node_modules" (
    echo ⚠️  server/node_modules が見つかりません。インストール中...
    cd server && npm install && cd ..
    echo.
)

echo ✅ 依存関係チェック完了
echo.

echo 🌐 開発サーバーを起動します...
echo.
echo 📍 アクセスURL:
echo   - クライアント: http://localhost:5173/
echo   - サーバーAPI:  http://localhost:5000/api/
echo.
echo 🛑 停止するには Ctrl+C を押してください
echo.

REM 開発サーバー起動
npm run dev
