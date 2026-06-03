import { Router } from 'express';
import { statements } from '../database';

const router = Router();

router.get('/', (_req, res) => {
  const libraries = statements.getAllLibraries.all();
  res.json(libraries);
});

router.post('/', (req, res) => {
  const { name, parent_id } = req.body;
  const result = statements.createLibrary.run(name, parent_id || null);
  res.json({ id: result.lastInsertRowid, name, parent_id });
});

router.put('/:id', (req, res) => {
  const { name, parent_id } = req.body;
  const result = statements.updateLibrary.run(name, parent_id || null, Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Library not found' });
  res.json(statements.getLibraryById.get(Number(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const result = statements.deleteLibrary.run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Library not found' });
  res.json({ success: true });
});

export default router;