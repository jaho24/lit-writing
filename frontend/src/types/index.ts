export interface Library {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Literature {
  id: number;
  title: string | null;
  authors: string | null;
  year: number | null;
  journal: string | null;
  doi: string | null;
  abstract: string | null;
  file_path: string;
  file_name: string;
  library_id: number | null;
  metadata_confidence: Record<string, string> | null;
  added_at: string;
  updated_at: string;
}

export interface Annotation {
  id: number;
  literature_id: number;
  page: number;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  color: string;
  type: 'highlight' | 'note';
  text: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  literature?: Literature;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  description: string | null;
  parent_id: number | null;
  created_at: string;
  annotation_count?: number;
}

export interface WritingStyle {
  id: number;
  name: string;
  description: string | null;
  style_prompt: string;
  citation_format: string;
  language: string;
  is_builtin: number;
  created_at: string;
}

export interface CitationItem {
  marker: string;
  literature_id: number;
  title: string;
  authors: string;
  year: number | null;
  journal: string | null;
  doi: string | null;
}

export interface GenerationResult {
  id: number;
  content: string;
  citations: CitationItem[];
  style_used: { id: number; name: string } | null;
  style_mode: string;
  tags_used: number[];
  annotation_count: number;
  generated_at: string;
}

export type StyleMode = 'imitate' | 'journal_style' | 'custom_prompt';
export type OutputLanguage = 'zh' | 'en';
export type RightPanelTab = 'preview' | 'annotations' | 'writing';