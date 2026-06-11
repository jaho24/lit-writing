# 写作工作区重构设计文档

**日期**: 2026-06-08
**状态**: 设计审批中
**影响范围**: `frontend/src/components/Writing/`, `frontend/src/stores/appStore.ts`, `frontend/src/types/index.ts`, `frontend/src/api/client.ts`, `backend/src/routes/literature.ts`, `frontend/package.json`

## 1. 问题陈述

当前写作工作区采用三栏等宽 `grid-cols-3` 布局（素材选择 / 写作风格 / 生成结果），存在以下核心问题：

- **布局比例不合理**：三栏等宽导致生成结果区仅占 1/3，阅读空间受限
- **结果展示简陋**：AI 生成的 Markdown 内容仅用 `<pre>` 纯文本标签显示，无格式渲染
- **无编辑能力**：生成后只能复制或导出，无法直接修改内容
- **素材选择功能单一**：仅有标签 checkbox 列表，无路径筛选、类型筛选、关键词检索

## 2. 设计目标

重构为**两栏布局**：
- **左侧（~40%）**：高级检索与结果列表 — 路径选择、类型筛选、标签输入、检索条件摘要、文献/笔记双视图、高亮摘录列表
- **右侧（~60%）**：阅读与写作编辑 — Tiptap WYSIWYG 编辑器，AI 生成内容即时渲染为富文本并可编辑

## 3. 布局结构

```
┌──────────────────────────────────────────────────────────────────┐
│                        写作工作区                                  │
├─────────────────┬────────────────────────────────────────────────┤
│                 │                                                │
│   检索区 40%    │           编辑区 60%                           │
│                 │                                                │
│ ┌─────────────┐ │ ┌────────────────────────────────────────────┐ │
│ │ 高级搜索表单│ │ │  Tiptap 工具栏                             │ │
│ │ · 路径选择  │ │ │  [B][I][H1][H2][列表][引用] | 复制 导出    │ │
│ │ · 类型筛选  │ │ ├────────────────────────────────────────────┤ │
│ │ · 标签输入  │ │ │                                            │ │
│ ├─────────────┤ │ │  WYSIWYG 编辑区                            │ │
│ │ 检索条件摘要│ │ │  AI 生成的文本直接渲染为富文本              │ │
│ │ 红色高亮统计│ │ │  可即时编辑、修改、格式化                   │ │
│ ├─────────────┤ │ │                                            │ │
│ │Tab: 文献|笔记│ │ │  ─── 参考文献 ───                          │ │
│ ├─────────────┤ │ │  [1] Smith (2023). Title...  ← 可交互     │ │
│ │结果列表     │ │ │                                            │ │
│ │· 高亮摘录   │ │ └────────────────────────────────────────────┘ │
│ │· 元数据标签 │ │                                                │
│ ├─────────────┤ │                                                │
│ │写作配置     │ │                                                │
│ │(可折叠)     │ │                                                │
│ │· 风格模式   │ │                                                │
│ │· 语言       │ │                                                │
│ │· 引用格式   │ │                                                │
│ ├─────────────┤ │                                                │
│ │[⚡ 生成]    │ │                                                │
│ └─────────────┘ │                                                │
└─────────────────┴────────────────────────────────────────────────┘
```

## 4. 左侧检索区详细设计

### 4.1 高级搜索表单

位于检索区顶部，包含三个筛选维度：

**路径选择**：下拉菜单，数据源为 `libraries`（树形结构）。选择某个文献库后，检索范围限定在该库及其子库下的文献。默认为"全部文献"。

**类型筛选**：radio 或 checkbox 组，选项包括：
- 全部
- 仅标注（annotations）
- 仅文献摘要（literature abstract）
- 仅笔记型标注（annotation type = 'note'）

**标签输入**：支持多选的标签选择器。可以从 `tags` 列表中选择多个标签，支持 AND/OR 逻辑切换。选中标签后，检索结果只包含带这些标签的标注或文献。

### 4.2 检索条件摘要

搜索表单下方实时显示当前检索条件的摘要：
- 以**红色高亮**背景显示每个活跃条件（路径名、类型、标签名）
- 右侧显示统计数量：`共 N 条结果`
- 每个条件旁有 ✕ 按钮，可快速移除该条件

示例：
```
🔴 路径: 认知科学  🔴 类型: 仅标注  🔴 标签:方法论 AND 实验设计    共 24 条结果
```

### 4.3 Tab 视图切换

检索条件摘要下方有两个 Tab 页签：
- **文献视图**：列表项为文献卡片，显示文献标题、作者、年份、摘要摘录、关联标签
- **笔记视图**：列表项为标注卡片，显示标注文本摘录（带关键词高亮背景）、批注、来源文献、关联标签

Tab 切换不重新检索，只改变结果列表的展示粒度。

### 4.4 结果列表

每个列表项包含：
- **高亮摘录**：检索关键词在文本中以特殊背景色高亮显示
- **元数据标签**：作者、年份、期刊等以小标签形式展示
- **来源信息**：文献视图显示文献元数据；笔记视图显示标注来源文献名

列表项可点击 → 将对应标注/文献的文本内容**追加**到右侧编辑区末尾作为素材参考（不替换已有内容）。

### 4.5 写作配置（可折叠）

位于检索区底部，包含：
- 风格模式选择（仿写 / 期刊风格 / 自定义）— radio button 组
- 条件展开：仿写 → 参考文本 textarea；期刊 → 风格模板下拉；自定义 → 提示词 textarea
- 输出语言：中文 / English
- 引用格式：GB/T 7714 / APA / IEEE / Nature / MLA

默认折叠，点击标题栏展开。不影响检索，只影响 AI 生成行为。

### 4.6 生成按钮

检索区最底部：醒目蓝色按钮 `⚡ 生成写作内容`
- 未选标签或无检索结果时禁用，显示提示文案
- 生成中显示 loading spinner + "正在生成..."
- 生成完成后按钮文案不变，可重新点击再次生成

## 5. 右侧编辑区详细设计

### 5.1 Tiptap 编辑器

**配置**：
- Extensions: `StarterKit` (Heading, Bold, Italic, BulletList, OrderedList, CodeBlock, Blockquote) + `Markdown` (双向转换) + 自定义 `CitationMark` (行内引用标记)
- 内容输入：AI 生成的 Markdown 字符串 → `editor.commands.setContent(markdownContent)`
- 内容输出：`editor.storage.markdown.getMarkdown()` → 导出/复制

**工具栏**：
- 格式化按钮组：Bold(B)、Italic(I)、H1、H2、BulletList、OrderedList、Blockquote
- 右侧操作按钮：复制全文、导出 .md、重新生成

**编辑行为**：
- AI 生成后内容自动填入编辑器，用户可立即开始编辑
- 编辑修改实时保存到 `editedContent` store state
- 支持撤销/重做（Tiptap 内置）

### 5.2 参考文献区

生成结果包含 citations 时，在编辑器下方渲染参考文献列表：
- 每条引用格式化显示：marker + authors + (year) + title + journal + DOI
- 引用项可点击 → 调用 `openTab(literature_id)` 在 PDF 预览中打开原始文献
- 引用列表不嵌入编辑器，作为独立的交互区域

### 5.3 空状态

未生成内容时：
- 居中显示 `PenTool` 图标 + 提示文案
- "选择标签并设置风格后，点击生成按钮"

## 6. 组件拆分

当前 `WritingWorkspace.tsx` (401行) 重构为：

```
Writing/
  WritingWorkspace.tsx        — 两栏布局容器
  SearchPanel.tsx             — 高级搜索表单（路径、类型、标签）
  SearchSummary.tsx           — 检索条件摘要（红色高亮 + 统计）
  ResultsList.tsx             — Tab视图 + 结果列表（文献/笔记视图）
  WritingConfig.tsx           — 写作配置可折叠区
  WritingEditor.tsx           — Tiptap WYSIWYG 编辑器
  CitationBlock.tsx           — 参考文献交互渲染
```

## 7. Store 变化

> **注意**: `SearchResultItem` 类型需同步添加到 `frontend/src/types/index.ts` 和 `backend/src/types/index.ts`，因为前后端都需要该类型定义。

新增 state:
```typescript
// 检索相关
searchPathId: number | null;           // 选中的文献库路径
searchTypeFilter: 'all' | 'annotations' | 'abstracts' | 'notes';  // 类型筛选
searchTagLogic: 'AND' | 'OR';         // 标签逻辑
searchResults: SearchResultItem[];     // 检索结果列表
searchActiveTab: 'literature' | 'notes';  // 视图 Tab

// 编辑相关
editedContent: string | null;          // 用户编辑后的内容

// 新增类型
interface SearchResultItem {
  id: number;
  type: 'literature' | 'annotation';
  title: string;
  excerpt: string;          // 高亮摘录
  highlightRanges: [number, number][];  // 高亮起止位置
  authors?: string;
  year?: number;
  journal?: string;
  tags: Tag[];
  literatureId: number;
}
```

新增 actions:
```typescript
setSearchPathId: (id: number | null) => void;
setSearchTypeFilter: (filter: SearchTypeFilter) => void;
setSearchTagLogic: (logic: 'AND' | 'OR') => void;
setSearchActiveTab: (tab: 'literature' | 'notes') => void;
performSearch: () => Promise<void>;      // 综合检索（路径+类型+标签）
setEditedContent: (content: string) => void;
```

## 8. API 变化

**新增检索端点** (backend):
```
POST /api/literature/search-advanced
Body: {
  library_id?: number;
  type_filter: 'all' | 'annotations' | 'abstracts' | 'notes';
  tag_ids: number[];
  tag_logic: 'AND' | 'OR';
}
Response: {
  results: SearchResultItem[];
  total_count: number;
  active_conditions: { path?: string; type?: string; tags?: string[] };
}
```

**高亮实现说明**: 后端检索返回的 `highlightRanges` 为字符偏移量数组（如 `[[5, 12], [45, 58]]`），前端根据这些偏移量在摘录文本中渲染 `<mark>` 高亮标签。偏移量由后端在 SQL 全文检索或正则匹配时计算。当前阶段如后端计算偏移量成本较高，可先实现"前端关键词匹配高亮"作为降级方案：前端拿到 `active_conditions.tags` 的标签名后，在摘录文本中对标签名关键词做简单正则高亮。

## 9. 新增前端依赖

```
@tiptap/react              — React 集成
@tiptap/starter-kit         — 基础扩展包
@tiptap/extension-markdown  — Markdown 双向转换
@tiptap/pm                  — ProseMirror 核心
```

约 ~150KB gzipped。

## 10. 不做的事情

- ❌ 不改变 `/api/generate` 的请求/响应格式
- ❌ 不改变 Layout.tsx 的右侧面板切换逻辑
- ❌ 不添加协同编辑、版本管理 — 留给后续迭代
- ❌ 不修改 PDF 预览或标注创建流程
- ❌ 不删除现有功能（标签选择、风格模式、语言/引用设置全部保留，只是重新组织布局）

## 12. 自审查见

本节记录设计过程中的自我审查发现及修正：

| 问题 | 修正措施 |
|---|---|
| `SearchResultItem` 类型仅定义在 store 中，前后端都需要 | 添加注释：需同步到 `frontend/src/types/index.ts` 和 `backend/src/types/index.ts` |
| "列表项可点击 → 内容加入编辑区"含义模糊 | 明确为"追加到编辑区末尾"，不替换已有内容 |
| `highlightRanges` 高亮偏移量来源不明确 | 添加"高亮实现说明"段落：后端计算为正道，前端关键词匹配为降级方案 |
| 新增后端端点不在原始用户需求中 | 标注为必要实现 — 高级检索功能必须要有后端支持 |
| 组件拆分中缺少类型文件 | 影响范围已更新，包含 `types/index.ts` |

## 13. 实现步骤（预估）

1. 安装 Tiptap 依赖
2. 创建 `WritingEditor.tsx` — Tiptap 编辑器 + 工具栏
3. 创建 `SearchPanel.tsx` — 高级搜索表单
4. 创建 `SearchSummary.tsx` — 检索条件摘要
5. 创建 `ResultsList.tsx` — Tab 视图 + 结果列表
6. 创建 `WritingConfig.tsx` — 写作配置折叠区
7. 创建 `CitationBlock.tsx` — 参考文献交互渲染
8. 新增后端 `/api/literature/search-advanced` 端点
9. 更新 `appStore.ts` — 新增检索和编辑 state/actions
10. 重构 `WritingWorkspace.tsx` — 两栏布局容器
11. 验证 — LSP diagnostics + 手动测试完整流程