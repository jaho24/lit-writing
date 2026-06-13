# LitWrite

从阅读、标注到写作的一站式学术写作工具。

## 功能

- **文献管理** — 导入 PDF 文件或文件夹，自动提取元数据（标题、作者、年份），按文件夹分类收纳，支持移动文献到文件夹
- **PDF 阅读与标注** — 内置 PDF 预览（高 DPI 适配），文本高亮标注，标注颜色自动跟随标签颜色
- **标签知识组织** — 为标注分配标签，按标签聚合跨文献标注，打破论文边界组织观点
- **高级检索** — 按标签 AND/OR 逻辑检索标注与文献，支持高亮显示匹配内容
- **AI 对话写作** — 选择标注/文献作为参考材料，与 AI 多轮对话，一键插入编辑器
- **提示词管理** — 写作风格、模板、字数+语言三类独立选择，字数自定义输入，语言中/英切换，选中后一键应用到聊天框
- **写作工作区** — 三栏布局（标注筛选 / AI 对话 / 编辑器），可拖动调整宽度，支持一键收起
- **引用去重** — 同一篇文献的多个标注写作时，引文列表自动去重

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + TailwindCSS + Zustand |
| PDF 渲染 | pdfjs-dist (PDF.js) v4 |
| 富文本编辑 | TipTap |
| 后端 | Express + TypeScript + better-sqlite3 |
| PDF 解析 | pdfjs-dist v6 (legacy build) |
| AI 写作 | DeepSeek / Qwen / Minimax API (OpenAI 兼容接口) |

## 项目结构

```
backend/                # Express 后端 (CommonJS, target ES2022)
├── src/
│   ├── index.ts            # 服务器入口，挂载路由
│   ├── database.ts         # SQLite 初始化 + 迁移 + 预编译语句
│   ├── schema.sql          # 数据库 schema（与 database.ts 保持一致）
│   ├── routes/             # API 路由
│   │   ├── literature.ts   # 文献 CRUD + 高级检索
│   │   ├── libraries.ts    # 集合 CRUD
│   │   ├── upload.ts       # PDF 上传 + 文件夹扫描
│   │   ├── annotations.ts  # 标注 CRUD
│   │   ├── tags.ts         # 标签 CRUD
│   │   ├── writingStyles.ts# 写作风格 CRUD
│   │   ├── generate.ts     # AI 写作生成
│   │   ├── chat.ts         # AI 对话 + 线程管理
│   │   ├── config.ts       # AI 提供商配置
│   │   └── promptTemplates.ts # 提示词模板
│   ├── services/           # 业务服务
│   │   ├── ai-writer.ts    # AI 调用（callAIService + generateWriting + chatGenerate）
│   │   ├── writing-utils.ts# 标注/文献材料构建、引用生成
│   │   ├── pdf-parser.ts   # PDF 元数据提取
│   │   └── file-scanner.ts # 文件夹扫描
│   └── types/              # TypeScript 类型
└── package.json

frontend/               # React 前端 (ESM)
├── src/
│   ├── App.tsx             # 应用入口
│   ├── components/
│   │   ├── Layout/         # 主布局（文献列表 + 右侧面板/写作区）
│   │   ├── Library/        # 文献列表 + 文件夹分组
│   │   ├── Tags/           # 标签管理
│   │   ├── Annotations/    # 标注列表 + 弹窗
│   │   ├── Preview/        # PDF 预览 + 标注覆盖层
│   │   ├── Writing/        # 写作工作区
│   │   │   ├── WritingWorkspace.tsx  # 三栏可调整面板
│   │   │   ├── AnnotationFilter.tsx  # 标签下拉筛选 + 结果列表
│   │   │   ├── AIChatDialog.tsx      # AI 对话
│   │   │   ├── PromptManager.tsx     # 提示词管理（风格/模板/字数+语言）
│   │   │   ├── ChatInputBar.tsx      # 聊天输入栏（支持外部文本插入）
│   │   │   ├── NotebookEditor.tsx    # TipTap 编辑器
│   │   │   └── SearchResultCard.tsx  # 搜索结果卡片（勾选）
│   │   ├── Upload/         # 上传对话框
│   │   ├── Settings/       # 设置面板
│   │   └── Common/         # 通用组件
│   ├── stores/             # Zustand 状态管理
│   ├── api/                # Axios API 客户端
│   └── types/              # TypeScript 类型
└── package.json
```

## 快速开始

### 后端

```bash
cd backend
npm install
cp .env.example .env    # 编辑 .env 填入 AI API Key
npm run dev
```

后端默认运行在 `http://localhost:3001`

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`（Vite 自动代理 `/api` 和 `/pdfs` 到后端）

### AI API 配置

在 `backend/.env` 中配置，或通过前端设置面板动态切换：

- **DeepSeek**: `DEEPSEEK_API_KEY` + `DEEPSEEK_BASE_URL` + `DEEPSEEK_MODEL`
- **Qwen**: `QWEN_API_KEY` + `QWEN_BASE_URL` + `QWEN_MODEL`
- **Minimax**: `MINIMAX_API_KEY` + `MINIMAX_BASE_URL` + `MINIMAX_MODEL`

## API 端点

| 端点前缀 | 模块 |
|---|---|
| `/api/literature` | 文献 CRUD + 高级检索 (`POST /search-advanced`) |
| `/api/libraries` | 集合 CRUD（树形结构） |
| `/api/upload` | PDF 上传、文件夹扫描 |
| `/api/annotations` | 标注 CRUD、按标签查询 |
| `/api/tags` | 标签 CRUD（层级结构） |
| `/api/writing-styles` | 写作风格 CRUD |
| `/api/generate` | AI 写作生成、生成记录 |
| `/api/chat` | AI 对话生成、线程 CRUD、提示词模板 |
| `/api/config` | AI 提供商配置（增删改查、激活切换） |

## 部署

### 阿里云 ECS (PM2 + Nginx)

```bash
bash deploy/deploy.sh       # 首次部署
bash deploy/update.sh       # 后续更新
```

Nginx 配置见 `deploy/nginx-litwrite.conf`。

### Render + Vercel

- 后端部署到 Render（使用 `render.yaml`）
- 前端部署到 Vercel（使用 `vercel.json`），需设置 `VITE_BACKEND_URL` 环境变量指向 Render 后端地址

## License

MIT
