import { Router } from 'express';
import db, { statements } from '../database';
import type { Annotation, Tag, Literature } from '../types';

const router = Router();

router.get('/literature/:literatureId', (req, res) => {
  const annotations = statements.getAnnotationsByLiterature.all(Number(req.params.literatureId)) as Annotation[];
  const enriched = annotations.map(a => ({
    ...a,
    tags: statements.getAnnotationTags.all(a.id) as Tag[],
  }));
  res.json(enriched);
});

router.get('/', (req, res) => {
  const { tag_ids, logic } = req.query;

  if (tag_ids) {
    const ids = (tag_ids as string).split(',').map(Number).filter(n => n > 0);
    if (ids.length === 0) return res.json([]);

    const placeholders = ids.map(() => '?').join(',');
    const query = logic === 'AND'
      ? `SELECT a.* FROM annotations a
         JOIN annotation_tags at ON a.id = at.annotation_id
         WHERE at.tag_id IN (${placeholders})
         GROUP BY a.id
         HAVING COUNT(DISTINCT at.tag_id) = ${ids.length}
         ORDER BY a.created_at DESC`
      : `SELECT DISTINCT a.* FROM annotations a
         JOIN annotation_tags at ON a.id = at.annotation_id
         WHERE at.tag_id IN (${placeholders})
         ORDER BY a.created_at DESC`;

    const annotations = db.prepare(query).all(...ids) as Annotation[];
    const enriched = annotations.map(a => ({
      ...a,
      tags: statements.getAnnotationTags.all(a.id) as Tag[],
      literature: statements.getLiteratureById.get(a.literature_id) as Literature | undefined,
    }));
    return res.json(enriched);
  }

  const annotations = statements.getAllAnnotations.all() as Annotation[];
  const enriched = annotations.map(a => ({
    ...a,
    tags: statements.getAnnotationTags.all(a.id) as Tag[],
    literature: statements.getLiteratureById.get(a.literature_id) as Literature | undefined,
  }));
  res.json(enriched);
});

router.post('/', (req, res) => {
  const { literature_id, page, position_x, position_y, width, height, type, text, note, tag_ids } = req.body;

  let color = '#9E9E9E';
  if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
    const firstTag = statements.getTagById.get(tag_ids[0]) as Tag | undefined;
    if (firstTag) color = firstTag.color;
  }

  const result = statements.createAnnotation.run(
    literature_id, page, position_x || null, position_y || null,
    width || null, height || null, color, type || 'highlight',
    text || null, note || null
  );

  const annotationId = Number(result.lastInsertRowid);

  if (tag_ids && Array.isArray(tag_ids)) {
    const transaction = db.transaction(() => {
      for (const tagId of tag_ids) {
        statements.addAnnotationTag.run(annotationId, tagId);
      }
    });
    transaction();
  }

  const annotation = statements.getAnnotationById.get(annotationId) as Annotation | undefined;
  const tags = statements.getAnnotationTags.all(annotationId) as Tag[];

  res.json({ ...annotation, tags });
});

router.put('/:id', (req, res) => {
  const { note, text, position_x, position_y, width, height } = req.body;
  const result = statements.updateAnnotation.run(
    note, text, position_x, position_y, width, height, Number(req.params.id)
  );
  if (result.changes === 0) return res.status(404).json({ error: 'Annotation not found' });
  res.json(statements.getAnnotationById.get(Number(req.params.id)));
});

router.put('/:id/tags', (req, res) => {
  const annotationId = Number(req.params.id);
  const { tag_ids } = req.body as { tag_ids: number[] };

  const transaction = db.transaction(() => {
    statements.setAnnotationTags.run(annotationId);
    for (const tagId of tag_ids) {
      statements.addAnnotationTag.run(annotationId, tagId);
    }

    if (tag_ids.length > 0) {
      const firstTag = statements.getTagById.get(tag_ids[0]) as Tag | undefined;
      if (firstTag) {
        db.prepare('UPDATE annotations SET color = ? WHERE id = ?').run(firstTag.color, annotationId);
      }
    } else {
      db.prepare('UPDATE annotations SET color = ? WHERE id = ?').run('#9E9E9E', annotationId);
    }
  });
  transaction();

  const annotation = statements.getAnnotationById.get(annotationId) as Annotation | undefined;
  res.json({ ...annotation, tags: statements.getAnnotationTags.all(annotationId) as Tag[] });
});

router.delete('/:id', (req, res) => {
  const result = statements.deleteAnnotation.run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Annotation not found' });
  res.json({ success: true });
});

export default router;