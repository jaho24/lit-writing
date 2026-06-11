import { Router } from 'express';
import db, { statements } from '../database';
import type { Literature, SearchResultItem, AdvancedSearchRequest } from '../types';

const router = Router();

router.get('/', (_req, res) => {
  const literature = statements.getAllLiterature.all();
  const enriched = literature.map((lit: any) => ({
    ...lit,
    tags: statements.getLiteratureTags.all(lit.id),
  }));
  res.json(enriched);
});

router.get('/by-tag/:tagId', (req, res) => {
  const tagId = Number(req.params.tagId);
  const literature = db.prepare(`
    SELECT DISTINCT l.* FROM literature l
    JOIN annotations a ON a.literature_id = l.id
    JOIN annotation_tags at ON a.id = at.annotation_id
    WHERE at.tag_id = ?
    ORDER BY l.added_at DESC
  `).all(tagId);
  const enriched = literature.map((lit: any) => ({
    ...lit,
    tags: statements.getLiteratureTags.all(lit.id),
  }));
  res.json(enriched);
});

router.get('/library/:libraryId', (req, res) => {
  const literature = statements.getLiteratureByLibrary.all(Number(req.params.libraryId));
  const enriched = literature.map((lit: any) => ({
    ...lit,
    tags: statements.getLiteratureTags.all(lit.id),
  }));
  res.json(enriched);
});

router.get('/search', (req, res) => {
  const q = req.query.q as string || '';
  const pattern = `%${q}%`;
  const results = statements.searchLiterature.all(pattern, pattern, pattern);
  const enriched = results.map((lit: any) => ({
    ...lit,
    tags: statements.getLiteratureTags.all(lit.id),
  }));
  res.json(enriched);
});

router.get('/:id', (req, res) => {
  const lit = statements.getLiteratureById.get(Number(req.params.id));
  if (!lit) return res.status(404).json({ error: 'Literature not found' });
  res.json(lit);
});

router.put('/:id', (req, res) => {
  try {
    const { title, authors, year, journal, doi, abstract, is_starred, priority } = req.body;
    const current = statements.getLiteratureById.get(Number(req.params.id)) as Literature | undefined;
    if (!current) return res.status(404).json({ error: 'Literature not found' });
    statements.updateLiterature.run(
      title ?? current.title,
      authors ?? current.authors,
      year ?? current.year,
      journal ?? current.journal,
      doi ?? current.doi,
      abstract ?? current.abstract,
      is_starred ?? current.is_starred,
      priority ?? current.priority,
      Number(req.params.id)
    );
    res.json({ ...statements.getLiteratureById.get(Number(req.params.id)) as Literature });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update literature', detail: String(err) });
  }
});

router.patch('/:id/star', (req, res) => {
  try {
    const { is_starred } = req.body;
    const result = statements.toggleStarred.run(is_starred ? 1 : 0, Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ error: 'Literature not found' });
    res.json({ ...statements.getLiteratureById.get(Number(req.params.id)) as Literature });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update star status', detail: String(err) });
  }
});

router.patch('/:id/priority', (req, res) => {
  try {
    const { priority } = req.body;
    if (![0, 1, 2].includes(priority)) return res.status(400).json({ error: 'priority must be 0, 1, or 2' });
    const result = statements.setPriority.run(priority, Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ error: 'Literature not found' });
    res.json({ ...statements.getLiteratureById.get(Number(req.params.id)) as Literature });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update priority', detail: String(err) });
  }
});

router.get('/starred', (_req, res) => {
  res.json(statements.getStarredLiterature.all());
});

router.put('/:id/libraries', (req, res) => {
  try {
    const litId = Number(req.params.id);
    const { library_ids } = req.body as { library_ids: number[] };

    const transaction = db.transaction(() => {
      statements.setLiteratureLibraries.run(litId);
      for (const libId of library_ids) {
        statements.addLiteratureLibrary.run(litId, libId);
      }
    });
    transaction();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update literature libraries', detail: String(err) });
  }
});

router.delete('/:id', (req, res) => {
  const result = statements.deleteLiterature.run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Literature not found' });
  res.json({ success: true });
});

router.post('/search-advanced', (req, res) => {
  const { library_id, type_filter, tag_ids, tag_logic } = req.body as AdvancedSearchRequest;

  const validFilters = ['all', 'annotations', 'abstracts', 'notes'];
  if (!validFilters.includes(type_filter)) {
    return res.status(400).json({ error: `type_filter must be one of: ${validFilters.join(', ')}` });
  }

  const hasTags = tag_ids && tag_ids.length > 0;
  if (hasTags && !['AND', 'OR'].includes(tag_logic)) {
    return res.status(400).json({ error: 'tag_logic must be AND or OR when tag_ids provided' });
  }

  function getTagAnnotationFilter(): [string | null, any[]] {
    if (!hasTags) return [null, []];
    const placeholders = tag_ids.map(() => '?').join(',');
    if (tag_logic === 'AND') {
      return [
        `SELECT a.id FROM annotations a
         JOIN annotation_tags at ON a.id = at.annotation_id
         WHERE at.tag_id IN (${placeholders})
         GROUP BY a.id
         HAVING COUNT(DISTINCT at.tag_id) = ?`,
        [...tag_ids, tag_ids.length],
      ];
    }
    return [
      `SELECT DISTINCT a.id FROM annotations a
       JOIN annotation_tags at ON a.id = at.annotation_id
       WHERE at.tag_id IN (${placeholders})`,
      [...tag_ids],
    ];
  }

  function computeHighlightRanges(excerpt: string, tags: { name: string }[]): [number, number][] {
    const ranges: [number, number][] = [];
    const lowerExcerpt = excerpt.toLowerCase();
    for (const tag of tags) {
      const lowerName = tag.name.toLowerCase();
      let idx = lowerExcerpt.indexOf(lowerName);
      while (idx !== -1) {
        ranges.push([idx, idx + tag.name.length]);
        idx = lowerExcerpt.indexOf(lowerName, idx + 1);
      }
    }
    return ranges;
  }

  function getAnnotationTags(annotationId: number): { id: number; name: string; color: string }[] {
    return statements.getAnnotationTags.all(annotationId) as { id: number; name: string; color: string }[];
  }

  function getLiteratureTags(literatureId: number): { id: number; name: string; color: string }[] {
    return statements.getLiteratureTags.all(literatureId) as { id: number; name: string; color: string }[];
  }

  const [tagFilterSQL, tagFilterParams] = getTagAnnotationFilter();
  const hasTagFilter = tagFilterSQL !== null;

  const libFilter = library_id != null
    ? 'AND l.id IN (SELECT literature_id FROM literature_libraries WHERE library_id = ?)'
    : '';
  const libParam = library_id != null ? [library_id] : [];

  const results: SearchResultItem[] = [];
  const fetchTag = hasTagFilter ? `AND a.id IN (${tagFilterSQL})` : '';

  const annotationFrom = `
    SELECT a.*, l.title as lit_title, l.authors, l.year, l.journal
    FROM annotations a
    JOIN literature l ON a.literature_id = l.id
    WHERE 1=1 ${fetchTag}
  `;

  const annotationFromParams = [...tagFilterParams];

  function runAnnotationQuery(extraCondition: string, extraParams: any[] = []) {
    const sql = `${annotationFrom} ${extraCondition} ${libFilter} ORDER BY a.created_at DESC LIMIT 200`;
    const params = [...annotationFromParams, ...extraParams, ...libParam];
    return db.prepare(sql).all(...params) as any[];
  }

  function runAbstractQuery() {
    let sql: string;
    let params: any[];

    if (hasTagFilter) {
      sql = `
        SELECT DISTINCT l.* FROM literature l
        JOIN annotations a ON a.literature_id = l.id
        WHERE a.id IN (${tagFilterSQL})
        AND l.abstract IS NOT NULL AND l.abstract != ''
        ${libFilter}
        ORDER BY l.added_at DESC LIMIT 200
      `;
      params = [...tagFilterParams, ...libParam];
    } else {
      sql = `
        SELECT l.* FROM literature l
        WHERE l.abstract IS NOT NULL AND l.abstract != ''
        ${libFilter}
        ORDER BY l.added_at DESC LIMIT 200
      `;
      params = [...libParam];
    }

    return db.prepare(sql).all(...params) as any[];
  }

  if (type_filter === 'all' || type_filter === 'annotations') {
    const rows = runAnnotationQuery('');
    for (const row of rows) {
      const text = row.text || row.note || '';
      const excerpt = text.length > 200 ? text.substring(0, 200).trim() : text.trim();
      const tags = getAnnotationTags(row.id);
      results.push({
        id: row.id,
        type: 'annotation',
        title: row.lit_title || '',
        excerpt,
        highlightRanges: computeHighlightRanges(excerpt, tags),
        authors: row.authors ?? undefined,
        year: row.year ?? undefined,
        journal: row.journal ?? undefined,
        tags,
        literatureId: row.literature_id,
      });
    }
  }

  if (type_filter === 'all' || type_filter === 'abstracts') {
    const rows = runAbstractQuery();
    for (const row of rows) {
      const excerpt = row.abstract?.substring(0, 200).trim() || '';
      const tags = getLiteratureTags(row.id);
      results.push({
        id: row.id,
        type: 'literature',
        title: row.title || '',
        excerpt,
        highlightRanges: computeHighlightRanges(excerpt, tags),
        authors: row.authors ?? undefined,
        year: row.year ?? undefined,
        journal: row.journal ?? undefined,
        tags,
        literatureId: row.id,
      });
    }
  }

  res.json({
    results,
    total_count: results.length,
    active_conditions: [
      ...(library_id != null ? [{ label: 'Library', value: String(library_id) }] : []),
      { label: 'Type', value: type_filter },
      ...(hasTags ? [{ label: 'Tags', value: `${tag_logic}: ${tag_ids.join(',')}` }] : []),
    ],
  });
});

export default router;