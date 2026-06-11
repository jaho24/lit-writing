# Three-Panel Writing Workspace — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current two-panel writing workspace with a three-panel layout (left: annotation filter, middle: AI chat dialog, right: notebook editor) with multi-turn conversation, prompt template management, and insert-to-editor support.

**Design spec:** `docs/superpowers/specs/2026-06-10-three-panel-writing-workspace.md`

## File Structure

### Backend — New Files

| File | Responsibility |
|------|----------------|
| `backend/src/routes/chat.ts` | Chat thread CRUD + chat generate endpoint |
| `backend/src/routes/promptTemplates.ts` | Prompt template CRUD |

### Backend — Modified Files

| File | Change |
|------|--------|
| `backend/src/database.ts` | Add 3 new tables + seed data + prepared statements |
| `backend/src/services/ai-writer.ts` | Add `chatGenerate()` function |
| `backend/src/types/index.ts` | Add new request/response types |
| `backend/src/index.ts` | Mount new routes |
| `backend/src/schema.sql` | Add new table schemas (keep in sync with database.ts) |

### Frontend — New Files

| File | Responsibility |
|------|----------------|
| `frontend/src/components/Writing/AnnotationFilter.tsx` | Left panel: tag selector + annotation list |
| `frontend/src/components/Writing/TagSelector.tsx` | Tag multi-select chips with AND/OR toggle |
| `frontend/src/components/Writing/AnnotationCard.tsx` | Single annotation display with checkbox |
| `frontend/src/components/Writing/AIChatDialog.tsx` | Middle panel: full chat interface |
| `frontend/src/components/Writing/PromptManager.tsx` | Collapsible prompt template/style manager |
| `frontend/src/components/Writing/ChatMessageList.tsx` | Scrollable message history with insert actions |
| `frontend/src/components/Writing/ChatInputBar.tsx` | Input area with prompt chip + send |
| `frontend/src/components/Writing/NotebookEditor.tsx` | Right panel: Tiptap editor with insert support |

### Frontend — Modified Files

| File | Change |
|------|--------|
| `frontend/src/components/Writing/WritingWorkspace.tsx` | Rewrite: three-panel layout |
| `frontend/src/stores/appStore.ts` | Add chat/prompt state + actions; deprecate old generation state |
| `frontend/src/api/client.ts` | Add chatApi + promptTemplateApi |
| `frontend/src/types/index.ts` | Add ChatMessage, ChatThread, PromptTemplate, API types |

### Frontend — Deleted Files

| File | Reason |
|------|--------|
| `frontend/src/components/Writing/SearchPanel.tsx` | Replaced by TagSelector + AnnotationFilter |
| `frontend/src/components/Writing/SearchSummary.tsx` | Replaced by inline summary in AnnotationFilter |
| `frontend/src/components/Writing/ResultsList.tsx` | Replaced by AnnotationCard list |
| `frontend/src/components/Writing/WritingConfig.tsx` | Replaced by PromptManager + ChatInputBar |
| `frontend/src/components/Writing/WritingEditor.tsx` | Replaced by NotebookEditor |

### Kept Files

| File | Note |
|------|------|
| `frontend/src/components/Writing/CitationBlock.tsx` | Reused in both ChatMessageList and NotebookEditor |

## Tasks

### Phase 1: Backend Foundation

#### Task 1: Add new database tables and seed data

- [ ] Add `prompt_templates`, `chat_threads`, `chat_messages` table definitions to `SCHEMA_SQL` in `backend/src/database.ts`
  - `prompt_templates`: id, name, description, prompt_text, category, is_builtin, created_at
  - `chat_threads`: id, title, created_at, updated_at
  - `chat_messages`: id, thread_id (FK), role, content, citations (JSON), annotation_ids (JSON), prompt_used, prompt_type, created_at
- [ ] Add seed data for builtin prompt templates (总结摘要, 深度分析, 对比论述, 润色优化) as `INSERT OR IGNORE`
- [ ] Add prepared statements for all new tables (CRUD operations)
- [ ] Add same table definitions to `backend/src/schema.sql` for documentation consistency
- [ ] Run `lsp_diagnostics` on `database.ts`

#### Task 2: Add backend types

- [ ] Add new types to `backend/src/types/index.ts`:
  ```typescript
  interface PromptTemplate {
    id: number; name: string; description: string | null;
    prompt_text: string; category: string; is_builtin: number; created_at: string;
  }
  interface ChatThread { id: number; title: string; created_at: string; updated_at: string; }
  interface ChatMessage {
    id: number; thread_id: number; role: 'user' | 'assistant';
    content: string; citations: string; annotation_ids: string;
    prompt_used: string | null; prompt_type: 'style' | 'template' | null; created_at: string;
  }
  interface ChatGenerateRequest {
    thread_id?: number; messages: Array<{role: string; content: string}>;
    instruction: string; annotation_ids: number[];
    prompt_template?: string; prompt_type?: 'style' | 'template';
    style_mode?: string; language?: string; citation_format?: string;
  }
  interface ChatGenerateResponse { thread_id: number; message_id: number; content: string; citations: CitationItem[]; }
  ```
- [ ] Run `lsp_diagnostics`

#### Task 3: Add `chatGenerate()` service function

- [ ] Add `ChatGenerateOptions` interface and `chatGenerate()` to `backend/src/services/ai-writer.ts`
  - Same `getAIConfig()` pattern
  - System prompt: multi-turn academic writing assistant (see design doc)
  - Takes `messages[]` + `instruction` + `annotation_material` + optional `prompt_template`
  - Builds messages array for AI API: system + history + new user message
  - `max_tokens: 4000`, `temperature: 0.7`
  - Returns `{ content: string }`
- [ ] Run `lsp_diagnostics`

#### Task 4: Add chat routes

- [ ] Create `backend/src/routes/chat.ts`
  - `POST /api/generate/chat` — multi-turn generation
    - Validate: instruction required, annotation_ids required
    - If no thread_id: create new `chat_thread` with title from instruction (first 50 chars)
    - Fetch annotations by annotation_ids (with literature info for citation extraction)
    - Assemble annotation material (same format as existing generate.ts)
    - Save user message to `chat_messages`
    - Call `chatGenerate()` with full message history
    - Save AI message to `chat_messages`
    - Extract citations from literature referenced in annotations
    - Return `{ thread_id, message_id, content, citations }`
  - `GET /api/chat/threads` — list all threads ordered by updated_at DESC
  - `GET /api/chat/threads/:id` — get thread with all messages
  - `POST /api/chat/threads` — create empty thread with title
  - `DELETE /api/chat/threads/:id` — delete thread + cascade messages
- [ ] Run `lsp_diagnostics`

#### Task 5: Add prompt template routes

- [ ] Create `backend/src/routes/promptTemplates.ts`
  - `GET /` — list all templates
  - `POST /` — create custom template (name, description, prompt_text, category required)
  - `PUT /:id` — update custom template (reject if is_builtin)
  - `DELETE /:id` — delete custom template (reject if is_builtin)
- [ ] Run `lsp_diagnostics`

#### Task 6: Mount new routes in index.ts

- [ ] Add imports for chatRouter and promptTemplateRouter in `backend/src/index.ts`
- [ ] Mount: `app.use('/api/chat', chatRouter)`, `app.use('/api/prompt-templates', promptTemplateRouter)`
- [ ] Note: generate/chat stays under `/api/generate` since it's a generation operation
- [ ] Start backend, verify `/api/health` responds
- [ ] Test: `curl POST /api/prompt-templates` with sample data, `curl GET /api/prompt-templates`
- [ ] Test: `curl POST /api/chat/threads` with title, `curl GET /api/chat/threads`

### Phase 2: Frontend Foundation

#### Task 7: Add frontend types

- [ ] Add to `frontend/src/types/index.ts`:
  ```typescript
  interface ChatMessage {
    id: string; role: 'user' | 'assistant'; content: string;
    citations: CitationItem[]; annotationIds: number[];
    promptUsed: string | null; promptType: 'style' | 'template' | null;
    timestamp: number;
  }
  interface ChatThread { id: number; title: string; created_at: string; updated_at: string; }
  interface PromptTemplate {
    id: number; name: string; description: string | null;
    prompt_text: string; category: string; is_builtin: number; created_at: string;
  }
  interface ChatGenerateRequest { ... }  // mirror backend
  interface ChatGenerateResponse { ... }
  ```
- [ ] Run `lsp_diagnostics`

#### Task 8: Add API client methods

- [ ] Add to `frontend/src/api/client.ts`:
  - `chatApi` object with: generate, getThreads, getThread, createThread, deleteThread
  - `promptTemplateApi` object with: getAll, create, update, delete
  - Import new types
- [ ] Run `lsp_diagnostics`

#### Task 9: Add Zustand store state and actions

- [ ] Add to `AppState` interface in `frontend/src/stores/appStore.ts`:
  - State: chatMessages, isChatGenerating, selectedPromptId, selectedPromptType, selectedAnnotationIds, chatInputText, isPromptManagerOpen, currentChatId, chatThreads, promptTemplates
  - Actions: sendChatMessage, setSelectedPromptId, setSelectedAnnotationIds, clearChat, fetchChatThreads, loadChatThread, createChatThread, deleteChatThread, fetchPromptTemplates, createPromptTemplate, deletePromptTemplate
- [ ] Implement all actions with API calls
- [ ] When `setSelectedWritingTags` is called and new annotations are fetched, auto-initialize `selectedAnnotationIds` to all fetched annotation IDs (default selected behavior)
- [ ] Run `lsp_diagnostics`

### Phase 3: Frontend Components

#### Task 10: Create TagSelector component

- [ ] Create `frontend/src/components/Writing/TagSelector.tsx`
  - Props: none (reads from store)
  - Renders: list of tag chips from `tags` store, multi-select with checkmark
  - Selected tags trigger `setSelectedWritingTags` → fetches annotations
  - AND/OR toggle button between tag logic modes
  - Use colored chips matching tag colors
- [ ] Run `lsp_diagnostics`

#### Task 11: Create AnnotationCard component

- [ ] Create `frontend/src/components/Writing/AnnotationCard.tsx`
  - Props: `{ annotation: Annotation; literature: Literature | undefined; tags: Tag[]; isSelected: boolean; onToggle: (id: number) => void }`
  - Renders:
    - Checkbox (default checked)
    - Annotation text (truncated, expandable)
    - Note (if any, in italic)
    - Literature source line: title + authors + year
    - Tag chips (colored)
  - Click checkbox → calls onToggle
- [ ] Run `lsp_diagnostics`

#### Task 12: Create AnnotationFilter component (left panel)

- [ ] Create `frontend/src/components/Writing/AnnotationFilter.tsx`
  - Renders: header "标注筛选" → TagSelector → selection summary "已选 N/M 条" → AnnotationCard list
  - Reads: writingAnnotations, selectedAnnotationIds, tags from store
  - Handles toggle: updates selectedAnnotationIds
  - Scrollable annotation list
- [ ] Run `lsp_diagnostics`

#### Task 13: Create PromptManager component

- [ ] Create `frontend/src/components/Writing/PromptManager.tsx`
  - Props: none (reads from store)
  - Collapsible section with chevron toggle
  - Two subsections:
    - "写作风格": list from `writingStyles` store — click to select
    - "提示词模板": list from `promptTemplates` store — click to select, "新建" button, delete button for custom
  - Selected item has highlight style
  - "新建提示词" button opens inline form (name + prompt_text + category)
  - `isPromptManagerOpen` state controls collapse
- [ ] Run `lsp_diagnostics`

#### Task 14: Create ChatMessageList component

- [ ] Create `frontend/src/components/Writing/ChatMessageList.tsx`
  - Props: `{ onInsertFull: (content: string) => void; onInsertSelection: (content: string) => void; editorRef: React.RefObject<EditorHandle> }`
  - Renders scrollable list of ChatMessage items:
    - User messages: instruction text + badge "引用了 N 条标注" + prompt chip if used
    - AI messages: markdown rendered content + CitationBlock + two action buttons:
      1. "插入到编辑器" — calls onInsertFull with full content
      2. "选择插入" — enables text selection mode, on selection + click calls onInsertSelection
    - Loading message: spinner + "正在生成..."
  - Auto-scrolls to bottom on new message
- [ ] Run `lsp_diagnostics`

#### Task 15: Create ChatInputBar component

- [ ] Create `frontend/src/components/Writing/ChatInputBar.tsx`
  - Props: `{ onSend: (instruction: string) => void; isGenerating: boolean }`
  - Reads: selectedPromptId, selectedPromptType, promptTemplates, writingStyles from store
  - Renders:
    - Prompt chip row: if prompt selected, show chip with name + X to deselect + edit icon
    - Text input: textarea, Enter sends, Shift+Enter newline
    - Send button (disabled when empty or generating)
  - Edit chip: opens small modal/popover to edit prompt text before sending
- [ ] Run `lsp_diagnostics`

#### Task 16: Create AIChatDialog component (middle panel)

- [ ] Create `frontend/src/components/Writing/AIChatDialog.tsx`
  - Composes: PromptManager + ChatMessageList + ChatInputBar
  - Thread switcher: dropdown at top showing current thread title, click to see thread list
  - "新建对话" button
  - Reads: chatMessages, currentChatId, isChatGenerating from store
  - Handles send: calls `sendChatMessage(instruction)`
  - Handles insert: calls `editorRef.current?.insertAtCursor(content)` (editorRef passed from parent)
  - Chat input clears after send
- [ ] Run `lsp_diagnostics`

#### Task 17: Create NotebookEditor component (right panel)

- [ ] Create `frontend/src/components/Writing/NotebookEditor.tsx`
  - Based on current WritingEditor.tsx but simplified:
    - Toolbar: Bold, Italic, H1, H2, List, Quote, Code, Minus + Copy + Export
    - Tiptap editor with StarterKit + Markdown extensions
    - CitationBlock at bottom
  - Props: `{ editorRef: React.RefObject<EditorHandle> }`
  - EditorHandle exposes: `insertAtCursor(text)`, `getContent()` (returns markdown)
  - Content managed via `editedContent` in store
  - Remove the old "regenerate" and "generating" overlay logic
- [ ] Run `lsp_diagnostics`

#### Task 18: Rewrite WritingWorkspace (three-panel layout)

- [ ] Rewrite `frontend/src/components/Writing/WritingWorkspace.tsx`
  - Three-panel layout using `react-resizable-panels`:
    ```
    <PanelGroup direction="horizontal" autoSaveId="writing-workspace">
      <Panel defaultSize={20} minSize={15} maxSize={35} collapsible>
        <AnnotationFilter />
      </Panel>
      <PanelResizeHandle />
      <Panel defaultSize={45} minSize={30}>
        <AIChatDialog editorRef={editorRef} />
      </Panel>
      <PanelResizeHandle />
      <Panel defaultSize={35} minSize={25} collapsible>
        <NotebookEditor editorRef={editorRef} />
      </Panel>
    </PanelGroup>
    ```
  - Single `editorRef` shared between AIChatDialog and NotebookEditor
  - Remove all old imports (SearchPanel, ResultsList, WritingConfig, WritingEditor)
  - On mount: fetchChatThreads, fetchPromptTemplates, fetchWritingStyles, fetchTags
  - Collapsed panels: Panel component handles this natively with `collapsible` prop
- [ ] Run `lsp_diagnostics`

### Phase 4: Cleanup & Verification

#### Task 19: Delete retired components

- [ ] Delete `frontend/src/components/Writing/SearchPanel.tsx`
- [ ] Delete `frontend/src/components/Writing/SearchSummary.tsx`
- [ ] Delete `frontend/src/components/Writing/ResultsList.tsx`
- [ ] Delete `frontend/src/components/Writing/WritingConfig.tsx`
- [ ] Delete `frontend/src/components/Writing/WritingEditor.tsx`
- [ ] Verify no other files import these deleted components (grep for each)
- [ ] Run `lsp_diagnostics` on all remaining Writing/ files

#### Task 20: End-to-end verification

- [ ] Start backend: `cd backend && npm run dev`
- [ ] Start frontend: `cd frontend && npm run dev`
- [ ] Open writing workspace in browser
- [ ] Verify left panel: select tags → annotations load → all checked by default → uncheck works
- [ ] Verify middle panel: PromptManager shows styles + templates → select one → chip appears in input
- [ ] Type instruction → send → AI response appears with insert buttons
- [ ] Verify "插入到编辑器" inserts into right panel at cursor
- [ ] Verify "选择插入" — select portion of AI text → insert selected fragment
- [ ] Send follow-up instruction → multi-turn context preserved
- [ ] Verify thread: create new thread, switch between threads, delete thread
- [ ] Verify panel collapse/resize
- [ ] Verify prompt template CRUD: create custom → appears in list → delete
- [ ] Run `lsp_diagnostics` on all modified/created files

## Dependencies

```
Phase 1 (Backend): Tasks 1→2→3→4→5→6 (sequential, each builds on prior)
Phase 2 (Frontend Foundation): Tasks 7→8→9 (sequential)
Phase 3 (Frontend Components): Tasks 10-17 (mostly parallel after Phase 2, but Task 18 depends on 10-17)
Phase 4 (Cleanup): Tasks 19-20 (after Phase 3)

Phase 1 and Phase 2 can run in parallel.
Phase 3 blocks on Phase 2 completion.
Task 18 blocks on Tasks 10-17.
Task 20 blocks on everything.
```

## Risks

1. **Token limits for long conversations**: Multi-turn chat sends full history each time. Very long conversations may hit model context limits. Mitigation: truncate history to last N messages (e.g., 10) in the API call, while keeping full history in DB.

2. **Citation parsing in multi-turn**: AI may add/remove citation markers in modified text. Need to re-extract `[N]` markers from each response. Mitigation: parse markers from AI output, match against referenced literature in the annotation set.

3. **Editor-Tiptap insert race condition**: If user clicks "insert" while typing in editor, cursor position may be wrong. Mitigation: Tiptap's `insertContent` uses last known cursor position, which is generally safe.

4. **Migration of existing generation state**: Users with in-progress `generationResult` in their store will lose it on refresh after this change. Mitigation: acceptable since this is a workspace redesign, not a data migration. The old `/api/generate` endpoint and `generation_records` table remain intact.

5. **Prompt template vs writing style confusion**: Two sources of prompt text may confuse users. Mitigation: clear UI separation in PromptManager with labeled sections, and distinct chip colors for styles vs templates.
