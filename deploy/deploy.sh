#!/bin/bash
# ============================================================
# LitWrite 阿里云 ECS 一键部署脚本
# 系统：Alibaba Cloud Linux 3 (基于 RHEL 9)
# 方式：PM2 + Nginx，无域名（IP 直接访问）
# ============================================================

set -e

# ---- 配置区（按需修改） ----
APP_DIR="/var/www/litwrite"
REPO_URL="git@github.com:jaho24/lit-writing.git"
BRANCH="main"
NODE_VERSION="20"
BACKEND_PORT=3001

# ---- 颜色输出 ----
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ---- 检查是否 root ----
if [ "$EUID" -ne 0 ]; then
  error "请用 root 用户执行此脚本"
fi

info "===== LitWrite 阿里云 ECS 部署开始 ====="

# ============================================================
# 1. 系统基础配置
# ============================================================
info "1. 配置系统软件源..."

# Alibaba Cloud Linux 3 使用 dnf
dnf makecache || warn "dnf makecache 失败，继续..."

# 安装基础工具
dnf install -y git curl wget vim tar unzip || error "基础工具安装失败"

# ============================================================
# 2. 安装 Node.js 20
# ============================================================
info "2. 安装 Node.js ${NODE_VERSION}..."

# 使用 NodeSource 安装 Node.js 20 (Alibaba Cloud Linux 3 兼容 RHEL 9)
curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
dnf install -y nodejs || error "Node.js 安装失败"

node -v && npm -v
info "Node.js 安装完成"

# ============================================================
# 3. 安装 PM2（进程管理）
# ============================================================
info "3. 安装 PM2..."
npm install -g pm2 || error "PM2 安装失败"

# ============================================================
# 4. 安装 Nginx
# ============================================================
info "4. 安装 Nginx..."

# Alibaba Cloud Linux 3 可以直接用 dnf 安装 nginx
dnf install -y nginx || error "Nginx 安装失败"

# 启动并设置开机自启
systemctl enable nginx
systemctl start nginx
info "Nginx 安装完成"

# ============================================================
# 5. 配置阿里云安全组（提示）
# ============================================================
warn "5. 请在阿里云控制台配置安全组，开放以下端口："
echo ""
echo "  端口 22   → SSH 远程登录"
echo "  端口 80   → HTTP 网页访问"
echo "  端口 443  → HTTPS（后续可配）"
echo ""
echo "  操作路径：阿里云控制台 → ECS → 实例 → 安全组 → 配置规则 → 添加入方向规则"
echo ""
read -p "已配置安全组？继续部署 (y/n): " confirm
if [ "$confirm" != "y" ]; then
  warn "请先配置安全组再继续"
  exit 0
fi

# ============================================================
# 6. 拉取代码
# ============================================================
info "6. 拉取代码..."

# 创建应用目录
mkdir -p ${APP_DIR}

# 检查是否已有代码
if [ -d "${APP_DIR}/.git" ]; then
  info "代码已存在，拉取最新版本..."
  cd ${APP_DIR}
  git pull origin ${BRANCH} || warn "git pull 失败，使用现有代码"
else
  info "首次部署，克隆仓库..."
  # 优先尝试 SSH，失败则用 HTTPS
  if git clone ${REPO_URL} ${APP_DIR} 2>/dev/null; then
    info "SSH 克隆成功"
  else
    warn "SSH 克隆失败，尝试 HTTPS..."
    git clone https://github.com/jaho24/lit-writing.git ${APP_DIR} || error "代码克隆失败"
  fi
fi

cd ${APP_DIR}

# ============================================================
# 7. 部署后端
# ============================================================
info "7. 部署后端..."

cd ${APP_DIR}/backend

# 安装依赖
npm install || error "后端依赖安装失败"

# 配置环境变量
if [ ! -f ".env" ]; then
  info "创建 .env 文件..."
  cp .env.example .env
  warn "请编辑 .env 填入你的 AI API Key！"
  warn "运行: vim ${APP_DIR}/backend/.env"
  echo ""
  read -p "是否现在编辑 .env？(y/n): " edit_env
  if [ "$edit_env" = "y" ]; then
    vim .env
  fi
fi

# 构建
npm run build || error "后端构建失败"

# 创建数据目录
mkdir -p data/pdfs

# 用 PM2 启动后端
pm2 delete litwrite-backend 2>/dev/null || true  # 清理旧进程
pm2 start dist/index.js --name litwrite-backend || error "后端启动失败"
pm2 save

info "后端部署完成，端口 ${BACKEND_PORT}"

# ============================================================
# 8. 部署前端
# ============================================================
info "8. 部署前端..."

cd ${APP_DIR}/frontend

# 安装依赖
npm install || error "前端依赖安装失败"

# 修改 vite.config.ts 中的 API 代理（生产环境不需要代理，直接请求同源）
# 构建前端（输出到 dist/）
npm run build || error "前端构建失败"

# 将构建产物部署到 Nginx 目录
rm -rf /usr/share/nginx/html/*
cp -r dist/* /usr/share/nginx/html/ || error "前端文件复制失败"

info "前端部署完成"

# ============================================================
# 9. 配置 Nginx
# ============================================================
info "9. 配置 Nginx..."

cat > /etc/nginx/conf.d/litwrite.conf << 'NGINX_EOF'
server {
    listen 80 default_server;
    server_name _;

    client_max_body_size 50m;

    # 前端静态文件
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理到后端
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # PDF 文件代理到后端
    location /pdfs {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
}
NGINX_EOF

# 移除默认 server 配置的冲突
# 确保 nginx.conf 中 default_server 只有一个
sed -i 's/default_server//' /etc/nginx/nginx.conf 2>/dev/null || true

# 测试 Nginx 配置
nginx -t || error "Nginx 配置有错误"
systemctl restart nginx

info "Nginx 配置完成"

# ============================================================
# 10. 配置 PM2 开机自启
# ============================================================
info "10. 配置 PM2 开机自启..."
pm2 startup || warn "PM2 startup 需要 root 权限，可能已配置"
pm2 save

# ============================================================
# 11. 配置防火墙（Alibaba Cloud Linux 3 firewalld）
# ============================================================
info "11. 配置本地防火墙..."

# Alibaba Cloud Linux 3 使用 firewalld
systemctl enable firewalld
systemctl start firewalld 2>/dev/null || true

firewall-cmd --permanent --add-service=http || true
firewall-cmd --permanent --add-service=https || true
firewall-cmd --permanent --add-service=ssh || true
firewall-cmd --reload || true

info "防火墙配置完成"

# ============================================================
# 12. 数据库备份定时任务
# ============================================================
info "12. 配置数据库自动备份..."

mkdir -p /backup

# 每天凌晨 2 点备份 SQLite 数据库和 PDF 文件
cat > /etc/cron.d/litwrite-backup << 'CRON_EOF'
0 2 * * * root cp /var/www/litwrite/backend/data/litwrite.db /backup/litwrite-$(date +\%Y\%m\%d).db && find /backup -name "litwrite-*.db" -mtime +30 -delete
0 3 * * * root tar czf /backup/pdfs-$(date +\%Y\%m\%d).tar.gz -C /var/www/litwrite/backend/data pdfs && find /backup -name "pdfs-*.tar.gz" -mtime +30 -delete
CRON_EOF

info "自动备份配置完成（每天 2:00 备份数据库，3:00 备份 PDF，保留 30 天）"

# ============================================================
# 完成
# ============================================================
echo ""
info "===== 部署完成 ====="
echo ""
echo "  访问地址: http://$(curl -s ifconfig.me || echo '你的服务器公网IP')"
echo ""
echo "  后端状态: pm2 status"
echo "  后端日志: pm2 logs litwrite-backend"
echo "  重启后端: pm2 restart litwrite-backend"
echo "  Nginx 状态: systemctl status nginx"
echo ""
echo "  后续更新代码:"
echo "    cd ${APP_DIR}"
echo "    git pull origin ${BRANCH}"
echo "    cd backend && npm install && npm run build && pm2 restart litwrite-backend"
echo "    cd frontend && npm install && npm run build && cp -r dist/* /usr/share/nginx/html/"
echo ""