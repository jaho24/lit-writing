import { statements } from '../database';

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

interface AIProviderConfig {
  api_key: string;
  base_url: string;
  model: string;
}

function getAIConfig(): AIProviderConfig {
  const dbConfig = statements.getActiveAIConfig.get() as
    | { api_key: string; base_url: string; model: string }
    | undefined;

  if (dbConfig) {
    return {
      api_key: dbConfig.api_key,
      base_url: dbConfig.base_url,
      model: dbConfig.model,
    };
  }

  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.QWEN_API_KEY || process.env.MINIMAX_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || process.env.QWEN_BASE_URL || process.env.MINIMAX_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.DEEPSEEK_MODEL || process.env.QWEN_MODEL || process.env.MINIMAX_MODEL || 'deepseek-chat';

  if (!apiKey) {
    throw new Error('AI API key not configured. Configure it in Settings or set DEEPSEEK_API_KEY/QWEN_API_KEY/MINIMAX_API_KEY in .env');
  }

  return { api_key: apiKey, base_url: baseUrl, model };
}

async function callAIService(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 2000,
): Promise<GenerateResult> {
  const config = getAIConfig();

  const response = await fetch(`${config.base_url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.api_key}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
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

export async function generateWriting(options: GenerateOptions): Promise<GenerateResult> {
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

  return callAIService([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);
}

interface ChatGenerateOptions {
  messages: Array<{ role: string; content: string }>;
  instruction: string;
  annotation_material: string;
  prompt_template?: string;
  language: string;
  citation_format: string;
}

export async function chatGenerate(options: ChatGenerateOptions): Promise<GenerateResult> {
  const systemPrompt = `你是一位学术写作助手。用户正在撰写学术论文，你会根据提供的标注素材和写作指令来协助写作。
核心要求：
1. 严格基于提供的标注素材内容，不添加标注中未涉及的信息
2. 每个论点必须引用对应的标注来源文献，使用[编号]标记
3. 引用标记：正文中用[序号]，段后列举完整引用信息
4. 输出语言按指定要求
5. 如果用户要求修改之前的内容，返回修改后的完整文本

当前对话是持续的创作过程，请基于上下文和用户的最新指令来生成或修改内容。`;

  let userPrompt = '';

  if (options.annotation_material) {
    userPrompt += `[Selected Annotations]\n${options.annotation_material}\n\n`;
  }

  if (options.prompt_template) {
    userPrompt += `[Prompt Template]\n${options.prompt_template}\n\n`;
  }

  userPrompt += `[Instruction]\n${options.instruction}\n\n`;
  userPrompt += `[Citation Format]\n引用格式：${options.citation_format}\n\n`;
  userPrompt += `[Output Language]\n${options.language === 'zh' ? '中文' : 'English'}\n`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...options.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userPrompt },
  ];

  return callAIService(messages, 4000);
}
