# ===========================
# FlickMV VPS転送コマンド
# ローカル → シンVPS (162.43.72.195)
# ===========================

📦 転送方法A: SCP（推奨）

# Windows コマンドプロンプトで実行
cd "C:\Users\mayum\OneDrive\デスクトップ"

# FlickMVフォルダ全体を転送
scp -r FlickMV root@162.43.72.195:/var/www/

# パスワード入力後、転送開始

📦 転送方法B: WinSCP（GUI）

1. WinSCPをダウンロード・インストール
2. ホスト名: 162.43.72.195
3. ユーザー名: root  
4. FlickMVフォルダをドラッグ&ドロップ

📦 転送方法C: Git（リポジトリ使用）

# GitHub等にプッシュ後、VPS側でクローン
git clone https://github.com/your-username/FlickMV.git /var/www/flickmv

⚡ 転送後の作業（VPS側）

ssh root@162.43.72.195
cd /var/www/FlickMV
chmod +x deploy/deploy-production.sh
./deploy/deploy-production.sh

結果: https://flick.jp でFlickMV稼働開始！