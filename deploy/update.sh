#!/bin/bash
set -e

APP_DIR="/var/www/litwrite"
BRANCH="main"

echo "[1] 拉取最新代码..."
cd ${APP_DIR}
git pull origin ${BRANCH}

echo "[2] 更新后端..."
cd ${APP_DIR}/backend
npm install
npm run build
pm2 restart litwrite-backend

echo "[3] 更新前端..."
cd ${APP_DIR}/frontend
npm install
npm run build
cp -r dist/* /usr/share/nginx/html/

echo "===== 更新完成 ====="
pm2 status