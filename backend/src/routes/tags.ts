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
  const { name, color, description, parent_id } = req.body;
  try {
    const result = statements.createTag.run(name, color || '#4CAF50', description || null);
    if (parent_id) {
      db.prepare('UPDATE tags SET parent_id = ? WHERE id = ?').run(parent_id, Number(result.lastInsertRowid));
    }
    const tag = statements.getTagById.get(Number(result.lastInsertRowid));
    res.json(tag);
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

  statements.propagateTagColor.run(color, Number(req.params.id));

  res.json(statements.getTagById.get(Number(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const result = statements.deleteTag.run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Tag not found' });
  res.json({ success: true });
});

router.get('/:id/annotations', (req, res) => {
  const tagId = Number(req.params.id);
  const annotations = statements.getTagAnnotationsWithLiterature.all(tagId) as Annotation[];
  res.json(annotations);
});

export default router;