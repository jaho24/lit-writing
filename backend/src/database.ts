import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || './data';
const DB_PATH = path.join(DATA_DIR, 'litwrite.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(path.join(DATA_DIR, 'pdfs'))) {
  fs.mkdirSync(path.join(DATA_DIR, 'pdfs'), { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS libraries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  parent_id     INTEGER REFERENCES libraries(id) ON DELETE SET NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS literature (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT,
  authors       TEXT,
  year          INTEGER,
  journal       TEXT,
  doi           TEXT,
  abstract      TEXT,
  file_path     TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  library_id    INTEGER REFERENCES libraries(id) ON DELETE SET NULL,
  metadata_confidence TEXT,
  is_starred    INTEGER DEFAULT 0,
  priority      INTEGER DEFAULT 0 CHECK(priority IN (0, 1, 2)),
  added_at      TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS literature_libraries (
  literature_id INTEGER NOT NULL REFERENCES literature(id) ON DELETE CASCADE,
  library_id    INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  PRIMARY KEY (literature_id, library_id)
);

CREATE TABLE IF NOT EXISTS annotations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  literature_id INTEGER NOT NULL REFERENCES literature(id) ON DELETE CASCADE,
  page          INTEGER NOT NULL,
  position_x    REAL,
  position_y    REAL,
  width         REAL,
  height        REAL,
  color         TEXT DEFAULT '#9E9E9E',
  type          TEXT DEFAULT 'highlight' CHECK(type IN ('highlight','note','underline')),
  text          TEXT,
  note          TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL UNIQUE,
  color         TEXT DEFAULT '#4CAF50',
  description   TEXT,
  parent_id     INTEGER REFERENCES tags(id) ON DELETE SET NULL,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS annotation_tags (
  annotation_id INTEGER NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  tag_id        INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (annotation_id, tag_id)
);

CREATE TABLE IF NOT EXISTS writing_styles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  description   TEXT,
  style_prompt  TEXT NOT NULL,
  citation_format TEXT NOT NULL,
  language      TEXT DEFAULT 'zh',
  is_builtin    INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generation_records (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  content       TEXT NOT NULL,
  citations     TEXT NOT NULL,
  style_id      INTEGER REFERENCES writing_styles(id),
  style_mode    TEXT NOT NULL,
  reference_text TEXT,
  custom_prompt  TEXT,
  tags_used     TEXT NOT NULL,
  annotation_ids TEXT,
  language      TEXT DEFAULT 'zh',
  citation_format TEXT DEFAULT 'GB/T 7714',
  generated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_config (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  provider      TEXT NOT NULL DEFAULT 'deepseek' CHECK(provider IN ('deepseek', 'qwen', 'minimax')),
  api_key       TEXT NOT NULL,
  base_url      TEXT NOT NULL,
  model         TEXT NOT NULL,
  is_active     INTEGER DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prompt_templates (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  description   TEXT,
  prompt_text   TEXT NOT NULL,
  category      TEXT DEFAULT 'general',
  is_builtin    INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_threads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id     INTEGER NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content       TEXT NOT NULL,
  citations     TEXT DEFAULT '[]',
  annotation_ids TEXT DEFAULT '[]',
  prompt_used   TEXT,
  prompt_type   TEXT CHECK(prompt_type IN ('style', 'template')),
  created_at    TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO writing_styles (id, name, description, style_prompt, citation_format, language, is_builtin) VALUES
(1, '中文文献综述', '研究背景→国内外现状→争议→趋势的综述风格',
'你是一位中文学术写作助手。根据提供的标注素材，撰写一段文献综述段落。要求：1.段落结构：研究背景→国内外研究现状→主要发现与争议→研究趋势；2.每个论点必须引用来源文献，使用[序号]标记；3.语言风格：学术性、客观、逻辑严密，避免口语化表达；4.严格基于提供的标注素材，不虚构未提及的内容；5.引用格式：GB/T 7714标准；6.段落长度：300-500字；7.段末列举所有引用文献的完整信息。',
'GB/T 7714', 'zh', 1),

(2, 'Nature综述风格', 'broad context→specific findings→critical assessment→outlook',
'You are an academic writing assistant. Based on the provided annotation materials, write a review paragraph in Nature style. Requirements: 1.Structure: broad context→specific findings→critical assessment→outlook; 2.Each claim must cite its source using [number] markers; 3.Tone: authoritative yet accessible, concise, data-driven; 4.Strictly based on provided annotations—no fabrication; 5.Citation format: Nature style; 6.Length: 200-400 words; 7.List full references at the end.',
'Nature', 'en', 1),

(3, 'IEEE论证段落', '背景→问题→现有方法→评述→改进方向',
'You are an academic writing assistant. Based on the provided annotation materials, write an argument paragraph in IEEE style. Requirements: 1.Structure: background→problem→existing methods→critique→improvement direction; 2.Each claim must cite its source using [number] markers; 3.Tone: technical, precise, evidence-based; 4.Strictly based on provided annotations—no fabrication; 5.Citation format: IEEE style with bracketed numbers; 6.Length: 200-400 words; 7.List full references at the end.',
'IEEE', 'en', 1),

(4, '社科定性论述', '现象描述→理论框架→案例支撑→反思',
'你是一位中文学术写作助手。根据提供的标注素材，撰写一段社科定性论述段落。要求：1.段落结构：现象描述→理论框架→案例支撑→反思；2.每个论点必须引用来源文献，使用[序号]标记；3.语言风格：论证性、有理论深度，兼顾案例具体性；4.严格基于提供的标注素材，不虚构未提及的内容；5.引用格式：GB/T 7714标准；6.段落长度：300-500字；7.段末列举所有引用文献的完整信息。',
'GB/T 7714', 'zh', 1),

(5, '实验方法比较', '问题→方法A→方法B→对比→结论',
'You are an academic writing assistant. Based on the provided annotation materials, write a method comparison paragraph. Requirements: 1.Structure: problem→method A→method B→comparison→conclusion; 2.Each claim must cite its source using [number] markers; 3.Tone: objective, comparative, data-supported; 4.Strictly based on provided annotations—no fabrication; 5.Citation format: APA style; 6.Length: 200-400 words; 7.List full references at the end.',
'APA', 'en', 1);

INSERT OR IGNORE INTO prompt_templates (id, name, description, prompt_text, category, is_builtin) VALUES
(1, '总结摘要', '对标注素材进行总结概括',
'你是一位学术写作助手。请对以下标注素材进行总结概括，提炼核心观点和关键发现。要求：1.按照逻辑顺序组织总结内容；2.每个要点引用来源文献，使用[序号]标记；3.语言简洁、准确，避免冗余；4.严格基于提供的标注素材，不添加未涉及的信息；5.段末列举所有引用文献的完整信息。',
'summary', 1),

(2, '深度分析', '对标注素材进行深入分析和批判性评价',
'你是一位学术写作助手。请对以下标注素材进行深入分析和批判性评价。要求：1.识别不同文献观点的内在逻辑和潜在假设；2.指出研究方法的优势与局限；3.发现观点之间的矛盾或互补关系；4.提出可能的改进方向或新的研究视角；5.每个分析论点引用来源文献，使用[序号]标记；6.严格基于提供的标注素材；7.段末列举所有引用文献的完整信息。',
'analysis', 1),

(3, '对比论述', '对比不同文献的观点和方法',
'你是一位学术写作助手。请对以下标注素材进行对比论述，呈现不同文献观点之间的差异与共性。要求：1.明确对比维度（方法、结论、适用范围等）；2.客观呈现各方观点，不偏袒任何一方；3.指出差异的原因和背景；4.总结对比发现和启示；5.每个论点引用来源文献，使用[序号]标记；6.严格基于提供的标注素材；7.段末列举所有引用文献的完整信息。',
'comparison', 1),

(4, '润色优化', '对现有内容进行语言润色和逻辑优化',
'你是一位学术写作助手。请对用户提供的现有写作内容进行润色优化。要求：1.改善语言表达：消除口语化、冗余表述，增强学术性和准确性；2.优化逻辑结构：确保论证连贯、过渡自然；3.保持原文核心观点不变，仅优化表达方式；4.引用标记保持不变；5.返回完整的润色后文本；6.如有修改说明，简要列出主要改动点。',
'polish', 1);
`;

db.exec(SCHEMA_SQL);

const MIGRATIONS = [
  { column: 'is_starred', table: 'literature', ddl: 'ALTER TABLE literature ADD COLUMN is_starred INTEGER DEFAULT 0' },
  { column: 'priority', table: 'literature', ddl: 'ALTER TABLE literature ADD COLUMN priority INTEGER DEFAULT 0 CHECK(priority IN (0, 1, 2))' },
  { column: 'parent_id', table: 'tags', ddl: 'ALTER TABLE tags ADD COLUMN parent_id INTEGER REFERENCES tags(id) ON DELETE SET NULL' },
  { column: 'description', table: 'tags', ddl: 'ALTER TABLE tags ADD COLUMN description TEXT' },
];

for (const migration of MIGRATIONS) {
  const colExists = db.prepare(`SELECT COUNT(*) as cnt FROM pragma_table_info(?) WHERE name = ?`).get(migration.table, migration.column) as { cnt: number };
  if (colExists.cnt === 0) {
    db.exec(migration.ddl);
  }
}

const typeConstraint = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='annotations' AND sql LIKE '%CHECK(type%%'").get() as { sql: string } | undefined;
if (typeConstraint && !typeConstraint.sql.includes('underline')) {
  db.exec(`
    CREATE TABLE annotations_new (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      literature_id INTEGER NOT NULL REFERENCES literature(id) ON DELETE CASCADE,
      page          INTEGER NOT NULL,
      position_x    REAL,
      position_y    REAL,
      width         REAL,
      height        REAL,
      color         TEXT DEFAULT '#9E9E9E',
      type          TEXT DEFAULT 'highlight' CHECK(type IN ('highlight','note','underline')),
      text          TEXT,
      note          TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );
    INSERT INTO annotations_new SELECT * FROM annotations;
    DROP TABLE annotations;
    ALTER TABLE annotations_new RENAME TO annotations;
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_annotations_literature ON annotations(literature_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_annotations_page ON annotations(page)`);
}

// Prepare common statements
export const statements = {
  // Libraries
  getAllLibraries: db.prepare('SELECT * FROM libraries ORDER BY name'),
  getLibraryById: db.prepare('SELECT * FROM libraries WHERE id = ?'),
  createLibrary: db.prepare('INSERT INTO libraries (name, parent_id) VALUES (?, ?)'),
  updateLibrary: db.prepare('UPDATE libraries SET name = ?, parent_id = ?, updated_at = datetime(\'now\') WHERE id = ?'),
  deleteLibrary: db.prepare('DELETE FROM libraries WHERE id = ?'),

  // Literature
  getAllLiterature: db.prepare('SELECT * FROM literature ORDER BY added_at DESC'),
  getLiteratureById: db.prepare('SELECT * FROM literature WHERE id = ?'),
  getLiteratureByLibrary: db.prepare(`
    SELECT l.* FROM literature l
    JOIN literature_libraries ll ON l.id = ll.literature_id
    WHERE ll.library_id = ?
    ORDER BY l.added_at DESC
  `),
  createLiterature: db.prepare(`
    INSERT INTO literature (title, authors, year, journal, doi, abstract, file_path, file_name, library_id, metadata_confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateLiterature: db.prepare(`
    UPDATE literature SET title = ?, authors = ?, year = ?, journal = ?, doi = ?, abstract = ?, is_starred = ?, priority = ?, updated_at = datetime(\'now\')
    WHERE id = ?
  `),
  toggleStarred: db.prepare('UPDATE literature SET is_starred = ? WHERE id = ?'),
  setPriority: db.prepare('UPDATE literature SET priority = ? WHERE id = ?'),
  getStarredLiterature: db.prepare('SELECT * FROM literature WHERE is_starred = 1 ORDER BY added_at DESC'),
  deleteLiterature: db.prepare('DELETE FROM literature WHERE id = ?'),
  searchLiterature: db.prepare(`
    SELECT * FROM literature
    WHERE title LIKE ? OR authors LIKE ? OR doi LIKE ?
    ORDER BY added_at DESC
  `),

  // Literature-Library associations
  setLiteratureLibraries: db.prepare(`
    DELETE FROM literature_libraries WHERE literature_id = ?
  `),
  addLiteratureLibrary: db.prepare(`
    INSERT INTO literature_libraries (literature_id, library_id) VALUES (?, ?)
  `),

  // Annotations
  getAnnotationsByLiterature: db.prepare('SELECT * FROM annotations WHERE literature_id = ? ORDER BY page, created_at'),
  getAllAnnotations: db.prepare('SELECT * FROM annotations ORDER BY created_at DESC'),
  getAnnotationsByTagIds: db.prepare(`
    SELECT DISTINCT a.* FROM annotations a
    JOIN annotation_tags at ON a.id = at.annotation_id
    WHERE at.tag_id IN (${Array.from({ length: 20 }, () => '?').join(',')})
    ORDER BY a.created_at DESC
  `),
  getAnnotationById: db.prepare('SELECT * FROM annotations WHERE id = ?'),
  createAnnotation: db.prepare(`
    INSERT INTO annotations (literature_id, page, position_x, position_y, width, height, color, type, text, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateAnnotation: db.prepare(`
    UPDATE annotations SET note = ?, text = ?, position_x = ?, position_y = ?, width = ?, height = ?, updated_at = datetime(\'now\')
    WHERE id = ?
  `),
  deleteAnnotation: db.prepare('DELETE FROM annotations WHERE id = ?'),

  // Tags
  getAllTags: db.prepare('SELECT * FROM tags ORDER BY name'),
  getTagById: db.prepare('SELECT * FROM tags WHERE id = ?'),
  createTag: db.prepare('INSERT INTO tags (name, color, description) VALUES (?, ?, ?)'),
  updateTag: db.prepare('UPDATE tags SET name = ?, color = ?, description = ? WHERE id = ?'),
  deleteTag: db.prepare('DELETE FROM tags WHERE id = ?'),
  getTagAnnotationCount: db.prepare(`
    SELECT COUNT(*) as count FROM annotation_tags WHERE tag_id = ?
  `),

  // Annotation-Tags
  getAnnotationTags: db.prepare(`
    SELECT t.* FROM tags t
    JOIN annotation_tags at ON t.id = at.tag_id
    WHERE at.annotation_id = ?
  `),
  setAnnotationTags: db.prepare('DELETE FROM annotation_tags WHERE annotation_id = ?'),
  addAnnotationTag: db.prepare('INSERT INTO annotation_tags (annotation_id, tag_id) VALUES (?, ?)'),
  removeAnnotationTag: db.prepare('DELETE FROM annotation_tags WHERE annotation_id = ? AND tag_id = ?'),

  // Writing Styles
  getAllWritingStyles: db.prepare('SELECT * FROM writing_styles ORDER BY is_builtin DESC, name'),
  getWritingStyleById: db.prepare('SELECT * FROM writing_styles WHERE id = ?'),
  createWritingStyle: db.prepare(`
    INSERT INTO writing_styles (name, description, style_prompt, citation_format, language, is_builtin)
    VALUES (?, ?, ?, ?, ?, 0)
  `),
  updateWritingStyle: db.prepare(`
    UPDATE writing_styles SET name = ?, description = ?, style_prompt = ?, citation_format = ?, language = ?
    WHERE id = ? AND is_builtin = 0
  `),
  deleteWritingStyle: db.prepare('DELETE FROM writing_styles WHERE id = ? AND is_builtin = 0'),

  // Generation Records
  createGenerationRecord: db.prepare(`
    INSERT INTO generation_records (content, citations, style_id, style_mode, reference_text, custom_prompt, tags_used, annotation_ids, language, citation_format)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getAllGenerationRecords: db.prepare('SELECT * FROM generation_records ORDER BY generated_at DESC'),
  getGenerationRecordById: db.prepare('SELECT * FROM generation_records WHERE id = ?'),

  // AI Config
  getActiveAIConfig: db.prepare('SELECT * FROM ai_config WHERE is_active = 1 LIMIT 1'),
  getAllAIConfigs: db.prepare('SELECT id, provider, base_url, model, is_active, created_at, updated_at FROM ai_config ORDER BY is_active DESC, created_at DESC'),
  getAIConfigById: db.prepare('SELECT id, provider, base_url, model, is_active, created_at, updated_at FROM ai_config WHERE id = ?'),
  createAIConfig: db.prepare(`
    INSERT INTO ai_config (provider, api_key, base_url, model, is_active)
    VALUES (?, ?, ?, ?, ?)
  `),
  updateAIConfig: db.prepare(`
    UPDATE ai_config SET provider = ?, api_key = ?, base_url = ?, model = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `),
  deactivateAllAIConfigs: db.prepare('UPDATE ai_config SET is_active = 0'),
  deleteAIConfig: db.prepare('DELETE FROM ai_config WHERE id = ?'),

  // Prompt Templates
  getAllPromptTemplates: db.prepare('SELECT * FROM prompt_templates ORDER BY is_builtin DESC, name'),
  getPromptTemplateById: db.prepare('SELECT * FROM prompt_templates WHERE id = ?'),
  createPromptTemplate: db.prepare(`
    INSERT INTO prompt_templates (name, description, prompt_text, category, is_builtin)
    VALUES (?, ?, ?, ?, 0)
  `),
  updatePromptTemplate: db.prepare(`
    UPDATE prompt_templates SET name = ?, description = ?, prompt_text = ?, category = ?
    WHERE id = ? AND is_builtin = 0
  `),
  deletePromptTemplate: db.prepare('DELETE FROM prompt_templates WHERE id = ? AND is_builtin = 0'),

  // Chat Threads
  getAllChatThreads: db.prepare('SELECT * FROM chat_threads ORDER BY updated_at DESC'),
  getChatThreadById: db.prepare('SELECT * FROM chat_threads WHERE id = ?'),
  createChatThread: db.prepare(`INSERT INTO chat_threads (title) VALUES (?)`),
  updateChatThread: db.prepare(`UPDATE chat_threads SET title = ?, updated_at = datetime('now') WHERE id = ?`),
  touchChatThread: db.prepare(`UPDATE chat_threads SET updated_at = datetime('now') WHERE id = ?`),
  deleteChatThread: db.prepare('DELETE FROM chat_threads WHERE id = ?'),

  // Chat Messages
  getChatMessagesByThread: db.prepare('SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC'),
  createChatMessage: db.prepare(`
    INSERT INTO chat_messages (thread_id, role, content, citations, annotation_ids, prompt_used, prompt_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  deleteChatMessagesByThread: db.prepare('DELETE FROM chat_messages WHERE thread_id = ?'),

  // Literature tags
  getLiteratureTags: db.prepare(`
    SELECT DISTINCT t.id, t.name, t.color FROM tags t
    JOIN annotation_tags at ON t.id = at.tag_id
    JOIN annotations a ON at.annotation_id = a.id
    WHERE a.literature_id = ?
    ORDER BY t.name
  `),

  propagateTagColor: db.prepare(`
    UPDATE annotations SET color = ? WHERE id IN (
      SELECT annotation_id FROM annotation_tags WHERE tag_id = ?
    )
  `),

  getTagAnnotationsWithLiterature: db.prepare(`
    SELECT a.*, l.title as literature_title, l.authors as literature_authors,
           l.year as literature_year, l.journal as literature_journal
    FROM annotations a
    JOIN annotation_tags at ON a.id = at.annotation_id
    JOIN literature l ON a.literature_id = l.id
    WHERE at.tag_id = ?
    ORDER BY a.created_at DESC
  `),

  getAnnotationsByIds: db.prepare(`
    SELECT a.*, l.title as literature_title, l.authors as literature_authors,
           l.year as literature_year, l.journal as literature_journal, l.doi as literature_doi
    FROM annotations a
    JOIN literature l ON a.literature_id = l.id
    WHERE a.id IN (${Array.from({ length: 50 }, () => '?').join(',')})
  `),
};

export default db;