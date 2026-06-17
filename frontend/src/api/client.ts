import axios from 'axios';
import type { Literature, Library, Annotation, Tag, WritingStyle, StyleMode, OutputLanguage, GenerationResult, AIConfigResponse, AIConfigPublic, SearchTypeFilter, SearchAdvancedResponse, ChatGenerateRequest, ChatGenerateResponse, ChatThread, PersistedChatMessage, PromptTemplate, TranslateRequest, TranslateResponse } from '../types';

// VITE_BACKEND_URL is set in production (e.g. https://litwrite-api.onrender.com)
// In dev it's empty → Vite proxy handles /api and /pdfs
const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

const api = axios.create({
  baseURL: BACKEND ? `${BACKEND}/api` : '/api',
  timeout: 30000,
  paramsSerializer: {
    serialize: (params) => {
      const parts: string[] = [];
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.join(','))}`);
        } else {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
        }
      }
      return parts.join('&');
    }
  },
});

export function getPdfUrl(filePath: string): string {
  const base = BACKEND || '';
  if (filePath.startsWith('pdfs/')) return `${base}/${filePath}`;
  return `${base}/pdfs/${filePath}`;
}

export const literatureApi = {
  getAll: () => api.get<Literature[]>('/literature'),
  getById: (id: number) => api.get<Literature>(`/literature/${id}`),
  getByLibrary: (libraryId: number) => api.get<Literature[]>(`/literature/library/${libraryId}`),
  getByTag: (tagId: number) => api.get<Literature[]>(`/literature/by-tag/${tagId}`),
  getStarred: () => api.get<Literature[]>('/literature/starred'),
  search: (q: string) => api.get<Literature[]>('/literature/search', { params: { q } }),
  searchAdvanced: (data: {
    library_id?: number;
    type_filter: SearchTypeFilter;
    tag_ids: number[];
    tag_logic: 'AND' | 'OR';
  }) => api.post<SearchAdvancedResponse>('/literature/search-advanced', data),
  update: (id: number, data: Partial<Literature>) => api.put(`/literature/${id}`, data),
  toggleStar: (id: number, is_starred: boolean) => api.patch(`/literature/${id}/star`, { is_starred }),
  setPriority: (id: number, priority: 0 | 1 | 2) => api.patch(`/literature/${id}/priority`, { priority }),
  setLibraries: (id: number, library_ids: number[]) => api.put(`/literature/${id}/libraries`, { library_ids }),
  delete: (id: number) => api.delete(`/literature/${id}`),
};

export const libraryApi = {
  getAll: () => api.get<Library[]>('/libraries'),
  create: (name: string, parent_id?: number) => api.post('/libraries', { name, parent_id }),
  update: (id: number, name: string, parent_id?: number) => api.put(`/libraries/${id}`, { name, parent_id }),
  delete: (id: number) => api.delete(`/libraries/${id}`),
};

export const uploadApi = {
  uploadPDF: (file: File, library_id?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    if (library_id) formData.append('library_id', String(library_id));
    return api.post('/upload/pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },
  scanFolder: (folder_path: string, library_id?: number) =>
    api.post('/upload/folder', { folder_path, library_id }),
};

export const annotationApi = {
  getByLiterature: (literatureId: number) => api.get<Annotation[]>(`/annotations/literature/${literatureId}`),
  getAll: (params?: { tag_ids?: number[]; logic?: 'AND' | 'OR' }) =>
    api.get<Annotation[]>('/annotations', { params }),
  create: (data: {
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
  }) => api.post('/annotations', data),
  update: (id: number, data: Partial<Annotation>) => api.put(`/annotations/${id}`, data),
  setTags: (id: number, tag_ids: number[]) => api.put(`/annotations/${id}/tags`, { tag_ids }),
  delete: (id: number) => api.delete(`/annotations/${id}`),
};

export const tagApi = {
  getAll: () => api.get<Tag[]>('/tags'),
  create: (name: string, color?: string, description?: string, parent_id?: number | null) =>
    api.post('/tags', { name, color, description, parent_id }),
  update: (id: number, name: string, color: string, description?: string) =>
    api.put(`/tags/${id}`, { name, color, description }),
  delete: (id: number) => api.delete(`/tags/${id}`),
  getAnnotations: (id: number) => api.get(`/tags/${id}/annotations`),
};

export const writingStyleApi = {
  getAll: () => api.get<WritingStyle[]>('/writing-styles'),
  create: (data: { name: string; description?: string; style_prompt: string; citation_format: string; language?: string }) =>
    api.post('/writing-styles', data),
  update: (id: number, data: Partial<WritingStyle>) => api.put(`/writing-styles/${id}`, data),
  delete: (id: number) => api.delete(`/writing-styles/${id}`),
};

export const generateApi = {
  generate: (data: {
    tag_ids: number[];
    style_mode: StyleMode;
    style_id?: number;
    reference_text?: string;
    reference_source?: 'library' | 'external';
    reference_literature_id?: number;
    custom_prompt?: string;
    language: OutputLanguage;
    citation_format?: string;
  }) => api.post<GenerationResult>('/generate', data),
  getRecords: () => api.get('/generate/records'),
  getRecordById: (id: number) => api.get(`/generate/records/${id}`),
};

export const configApi = {
  getAIConfig: () => api.get<AIConfigResponse>('/config/ai'),
  createAIConfig: (data: { provider: string; api_key: string; base_url?: string; model?: string }) =>
    api.post<AIConfigPublic>('/config/ai', data),
  updateAIConfig: (id: number, data: { provider?: string; api_key?: string; base_url?: string; model?: string; is_active?: boolean }) =>
    api.put<AIConfigPublic>(`/config/ai/${id}`, data),
  deleteAIConfig: (id: number) => api.delete(`/config/ai/${id}`),
};

export const chatApi = {
  generate: (data: ChatGenerateRequest) => api.post<ChatGenerateResponse>('/chat/generate', data, { timeout: 120000 }),
  getThreads: () => api.get<ChatThread[]>('/chat/threads'),
  getThread: (id: number) => api.get<{ thread: ChatThread; messages: PersistedChatMessage[] }>(`/chat/threads/${id}`),
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

export const translateApi = {
  translate: (data: TranslateRequest) => api.post<TranslateResponse>('/translate', data, { timeout: 30000 }),
};