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
  is_starred: number;
  priority: number;
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
  type: 'highlight' | 'note' | 'underline';
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

export interface AIConfig {
  id: number;
  provider: 'deepseek' | 'qwen' | 'minimax';
  api_key: string;
  base_url: string;
  model: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface SearchResultItem {
  id: number;
  type: 'literature' | 'annotation';
  title: string;
  excerpt: string;
  highlightRanges: [number, number][];
  authors?: string;
  year?: number;
  journal?: string;
  tags: { id: number; name: string; color: string }[];
  literatureId: number;
}

export interface AdvancedSearchRequest {
  library_id?: number;
  type_filter: string;
  tag_ids: number[];
  tag_logic: 'AND' | 'OR';
}

export interface AdvancedSearchResponse {
  results: SearchResultItem[];
  total_count: number;
  active_conditions: { label: string; value: string }[];
}

export interface PromptTemplate {
  id: number;
  name: string;
  description: string | null;
  prompt_text: string;
  category: string;
  is_builtin: number;
  created_at: string;
}

export interface ChatThread {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  thread_id: number;
  role: 'user' | 'assistant';
  content: string;
  citations: string;
  annotation_ids: string;
  prompt_used: string | null;
  prompt_type: 'style' | 'template' | null;
  created_at: string;
}

export interface ChatGenerateRequest {
  thread_id?: number;
  messages: Array<{ role: string; content: string }>;
  instruction: string;
  annotation_ids: number[];
  literature_ids?: number[];
  prompt_template?: string;
  prompt_type?: 'style' | 'template';
  style_mode?: string;
  language?: string;
  citation_format?: string;
}

export interface ChatGenerateResponse {
  thread_id: number;
  message_id: number;
  content: string;
  citations: CitationItem[];
}