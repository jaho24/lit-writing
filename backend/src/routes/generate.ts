import { Router } from 'express';
import db, { statements } from '../database';
import { generateWriting } from '../services/ai-writer';
import { fetchAnnotationsWithLiterature, buildLiteratureMap, buildCitationsFromLiteratureMap, parseJSONField } from '../services/writing-utils';
import type { Annotation, Tag, WritingStyle, GenerationRecord, GenerateRequest } from '../types';

const router = Router();

router.post('/', async (req, res) => {
  const body: GenerateRequest = req.body;

  if (!body.tag_ids || body.tag_ids.length === 0) {
    return res.status(400).json({ error: 'tag_ids is required' });
  }
  if (!body.style_mode) {
    return res.status(400).json({ error: 'style_mode is required' });
  }

  const placeholders = body.tag_ids.map(() => '?').join(',');
  const annotations = db.prepare(`
    SELECT a.*, l.title as literature_title, l.authors as literature_authors,
           l.year as literature_year, l.journal as literature_journal, l.doi as literature_doi
    FROM annotations a
    JOIN annotation_tags at ON a.id = at.annotation_id
    JOIN literature l ON a.literature_id = l.id
    WHERE at.tag_id IN (${placeholders})
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `).all(...body.tag_ids) as Annotation[];

  const tagDetails = body.tag_ids.map(id => statements.getTagById.get(id) as Tag | undefined);
  const annotationTags = body.tag_ids.map(id => ({ id, name: (tagDetails.find(t => t?.id === id))?.name || '' }));

  let stylePrompt = '';
  let citationFormat = body.citation_format || 'GB/T 7714';

  if (body.style_mode === 'journal_style') {
    if (!body.style_id) return res.status(400).json({ error: 'style_id is required for journal_style mode' });
    const style = statements.getWritingStyleById.get(body.style_id) as WritingStyle | undefined;
    if (!style) return res.status(400).json({ error: 'Writing style not found' });
    stylePrompt = style.style_prompt;
    citationFormat = style.citation_format;
  } else if (body.style_mode === 'imitate') {
    if (!body.reference_text) return res.status(400).json({ error: 'reference_text is required for imitate mode' });
    const imitateAnalysis = await generateWriting({
      tag_ids: [],
      style_mode: 'custom_prompt',
      custom_prompt: `分析以下学术文本的写作风格特征，包括：论证结构、语气密度、句式模式、引用嵌入方式。用2-3句话概括其核心风格要点。\n\n文本：${body.reference_text}`,
      language: body.language,
      citation_format: 'none',
    });
    stylePrompt = `模仿以下写作风格特征生成新段落：${imitateAnalysis.content}\n\n注意对齐上述风格中的论证结构、语气密度、句式模式和引用嵌入方式。`;
  } else if (body.style_mode === 'custom_prompt') {
    if (!body.custom_prompt) return res.status(400).json({ error: 'custom_prompt is required for custom_prompt mode' });
    stylePrompt = body.custom_prompt;
  }

  const literatureMap = buildLiteratureMap(annotations as any);

  const tagSections = body.tag_ids.map(id => {
    const tagName = (tagDetails.find(t => t?.id === id))?.name || '';
    const tagAnnotations = annotations.filter(a => {
      const aTags = statements.getAnnotationTags.all(a.id) as { tag_id: number }[];
      return aTags.some(at => at.tag_id === id);
    });
    if (tagAnnotations.length === 0) return '';
    return `标签 "${tagName}" 下的标注：\n${tagAnnotations.map(a =>
      `- 来源：${(a as any).literature_title || 'Unknown'} (${(a as any).literature_authors || 'Unknown'}, ${(a as any).literature_year || 'N/A'})\n  原文："${a.text || ''}"\n  批注："${a.note || ''}"`
    ).join('\n')}`;
  }).filter(Boolean).join('\n\n');

  try {
    const result = await generateWriting({
      tag_ids: body.tag_ids,
      style_mode: body.style_mode,
      custom_prompt: stylePrompt,
      language: body.language,
      citation_format: citationFormat,
      annotation_material: tagSections,
    });

    const citations = buildCitationsFromLiteratureMap(literatureMap);

    const recordResult = statements.createGenerationRecord.run(
      result.content,
      JSON.stringify(citations),
      body.style_id || null,
      body.style_mode,
      body.reference_text || null,
      body.custom_prompt || null,
      JSON.stringify(body.tag_ids),
      JSON.stringify(annotations.map(a => a.id)),
      body.language,
      citationFormat
    );

    res.json({
      id: Number(recordResult.lastInsertRowid),
      content: result.content,
      citations,
      style_used: body.style_id ? { id: body.style_id, name: (statements.getWritingStyleById.get(body.style_id) as WritingStyle | undefined)?.name || '' } : null,
      style_mode: body.style_mode,
      tags_used: body.tag_ids,
      annotation_count: annotations.length,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Generation failed', detail: String(err) });
  }
});

router.get('/records', (_req, res) => {
  const records = statements.getAllGenerationRecords.all() as GenerationRecord[];
  res.json(records.map(r => ({
    ...r,
    citations: parseJSONField(r.citations as unknown as string, []),
    tags_used: parseJSONField(r.tags_used as unknown as string, []),
    annotation_ids: parseJSONField(r.annotation_ids as unknown as string, []),
  })));
});

router.get('/records/:id', (req, res) => {
  const record = statements.getGenerationRecordById.get(Number(req.params.id)) as GenerationRecord | undefined;
  if (!record) return res.status(404).json({ error: 'Record not found' });
  res.json({
    ...record,
    citations: parseJSONField(record.citations as unknown as string, []),
    tags_used: parseJSONField(record.tags_used as unknown as string, []),
    annotation_ids: parseJSONField(record.annotation_ids as unknown as string, []),
  });
});

export default router;