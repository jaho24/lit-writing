# PDF Browser-Style Tabs Design

Date: 2026-06-05

## Goal

Add browser-style PDF tabs to LitWrite's right panel, so each opened literature gets its own tab (like Chrome tabs). Users can have multiple PDFs open simultaneously, switch between them, and close individual tabs. Tabs preserve page number and zoom level.

## Scope (Phase 1)

This phase covers **only the PDF tab bar**. Folder grouping and annotation type extensions are deferred.

## Current Architecture

- Right panel has text-label tabs: "预览 | 标注 | 写作 | 设置"
- "预览" tab renders `PDFPreview` component (380 lines) which loads a single PDF based on `selectedLiteratureId`
- `PDFPreview` manages its own state: `pdfDocument`, `currentPage`, `scale`, annotation overlays, text selection, tag assignment
- Clicking a literature row in the middle pane calls `selectLiterature(id)` which sets `selectedLiteratureId` and fetches annotations
- The PDF is re-loaded every time `selectedLiteratureId` changes

## New Architecture

### State (Zustand store additions)

```typescript
interface OpenTab {
  literatureId: number;
  title: string;
  page: number;
  scale: number;
}

// New fields in AppState:
openTabs: OpenTab[];           // max 5
activeTabId: number | null;    // literatureId of active tab
```

### Tab Bar Component

New component: `PdfTabBar.tsx` in `components/Preview/`

- Renders a horizontal bar of tabs between the text-label tabs and the content area
- Each tab shows: truncated title + close button (×)
- Active tab: white bg + bottom border `#2D6DA4`
- Inactive tabs: `#f5f5f5` bg, hover → lighter
- Max 5 tabs; opening a 6th replaces the oldest inactive tab
- Clicking a tab → `setActiveTabId(id)`, also calls `selectLiterature(id)` to load annotations
- Closing a tab → remove from `openTabs`, activate adjacent tab
- Close all → show empty state

### PDFPreview Changes

- Accept `literatureId` and `initialPage`/`initialScale` as props instead of reading from store
- On mount, restore page/scale from the tab's saved state
- On unmount (tab switch), save current page/scale back to `openTabs`
- Only the active tab's PDFPreview is rendered (lazy loading)

### Interaction Flow

1. **Double-click** a literature row → `openTab(literatureId, title)` + `setActiveTabId(literatureId)`
2. **Single-click** a literature row → `selectLiterature(id)` (highlights row, shows basic info, but does NOT open PDF tab)
3. **Right-click → "在预览中打开"** → same as double-click
4. If the literature is already in `openTabs` → just switch to that tab (don't duplicate)
5. Closing last tab → `activeTabId = null`, show empty state in preview area

### Right Panel Layout (updated)

```
┌─────────────────────────────────────┐
│ 预览 | 标注 | 写作 | 设置           │  text-label tabs (unchanged)
├─────────────────────────────────────┤
│ [Paper A ×] [Paper B ×]            │  PdfTabBar (only when 预览 is active)
├─────────────────────────────────────┤
│                                     │
│  PDFPreview (only active tab)       │  content area
│  or AnnotationList / Writing / etc  │
│                                     │
└─────────────────────────────────────┘
```

The PdfTabBar is only visible when the "预览" text-label tab is active.

### Store Actions (new)

```typescript
openTab: (literatureId: number, title: string) => void;
closeTab: (literatureId: number) => void;
setActiveTabId: (id: number | null) => void;
updateTabState: (literatureId: number, page: number, scale: number) => void;
```

### Files to Modify

| File | Change |
|------|--------|
| `stores/appStore.ts` | Add `openTabs`, `activeTabId`, new actions |
| `types/index.ts` | Add `OpenTab` interface |
| `components/Preview/PdfTabBar.tsx` | New component |
| `components/Preview/PDFPreview.tsx` | Accept props, save/restore state on mount/unmount |
| `components/Layout/Layout.tsx` | Render PdfTabBar, wire up double-click on LiteratureList |
| `components/Library/LiteratureList.tsx` | Add `onDoubleClick` handler |

### Constraints

- Max 5 open tabs (enforced in `openTab` action)
- Only the active tab renders a PDFPreview instance
- Tab state (page, scale) persists across tab switches within a session
- No server-side changes needed (all tab state is client-side)
- Compatible with existing annotation creation flow (text selection → highlight → tag assignment)
