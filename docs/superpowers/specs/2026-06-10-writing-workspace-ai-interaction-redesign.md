# Writing Workspace AI Interaction Redesign

**Date**: 2026-06-10
**Approach**: C — Mixed Mode (Initial Generation + Instruction Bar)
**Status**: Draft

## Problem

Current AI writing interaction is one-shot: select tags → configure → generate → done. There is no way to iteratively refine the AI output. Users must manually edit the generated text or regenerate from scratch, which breaks the writing flow and wastes good partial results.

## Design

### Core Concept

Add a lightweight **instruction bar** to the writing editor. After initial generation, the user can type free-form instructions (e.g. "rewrite paragraph 2 more formally", "expand the methodology section", "simplify the third argument") and the AI will modify the current editor content based on that instruction.

Each instruction is independent — no conversation history is maintained. The AI receives:
1. The current full editor content (as context)
2. The user's instruction
3. The original generation parameters (style, language, citation format)

This covers ~90% of iteration needs for academic writing without the complexity of a full chat system.

### Frontend Changes

#### 1. New Component: `InstructionBar`

Location: Below the Tiptap toolbar in `WritingEditor.tsx`, or as a floating bar at the bottom of the editor panel.

```
┌─────────────────────────────────────────────┐
│  [Toolbar: Bold Italic H1 H2 ...]           │
├─────────────────────────────────────────────┤
│                                             │
│  [Editor content area]                      │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│  [Quick actions: 改写 | 扩写 | 精简 | 润色] │
│  [Type instruction...                    ➤] │
└─────────────────────────────────────────────┘
```

Features:
- **Text input** for free-form instructions
- **Quick action buttons** for common operations: Rewrite (改写), Expand (扩写), Condense (精简), Polish (润色)
- **Submit** via Enter key or send button
- Shows loading state while AI processes
- Disabled when no content in editor or when initial generation hasn't been done

#### 2. Modified Component: `WritingEditor`

- Add `InstructionBar` as a child component
- Pass current editor markdown content down for AI context
- Handle the "apply AI modification" callback: replace editor content with AI response
- During instruction processing, show a subtle diff or loading overlay (not the full-screen loader used for initial generation)

#### 3. Modified Component: `WritingWorkspace`

- Add state for `instructionHistory` (optional — list of recent instructions for UX, not for AI context)
- Wire up the instruction flow: instruction → API call → update editor content

### Backend Changes

#### 1. New Endpoint: `POST /api/generate/iterate`

```typescript
interface IterateRequest {
  current_content: string;      // Full markdown from editor
  instruction: string;           // User's free-form instruction
  style_mode?: StyleMode;       // Original style params (for consistency)
  language?: OutputLanguage;
  citation_format?: string;
  custom_prompt?: string;
  style_id?: number;
  tag_ids?: number[];           // Optional: re-fetch annotations if needed
}

interface IterateResponse {
  content: string;              // Modified full markdown
  citations: CitationItem[];    // Updated citations (may add/remove)
}
```

The endpoint:
1. Constructs a system prompt that includes the academic writing assistant persona (same as initial generation)
2. Includes the current content as context
3. Appends the user's instruction
4. Calls the same `generateWriting()` service (or a new `iterateWriting()` that takes different prompt structure)
5. Returns the modified content + updated citations

#### 2. New Service Function: `iterateWriting()`

In `backend/src/services/ai-writer.ts`:

```typescript
interface IterateOptions {
  current_content: string;
  instruction: string;
  style_mode: string;
  custom_prompt?: string;
  language: string;
  citation_format: string;
}
```

System prompt for iteration:
```
你是一位学术写作助手。用户会提供当前的写作内容以及一条修改指令。
你的任务是：根据修改指令，对当前内容进行修改，返回修改后的完整文本。
要求：
1. 只修改与指令相关的部分，保持其余内容不变
2. 保持引用标记[序号]的连续性和正确性
3. 如果修改导致引用变化，更新引用列表
4. 返回完整的修改后文本（不仅仅是修改的部分）
```

#### 3. Generation Record

Store iteration calls in `generation_records` table with a `type` field to distinguish `initial` vs `iteration`. This allows tracking how many iterations a user typically makes.

### State Management (Zustand)

Add to `appStore.ts`:

```typescript
// New state
iterationCount: number;              // How many iterations on current piece
isIterating: boolean;                // Loading state for iteration

// New actions
iterateGeneration: (instruction: string) => Promise<void>;  // Call iterate API
resetIterationCount: () => void;     // Reset on new initial generation
```

### Interaction Flow

1. **Initial generation** (unchanged): Select tags → Configure → Click generate → AI returns full text
2. **Iteration**: Type instruction in bar → Enter → AI receives current editor content + instruction → Returns modified content → Editor updates
3. **Quick actions**: Click "改写/扩写/精简/润色" → Same flow with preset instruction
4. **Continue iterating**: User can keep sending instructions; each one operates on the current editor state

### What This Does NOT Include (Explicit Scope Boundaries)

- No conversation history / chat thread management
- No multi-model selection per iteration
- No inline diff view (just replaces content)
- No "undo iteration" beyond browser/editor undo
- No change to the left panel (SearchPanel, ResultsList, WritingConfig)

## Implementation Scope

| Area | Files | Effort |
|------|-------|--------|
| Backend: iterate endpoint | `routes/generate.ts`, `services/ai-writer.ts`, `types/index.ts` | Medium |
| Frontend: InstructionBar component | New `components/Writing/InstructionBar.tsx` | Medium |
| Frontend: WritingEditor integration | `components/Writing/WritingEditor.tsx` | Small |
| Frontend: Zustand store updates | `stores/appStore.ts` | Small |
| Frontend: API client | `api/client.ts` | Small |

Total estimate: ~200-300 lines of new/modified code across both packages.
