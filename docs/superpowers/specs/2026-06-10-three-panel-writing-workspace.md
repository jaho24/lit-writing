# Three-Panel Writing Workspace Redesign

**Date**: 2026-06-10
**Status**: Draft (confirmed with user)
**Supersedes**: `2026-06-10-writing-workspace-ai-interaction-redesign.md`

## User-Confirmed Design Decisions

1. **标注卡片**: 默认选中，可以取消勾选来排除不想发给AI的标注
2. **提示词模板**: 新建独立的 `prompt_templates` 表（与 `writing_styles` 分开），内置总结/分析等通用模板，用户可自定义
3. **对话历史**: 后端持久化保存，支持跨会话恢复
4. **对话线程**: 独立对话管理——用户可新建/切换/删除对话线程，不与标签绑定
5. **编辑器形态**: 连续文本流，插入内容直接到光标位置
6. **插入方式**: 两种——一键插入按钮 + 选中AI内容部分片段后插入

## Problem

The current writing workspace is a two-panel layout (left: search+config, right: editor) with one-shot AI generation. Users cannot iterate on AI output, there's no conversational interaction with the AI, and the workflow from annotation selection → generation → editing is disconnected.

## Design Vision

A three-panel writing workspace with an AI-first conversational workflow:

```
┌──────────────┬──────────────────────┬───────────────────┐
│  标注筛选     │    AI 对话区          │   笔记本编辑器     │
│              │                      │                   │
│ [标签选择器]  │ [提示词管理 ▼]        │ [# Section 1]     │
│              │ ┌──────────────────┐  │ Markdown content  │
│ [标注卡片]   │ │ 对话消息列表      │  │                   │
│  📄 文献标题  │ │                  │  │ [# Section 2]     │
│  🏷 tag1 tag2│ │ 🤖 AI: 生成段落   │  │ More content      │
│  "标注文本..."│ │    [插入到编辑器]  │  │                   │
│              │ │                  │  │                   │
│              │ │ 👤 你: 润色第二段  │  │                   │
│              │ │ 🤖 AI: 修改后段落  │  │                   │
│              │ │    [插入到编辑器]  │  │                   │
│              │ └──────────────────┘  │                   │
│              │ ┌──────────────────┐  │                   │
│              │ │ 提示词: [综述风格] │  │                   │
│              │ │ 输入指令...     ➤ │  │                   │
│              │ └──────────────────┘  │                   │
└──────────────┴──────────────────────┴───────────────────┘
  20% collapsible     45% resizable        35% collapsible
```

### Core Workflow

1. **Left**: Select tags → see matching annotations (with literature source + tags) → check annotations to use
2. **Middle**: Select a prompt template → it appears in input area → edit if needed → type instruction → AI generates → see result with "Insert" button → continue chatting for refinement
3. **Right**: Click "Insert" → content lands at cursor position in notebook → freely edit

## Panel Details

### Left Panel: AnnotationFilter

**Responsibility**: Tag-based annotation retrieval and selection.

Components:
- **TagSelector**: Multi-select tag chips. Selecting tags triggers annotation fetch. Shows AND/OR toggle.
- **AnnotationList**: Scrollable list of annotation cards. Each card shows:
  - Annotation text (truncated)
  - Note (if any)
  - Literature source: title + authors + year
  - Tags on this annotation (colored chips)
  - Checkbox — **default checked (选中)**, can be unchecked to exclude from AI context
- **SelectionSummary**: Compact bar showing "已选 N/M 条标注" (selected vs total count)

State:
- `selectedWritingTags: number[]` — tag filter (existing store field)
- `selectedAnnotationIds: number[]` — which annotations to include in AI context. **On fetch, initialized to all annotation IDs** (default selected). Updated when user unchecks a card.
- `writingAnnotations: Annotation[]` — fetched annotations (existing store field)

### Middle Panel: AIChatDialog

**Responsibility**: Conversational AI writing with prompt management.

Components:
- **PromptManager** (collapsible section at top):
  - Two sections: "写作风格" (from `writing_styles` table) and "提示词模板" (from new `prompt_templates` table)
  - Writing styles: existing academic styles (文献综述, Nature风格, etc.)
  - Prompt templates: new generic templates (总结, 分析, 对比, 润色, etc.) + user-created custom templates
  - Click to select → template/style text appears in input area
  - Edit button → modify template text inline before sending (does not modify the saved template)
  - Create/Delete buttons for custom prompt templates
  - Collapsible via chevron toggle
- **ChatMessageList**: Scrollable message history
  - User messages: show instruction text + which annotations were referenced (as summary badge "引用了 N 条标注")
  - AI messages: show generated content in markdown + citations block + two insert actions:
    1. **"插入到编辑器" button**: inserts full AI response content at cursor
    2. **"选择插入" mode**: user can select a portion of the AI content (text selection), then click to insert only the selected fragment
  - Loading indicator during generation
- **ChatInputBar**: Bottom input area
  - Selected prompt/style shown as a removable chip above the input
  - Text input for free-form instruction (multi-line, Enter to send, Shift+Enter for newline)
  - Send button
  - "Regenerate" button for last AI response

State (NEW):
- `chatMessages: ChatMessage[]` — conversation history
- `selectedPromptId: number | null` — currently selected prompt template OR writing style ID
- `selectedPromptType: 'style' | 'template'` — distinguishes which table the prompt comes from
- `chatInputText: string` — current input
- `isPromptManagerOpen: boolean` — collapsible state
- `currentChatId: number | null` — ID of the current chat thread (for persistence)
- `chatThreads: ChatThread[]` — list of saved chat threads

Types (NEW):
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: CitationItem[];
  annotationIds: number[];       // which annotations were used
  promptUsed: string | null;     // prompt template/style text
  promptType: 'style' | 'template' | null;
  timestamp: number;
}

interface ChatThread {
  id: number;
  title: string;                 // auto-generated from first user message
  created_at: string;
  updated_at: string;
}
```

### Right Panel: NotebookEditor

**Responsibility**: Notebook-style content editing with insert-from-chat support.

Components:
- **NotebookToolbar**: Formatting buttons (bold, italic, headings, lists, etc.) + Copy + Export
- **NotebookContent**: Tiptap editor (same as current `WritingEditor`) — **continuous text flow**
  - Single continuous editable area
  - Content is markdown, editable at any position
  - When "插入到编辑器" is clicked from chat, content is inserted at cursor position
  - When "选择插入" is used from chat, only the selected fragment is inserted at cursor
- **CitationBlock**: References section at the bottom (same as current)

State:
- `editedContent: string | null` — editor content (existing)
- `generationResult: GenerationResult | null` — for citations (existing, will be extended)

### Panel Behavior

All three panels use `react-resizable-panels` (already installed v4.11.2):
- **Left**: `defaultSize={20} minSize={15} maxSize={35} collapsible`
- **Middle**: `defaultSize={45} minSize={30}` (not collapsible — it's the primary panel)
- **Right**: `defaultSize={35} minSize={25} collapsible`
- `PanelResizeHandle` between each panel with hover/active styling
- Collapsed panels show a thin strip with expand button and panel title

## Backend Changes

### New Table: `prompt_templates`

```sql
CREATE TABLE IF NOT EXISTS prompt_templates (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  description   TEXT,
  prompt_text   TEXT NOT NULL,
  category      TEXT DEFAULT 'general',  -- 'general', 'analysis', 'summary', 'custom'
  is_builtin    INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now'))
);
```

Builtin templates seeded on first run:
- '总结摘要' — 对标注素材进行总结概括
- '深度分析' — 对标注素材进行深入分析和批判性评价
- '对比论述' — 对比不同文献的观点和方法
- '润色优化' — 对现有内容进行语言润色和逻辑优化

### New Table: `chat_threads`

```sql
CREATE TABLE IF NOT EXISTS chat_threads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);
```

### New Table: `chat_messages`

```sql
CREATE TABLE IF NOT EXISTS chat_messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id     INTEGER NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content       TEXT NOT NULL,
  citations     TEXT DEFAULT '[]',        -- JSON array of CitationItem
  annotation_ids TEXT DEFAULT '[]',       -- JSON array of annotation IDs used
  prompt_used   TEXT,                     -- prompt template/style text
  prompt_type   TEXT CHECK(prompt_type IN ('style', 'template', NULL)),
  created_at    TEXT DEFAULT (datetime('now'))
);
```

### New Endpoint: `POST /api/generate/chat`

 Multi-turn generation endpoint.

 Accepts conversation history + current instruction.

 See Backend section.

Multi-turn generation endpoint. Accepts conversation history + current instruction.

```typescript
interface ChatGenerateRequest {
  thread_id?: number;            // Existing thread ID (for continuation) or null (new thread)
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  instruction: string;           // Current user instruction
  annotation_ids: number[];      // Selected annotation IDs
  prompt_template?: string;      // Selected prompt template text (from prompt_templates or writing_styles)
  prompt_type?: 'style' | 'template';
  style_mode?: StyleMode;        // Only used when prompt_type = 'style'
  language?: OutputLanguage;
  citation_format?: string;
}

interface ChatGenerateResponse {
  thread_id: number;             // Created or existing thread ID
  message_id: number;            // Created message ID
  content: string;
  citations: CitationItem[];
}
```

The endpoint:
1. If `thread_id` is null, creates a new `chat_thread` with title from first user message
2. Fetches annotations by `annotation_ids`
3. Assembles annotation material (same format as existing `/api/generate`)
4. Constructs messages array for the AI API:
   - System prompt: academic writing assistant (enhanced from current)
   - Previous messages: passed through for multi-turn context
   - New user message: `[Selected Annotations]\n{material}\n\n[Prompt Template]\n{template}\n\n[Instruction]\n{instruction}`
5. Calls AI API with the full messages array
6. Saves both user message and AI message to `chat_messages` table
7. Updates `chat_thread.updated_at`
8. Returns `{ thread_id, message_id, content, citations }`

### New Endpoints: Chat Thread CRUD

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/chat/threads` | List all chat threads (ordered by updated_at DESC) |
| `GET` | `/api/chat/threads/:id` | Get thread detail + all messages |
| `POST` | `/api/chat/threads` | Create new empty thread |
| `DELETE` | `/api/chat/threads/:id` | Delete thread + all messages |

### New Endpoints: Prompt Template CRUD

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/prompt-templates` | List all prompt templates (builtin + custom) |
| `POST` | `/api/prompt-templates` | Create custom template |
| `PUT` | `/api/prompt-templates/:id` | Update custom template (cannot edit builtin) |
| `DELETE` | `/api/prompt-templates/:id` | Delete custom template (cannot delete builtin) |

### New Service Function: `chatGenerate()`

In `backend/src/services/ai-writer.ts`:

```typescript
interface ChatGenerateOptions {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  instruction: string;
  annotation_material: string;
  prompt_template?: string;
  language: string;
  citation_format: string;
}
```

Uses same `getAIConfig()`. System prompt is enhanced for multi-turn:
```
你是一位学术写作助手。用户正在撰写学术论文，你会根据提供的标注素材和写作指令来协助写作。

核心要求：
1. 严格基于提供的标注素材内容，不添加标注中未涉及的信息
2. 每个论点必须引用对应的标注来源文献，使用[编号]标记
3. 引用标记：正文中用[序号]，段后列举完整引用信息
4. 输出语言按指定要求
5. 如果用户要求修改之前的内容，返回修改后的完整文本

当前对话是持续的创作过程，请基于上下文和用户的最新指令来生成或修改内容。
```

`max_tokens: 4000` (higher limit since responses may include full modified text).

### Existing Endpoints: Unchanged

The existing `POST /api/generate` endpoint stays as-is. The new chat endpoint is additive.

## Frontend Architecture

### New Components

| Component | File | Responsibility |
|-----------|------|----------------|
| `AnnotationFilter` | `Writing/AnnotationFilter.tsx` | Left panel: tag selector + annotation list |
| `TagSelector` | `Writing/TagSelector.tsx` | Tag multi-select chips with AND/OR |
| `AnnotationCard` | `Writing/AnnotationCard.tsx` | Single annotation display card |
| `AIChatDialog` | `Writing/AIChatDialog.tsx` | Middle panel: full chat interface |
| `PromptManager` | `Writing/PromptManager.tsx` | Collapsible prompt template manager |
| `ChatMessageList` | `Writing/ChatMessageList.tsx` | Scrollable message history |
| `ChatInputBar` | `Writing/ChatInputBar.tsx` | Input area with prompt chip |
| `NotebookEditor` | `Writing/NotebookEditor.tsx` | Right panel: Tiptap editor with insert support |
| `WritingWorkspace` | `Writing/WritingWorkspace.tsx` | Three-panel layout orchestrator (rewrite) |

### Retired Components

The following current components will be **replaced** by the new architecture:
- `SearchPanel.tsx` → replaced by `TagSelector` + `AnnotationFilter`
- `SearchSummary.tsx` → replaced by inline summary in `AnnotationFilter`
- `ResultsList.tsx` → replaced by `AnnotationCard` list in `AnnotationFilter`
- `WritingConfig.tsx` → replaced by `PromptManager` + `ChatInputBar`
- `WritingEditor.tsx` → replaced by `NotebookEditor`

`CitationBlock.tsx` is **reused** in both `ChatMessageList` (for AI messages) and `NotebookEditor`.

### State Changes (Zustand)

Add to `AppState`:

```typescript
// Chat state
chatMessages: ChatMessage[];
isChatGenerating: boolean;
selectedPromptId: number | null;
selectedPromptType: 'style' | 'template' | null;
selectedAnnotationIds: number[];     // default: all fetched annotation IDs
chatInputText: string;
isPromptManagerOpen: boolean;
currentChatId: number | null;
chatThreads: ChatThread[];
promptTemplates: PromptTemplate[];   // from new prompt_templates table

// Chat actions
sendChatMessage: (instruction: string) => Promise<void>;
setSelectedPromptId: (id: number | null, type: 'style' | 'template' | null) => void;
setSelectedAnnotationIds: (ids: number[]) => void;
clearChat: () => void;
fetchChatThreads: () => Promise<void>;
loadChatThread: (threadId: number) => Promise<void>;
createChatThread: (title: string) => Promise<void>;
deleteChatThread: (threadId: number) => Promise<void>;
fetchPromptTemplates: () => Promise<void>;
createPromptTemplate: (data: { name: string; description?: string; prompt_text: string; category?: string }) => Promise<void>;
deletePromptTemplate: (id: number) => Promise<void>;
```

Remove (or deprecate):
- `isGenerating` → replaced by `isChatGenerating`
- `generationResult` → content now lives in `chatMessages` + `editedContent`

### API Client Changes

Add to `client.ts`:

```typescript
export const chatApi = {
  generate: (data: ChatGenerateRequest) => api.post<ChatGenerateResponse>('/generate/chat', data, { timeout: 120000 }),
  getThreads: () => api.get<ChatThread[]>('/chat/threads'),
  getThread: (id: number) => api.get<{ thread: ChatThread; messages: ChatMessage[] }>(`/chat/threads/${id}`),
  createThread: (title: string) => api.post<ChatThread>('/chat/threads', { title }),
  deleteThread: (id: number) => api.delete(`/chat/threads/${id}`),
};

export const promptTemplateApi = {
  getAll: () => api.get<PromptTemplate[]>('/prompt-templates'),
  create: (data: { name: string; description?: string; prompt_text: string; category?: string }) =>
    api.post<PromptTemplate>('/prompt-templates', data),
  update: (id: number, data: Partial<PromptTemplate>) => api.put(`/prompt-templates/${id}`, data),
  delete: (id: number) => api.delete(`/prompt-templates/${id}`),
};
```

## Interaction Details

### Multi-turn Chat Flow

1. User selects tags in left panel → annotations load → **all annotations are checked by default**
2. User can uncheck any annotation to exclude it from AI context
3. User selects a prompt/style in PromptManager → template text appears as chip in input
4. User types instruction "写一段文献综述" → clicks Send
5. Frontend builds `ChatGenerateRequest`:
   - `thread_id`: current thread ID (or null for new)
   - `messages`: previous chat history (from `chatMessages`)
   - `instruction`: user's typed text
   - `annotation_ids`: checked annotation IDs
   - `prompt_template`: selected prompt/style text
   - `prompt_type`: 'style' or 'template'
6. Backend saves messages to DB, calls AI, returns `{ thread_id, message_id, content, citations }`
7. Frontend adds user message + AI message to `chatMessages`
8. AI message shows content with two insert options:
   - **"插入到编辑器" button**: inserts full AI response at cursor
   - **"选择插入"**: user selects a portion of AI content, then clicks to insert only that fragment
9. User continues: "第二段改得更学术" → new request with full chat history
10. AI returns modified text → user can insert again or keep chatting

### Chat Thread Management Flow

1. User enters writing workspace → `chatThreads` loaded from backend
2. A new thread is auto-created on first message
3. User can switch to a previous thread via a thread list (dropdown or sidebar)
4. Switching threads loads that thread's messages into `chatMessages`
5. User can rename or delete threads
6. Each thread maintains its own independent conversation history

### Prompt Template Flow

1. User opens PromptManager (collapsible, at top of chat panel)
2. Sees two sections:
   - "写作风格": existing `writing_styles` (文献综述, Nature, etc.)
   - "提示词模板": new `prompt_templates` (总结, 分析, 对比, 润色 + user custom)
3. Clicks one → `selectedPromptId` + `selectedPromptType` set → text appears as removable chip above input
4. Chip shows name, X button to deselect
5. When sending a message, the prompt text is included in the API request
6. User can click "edit" on the chip → inline edit the text before sending (does not modify the saved template)
7. Custom templates: "新建" button opens form for name + prompt text + category

## Scope Boundaries

### In Scope
- Three-panel layout with collapsible/resizable panels
- Tag-based annotation filter with selection
- Multi-turn AI chat with prompt template management
- Insert-from-chat to notebook editor
- Prompt template CRUD (reuse existing writing_styles API)

### In Scope
 prompt templates CRUD (backend API)

**
IN SCOPE** — prompt templates CRUD. New `prompt_templates` table + API endpoints.

 See Backend section.
- Jupyter-style cell model (cells with individual execute/output)
- Diff view when inserting modified content
- Chat session persistence → **IN SCOPE** (backend `chat_threads` + `chat_messages` tables, CRUD API)
- Collaborative editing
- Annotation text editing from the filter panel
- Export to formats beyond Markdown (DOCX, PDF)

## Migration Path

The old two-panel workspace is fully replaced. No backward compatibility needed — the `WritingWorkspace` component is rewritten, old sub-components are deleted. The backend `/api/generate` endpoint is kept but no longer called by the frontend (may be useful for API consumers or future features).

The `rightPanelTab: 'writing'` in Layout.tsx still mounts `WritingWorkspace` — no change needed at the Layout level.
