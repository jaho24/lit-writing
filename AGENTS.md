# LitWrite — Agent Instructions

## Architecture

```
backend/          # Express + TypeScript + better-sqlite3 (CommonJS, target ES2022)
frontend/         # React 18 + Vite + TailwindCSS + Zustand (ESM, type: "module")
```

Not a monorepo — two independent `package.json` files, no workspace config.

## Commands

| Scope | Command | Effect |
|---|---|---|
| `backend/` | `npm run dev` | `tsx watch src/index.ts` (auto-restart on changes) |
| `backend/` | `npm run build` | `tsc` → outputs to `dist/` |
| `backend/` | `npm start` | `node dist/index.js` |
| `frontend/` | `npm run dev` | Vite dev server on `:5173` |
| `frontend/` | `npm run build` | `tsc -b && vite build` |

No test, lint, or formatter scripts configured.

## Quick Start

1. `backend/`: `cp .env.example .env`, edit AI API key, `npm install && npm run dev`
2. `frontend/`: `npm install && npm run dev`
3. Open `http://localhost:5173`

## Backend

### Entrypoint
`backend/src/index.ts` — mounts routes on `/api/*`, serves `/pdfs` as static, health check at `/api/health`. Includes global error handler middleware.

### Database
- `backend/src/database.ts` — auto-creates `data/` dir, initializes `litwrite.db` with WAL mode, runs schema **and inline migrations** at module import time (side-effect import: `import './database'` in `index.ts`).
- Schema defined inline in `database.ts` AND in `backend/src/schema.sql` (both must stay identical — modify both when changing schema).
- **Inline migrations**: `database.ts` contains a `MIGRATIONS` array that adds columns if missing, and a block that recreates the `annotations` table to add the `underline` type to the CHECK constraint. Any future schema changes should add entries to this migrations array.
- Tables: `libraries`, `literature`, `literature_libraries`, `annotations`, `tags`, `annotation_tags`, `writing_styles`, `generation_records`, `ai_config`, `chat_threads`, `chat_messages`, `prompt_templates`.
- Uses `better-sqlite3` — synchronous API. Prepared statements exported as `statements` object.
- Centralized prepared statements: `getLiteratureTags`, `propagateTagColor`, `getTagAnnotationsWithLiterature`, `getAnnotationTags` are defined in `database.ts` and used across route files.

### API Routes (`backend/src/routes/`)
| File | Prefix | Key ops |
|---|---|---|
| `literature.ts` | `/api/literature` | CRUD, search, library-assignment, star/priority, **advanced search** (`POST /search-advanced`) |
| `libraries.ts` | `/api/libraries` | Tree-structured CRUD (input validation on name) |
| `upload.ts` | `/api/upload` | PDF upload + folder scan (error handling on /folder) |
| `annotations.ts` | `/api/annotations` | CRUD, tag-based query |
| `tags.ts` | `/api/tags` | CRUD, hierarchical (uses centralized prepared statements) |
| `writingStyles.ts` | `/api/writing-styles` | CRUD (input validation on name/style_prompt/citation_format) |
| `generate.ts` | `/api/generate` | AI generation (POST) + generation records |
| `config.ts` | `/api/config` | AI provider config CRUD (create/read/update/delete active provider) |
| `chat.ts` | `/api/chat` | Chat generation (POST /generate), thread CRUD, prompt templates |
| `translate.ts` | `/api/translate` | Text translation (POST /), accepts `{text, target_language}`, calls `callAIService` with academic translation prompt |

Each route file exports a default `Router`. Transactions use `db.transaction(() => { ... })()`.

### Advanced Search (`POST /api/literature/search-advanced`)
- Accepts: `library_id`, `type_filter` (`all`/`annotations`/`abstracts`/`notes`), `tag_ids`, `tag_logic` (`AND`/`OR`).
- Returns `SearchResultItem[]` with `type` (`literature`|`annotation`), `excerpt`, `highlightRanges`, `tags`.
- AND logic: `HAVING COUNT(DISTINCT at.tag_id) = ?` to ensure all tags matched.
- OR logic: `DISTINCT` match on any tag.
- Computes highlight ranges by matching tag names in excerpt text.

### AI Writer (`backend/src/services/ai-writer.ts`)
- Calls DeepSeek / Qwen / Minimax API via `fetch()` (OpenAI-compatible `/chat/completions` endpoint).
- `callAIService` — shared core that calls the OpenAI-compatible endpoint; now **exported** so translate and other routes can use it directly. `generateWriting` and `chatGenerate` are thin wrappers.
- **Two-tier config**: first checks `ai_config` table for an active provider set via `/api/config`; falls back to `.env` vars.
- Env fallback order: `DEEPSEEK_*` → `QWEN_*` → `MINIMAX_*` (for api_key, base_url, model).
- `.env` keys: `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL` / `QWEN_API_KEY`, `QWEN_BASE_URL`, `QWEN_MODEL` / `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`.
- Server port: `PORT` (default `3001`). Data dir: `DATA_DIR` (default `./data`). Max upload: `MAX_FILE_SIZE` (default `50000000`).

### Services (`backend/src/services/`)
- `ai-writer.ts` — AI generation via OpenAI-compatible chat API (`callAIService` (exported) + `generateWriting` + `chatGenerate`)
- `writing-utils.ts` — Shared writing utilities:
  - `AnnotationWithLiterature` / `LiteratureWithInfo` interfaces
  - `fetchAnnotationsWithLiterature(annotationIds)` — fetch annotations with literature metadata
  - `fetchAllAnnotationsForLiteratures(literatureIds)` — fetch all annotations belonging to given literatures
  - `fetchLiteraturesByIds(literatureIds)` — fetch literature metadata + abstracts
  - `buildAnnotationMaterial(annotations)` — format annotations as AI reference material
  - `buildLiteratureMaterial(literatures)` — format literature abstracts as AI reference material
  - `buildLiteratureMap(annotations)` → `Map<litId, LiteratureInfo>` for citation building
  - `addLiteraturesToMap(literatures, map)` — add directly-selected literatures to citation map
  - `buildCitationsFromLiteratureMap(map)` → `CitationItem[]` with `[1]` `[2]` markers
  - `parseJSONField(value, fallback)` — safe JSON.parse for DB fields
- `pdf-parser.ts` — PDF metadata extraction using `pdfjs-dist`
- `file-scanner.ts` — Folder scanning, delegates to `pdf-parser` for metadata

### Chat Flow (selection → insertion)
1. Frontend: user selects tags → `performSearch()` → gets `SearchResultItem[]`
2. Frontend: user checks items → `selectedAnnotationIds` stores both annotation IDs and literature IDs
3. Frontend: `sendChatMessage()` splits `selectedAnnotationIds` into `annotation_ids` (type=annotation) and `literature_ids` (type=literature)
4. Backend: `chat.ts` fetches annotation material + literature material + all annotations for selected literatures → combines into reference text → sends to AI
5. Backend: builds citations from combined literature map → returns content + citations
6. Frontend: user clicks "insert" → `editorRef.current.insertAtCursor(content)`

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
Key state slices: `libraries`, `literature`, `annotations`, `tags`, `writingStyles`, `aiConfig`, `openTabs`, `rightPanelTab`, `generationResult`, `isGenerating`, `searchResults`, `searchTypeFilter`, `searchPathId`, `searchTagLogic`, `selectedWritingTags`, `selectedAnnotationIds`, `chatMessages`, `isChatGenerating`, `chatThreads`, `promptTemplates`, `currentChatId`.

Key actions:
- `setSelectedWritingTags(tags)` → triggers `performSearch()` (no auto-select)
- `setSearchTagLogic(logic)` → triggers `performSearch()`
- `setSearchTypeFilter(filter)` → triggers `performSearch()`
- `setSearchPathId(id)` → triggers `performSearch()`
- `performSearch()` → calls `literatureApi.searchAdvanced()` with current filters
- `sendChatMessage(instruction)` → splits selected IDs by type, calls `chatApi.generate()`

### API Client (`src/api/client.ts`)
- Axios instance, base URL `/api` (proxied by Vite to `localhost:3001` in dev).
- Production: set `VITE_BACKEND_URL` env var (e.g. `https://litwrite-api.onrender.com`) — client switches baseURL to `${VITE_BACKEND_URL}/api`.
- API objects: `literatureApi`, `libraryApi`, `uploadApi`, `annotationApi`, `tagApi`, `writingStyleApi`, `generateApi`, `configApi`, `chatApi`, `promptTemplateApi`.
- Upload uses `FormData` with `multipart/form-data` header and 120s timeout.
- Chat generation uses POST with timeout 120s.
- `getPdfUrl()` helper constructs PDF URL using `VITE_BACKEND_URL` in production.

### Components (`src/components/`)
Organized by domain: `Annotations/`, `Common/`, `Layout/`, `Library/`, `Preview/`, `Settings/`, `Tags/`, `Upload/`, `Writing/`.
Named exports: `export function ComponentName()`.
Icons from `lucide-react`.

### Writing Workspace (`src/components/Writing/`)
Three-panel layout using `react-resizable-panels` v4.11.2:
- **AnnotationFilter** — Tag dropdown selector (fixed-position dropdown with search), AND/OR toggle, select all/deselect all, search results list with checkbox selection
- **AIChatDialog** — Thread management, prompt/style selector, chat message list, input bar
- **NotebookEditor** — TipTap editor with Markdown support, toolbar, citation blocks
- **SearchResultCard** — Renders `SearchResultItem` with type badge, highlighted excerpt, checkbox
- **PanelHeader** — Collapsible toggle with polling-based `isCollapsed()` state

Panel sizes: 30% / 35% / 35% (filter / chat / editor), range 20-60% / 20-55% / 25-60%. Separator drag target 8px wide with visual 2px indicator. `resizeTargetMinimumSize: { coarse: 28, fine: 12 }`.

### Layout (`src/components/Layout/Layout.tsx`)
- Left panel (LibraryTree + TagManager) **always visible**, even in writing mode
- Middle panel (LiteratureList + splitter) hidden in writing mode
- Right panel: tab bar (preview/annotations/writing/settings) + content area
- Writing mode: `WritingWorkspace` renders inline in right panel

### Path alias
`@/` → `src/` (configured in `tsconfig.json` paths and `vite.config.ts` resolve alias). **Currently NOT used in imports** — all imports use relative paths.

### Styling
- TailwindCSS utility classes (via `postcss.config.js` + `tailwind.config.js`).
- Custom CSS in `src/styles/index.css` for PDF annotation overlay (`.annotation-highlight`, `.annotation-popup`, `.pdf-page-container`, `.pdf-text-layer`, `.pdf-annotation-overlay`).
- Font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei'`.

## Conventions

- **Imports**: Relative paths (`../../stores/appStore`), NOT `@/` alias despite it being configured.
- **Component exports**: Named `export function X()` — not `export default` (except `App.tsx`, route files).
- **File naming**: PascalCase for components (`PDFPreview.tsx`), camelCase for utilities (`appStore.ts`, `client.ts`).
- **Backend route pattern**: `Router()` → named handlers → `export default router`.
- **DB operations**: Prepared statements from `statements` object. Multi-table ops wrapped in `db.transaction()`.
- **Error handling**: Backend returns `{ error: '...' }` with HTTP status. Frontend uses try/catch with `console.error`. Global error middleware in `index.ts`.
- **Type duplication**: Backend and frontend each have independent `types/index.ts` with overlapping interfaces. Keep in sync when changing shared shapes.

## Gotchas

- Backend DB schema + migrations run on import — `import './database'` in `index.ts` triggers table creation and migration checks. New columns must be added to both the `CREATE TABLE` block AND the `MIGRATIONS` array.
- Backend `pdfjs-dist` v6 uses legacy build path: `pdfjs-dist/legacy/build/pdf.mjs`. Frontend `pdfjs-dist` v4 uses standard import + worker URL: `new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url)`. **These are different major versions** — backend v6, frontend v4.
- Vite proxies `/api` and `/pdfs` to backend — no CORS issues in dev. In production, frontend needs same-origin serving or `VITE_BACKEND_URL` set at build time.
- No tests exist for either package — any test setup starts from scratch.
- No linter/formatter configured — `eslint` or `prettier` would need to be added.
- `.env` is gitignored — always provide `.env.example` when adding new env vars.
- `backend/src/types/pdf-parse.d.ts` declares types for `pdf-parse`, but that module is no longer imported anywhere (pdf-parser uses `pdfjs-dist` instead). This type declaration is stale.
- The `litwrite/` directory at root is a stale copy of the working tree — actual tracked paths are `backend/` and `frontend/` at root level.
- `esbuild` is listed as a devDependency in both `package.json` files but has no build script — it's a transitive dependency of `tsx`/`vite`.
- `selectedAnnotationIds` stores mixed types: annotation IDs AND literature IDs from `SearchResultItem`. The `sendChatMessage` function splits them into `annotation_ids` and `literature_ids` before sending to backend. Do NOT pass `selectedAnnotationIds` directly as `annotation_ids` to the API.
- `TagSelector.tsx` exists but is no longer imported — tag selection is handled inline in `AnnotationFilter.tsx` via dropdown. Do not re-introduce `TagSelector` imports without reason.
- `AnnotationCard.tsx` exists but is not used in the writing workspace — it's kept for potential reuse. `SearchResultCard.tsx` is used instead.
- `PanelHeader` in `WritingWorkspace.tsx` uses 200ms polling interval to detect collapsed state (`panelRef.current?.isCollapsed()`). This is because `react-resizable-panels` doesn't expose a reactive state for collapse.
- AnnotationFilter's tag dropdown uses `fixed` positioning with `getBoundingClientRect()` to avoid being clipped by `overflow: hidden` on parent panels. Do NOT change to `absolute` positioning.
- `react-resizable-panels` Separator uses `flex-grow` and `flex-shrink` which cannot be overridden by CSS — the `w-2` class sets the visual width but flex properties are controlled by the library.

## Deployment

### Alibaba Cloud ECS (PM2 + Nginx)
- **Scripts**: `deploy/deploy.sh` (first deploy), `deploy/update.sh` (subsequent updates)
- **Nginx config**: `deploy/nginx-litwrite.conf` — proxies `/api` and `/pdfs` to backend `:3001`, serves frontend static from `/usr/share/nginx/html`
- **Key paths**: app code at `/var/www/litwrite`, DB at `/var/www/litwrite/backend/data/litwrite.db`, PDFs at `/var/www/litwrite/backend/data/pdfs/`

### Cloud Platform Configs
- `render.yaml` — backend deployed as Render web service (rootDirectory: `backend`)
- `vercel.json` — frontend deployed as Vercel site (rootDirectory: `frontend`, framework: `vite`)
- Frontend requires `VITE_BACKEND_URL` env var set to the Render backend URL at build time