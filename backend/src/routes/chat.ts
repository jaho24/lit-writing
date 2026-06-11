import { Router } from 'express';
import { statements } from '../database';
import { chatGenerate } from '../services/ai-writer';
import { fetchAnnotationsWithLiterature, fetchAllAnnotationsForLiteratures, fetchLiteraturesByIds, buildLiteratureMap, buildCitationsFromLiteratureMap, buildAnnotationMaterial, buildLiteratureMaterial, addLiteraturesToMap, parseJSONField } from '../services/writing-utils';
import type { ChatMessage as ChatMessageType, ChatGenerateRequest } from '../types';

const router = Router();

router.post('/generate', async (req, res) => {
  const body: ChatGenerateRequest = req.body;

  if (!body.instruction) {
    return res.status(400).json({ error: 'instruction is required' });
  }
  if (!body.annotation_ids || body.annotation_ids.length === 0) {
    if (!body.literature_ids || body.literature_ids.length === 0) {
      return res.status(400).json({ error: 'annotation_ids or literature_ids is required' });
    }
  }

  let threadId = body.thread_id;

  if (!threadId) {
    const title = body.instruction.slice(0, 50) + (body.instruction.length > 50 ? '...' : '');
    const threadResult = statements.createChatThread.run(title);
    threadId = Number(threadResult.lastInsertRowid);
  }

  const annotations = fetchAnnotationsWithLiterature(body.annotation_ids || []);
  const litAnnotations = fetchAllAnnotationsForLiteratures(body.literature_ids || []);
  const literatures = fetchLiteraturesByIds(body.literature_ids || []);

  const allAnnotations = [...annotations];
  const seenIds = new Set(annotations.map(a => a.id));
  for (const a of litAnnotations) {
    if (!seenIds.has(a.id)) {
      seenIds.add(a.id);
      allAnnotations.push(a);
    }
  }

  const literatureMap = buildLiteratureMap(allAnnotations);
  addLiteraturesToMap(literatures, literatureMap);

  const annotationMaterial = buildAnnotationMaterial(allAnnotations);
  const literatureMaterial = buildLiteratureMaterial(literatures);
  const combinedMaterial = [annotationMaterial, literatureMaterial].filter(s => s.length > 0).join('\n\n---\n\n');

  const allIds = [...(body.annotation_ids || []), ...(body.literature_ids || [])];

  statements.createChatMessage.run(
    threadId,
    'user',
    body.instruction,
    '[]',
    JSON.stringify(allIds),
    body.prompt_template || null,
    body.prompt_type || null,
  );

  try {
    const result = await chatGenerate({
      messages: body.messages || [],
      instruction: body.instruction,
      annotation_material: combinedMaterial,
      prompt_template: body.prompt_template,
      language: body.language || 'zh',
      citation_format: body.citation_format || 'GB/T 7714',
    });

    const citations = buildCitationsFromLiteratureMap(literatureMap);

    statements.createChatMessage.run(
      threadId,
      'assistant',
      result.content,
      JSON.stringify(citations),
      JSON.stringify(allIds),
      body.prompt_template || null,
      body.prompt_type || null,
    );

    statements.touchChatThread.run(threadId);

    res.json({
      thread_id: threadId,
      message_id: Number((statements.getChatMessagesByThread.all(threadId) as ChatMessageType[]).slice(-1)[0]?.id || 0),
      content: result.content,
      citations,
    });
  } catch (err) {
    res.status(500).json({ error: 'Chat generation failed', detail: String(err) });
  }
});

router.get('/threads', (_req, res) => {
  const threads = statements.getAllChatThreads.all();
  res.json(threads);
});

router.get('/threads/:id', (req, res) => {
  const threadId = Number(req.params.id);
  const thread = statements.getChatThreadById.get(threadId);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });

  const messages = statements.getChatMessagesByThread.all(threadId) as ChatMessageType[];
  res.json({
    thread,
    messages: messages.map(m => ({
      ...m,
      citations: parseJSONField(m.citations as unknown as string, []),
      annotation_ids: parseJSONField(m.annotation_ids as unknown as string, []),
    })),
  });
});

router.post('/threads', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const result = statements.createChatThread.run(title);
  res.json({ id: Number(result.lastInsertRowid), title, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
});

router.delete('/threads/:id', (req, res) => {
  const threadId = Number(req.params.id);
  const thread = statements.getChatThreadById.get(threadId);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  statements.deleteChatThread.run(threadId);
  statements.deleteChatMessagesByThread.run(threadId);
  res.json({ success: true });
});

router.get('/threads/:id/messages', (req, res) => {
  const threadId = Number(req.params.id);
  const messages = statements.getChatMessagesByThread.all(threadId) as ChatMessageType[];
  res.json(messages.map(m => ({
    ...m,
    citations: parseJSONField(m.citations as unknown as string, []),
    annotation_ids: parseJSONField(m.annotation_ids as unknown as string, []),
  })));
});

export default router;