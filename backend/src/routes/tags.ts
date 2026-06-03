import { Router } from 'express';
import db, { statements } from '../database';
import type { Tag, Annotation } from '../types';

const router = Router();

router.get('/', (_req, res) => {
  const tags = statements.getAllTags.all() as Tag[];
  const enriched = tags.map(t => ({
    ...t,
    annotation_count: (statements.getTagAnnotationCount.get(t.id) as { count: number }).count,
  }));
  res.json(enriched);
});

router.post('/', (req, res) => {
  const { name, color, description } = req.body;
  try {
    const result = statements.createTag.run(name, color || '#4CAF50', description || null);
    res.json({ id: result.lastInsertRowid, name, color: color || '#4CAF50', description });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Tag name already exists' });
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const { name, color, description } = req.body;
  const result = statements.updateTag.run(name, color, description || null, Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Tag not found' });

  db.prepare(`
    UPDATE annotations SET color = ? WHERE id IN (
      SELECT annotation_id FROM annotation_tags WHERE tag_id = ?
    )
  `).run(color, Number(req.params.id));

  res.json(statements.getTagById.get(Number(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const result = statements.deleteTag.run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Tag not found' });
  res.json({ success: true });
});

router.get('/:id/annotations', (req, res) => {
  const tagId = Number(req.params.id);
  const annotations = db.prepare(`
    SELECT a.*, l.title as literature_title, l.authors as literature_authors, l.year as literature_year, l.journal as literature_journal
    FROM annotations a
    JOIN annotation_tags at ON a.id = at.annotation_id
    JOIN literature l ON a.literature_id = l.id
    WHERE at.tag_id = ?
    ORDER BY a.created_at DESC
  `).all(tagId) as Annotation[];
  res.json(annotations);
});

export default router;