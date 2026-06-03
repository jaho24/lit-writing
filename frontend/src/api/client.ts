import axios from 'axios';
import type { Literature, Library, Annotation, Tag, WritingStyle, StyleMode, OutputLanguage, GenerationResult } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export const literatureApi = {
  getAll: () => api.get<Literature[]>('/literature'),
  getById: (id: number) => api.get<Literature>(`/literature/${id}`),
  getByLibrary: (libraryId: number) => api.get<Literature[]>(`/literature/library/${libraryId}`),
  search: (q: string) => api.get<Literature[]>('/literature/search', { params: { q } }),
  update: (id: number, data: Partial<Literature>) => api.put(`/literature/${id}`, data),
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
    type?: 'highlight' | 'note';
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
  create: (name: string, color?: string, description?: string) =>
    api.post('/tags', { name, color, description }),
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