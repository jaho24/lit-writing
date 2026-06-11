import { Router } from 'express';
import { statements } from '../database';

const router = Router();

router.get('/', (_req, res) => {
  const styles = statements.getAllWritingStyles.all();
  res.json(styles);
});

router.post('/', (req, res) => {
  const { name, description, style_prompt, citation_format, language } = req.body;
  if (!name || !style_prompt || !citation_format) {
    return res.status(400).json({ error: 'name, style_prompt, and citation_format are required' });
  }
  const result = statements.createWritingStyle.run(
    name, description || null, style_prompt, citation_format, language || 'zh'
  );
  res.json({ id: result.lastInsertRowid, name, description, style_prompt, citation_format, language });
});

router.put('/:id', (req, res) => {
  const { name, description, style_prompt, citation_format, language } = req.body;
  const result = statements.updateWritingStyle.run(
    name, description || null, style_prompt, citation_format, language || 'zh', Number(req.params.id)
  );
  if (result.changes === 0) return res.status(404).json({ error: 'Writing style not found or is builtin' });
  res.json(statements.getWritingStyleById.get(Number(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const result = statements.deleteWritingStyle.run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Writing style not found or is builtin' });
  res.json({ success: true });
});

export default router;