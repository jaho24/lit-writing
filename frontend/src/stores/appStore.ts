import { create } from 'zustand';
import type { Library, Literature, Annotation, Tag, WritingStyle, GenerationResult, RightPanelTab } from '../types';
import { libraryApi, literatureApi, annotationApi, tagApi, writingStyleApi } from '../api/client';

interface AppState {
  libraries: Library[];
  selectedLibraryId: number | null;
  literature: Literature[];
  selectedLiteratureId: number | null;
  annotations: Annotation[];
  tags: Tag[];
  writingStyles: WritingStyle[];
  rightPanelTab: RightPanelTab;
  searchQuery: string;
  isGenerating: boolean;
  generationResult: GenerationResult | null;
  currentPage: number;

  selectedLiterature: () => Literature | null;

  fetchLibraries: () => Promise<void>;
  createLibrary: (name: string, parentId?: number) => Promise<void>;
  deleteLibrary: (id: number) => Promise<void>;
  selectLibrary: (id: number | null) => Promise<void>;

  fetchLiterature: () => Promise<void>;
  fetchLiteratureByLibrary: (libraryId: number) => Promise<void>;
  searchLiterature: (q: string) => Promise<void>;
  selectLiterature: (id: number | null) => Promise<void>;
  updateLiterature: (id: number, data: Partial<Literature>) => Promise<void>;
  deleteLiterature: (id: number) => Promise<void>;

  fetchAnnotations: (literatureId: number) => Promise<void>;
  fetchAnnotationsByTags: (tagIds: number[], logic?: 'AND' | 'OR') => Promise<void>;
  createAnnotation: (data: {
    literature_id: number;
    page: number;
    position_x?: number;
    position_y?: number;
    width?: number;
    height?: number;
    type?: 'highlight' | 'note';
    text?: string;
    note?: string;
    tag_ids?: number[];
  }) => Promise<void>;
  updateAnnotation: (id: number, data: Partial<Annotation>) => Promise<void>;
  setAnnotationTags: (id: number, tagIds: number[]) => Promise<void>;
  deleteAnnotation: (id: number) => Promise<void>;
  setSelectedLiterature: (id: number | null) => void;
  setCurrentPage: (page: number) => void;

  fetchTags: () => Promise<void>;
  createTag: (name: string, color?: string, description?: string) => Promise<void>;
  updateTag: (id: number, name: string, color: string, description?: string) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;

  fetchWritingStyles: () => Promise<void>;

  setRightPanelTab: (tab: RightPanelTab) => void;
  setSearchQuery: (q: string) => void;
  setIsGenerating: (v: boolean) => void;
  setGenerationResult: (r: GenerationResult | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  libraries: [],
  selectedLibraryId: null,
  literature: [],
  selectedLiteratureId: null,
  annotations: [],
  tags: [],
  writingStyles: [],
  rightPanelTab: 'preview',
  searchQuery: '',
  isGenerating: false,
  generationResult: null,
  currentPage: 1,

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
  deleteLibrary: async (id) => {
    await libraryApi.delete(id);
    await get().fetchLibraries();
    if (get().selectedLibraryId === id) set({ selectedLibraryId: null });
  },
  selectLibrary: async (id) => {
    set({ selectedLibraryId: id });
    if (id) {
      await get().fetchLiteratureByLibrary(id);
    } else {
      await get().fetchLiterature();
    }
  },

  fetchLiterature: async () => {
    const { data } = await literatureApi.getAll();
    set({ literature: data });
  },
  fetchLiteratureByLibrary: async (libraryId) => {
    const { data } = await literatureApi.getByLibrary(libraryId);
    set({ literature: data });
  },
  searchLiterature: async (q) => {
    const { data } = await literatureApi.search(q);
    set({ literature: data, searchQuery: q });
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
  createTag: async (name, color, description) => {
    await tagApi.create(name, color, description);
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

  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setGenerationResult: (r) => set({ generationResult: r }),
  setSelectedLiterature: (id) => set({ selectedLiteratureId: id }),
  setCurrentPage: (page) => set({ currentPage: page }),
}));