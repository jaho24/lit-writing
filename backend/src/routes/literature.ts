import { Router } from 'express';
import db, { statements } from '../database';
import type { Literature } from '../types';

const router = Router();

router.get('/', (_req, res) => {
  const literature = statements.getAllLiterature.all();
  res.json(literature);
});

router.get('/search', (req, res) => {
  const q = req.query.q as string || '';
  const pattern = `%${q}%`;
  const results = statements.searchLiterature.all(pattern, pattern, pattern);
  res.json(results);
});

router.get('/library/:libraryId', (req, res) => {
  const literature = statements.getLiteratureByLibrary.all(Number(req.params.libraryId));
  res.json(literature);
});

router.get('/:id', (req, res) => {
  const lit = statements.getLiteratureById.get(Number(req.params.id));
  if (!lit) return res.status(404).json({ error: 'Literature not found' });
  res.json(lit);
});

router.put('/:id', (req, res) => {
  const { title, authors, year, journal, doi, abstract } = req.body;
  const result = statements.updateLiterature.run(title, authors, year, journal, doi, abstract, Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Literature not found' });
  res.json({ ...statements.getLiteratureById.get(Number(req.params.id)) as Literature });
});

router.put('/:id/libraries', (req, res) => {
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
});

router.delete('/:id', (req, res) => {
  const result = statements.deleteLiterature.run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Literature not found' });
  res.json({ success: true });
});

export default router;