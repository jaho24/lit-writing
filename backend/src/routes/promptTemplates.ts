import { Router } from 'express';
import { statements } from '../database';
import type { PromptTemplate } from '../types';

const router = Router();

router.get('/', (_req, res) => {
  const templates = statements.getAllPromptTemplates.all() as PromptTemplate[];
  res.json(templates);
});

router.post('/', (req, res) => {
  const { name, description, prompt_text, category } = req.body;
  if (!name || !prompt_text) {
    return res.status(400).json({ error: 'name and prompt_text are required' });
  }
  const result = statements.createPromptTemplate.run(name, description || null, prompt_text, category || 'general');
  res.json({
    id: Number(result.lastInsertRowid),
    name,
    description: description || null,
    prompt_text,
    category: category || 'general',
    is_builtin: 0,
    created_at: new Date().toISOString(),
  });
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const template = statements.getPromptTemplateById.get(id) as PromptTemplate | undefined;
  if (!template) return res.status(404).json({ error: 'Prompt template not found' });
  if (template.is_builtin) return res.status(403).json({ error: 'Cannot modify builtin prompt templates' });

  const { name, description, prompt_text, category } = req.body;
  statements.updatePromptTemplate.run(
    name || template.name,
    description !== undefined ? description : template.description,
    prompt_text || template.prompt_text,
    category || template.category,
    id,
  );
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const template = statements.getPromptTemplateById.get(id) as PromptTemplate | undefined;
  if (!template) return res.status(404).json({ error: 'Prompt template not found' });
  if (template.is_builtin) return res.status(403).json({ error: 'Cannot delete builtin prompt templates' });

  statements.deletePromptTemplate.run(id);
  res.json({ success: true });
});

export default router;