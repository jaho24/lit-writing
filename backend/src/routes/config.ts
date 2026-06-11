import { Router } from 'express';
import db, { statements } from '../database';
import type { AIConfig } from '../types';

const router = Router();

const PROVIDER_DEFAULTS: Record<string, { base_url: string; model: string }> = {
  deepseek: { base_url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  qwen: { base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  minimax: { base_url: 'https://api.minimaxi.com/v1', model: 'MiniMax-M3' },
};

interface AIConfigPublic {
  id: number;
  provider: string;
  base_url: string;
  model: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  source: string;
}

router.get('/ai', (_req, res) => {
  const configs = statements.getAllAIConfigs.all() as AIConfigPublic[];
  const envFallbacks: { provider: string; base_url: string; model: string; source: string }[] = [];

  if (process.env.DEEPSEEK_API_KEY) {
    envFallbacks.push({
      provider: 'deepseek',
      base_url: process.env.DEEPSEEK_BASE_URL || PROVIDER_DEFAULTS.deepseek.base_url,
      model: process.env.DEEPSEEK_MODEL || PROVIDER_DEFAULTS.deepseek.model,
      source: 'env',
    });
  }
  if (process.env.QWEN_API_KEY) {
    envFallbacks.push({
      provider: 'qwen',
      base_url: process.env.QWEN_BASE_URL || PROVIDER_DEFAULTS.qwen.base_url,
      model: process.env.QWEN_MODEL || PROVIDER_DEFAULTS.qwen.model,
      source: 'env',
    });
  }
  if (process.env.MINIMAX_API_KEY) {
    envFallbacks.push({
      provider: 'minimax',
      base_url: process.env.MINIMAX_BASE_URL || PROVIDER_DEFAULTS.minimax.base_url,
      model: process.env.MINIMAX_MODEL || PROVIDER_DEFAULTS.minimax.model,
      source: 'env',
    });
  }

  res.json({
    configs,
    envFallbacks,
    providerDefaults: PROVIDER_DEFAULTS,
  });
});

router.post('/ai', (req, res) => {
  const { provider, api_key, base_url, model } = req.body;

  if (!provider || !['deepseek', 'qwen', 'minimax'].includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider. Must be deepseek, qwen, or minimax' });
  }
  if (!api_key || api_key.trim().length === 0) {
    return res.status(400).json({ error: 'api_key is required' });
  }

  const effectiveBaseUrl = base_url?.trim() || PROVIDER_DEFAULTS[provider].base_url;
  const effectiveModel = model?.trim() || PROVIDER_DEFAULTS[provider].model;

  const transaction = db.transaction(() => {
    statements.deactivateAllAIConfigs.run();
    const result = statements.createAIConfig.run(provider, api_key.trim(), effectiveBaseUrl, effectiveModel, 1);
    return result;
  });
  const result = transaction();

  const newConfig = statements.getAIConfigById.get(Number(result.lastInsertRowid)) as AIConfigPublic;
  res.json({ ...newConfig, source: 'db' });
});

router.put('/ai/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = statements.getAIConfigById.get(id) as AIConfigPublic | undefined;
  if (!existing) return res.status(404).json({ error: 'Config not found' });

  const { provider, api_key, base_url, model, is_active } = req.body;

  const effectiveProvider = provider || existing.provider;
  const effectiveApiKey = api_key || '';
  const effectiveBaseUrl = base_url?.trim() || PROVIDER_DEFAULTS[effectiveProvider].base_url;
  const effectiveModel = model?.trim() || PROVIDER_DEFAULTS[effectiveProvider].model;
  const effectiveIsActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

  if (is_active) {
    db.transaction(() => {
      statements.deactivateAllAIConfigs.run();
      statements.updateAIConfig.run(effectiveProvider, effectiveApiKey, effectiveBaseUrl, effectiveModel, 1, id);
    })();
  } else {
    statements.updateAIConfig.run(effectiveProvider, effectiveApiKey, effectiveBaseUrl, effectiveModel, effectiveIsActive, id);
  }

  const updated = statements.getAIConfigById.get(id) as AIConfigPublic;
  res.json({ ...updated, source: 'db' });
});

router.delete('/ai/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = statements.getAIConfigById.get(id) as AIConfigPublic | undefined;
  if (!existing) return res.status(404).json({ error: 'Config not found' });

  statements.deleteAIConfig.run(id);
  res.json({ success: true });
});

export default router;