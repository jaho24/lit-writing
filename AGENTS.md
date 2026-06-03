# LitWrite — Agent Instructions

## Architecture

```
backend/          # Express + TypeScript + better-sqlite3 (CommonJS)
frontend/         # React 18 + Vite + TailwindCSS + Zustand (ESM)
```

Not a monorepo tool — two independent `package.json` files, no workspace config.

## Commands

| Scope | Command | Effect |
|---|---|---|
| `backend/` | `npm run dev` | `tsx watch src/index.ts` (auto-restart on changes) |
| `backend/` | `npm run build` | `tsc` → outputs to `dist/` |
| `backend/` | `npm start` | `node dist/index.js` |
| `frontend/` | `npm run dev` | Vite dev server on `:5173` |
| `frontend/` | `npm run build` | `tsc -b && vite build` |

No test, lint, or formatter scripts configured.

## Quick Start Order

1. `backend/`: `cp .env.example .env`, edit API keys, `npm install && npm run dev`
2. `frontend/`: `npm install && npm run dev`
3. Open `http://localhost:5173`

## Backend

### Entrypoint
`backend/src/index.ts` — mounts routes on `/api/*`, serves `/pdfs` as static.

### Database
- `backend/src/database.ts` — auto-creates `data/` dir, initializes `litwrite.db` with WAL mode, runs schema at module import time (side-effect import: `import './database'`).
- Schema defined inline in `database.ts` AND in `backend/src/schema.sql` (both identical — modify both).
- Tables: `libraries`, `literature`, `literature_libraries`, `annotations`, `tags`, `annotation_tags`, `writing_styles`, `generation_records`, `style_citation_markers`, `literature_libraries`.
- Uses `better-sqlite3` — synchronous API. Prepared statements exported as `statements` object.

### API Routes (`backend/src/routes/`)
| File | Prefix | Key ops |
|---|---|---|
| `literature.ts` | `/api/literature` | CRUD, search, library-assignment |
| `libraries.ts` | `/api/libraries` | Tree-structured CRUD |
| `upload.ts` | `/api/upload` | PDF upload + folder scan |
| `annotations.ts` | `/api/annotations` | CRUD, tag-based query |
| `tags.ts` | `/api/tags` | CRUD |
| `writingStyles.ts` | `/api/writing-styles` | CRUD |
| `generate.ts` | `/api/generate` | AI generation (POST) + generation records |

Each route file exports a default `Router`. Transactions use `db.transaction(() => { ... })()`.

### AI Writer (`backend/src/services/ai-writer.ts`)
- Calls DeepSeek / Qwen / Minimax API via `fetch()` (OpenAI-compatible endpoint).
- Falls back: `DEEPSEEK_API_KEY` → `QWEN_API_KEY` → `MINIMAX_API_KEY`, similarly for base URL and model.
- `.env` keys: `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL` / `QWEN_API_KEY`, `QWEN_BASE_URL`, `QWEN_MODEL` / `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`.
- Server port: `PORT` (default `3001`). Data dir: `DATA_DIR` (default `./data`). Max upload: `MAX_FILE_SIZE` (default `50000000`).

### PDF Parsing (`backend/src/services/pdf-parser.ts`)
- Uses `pdfjs-dist` v6 legacy build — import: `pdfjs-dist/legacy/build/pdf.mjs`.
- Extracts title/authors/year from PDF metadata or text heuristics.
- Confidence levels: `high` (from metadata), `medium` (regex match), `low` (text heuristic).

## Frontend

### Entrypoint
`frontend/index.html` → `src/main.tsx` → `src/App.tsx` → `src/components/Layout/Layout.tsx`

### State (Zustand)
Single store at `src/stores/appStore.ts`. Access with selector pattern:
```ts
const val = useAppStore(s => s.someField);
const { action1, action2 } = useAppStore();
```

### API Client (`src/api/client.ts`)
- Axios instance, base URL `/api` (proxied by Vite to `localhost:3001`).
- API objects: `literatureApi`, `libraryApi`, `uploadApi`, `annotationApi`, `tagApi`, `writingStyleApi`, `generateApi`.
- Upload uses `FormData` with `multipart/form-data` header and 120s timeout.
- Generation uses POST with timeout 120s (configured per-call).

### Components (`src/components/`)
- Organized by domain: `Annotations/`, `Layout/`, `Library/`, `Preview/`, `Tags/`, `Upload/`, `Writing/`.
- Named exports: `export function ComponentName()`.
- Icons from `lucide-react`.

### Path alias
`@/` → `src/` (configured in both `tsconfig.json` paths and `vite.config.ts` resolve alias). Currently NOT used in imports — all imports use relative paths.

### Styling
- TailwindCSS utility classes (via `postcss.config.js` + `tailwind.config.js`).
- Custom CSS in `src/styles/index.css` for PDF annotation overlay (`.annotation-highlight`, `.annotation-popup`, `.pdf-page-container`, `.pdf-text-layer`).
- Font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei'`.

## Conventions

- **Imports**: Relative paths (`../../stores/appStore`), NOT `@/` alias despite it being configured.
- **Component exports**: Named `export function X()` — not `export default` (except App.tsx, route files).
- **File naming**: PascalCase for components (`PDFPreview.tsx`), camelCase for utilities (`appStore.ts`, `client.ts`).
- **Backend route pattern**: `Router()` → named handlers → `export default router`.
- **DB operations**: Prepared statements from `statements` object. Multi-table ops wrapped in `db.transaction()`.
- **Error handling**: Backend returns `{ error: '...' }` with HTTP status. Frontend uses try/catch with `console.error`.
- **Type duplication**: Backend and frontend each have independent `types/index.ts` with overlapping interfaces. Keep in sync.

## Gotchas

- Backend DB schema runs on import — `import './database'` in `index.ts` triggers table creation.
- Backend `pdfjs-dist` import uses legacy build path: `pdfjs-dist/legacy/build/pdf.mjs`.
- Frontend `pdfjs-dist` uses standard import with worker URL: `new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url)`.
- Vite proxies `/api` and `/pdfs` to backend — no CORS issues in dev. In production, frontend `dist/` would need to be served or both on same origin.
- No tests exist for either package — any test setup starts from scratch.
- No linter/formatter configured — `eslint` or `prettier` would need to be added.
- `.env` is gitignored — always provide `.env.example` when adding new env vars.
- `dist/` is gitignored but tracked files exist in remote — need `git rm -r --cached dist/` if cleaning.
- The `litwrite/` directory at root is a stale copy of the working tree — actual tracked paths are `backend/` and `frontend/` at root level.

## Deployment (Alibaba Cloud ECS)

### Overview
- **Target**: Alibaba Cloud ECS, Alibaba Cloud Linux 3 (RHEL 9-based), PM2 + Nginx
- **Access**: IP-only (no domain), port 80
- **Scripts**: `deploy/deploy.sh` (first deploy), `deploy/update.sh` (subsequent updates)
- **Nginx config**: `deploy/nginx-litwrite.conf`

### Quick Deploy
```bash
# 1. 阿里云控制台 → 安全组 → 添加入方向规则：端口 22, 80, 443
# 2. SSH 连接服务器
ssh root@your-server-ip

# 3. 一键部署
curl -fsSL https://raw.githubusercontent.com/jaho24/lit-writing/main/deploy/deploy.sh | bash
# 或手动上传脚本后执行：
bash deploy/deploy.sh
```

### Post-Deploy Checklist
1. 编辑 `backend/.env` 填入 AI API Key
2. 阿里云安全组开放端口 22 (SSH), 80 (HTTP)
3. 访问 `http://your-server-ip` 验证

### Update (后续更新代码)
```bash
bash deploy/update.sh
# 或手动：
cd /var/www/litwrite && git pull origin main
cd backend && npm install && npm run build && pm2 restart litwrite-backend
cd frontend && npm install && npm run build && cp -r dist/* /usr/share/nginx/html/
```

### Key Paths on Server
| Item | Path |
|---|---|
| App code | `/var/www/litwrite` |
| Frontend static | `/usr/share/nginx/html` |
| SQLite DB | `/var/www/litwrite/backend/data/litwrite.db` |
| PDF files | `/var/www/litwrite/backend/data/pdfs/` |
| Nginx config | `/etc/nginx/conf.d/litwrite.conf` |
| PM2 logs | `pm2 logs litwrite-backend` |
| Backups | `/backup/` (auto: daily 2:00 DB, 3:00 PDFs, 30-day retention) |
