# LitWrite — 文献阅读与自动写作助手

从阅读、标注到写作的一站式学术工具。

## 功能

- **文献管理**：导入PDF文件或文件夹，自动提取元数据（标题、作者、年份、DOI等），按集合分类管理
- **PDF阅读标注**：内置PDF预览，文本高亮标注，标注颜色自动跟随标签颜色
- **标签知识组织**：为标注分配标签，按标签聚合跨文献标注，打破论文边界组织观点
- **写作工作区**：选择标签组→选择风格模式（仿写段落/期刊风格/自定义提示词）→AI生成带引用的学术段落

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + TailwindCSS + Zustand |
| PDF渲染 | pdfjs-dist (PDF.js) |
| 后端 | Express + TypeScript + better-sqlite3 |
| PDF解析 | pdf-parse |
| AI写作 | DeepSeek / Qwen API |

## 项目结构

```
litwrite/
├── backend/           # Express后端
│   ├── src/
│   │   ├── index.ts         # 服务器入口
│   │   ├── database.ts      # SQLite数据库
│   │   ├── schema.sql       # 数据库schema
│   │   ├── routes/          # API路由
│   │   ├── services/        # 业务服务
│   │   └── types/           # TypeScript类型
│   └── package.json
├── frontend/          # React前端
│   ├── src/
│   │   ├── App.tsx           # 应用入口
│   │   ├── components/       # UI组件
│   │   ├── stores/           # Zustand状态管理
│   │   ├── api/              # API客户端
│   │   └── types/            # TypeScript类型
│   └── package.json
├── .gitignore
└── README.md
```

## 快速开始

### 后端

```bash
cd backend
npm install
cp .env.example .env    # 编辑.env填入AI API Key
npm run dev
```

后端默认运行在 `http://localhost:3001`

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`

### AI API配置

在 `backend/.env` 中配置：

- **DeepSeek**: 设置 `DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL=https://api.deepseek.com/v1`、`DEEPSEEK_MODEL=deepseek-chat`
- **Qwen**: 设置 `QWEN_API_KEY`、`QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1`、`QWEN_MODEL=qwen-plus`

## API端点

| 端点前缀 | 模块 |
|---|---|
| `/api/literature` | 文献CRUD |
| `/api/libraries` | 集合CRUD |
| `/api/upload` | PDF上传、文件夹扫描 |
| `/api/annotations` | 标注CRUD、按标签查询 |
| `/api/tags` | 标签CRUD |
| `/api/writing-styles` | 写作风格CRUD |
| `/api/generate` | AI写作生成、生成记录 |

## License

MIT