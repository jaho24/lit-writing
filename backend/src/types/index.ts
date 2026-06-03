// LitWrite TypeScript Type Definitions

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
  metadata_confidence: Record<string, 'high' | 'medium' | 'low'> | null;
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
  color: string; // derived from tag color, default '#9E9E9E'
  type: 'highlight' | 'note';
  text: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  description: string | null;
  parent_id: number | null;
  created_at: string;
}

export interface AnnotationTag {
  annotation_id: number;
  tag_id: number;
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

export interface GenerationRecord {
  id: number;
  content: string;
  citations: CitationItem[];
  style_id: number | null;
  style_mode: 'imitate' | 'journal_style' | 'custom_prompt';
  reference_text: string | null;
  custom_prompt: string | null;
  tags_used: number[];
  annotation_ids: number[];
  language: string;
  citation_format: string;
  generated_at: string;
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

export interface GenerateRequest {
  tag_ids: number[];
  style_mode: 'imitate' | 'journal_style' | 'custom_prompt';
  style_id?: number;
  reference_text?: string;
  reference_source?: 'library' | 'external';
  reference_literature_id?: number;
  custom_prompt?: string;
  language: 'zh' | 'en';
  citation_format?: string;
}

export interface GenerateResponse {
  id: number;
  content: string;
  citations: CitationItem[];
  style_used: { id: number; name: string } | null;
  style_mode: string;
  tags_used: number[];
  annotation_count: number;
  generated_at: string;
}

export interface PDFMetadata {
  title: string | null;
  authors: string | null;
  year: number | null;
  journal: string | null;
  doi: string | null;
  abstract: string | null;
  confidence: Record<string, 'high' | 'medium' | 'low'>;
}

export interface FolderScanResult {
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  files: {
    path: string;
    status: 'imported' | 'skipped' | 'failed';
    literature_id?: number;
    error?: string;
  }[];
}