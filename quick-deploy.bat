@echo off
echo 🚀 FlickMV 開発フロー - 簡単デプロイ
echo.

REM プロジェクトディレクトリに移動
cd "C:\Users\mayum\OneDrive\デスクトップ\FlickMV"

echo 📝 現在の変更ファイル一覧:
git status --short
echo.

REM コミットメッセージの入力を求める
set /p commit_msg="💬 コミットメッセージを入力してください: "

REM コミットメッセージが空の場合はデフォルトを使用
if "%commit_msg%"=="" set commit_msg=更新: 開発中の変更を反映

echo.
echo 📤 GitHubに反映中...
git add .
git commit -m "%commit_msg%"
git push origin main

echo.
echo ✅ GitHub反映完了！
echo.
echo 🌐 VPSデプロイを実行しますか？ (y/N):
set /p deploy_choice="選択: "

if /i "%deploy_choice%"=="y" (
    echo.
    echo 🚀 VPSデプロイ手順を表示します:
    echo.
    echo ssh username@your-vps-ip
    echo cd /var/www/flickmv
    echo ./deploy.sh
    echo.
    echo または手動デプロイ:
    echo git pull origin main
    echo cd client ^&^& npm install ^&^& npm run build
    echo cd ../server ^&^& npm install ^&^& npm run build  
    echo pm2 restart flickmv-api
    echo.
) else (
    echo.
    echo 📝 VPSデプロイは手動で実行してください
    echo 詳細は DEVELOPMENT_WORKFLOW.md を参照
)

echo.
echo 🎉 完了！
pause
