# Writing Workspace AI Interaction Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an instruction bar to the writing editor that lets users iteratively modify AI-generated content via free-form instructions and quick-action buttons, enabling a "generate → refine → refine → done" workflow instead of one-shot generation.

**Design spec:** `docs/superpowers/specs/2026-06-10-writing-workspace-ai-interaction-redesign.md`

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/src/types/index.ts` | Modify | Add `IterateRequest`, `IterateResponse` types |
| `backend/src/services/ai-writer.ts` | Modify | Add `iterateWriting()` function |
| `backend/src/routes/generate.ts` | Modify | Add `POST /iterate` endpoint |
| `frontend/src/types/index.ts` | Modify | Add `IterateResult` type |
| `frontend/src/api/client.ts` | Modify | Add `generateApi.iterate()` method |
| `frontend/src/stores/appStore.ts` | Modify | Add `isIterating`, `iterateGeneration` state/action |
| `frontend/src/components/Writing/InstructionBar.tsx` | Create | New instruction bar component |
| `frontend/src/components/Writing/WritingEditor.tsx` | Modify | Integrate InstructionBar |
| `frontend/src/components/Writing/WritingWorkspace.tsx` | Modify | Wire up iteration flow |

## Tasks

### Task 1: Backend — Add iteration types

- [ ] Add `IterateRequest` interface to `backend/src/types/index.ts`:
  ```typescript
  export interface IterateRequest {
    current_content: string;
    instruction: string;
    style_mode?: 'imitate' | 'journal_style' | 'custom_prompt';
    language?: 'zh' | 'en';
    citation_format?: string;
    custom_prompt?: string;
    style_id?: number;
  }

  export interface IterateResponse {
    content: string;
    citations: CitationItem[];
  }
  ```
- [ ] Run `lsp_diagnostics` on the file to verify no type errors

### Task 2: Backend — Add `iterateWriting()` service function

- [ ] Add `IterateOptions` interface and `iterateWriting()` function to `backend/src/services/ai-writer.ts`
  - `IterateOptions`: `{ current_content: string; instruction: string; style_mode?: string; custom_prompt?: string; language: string; citation_format: string }`
  - `iterateWriting()`:
    - Uses same `getAIConfig()` for API key/base_url/model
    - System prompt: academic writing assistant that modifies existing text based on instruction; must return complete modified text; preserve citation markers
    - User prompt: `[Current Content]\n${current_content}\n\n[Modification Instruction]\n${instruction}\n\n[Style Requirements]\n${style info}\n\n[Output Language]\n${language}\n\n[Citation Format]\n${citation_format}`
    - Calls same `/chat/completions` endpoint with `temperature: 0.7, max_tokens: 4000` (higher token limit since returning full text)
    - Returns `{ content: string }`
- [ ] Run `lsp_diagnostics` on `ai-writer.ts`

### Task 3: Backend — Add `POST /iterate` route

- [ ] Add `POST /iterate` handler to `backend/src/routes/generate.ts`
  - Validate: `current_content` required, `instruction` required
  - Call `iterateWriting()` with the request body
  - Parse citations from modified content (scan for `[N]` markers, match to literature referenced in original content's citation context)
  - Store in `generation_records` with a `generation_type` column value of `'iteration'` (requires migration)
  - Return `{ content, citations }` as `IterateResponse`
  - Error handling same pattern as existing `POST /`
- [ ] Add migration for `generation_type` column to `backend/src/database.ts` MIGRATIONS array: `ALTER TABLE generation_records ADD COLUMN generation_type TEXT DEFAULT 'initial'`
- [ ] Run `lsp_diagnostics` on both files
- [ ] Start backend, verify `/api/health` still responds; test `POST /api/generate/iterate` with a mock request via curl

### Task 4: Frontend — Add iteration types and API client

- [ ] Add `IterateResult` interface to `frontend/src/types/index.ts`:
  ```typescript
  export interface IterateResult {
    content: string;
    citations: CitationItem[];
  }
  ```
- [ ] Add `generateApi.iterate()` method to `frontend/src/api/client.ts`:
  ```typescript
  iterate: (data: {
    current_content: string;
    instruction: string;
    style_mode?: StyleMode;
    language?: OutputLanguage;
    citation_format?: string;
    custom_prompt?: string;
    style_id?: number;
  }) => api.post<IterateResult>('/generate/iterate', data, { timeout: 120000 }),
  ```
- [ ] Run `lsp_diagnostics` on both files

### Task 5: Frontend — Add Zustand store state and actions

- [ ] Add to `AppState` interface in `frontend/src/stores/appStore.ts`:
  ```typescript
  isIterating: boolean;
  iterateGeneration: (instruction: string, currentContent: string) => Promise<void>;
  ```
- [ ] Add to store implementation:
  ```typescript
  isIterating: false,

  iterateGeneration: async (instruction, currentContent) => {
    set({ isIterating: true });
    try {
      const state = get();
      const { data } = await generateApi.iterate({
        current_content: currentContent,
        instruction,
        style_mode: state.generationResult?.style_mode as StyleMode || 'journal_style',
        language: 'zh',
        citation_format: 'GB/T 7714',
      });
      set({
        generationResult: {
          ...state.generationResult!,
          content: data.content,
          citations: data.citations,
        },
        editedContent: null,
      });
    } catch (err) {
      console.error('Iteration failed:', err);
    } finally {
      set({ isIterating: false });
    }
  },
  ```
- [ ] Run `lsp_diagnostics` on `appStore.ts`

### Task 6: Frontend — Create `InstructionBar` component

- [ ] Create `frontend/src/components/Writing/InstructionBar.tsx`
  - Props: `{ isIterating: boolean; hasContent: boolean; onInstruction: (instruction: string) => void }`
  - Layout: horizontal bar below editor toolbar area
    - Quick action buttons row: 改写, 扩写, 精简, 润色 (each maps to a preset instruction string)
    - Text input row: `<input>` with send button (Enter to submit)
    - Disabled when `!hasContent || isIterating`
    - Loading state: spinner on send button, input disabled
  - Style: TailwindCSS, match existing `WritingEditor` aesthetic (stone-50 bg, gray borders, blue accent for active/send)
  - Named export: `export function InstructionBar()`
- [ ] Run `lsp_diagnostics` on the new file

### Task 7: Frontend — Integrate InstructionBar into WritingEditor

- [ ] Modify `frontend/src/components/Writing/WritingEditor.tsx`:
  - Import `InstructionBar`
  - Add new prop `onInstruction: (instruction: string) => void` and `isIterating: boolean`
  - Place `InstructionBar` between the toolbar div and the `EditorContent` div
  - Pass `hasContent={!!content}`, `isIterating={isIterating}`, `onInstruction={onInstruction}`
- [ ] Run `lsp_diagnostics` on `WritingEditor.tsx`

### Task 8: Frontend — Wire up iteration flow in WritingWorkspace

- [ ] Modify `frontend/src/components/Writing/WritingWorkspace.tsx`:
  - Import `isIterating`, `iterateGeneration` from `useAppStore`
  - Add handler:
    ```typescript
    const handleInstruction = async (instruction: string) => {
      const content = editorRef.current?.getContent() ?? editedContent ?? generationResult?.content ?? '';
      if (!content) return;
      await iterateGeneration(instruction, content);
    };
    ```
  - Add `getContent()` to `EditorHandle` interface (exposes `editor.getMarkdown()`)
  - Pass `onInstruction={handleInstruction}` and `isIterating={isIterating}` to `WritingEditor`
- [ ] Run `lsp_diagnostics` on `WritingWorkspace.tsx`

### Task 9: Verify end-to-end

- [ ] Start backend: `cd backend && npm run dev`
- [ ] Start frontend: `cd frontend && npm run dev`
- [ ] Open browser, navigate to writing workspace
- [ ] Generate initial content via existing flow (select tags → configure → generate)
- [ ] Verify InstructionBar appears below toolbar with quick-action buttons and input
- [ ] Type "润色全文" in instruction bar, submit
- [ ] Verify: editor content updates with AI-modified version
- [ ] Click quick-action "扩写" button
- [ ] Verify: editor content updates again
- [ ] Check that citations update correctly in CitationBlock
- [ ] Run `lsp_diagnostics` on all modified/created files

## Dependencies

- Tasks 1-3 (backend) can be done in parallel with Tasks 4-5 (frontend types/store)
- Task 6 depends on Task 4 (types) for `StyleMode`/`OutputLanguage` references
- Task 7 depends on Task 6 (InstructionBar component)
- Task 8 depends on Tasks 5 and 7 (store actions + editor integration)
- Task 9 depends on all prior tasks

## Risks

- **Citation parsing in iteration**: Modified text may add/remove citation markers. The backend needs to re-extract `[N]` markers and match them to literature. This is harder than initial generation where we know which literature was used. Mitigation: send original citation list as context to AI, and parse markers from the returned text.
- **Token limits**: Sending full editor content + instruction may exceed model context limits for long texts. Mitigation: start with 4000 `max_tokens`, monitor; future enhancement could add truncation or section-specific iteration.
- **Editor content sync**: `editedContent` in store vs. current editor markdown may diverge if user manually edits between iterations. Mitigation: always use `editorRef.current?.getContent()` (actual editor state) as the source for `current_content`, not store state.