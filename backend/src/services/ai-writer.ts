interface GenerateOptions {
  tag_ids: number[];
  style_mode: string;
  custom_prompt?: string;
  language: string;
  citation_format: string;
  annotation_material?: string;
}

interface GenerateResult {
  content: string;
}

export async function generateWriting(options: GenerateOptions): Promise<GenerateResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.QWEN_API_KEY || process.env.MINIMAX_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || process.env.QWEN_BASE_URL || process.env.MINIMAX_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.DEEPSEEK_MODEL || process.env.QWEN_MODEL || process.env.MINIMAX_MODEL || 'deepseek-chat';

  if (!apiKey) {
    throw new Error('AI API key not configured. Set DEEPSEEK_API_KEY, QWEN_API_KEY, or MINIMAX_API_KEY in .env');
  }

  const systemPrompt = `你是一位学术写作助手。根据用户提供的标注素材和写作风格要求，生成一段学术论述段落。
核心要求：
1. 严格基于提供的标注素材内容，不添加标注中未涉及的信息
2. 每个论点必须引用对应的标注来源文献，使用[编号]标记
3. 引用标记：正文中用[序号]，段后列举完整引用信息
4. 输出语言按指定要求`;

  let userPrompt = '';

  if (options.custom_prompt) {
    userPrompt += `[Writing Style]\n${options.custom_prompt}\n\n`;
  }

  if (options.annotation_material) {
    userPrompt += `[Annotation Materials]\n${options.annotation_material}\n\n`;
  }

  userPrompt += `[Citation Format]\n引用格式：${options.citation_format}\n\n`;
  userPrompt += `[Output Language]\n${options.language === 'zh' ? '中文' : 'English'}\n`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI API call failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content || '';

  return { content };
}