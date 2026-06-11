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
  is_starred: number;
  priority: number;
  added_at: string;
  updated_at: string;
  tags?: Tag[];
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
  type: 'highlight' | 'note' | 'underline';
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
export type RightPanelTab = 'preview' | 'annotations' | 'writing' | 'settings';
export type AIProvider = 'deepseek' | 'qwen' | 'minimax';

export interface OpenTab {
  literatureId: number;
  title: string;
  page: number;
  scale: number;
}

export interface AIConfigPublic {
  id: number;
  provider: AIProvider;
  base_url: string;
  model: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  source: string;
}

export interface AIConfigResponse {
  configs: AIConfigPublic[];
  envFallbacks: { provider: AIProvider; base_url: string; model: string; source: string }[];
  providerDefaults: Record<AIProvider, { base_url: string; model: string }>;
}

export interface AIConfigFormData {
  provider: AIProvider;
  api_key: string;
  base_url: string;
  model: string;
}

export type SearchTypeFilter = 'all' | 'annotations' | 'abstracts' | 'notes';

export interface SearchResultItem {
  id: number;
  type: 'literature' | 'annotation';
  title: string;
  excerpt: string;
  highlightRanges: [number, number][];
  authors?: string;
  year?: number;
  journal?: string;
  tags: Tag[];
  literatureId: number;
}

export interface SearchAdvancedResponse {
  results: SearchResultItem[];
  total_count: number;
  active_conditions: { path?: string; type?: string; tags?: string[] };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: CitationItem[];
  annotationIds: number[];
  promptUsed: string | null;
  promptType: 'style' | 'template' | null;
  timestamp: number;
}

export interface ChatThread {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface PersistedChatMessage {
  id: number;
  thread_id: number;
  role: 'user' | 'assistant';
  content: string;
  citations: CitationItem[] | string;
  annotation_ids: number[] | string;
  prompt_used: string | null;
  prompt_type: 'style' | 'template' | null;
  created_at: string;
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