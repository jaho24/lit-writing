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

-- Seed built-in writing styles
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