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
  type          TEXT DEFAULT 'highlight' CHECK(type IN ('highlight','note')),
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
`;

db.exec(SCHEMA_SQL);

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
    UPDATE literature SET title = ?, authors = ?, year = ?, journal = ?, doi = ?, abstract = ?, updated_at = datetime(\'now\')
    WHERE id = ?
  `),
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
};

export default db;