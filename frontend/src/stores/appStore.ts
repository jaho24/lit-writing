import { create } from 'zustand';
import type { Library, Literature, Annotation, Tag, WritingStyle, GenerationResult, RightPanelTab, AIConfigResponse, OpenTab, SearchTypeFilter, SearchResultItem, ChatMessage, ChatThread, PromptTemplate, PersistedChatMessage } from '../types';
import { libraryApi, literatureApi, annotationApi, tagApi, writingStyleApi, configApi, chatApi, promptTemplateApi } from '../api/client';

interface AppState {
  libraries: Library[];
  literature: Literature[];
  selectedLiteratureId: number | null;
  annotations: Annotation[];
  tags: Tag[];
  selectedWritingTags: number[];
  writingAnnotations: Annotation[];
  writingStyles: WritingStyle[];
  rightPanelTab: RightPanelTab;
  searchQuery: string;
  isGenerating: boolean;
  generationResult: GenerationResult | null;
  currentPage: number;
  aiConfig: AIConfigResponse | null;
  openTabs: OpenTab[];
  activeTabId: number | null;

  // Search
  searchPathId: number | null;
  searchTypeFilter: SearchTypeFilter;
  searchTagLogic: 'AND' | 'OR';
  searchResults: SearchResultItem[];

  // Editor
  editedContent: string | null;

  // Chat
  chatMessages: ChatMessage[];
  isChatGenerating: boolean;
  selectedPromptId: number | null;
  selectedPromptType: 'style' | 'template' | null;
  selectedAnnotationIds: number[];
  currentChatId: number | null;
  chatThreads: ChatThread[];
  promptTemplates: PromptTemplate[];

  selectedLiterature: () => Literature | null;

  fetchLibraries: () => Promise<void>;
  createLibrary: (name: string, parentId?: number) => Promise<void>;
  renameLibrary: (id: number, name: string) => Promise<void>;
  deleteLibrary: (id: number) => Promise<void>;
  assignLiteratureToFolder: (literatureId: number, libraryId: number | null) => Promise<void>;

  fetchLiterature: () => Promise<void>;
  fetchLiteratureByTag: (tagId: number) => Promise<void>;
  searchLiterature: (q: string) => Promise<void>;
  selectLiterature: (id: number | null) => Promise<void>;
  updateLiterature: (id: number, data: Partial<Literature>) => Promise<void>;
  toggleLiteratureStar: (id: number, isStarred: boolean) => Promise<void>;
  setLiteraturePriority: (id: number, priority: 0 | 1 | 2) => Promise<void>;
  deleteLiterature: (id: number) => Promise<void>;

  fetchAnnotations: (literatureId: number) => Promise<void>;
  fetchAnnotationsByTags: (tagIds: number[], logic?: 'AND' | 'OR') => Promise<void>;
  fetchWritingAnnotations: (tagIds: number[]) => Promise<void>;
  setSelectedWritingTags: (tags: number[]) => void;
  createAnnotation: (data: {
    literature_id: number;
    page: number;
    position_x?: number;
    position_y?: number;
    width?: number;
    height?: number;
    type?: 'highlight' | 'note' | 'underline';
    text?: string;
    note?: string;
    tag_ids?: number[];
  }) => Promise<void>;
  updateAnnotation: (id: number, data: Partial<Annotation>) => Promise<void>;
  setAnnotationTags: (id: number, tagIds: number[]) => Promise<void>;
  deleteAnnotation: (id: number) => Promise<void>;
  setSelectedLiterature: (id: number | null) => void;
  setCurrentPage: (page: number) => void;
  openTab: (literatureId: number, title: string) => void;
  closeTab: (literatureId: number) => void;
  setActiveTabId: (id: number | null) => void;
  updateTabState: (literatureId: number, page: number, scale: number) => void;

  fetchTags: () => Promise<void>;
  createTag: (name: string, color?: string, description?: string, parent_id?: number | null) => Promise<void>;
  updateTag: (id: number, name: string, color: string, description?: string) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;

  fetchWritingStyles: () => Promise<void>;

  fetchAIConfig: () => Promise<void>;

  setRightPanelTab: (tab: RightPanelTab) => void;
  setSearchQuery: (q: string) => void;
  setIsGenerating: (v: boolean) => void;
  setGenerationResult: (r: GenerationResult | null) => void;

  setSearchPathId: (id: number | null) => void;
  setSearchTypeFilter: (filter: SearchTypeFilter) => void;
  setSearchTagLogic: (logic: 'AND' | 'OR') => void;
  performSearch: () => Promise<void>;
  setEditedContent: (content: string | null) => void;

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
}

export const useAppStore = create<AppState>((set, get) => ({
  libraries: [],
  literature: [],
  selectedLiteratureId: null,
  annotations: [],
  tags: [],
  selectedWritingTags: [],
  writingAnnotations: [],
  writingStyles: [],
  rightPanelTab: 'preview',
  searchQuery: '',
  isGenerating: false,
  generationResult: null,
  currentPage: 1,
  aiConfig: null,
  openTabs: [],
  activeTabId: null,
  searchPathId: null,
  searchTypeFilter: 'all' as SearchTypeFilter,
  searchTagLogic: 'AND' as const,
  searchResults: [],
  editedContent: null,
  chatMessages: [],
  isChatGenerating: false,
  selectedPromptId: null,
  selectedPromptType: null,
  selectedAnnotationIds: [],
  currentChatId: null,
  chatThreads: [],
  promptTemplates: [],

  selectedLiterature: () => {
    const id = get().selectedLiteratureId;
    if (!id) return null;
    return get().literature.find(l => l.id === id) || null;
  },

  fetchLibraries: async () => {
    const { data } = await libraryApi.getAll();
    set({ libraries: data });
  },
  createLibrary: async (name, parentId) => {
    await libraryApi.create(name, parentId);
    await get().fetchLibraries();
  },
  renameLibrary: async (id, name) => {
    await libraryApi.update(id, name);
    await get().fetchLibraries();
  },
  deleteLibrary: async (id) => {
    await libraryApi.delete(id);
    await get().fetchLibraries();
  },
  fetchLiterature: async () => {
    const { data } = await literatureApi.getAll();
    set({ literature: data });
  },
  fetchLiteratureByTag: async (tagId) => {
    const { data } = await literatureApi.getByTag(tagId);
    set({ literature: data });
  },
  searchLiterature: async (q) => {
    const { data } = await literatureApi.search(q);
    set({ literature: data, searchQuery: q });
  },
  assignLiteratureToFolder: async (literatureId: number, libraryId: number | null) => {
    await literatureApi.setLibraries(literatureId, libraryId ? [libraryId] : []);
    await get().fetchLiterature();
  },
  selectLiterature: async (id) => {
    set({ selectedLiteratureId: id, rightPanelTab: 'preview' });
    if (id) {
      await get().fetchAnnotations(id);
    }
  },
  updateLiterature: async (id, data) => {
    await literatureApi.update(id, data);
    await get().fetchLiterature();
  },
  toggleLiteratureStar: async (id, isStarred) => {
    await literatureApi.toggleStar(id, isStarred);
    set({ literature: get().literature.map(l => l.id === id ? { ...l, is_starred: isStarred ? 1 : 0 } : l) });
  },
  setLiteraturePriority: async (id, priority) => {
    await literatureApi.setPriority(id, priority);
    set({ literature: get().literature.map(l => l.id === id ? { ...l, priority } : l) });
  },
  deleteLiterature: async (id) => {
    await literatureApi.delete(id);
    await get().fetchLiterature();
    if (get().selectedLiteratureId === id) set({ selectedLiteratureId: null });
  },

  fetchAnnotations: async (literatureId) => {
    const { data } = await annotationApi.getByLiterature(literatureId);
    set({ annotations: data });
  },
  fetchAnnotationsByTags: async (tagIds, logic) => {
    const { data } = await annotationApi.getAll({ tag_ids: tagIds, logic });
    set({ annotations: data, rightPanelTab: 'annotations' });
  },
  fetchWritingAnnotations: async (tagIds) => {
    if (tagIds.length === 0) {
      set({ writingAnnotations: [] });
      return;
    }
    const logic = get().searchTagLogic;
    const { data } = await annotationApi.getAll({ tag_ids: tagIds, logic });
    set({ writingAnnotations: data });
  },
  setSelectedWritingTags: (tags) => {
    set({ selectedWritingTags: tags });
    if (tags.length > 0) {
      get().performSearch();
    } else {
      set({ searchResults: [], selectedAnnotationIds: [] });
    }
  },
  createAnnotation: async (data) => {
    const { data: annotation } = await annotationApi.create(data);
    set({ annotations: [...get().annotations, annotation] });
  },
  updateAnnotation: async (id, data) => {
    await annotationApi.update(id, data);
    const litId = get().selectedLiteratureId;
    if (litId) await get().fetchAnnotations(litId);
  },
  setAnnotationTags: async (id, tagIds) => {
    await annotationApi.setTags(id, tagIds);
    const litId = get().selectedLiteratureId;
    if (litId) await get().fetchAnnotations(litId);
  },
  deleteAnnotation: async (id) => {
    await annotationApi.delete(id);
    set({ annotations: get().annotations.filter(a => a.id !== id) });
  },

  fetchTags: async () => {
    const { data } = await tagApi.getAll();
    set({ tags: data });
  },
  createTag: async (name, color, description, parent_id) => {
    await tagApi.create(name, color, description, parent_id);
    await get().fetchTags();
  },
  updateTag: async (id, name, color, description) => {
    await tagApi.update(id, name, color, description);
    await get().fetchTags();
  },
  deleteTag: async (id) => {
    await tagApi.delete(id);
    await get().fetchTags();
  },

  fetchWritingStyles: async () => {
    const { data } = await writingStyleApi.getAll();
    set({ writingStyles: data });
  },

  fetchAIConfig: async () => {
    const { data } = await configApi.getAIConfig();
    set({ aiConfig: data });
  },

  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setGenerationResult: (r) => set({ generationResult: r }),
  setSearchPathId: (id) => {
    set({ searchPathId: id });
    const { selectedWritingTags } = get();
    if (selectedWritingTags.length > 0) {
      get().performSearch();
    }
  },
  setSearchTypeFilter: (filter) => {
    set({ searchTypeFilter: filter });
    const { selectedWritingTags } = get();
    if (selectedWritingTags.length > 0) {
      get().performSearch();
    }
  },
  setSearchTagLogic: (logic) => {
    set({ searchTagLogic: logic });
    const { selectedWritingTags } = get();
    if (selectedWritingTags.length > 0) {
      get().performSearch();
    }
  },
  performSearch: async () => {
    const { searchPathId, searchTypeFilter, selectedWritingTags, searchTagLogic } = get();
    if (selectedWritingTags.length === 0) {
      set({ searchResults: [] });
      return;
    }
    try {
      const { data } = await literatureApi.searchAdvanced({
        library_id: searchPathId ?? undefined,
        type_filter: searchTypeFilter,
        tag_ids: selectedWritingTags,
        tag_logic: searchTagLogic,
      });
      set({ searchResults: data.results });
    } catch (error) {
      console.error('Search failed:', error);
      set({ searchResults: [] });
    }
  },
  setEditedContent: (content) => set({ editedContent: content }),
  setSelectedLiterature: (id) => set({ selectedLiteratureId: id }),
  setCurrentPage: (page) => set({ currentPage: page }),

  openTab: (literatureId, title) => {
    const { openTabs, activeTabId } = get();
    const existing = openTabs.find(t => t.literatureId === literatureId);
    if (existing) {
      set({ activeTabId: literatureId, selectedLiteratureId: literatureId, rightPanelTab: 'preview' });
      get().fetchAnnotations(literatureId);
      return;
    }
    let newTabs = [...openTabs];
    if (newTabs.length >= 5) {
      const inactiveIndex = newTabs.findIndex(t => t.literatureId !== activeTabId);
      if (inactiveIndex >= 0) {
        newTabs.splice(inactiveIndex, 1);
      } else {
        newTabs.shift();
      }
    }
    newTabs.push({ literatureId, title, page: 1, scale: 1.2 });
    set({ openTabs: newTabs, activeTabId: literatureId, selectedLiteratureId: literatureId, rightPanelTab: 'preview' });
    get().fetchAnnotations(literatureId);
  },

  closeTab: (literatureId) => {
    const { openTabs, activeTabId } = get();
    const newTabs = openTabs.filter(t => t.literatureId !== literatureId);
    let newActiveId = activeTabId;
    if (activeTabId === literatureId) {
      const closedIndex = openTabs.findIndex(t => t.literatureId === literatureId);
      if (newTabs.length > 0) {
        const adjacentTab = newTabs[Math.min(Math.max(closedIndex, 0), newTabs.length - 1)];
        if (adjacentTab) {
          newActiveId = adjacentTab.literatureId;
          set({ selectedLiteratureId: newActiveId });
          get().fetchAnnotations(newActiveId);
        }
      } else {
        newActiveId = null;
        set({ selectedLiteratureId: null });
      }
    }
    set({ openTabs: newTabs, activeTabId: newActiveId });
  },

  setActiveTabId: (id) => {
    if (id) {
      set({ activeTabId: id, selectedLiteratureId: id });
      get().fetchAnnotations(id);
    } else {
      set({ activeTabId: null });
    }
  },

  updateTabState: (literatureId, page, scale) => {
    set({
      openTabs: get().openTabs.map(t =>
        t.literatureId === literatureId ? { ...t, page, scale } : t
      ),
    });
  },

  sendChatMessage: async (instruction) => {
    const state = get();
    if (!instruction.trim()) return;

    const annotationIds = state.selectedAnnotationIds
      .filter(id => state.searchResults.some(r => r.id === id && r.type === 'annotation'));
    const literatureIds = state.selectedAnnotationIds
      .filter(id => state.searchResults.some(r => r.id === id && r.type === 'literature'));

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: instruction,
      citations: [],
      annotationIds: state.selectedAnnotationIds,
      promptUsed: state.selectedPromptId
        ? (state.selectedPromptType === 'style'
          ? state.writingStyles.find(s => s.id === state.selectedPromptId)?.style_prompt
          : state.promptTemplates.find(t => t.id === state.selectedPromptId)?.prompt_text) || null
        : null,
      promptType: state.selectedPromptType,
      timestamp: Date.now(),
    };

    set({ chatMessages: [...state.chatMessages, userMessage], isChatGenerating: true });

    try {
      const promptText = state.selectedPromptId
        ? (state.selectedPromptType === 'style'
          ? state.writingStyles.find(s => s.id === state.selectedPromptId)?.style_prompt
          : state.promptTemplates.find(t => t.id === state.selectedPromptId)?.prompt_text)
        : undefined;

      const { data } = await chatApi.generate({
        thread_id: state.currentChatId ?? undefined,
        messages: state.chatMessages.map(m => ({ role: m.role, content: m.content })),
        instruction,
        annotation_ids: annotationIds,
        literature_ids: literatureIds.length > 0 ? literatureIds : undefined,
        prompt_template: promptText,
        prompt_type: state.selectedPromptType ?? undefined,
        language: 'zh',
        citation_format: 'GB/T 7714',
      });

      const aiMessage: ChatMessage = {
        id: `ai-${data.message_id}`,
        role: 'assistant',
        content: data.content,
        citations: data.citations,
        annotationIds: state.selectedAnnotationIds,
        promptUsed: promptText || null,
        promptType: state.selectedPromptType,
        timestamp: Date.now(),
      };

      set({
        chatMessages: [...get().chatMessages, aiMessage],
        currentChatId: data.thread_id,
        isChatGenerating: false,
      });

      await get().fetchChatThreads();
    } catch (err) {
      console.error('Chat generation failed:', err);
      set({ isChatGenerating: false });
    }
  },

  setSelectedPromptId: (id, type) => set({ selectedPromptId: id, selectedPromptType: type }),
  setSelectedAnnotationIds: (ids) => set({ selectedAnnotationIds: ids }),
  clearChat: () => set({ chatMessages: [], currentChatId: null }),

  fetchChatThreads: async () => {
    const { data } = await chatApi.getThreads();
    set({ chatThreads: data });
  },

  loadChatThread: async (threadId) => {
    const { data } = await chatApi.getThread(threadId);
    const messages: ChatMessage[] = (data.messages as PersistedChatMessage[]).map(m => ({
      id: `msg-${m.id}`,
      role: m.role,
      content: m.content,
      citations: typeof m.citations === 'string' ? JSON.parse(m.citations) : m.citations,
      annotationIds: typeof m.annotation_ids === 'string' ? JSON.parse(m.annotation_ids) : m.annotation_ids,
      promptUsed: m.prompt_used,
      promptType: m.prompt_type,
      timestamp: new Date(m.created_at).getTime(),
    }));
    set({ currentChatId: threadId, chatMessages: messages });
  },

  createChatThread: async (title) => {
    const { data } = await chatApi.createThread(title);
    set({ currentChatId: data.id, chatMessages: [], chatThreads: [data, ...get().chatThreads] });
  },

  deleteChatThread: async (threadId) => {
    await chatApi.deleteThread(threadId);
    if (get().currentChatId === threadId) {
      set({ currentChatId: null, chatMessages: [] });
    }
    await get().fetchChatThreads();
  },

  fetchPromptTemplates: async () => {
    const { data } = await promptTemplateApi.getAll();
    set({ promptTemplates: data });
  },

  createPromptTemplate: async (templateData) => {
    const { data } = await promptTemplateApi.create(templateData);
    set({ promptTemplates: [...get().promptTemplates, data] });
  },

  deletePromptTemplate: async (id) => {
    await promptTemplateApi.delete(id);
    set({ promptTemplates: get().promptTemplates.filter(t => t.id !== id) });
    if (get().selectedPromptId === id && get().selectedPromptType === 'template') {
      set({ selectedPromptId: null, selectedPromptType: null });
    }
  },
}));