import { Router } from 'express';
import { callAIService } from '../services/ai-writer';

const router = Router();

router.post('/', async (req, res) => {
  const { text, target_language } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  const lang = target_language || 'zh';
  const langLabel = lang === 'zh' ? '中文' : lang === 'en' ? 'English' : lang;

  const systemPrompt = `你是一位专业的学术翻译助手。将用户提供的文本翻译为${langLabel}。
核心要求：
1. 准确传达原文含义，不遗漏关键信息
2. 学术术语翻译遵循该领域通行译法
3. 保留原文的专业性和严谨性
4. 仅输出翻译结果，不要添加解释或注释`;

  try {
    const result = await callAIService(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
      2000,
    );
    res.json({ translated_text: result.content, source_language: 'auto', target_language: lang });
  } catch (err) {
    res.status(500).json({ error: 'Translation failed', detail: String(err) });
  }
});

export default router;
