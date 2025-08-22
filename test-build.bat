@echo off
REM ===========================
REM FlickMV Local Build Test
REM ===========================

echo FlickMV ローカルビルドテストを開始します...

cd client

echo 既存のnode_modulesを削除中...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo npm cacheをクリア中...
npm cache clean --force

echo 依存関係をインストール中...
npm install --legacy-peer-deps

echo TypeScript型チェック中...
npm run type-check

echo ビルドテスト中...
npm run build

echo テスト完了！

pause