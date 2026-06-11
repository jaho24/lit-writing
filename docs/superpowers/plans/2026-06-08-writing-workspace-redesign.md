# Writing Workspace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Writing Workspace from a 3-column grid to a 2-column layout (left ~40% search + right ~60% WYSIWYG editor), replacing the plain-text `<pre>` output with a Tiptap WYSIWYG editor and adding an advanced search panel with path/type/tag filtering.

**Spec:** `docs/superpowers/specs/2026-06-08-writing-workspace-redesign.md`

**Branch:** Create feature branch `feature/writing-workspace-redesign` before starting.

---

## File Structure

### New files to create:
| File | Responsibility |
|---|---|
| `frontend/src/components/Writing/WritingEditor.tsx` | Tiptap WYSIWYG editor + toolbar (format buttons + action buttons) |
| `frontend/src/components/Writing/SearchPanel.tsx` | Advanced search form (library path, type filter, tag selector) |
| `frontend/src/components/Writing/SearchSummary.tsx` | Red-highlighted active conditions summary + count |
| `frontend/src/components/Writing/ResultsList.tsx` | Tab switcher (literature/notes) + result cards with highlighted excerpts |
| `frontend/src/components/Writing/WritingConfig.tsx` | Collapsible writing config (style mode, language, citation format) |
| `frontend/src/components/Writing/CitationBlock.tsx` | Interactive citation list (clickable → open PDF) |

### Existing files to modify:
| File | Changes |
|---|---|
| `frontend/package.json` | Add Tiptap dependencies |
| `frontend/src/types/index.ts` | Add `SearchResultItem`, `SearchTypeFilter`, `SearchResultView` types |
| `frontend/src/stores/appStore.ts` | Add search state + actions, `editedContent`, `setEditedContent` |
| `frontend/src/api/client.ts` | Add `searchAdvanced` method to `literatureApi` |
| `frontend/src/components/Writing/WritingWorkspace.tsx` | Replace 3-column grid with 2-column flex layout, compose sub-components |
| `backend/src/routes/literature.ts` | Add `POST /search-advanced` endpoint |
| `backend/src/types/index.ts` | Add `SearchResultItem` type |

---

## Tasks

### Task 1: Install Tiptap dependencies

- [ ] Run `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-markdown @tiptap/pm` in `frontend/`
- [ ] Verify `package.json` shows the 4 new dependencies
- [ ] Run `npm install` to confirm no resolution errors
- [ ] Commit: "chore: add tiptap editor dependencies"

### Task 2: Add SearchResultItem type to frontend types

File: `frontend/src/types/index.ts`

- [ ] Add `SearchTypeFilter` type: `'all' | 'annotations' | 'abstracts' | 'notes'`
- [ ] Add `SearchResultView` type: `'literature' | 'notes'`
- [ ] Add `SearchResultItem` interface:
  ```typescript
  export interface SearchResultItem {
    id: number;
    type: 'literature' | 'annotation';
    title: string;
    excerpt: string;
    highlightRanges: [number, number][];
    authors?: string;
    year?: number;
    journal?: string;
    tags: Tag[];
    literatureId: number;
  }
  ```
- [ ] Add `SearchAdvancedResponse` interface:
  ```typescript
  export interface SearchAdvancedResponse {
    results: SearchResultItem[];
    total_count: number;
    active_conditions: { path?: string; type?: string; tags?: string[] };
  }
  ```
- [ ] Verify LSP diagnostics clean on `types/index.ts`
- [ ] Commit: "feat: add SearchResultItem types for advanced search"

### Task 3: Add searchAdvanced to API client

File: `frontend/src/api/client.ts`

- [ ] Import `SearchAdvancedResponse` from types
- [ ] Add `searchAdvanced` method to `literatureApi`:
  ```typescript
  searchAdvanced: (data: {
    library_id?: number;
    type_filter: SearchTypeFilter;
    tag_ids: number[];
    tag_logic: 'AND' | 'OR';
  }) => api.post<SearchAdvancedResponse>('/literature/search-advanced', data),
  ```
- [ ] Verify LSP diagnostics clean
- [ ] Commit: "feat: add searchAdvanced API method"

### Task 4: Add search state and actions to appStore

File: `frontend/src/stores/appStore.ts`

- [ ] Import new types (`SearchResultItem`, `SearchTypeFilter`, `SearchResultView`, `SearchAdvancedResponse`)
- [ ] Add to `AppState` interface:
  ```typescript
  // Search
  searchPathId: number | null;
  searchTypeFilter: SearchTypeFilter;
  searchTagLogic: 'AND' | 'OR';
  searchResults: SearchResultItem[];
  searchActiveTab: SearchResultView;
  // Editor
  editedContent: string | null;

  // New actions
  setSearchPathId: (id: number | null) => void;
  setSearchTypeFilter: (filter: SearchTypeFilter) => void;
  setSearchTagLogic: (logic: 'AND' | 'OR') => void;
  setSearchActiveTab: (tab: SearchResultView) => void;
  performSearch: () => Promise<void>;
  setEditedContent: (content: string | null) => void;
  ```
- [ ] Add default values in store creation:
  ```typescript
  searchPathId: null,
  searchTypeFilter: 'all',
  searchTagLogic: 'AND',
  searchResults: [],
  searchActiveTab: 'literature',
  editedContent: null,
  ```
- [ ] Implement actions:
  - `setSearchPathId`, `setSearchTypeFilter`, `setSearchTagLogic`, `setSearchActiveTab`: simple `set()` calls
  - `performSearch`: call `literatureApi.searchAdvanced()` with current search state, set `searchResults` and update `selectedWritingTags` from search results
  - `setEditedContent`: simple `set()` call
- [ ] Verify LSP diagnostics clean
- [ ] Commit: "feat: add search state and actions to appStore"

### Task 5: Create WritingEditor component (Tiptap)

File: `frontend/src/components/Writing/WritingEditor.tsx` (NEW)

This is the core UI change — the WYSIWYG editor replacing the `<pre>` plain-text display.

- [ ] Create `WritingEditor.tsx` with:
  - Import `useEditor`, `EditorContent` from `@tiptap/react`
  - Import `StarterKit` from `@tiptap/starter-kit`
  - Import `Markdown` from `@tiptap/extension-markdown`
  - Props: `content: string | null`, `onContentChange: (markdown: string) => void`, `citations: CitationItem[]`, `isGenerating: boolean`, `onRegenerate: () => void`
  - Initialize editor with `StarterKit` + `Markdown` extensions
  - When `content` prop changes (AI generates new content), call `editor.commands.setContent(content)` to render it
  - On editor `onUpdate`, call `onContentChange(editor.storage.markdown.getMarkdown())`
  - Render toolbar with format buttons (Bold, Italic, H1, H2, BulletList, OrderedList, Blockquote) using `editor.commands` + active state from `editor.isActive()`
  - Render action buttons (Copy, Export .md, Regenerate) on toolbar right side
  - Render `EditorContent` below toolbar
  - Render `CitationBlock` below editor if citations exist
  - Render empty state (PenTool icon + hint text) when no content and not generating
  - Style with Tailwind: toolbar buttons as icon buttons with hover/active states, editor area with white bg + padding
- [ ] Verify LSP diagnostics clean
- [ ] Commit: "feat: create WritingEditor with Tiptap WYSIWYG editor"

### Task 6: Create CitationBlock component

File: `frontend/src/components/Writing/CitationBlock.tsx` (NEW)

- [ ] Create `CitationBlock.tsx` with:
  - Props: `citations: CitationItem[]`
  - Import `openTab` from `useAppStore`
  - Render section heading "参考文献"
  - Map citations to formatted items: marker + authors + (year) + title + italic journal + DOI
  - Each citation clickable → calls `openTab(c.literature_id, c.title)` to open PDF preview
  - Style: `text-xs`, citations as linked items with hover underline
- [ ] Verify LSP diagnostics clean
- [ ] Commit: "feat: create CitationBlock with clickable citations"

### Task 7: Create SearchPanel component

File: `frontend/src/components/Writing/SearchPanel.tsx` (NEW)

- [ ] Create `SearchPanel.tsx` with:
  - Import `useAppStore` for `libraries`, `tags`, `searchPathId`, `searchTypeFilter`, `selectedWritingTags`, `searchTagLogic` and their setters
  - **Library path selector**: dropdown populated from `libraries` tree, default "全部文献", flattens tree to show full paths
  - **Type filter**: radio group (全部/仅标注/仅文献摘要/仅笔记), value bound to `searchTypeFilter`
  - **Tag selector**: multi-select from `tags` list, checkboxes with color dots, same visual style as current tag selection but with AND/OR toggle button
  - Each section has a label and compact layout
  - Style with Tailwind: compact form elements, `text-xs` labels, `p-2` inputs
- [ ] Verify LSP diagnostics clean
- [ ] Commit: "feat: create SearchPanel with path/type/tag filters"

### Task 8: Create SearchSummary component

File: `frontend/src/components/Writing/SearchSummary.tsx` (NEW)

- [ ] Create `SearchSummary.tsx` with:
  - Props: derived from store state (pathId → library name, typeFilter label, selected tags → tag names, results count)
  - Render active conditions as red-highlighted badges: `bg-red-50 text-red-700 border-red-200`
  - Each badge has ✕ button to remove that condition (calls corresponding setter)
  - Right side: `共 {totalCount} 条结果` in gray text
  - No conditions → show subtle hint "设置筛选条件开始检索"
  - Style: `flex items-center gap-2`, badges as `px-2 py-1 rounded-md`
- [ ] Verify LSP diagnostics clean
- [ ] Commit: "feat: create SearchSummary with red-highlighted condition badges"

### Task 9: Create ResultsList component

File: `frontend/src/components/Writing/ResultsList.tsx` (NEW)

- [ ] Create `ResultsList.tsx` with:
  - Import `searchResults`, `searchActiveTab`, `setSearchActiveTab`, `openTab` from store
  - Props: `onInsertContent: (text: string) => void` — callback to append content to editor
  - **Tab switcher**: two tabs "文献" / "笔记", `searchActiveTab` controls active tab, underline-style tabs
  - **Literature view**: cards with title, authors, year, excerpt (highlighted), journal badge, tag dots
  - **Notes view**: cards with annotation text excerpt (highlighted), note text, source literature name, tag dots
  - **Highlighting**: use frontend fallback — given tag names from active conditions, render `<mark>` around matching keywords in excerpt text. Simple regex: split excerpt at keyword boundaries, wrap matches in `<mark className="bg-yellow-100 rounded px-0.5">`
  - Click on card → calls `onInsertContent(excerpt)` to append to editor, and `openTab(literatureId, title)` to open PDF
  - Empty state when no results: "未找到匹配结果"
  - Style: cards with `bg-white rounded-md shadow-sm p-3 mb-2`, hover `bg-gray-50`
- [ ] Verify LSP diagnostics clean
- [ ] Commit: "feat: create ResultsList with literature/notes tab views"

### Task 10: Create WritingConfig component

File: `frontend/src/components/Writing/WritingConfig.tsx` (NEW)

This extracts the existing "写作风格区" from WritingWorkspace into a collapsible section.

- [ ] Create `WritingConfig.tsx` with:
  - Import state from `useAppStore`: `writingStyles`, `selectedWritingTags`, `isGenerating`
  - Local state (moved from WritingWorkspace): `styleMode`, `outputLanguage`, `citationFormat`, `customPrompt`, `referenceText`, `selectedStyle`
  - Collapsible container with header "写作配置 ▸/▾", click toggles body visibility
  - Body contains same controls as current middle panel: style mode buttons, conditional textareas/selects, language/citation selects
  - Generate button at bottom: `⚡ 生成写作内容`, disabled when no tags selected, loading state with spinner
  - Props: `onGenerate: () => void` — callback to trigger AI generation
  - Style: collapsible with `border-t border-gray-200 mt-3`, header `text-sm font-semibold cursor-pointer`, body `space-y-4` when expanded
- [ ] Verify LSP diagnostics clean
- [ ] Commit: "feat: create WritingConfig as collapsible section"

### Task 11: Add backend search-advanced endpoint

File: `backend/src/routes/literature.ts`

- [ ] Add `POST /search-advanced` route handler
- [ ] Request body: `{ library_id?: number, type_filter: string, tag_ids: number[], tag_logic: 'AND' | 'OR' }`
- [ ] Implementation logic:
  - If `library_id` provided: get literature IDs from `literature_libraries` table
  - If `type_filter === 'annotations'` or `'notes'`: query annotations joined with `annotation_tags`
  - If `type_filter === 'abstracts'`: query literature where `abstract IS NOT NULL`
  - If `type_filter === 'all'`: combine annotations + literature
  - Tag filtering: if `tag_logic === 'AND'`, annotations must have ALL specified tags; if `'OR'`, at least one
  - Build `SearchResultItem` objects from query results: compute excerpt (first 200 chars of text/abstract), compute highlightRanges (character offsets of tag name keywords in excerpt — use simple regex match)
  - Compute `active_conditions`: path name from library, type label, tag names
  - Return `{ results, total_count, active_conditions }`
- [ ] Add `SearchResultItem` type to `backend/src/types/index.ts` (mirroring frontend type)
- [ ] Test manually: start backend, call endpoint with curl, verify response shape
- [ ] Commit: "feat: add POST /literature/search-advanced endpoint"

### Task 12: Rewrite WritingWorkspace as two-column layout

File: `frontend/src/components/Writing/WritingWorkspace.tsx` (MODIFY — full rewrite of JSX)

This is the integration step — composing all sub-components into the new layout.

- [ ] Replace entire `return` block with:
  ```tsx
  <div className="flex h-full bg-gray-50">
    {/* Left: Search Panel (~40%) */}
    <div className="w-[40%] min-w-[280px] bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">写作工作区</h3>
      </div>
      <SearchPanel />
      <SearchSummary />
      <ResultsList onInsertContent={handleInsertContent} />
      <WritingConfig onGenerate={handleGenerate} />
    </div>

    {/* Right: Editor (~60%) */}
    <div className="flex-1 flex flex-col overflow-hidden">
      <WritingEditor
        content={generationResult?.content ?? editedContent}
        onContentChange={handleContentChange}
        citations={generationResult?.citations ?? []}
        isGenerating={isGenerating}
        onRegenerate={handleRegenerate}
      />
    </div>
  </div>
  ```
- [ ] Move local state (styleMode, outputLanguage, etc.) into `WritingConfig` component
- [ ] Add `handleInsertContent` callback: appends text to editor content via `setEditedContent`
- [ ] Add `handleContentChange` callback: syncs editor markdown to `editedContent` in store
- [ ] Keep `handleGenerate` in WritingWorkspace — delegates to WritingConfig's button
- [ ] Keep `handleCopy`, `handleExport` — move into WritingEditor
- [ ] Remove the old 3-column `grid-cols-3` JSX entirely
- [ ] Verify LSP diagnostics clean
- [ ] Commit: "feat: rewrite WritingWorkspace as two-column layout"

### Task 13: Verify full flow

- [ ] Start backend: `npm run dev` in `backend/`
- [ ] Start frontend: `npm run dev` in `frontend/`
- [ ] Open browser at `http://localhost:5173`
- [ ] Switch to "写作" tab in right panel
- [ ] Verify left panel shows: search form → summary → results list → collapsible config
- [ ] Verify right panel shows: empty state (PenTool icon + hint)
- [ ] Select tags in search panel → verify search results appear
- [ ] Switch between literature/notes tab views
- [ ] Click a result item → verify content appears in editor
- [ ] Expand writing config → select style mode → click generate
- [ ] Verify generated content renders as rich text in Tiptap editor (bold, headings, lists visible)
- [ ] Edit content directly in editor → verify changes persist
- [ ] Click citation → verify PDF opens in preview tab
- [ ] Click copy → verify clipboard contains markdown
- [ ] Click export → verify .md file downloads
- [ ] Click regenerate → verify new content replaces editor content
- [ ] Take screenshot of final UI for comparison
- [ ] Commit: "chore: verify writing workspace redesign works"

---

## Dependencies between tasks

```
Task 1 (install deps) → Task 5 (WritingEditor needs Tiptap)
Task 2 (types) → Task 3 (API client needs types) → Task 4 (store needs API + types) → Task 11 (backend needs types)
Task 5 (WritingEditor) → Task 12 (integration)
Task 6 (CitationBlock) → Task 5 (editor includes citations)
Task 7-10 (search components) → Task 12 (integration)
Task 11 (backend endpoint) → Task 13 (full flow verification)
```

Tasks 5-10 can be parallelized after Task 1-4 are done (they depend on types/store but not each other).
Task 12 depends on all component tasks (5-10).
Task 13 depends on everything.

## Risk notes

- **Tiptap Markdown extension**: The `@tiptap/extension-markdown` may not perfectly render all markdown edge cases (tables, complex citations). Test with realistic AI-generated content.
- **Highlighting fallback**: The frontend keyword matching approach for highlights is a temporary solution. If results are poor, escalate to backend-computed `highlightRanges`.
- **Backend search-advanced**: SQL query complexity with AND/OR tag logic + library filtering. Test with large datasets.