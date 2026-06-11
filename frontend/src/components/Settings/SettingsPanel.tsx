import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { configApi } from '../../api/client';
import type { AIProvider, AIConfigFormData } from '../../types';
import { Save, Trash2, Key, Globe, Cpu, CheckCircle, XCircle } from 'lucide-react';

const PROVIDER_LABELS: Record<AIProvider, string> = {
  deepseek: 'DeepSeek',
  qwen: '通义千问 (Qwen)',
  minimax: 'MiniMax M3',
};

const PROVIDER_COLORS: Record<AIProvider, string> = {
  deepseek: 'bg-blue-100 text-blue-700 border-blue-300',
  qwen: 'bg-orange-100 text-orange-700 border-orange-300',
  minimax: 'bg-purple-100 text-purple-700 border-purple-300',
};

export function SettingsPanel() {
  const { aiConfig, fetchAIConfig } = useAppStore();
  const [formData, setFormData] = useState<AIConfigFormData>({
    provider: 'deepseek',
    api_key: '',
    base_url: '',
    model: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchAIConfig();
  }, []);

  useEffect(() => {
    if (aiConfig && aiConfig.configs && aiConfig.configs.length > 0) {
      const active = aiConfig.configs.find(c => c.is_active === 1);
      if (active) {
        const defaults = aiConfig.providerDefaults[active.provider];
        setFormData({
          provider: active.provider as AIProvider,
          api_key: '',
          base_url: active.base_url || defaults?.base_url || '',
          model: active.model || defaults?.model || '',
        });
      }
    }
  }, [aiConfig]);

  const handleProviderChange = (provider: AIProvider) => {
    const defaults = aiConfig?.providerDefaults[provider];
    setFormData({
      provider,
      api_key: formData.api_key,
      base_url: defaults?.base_url || '',
      model: defaults?.model || '',
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      if (!formData.api_key.trim()) {
        setMessage({ type: 'error', text: '请输入 API Key' });
        setSaving(false);
        return;
      }

      await configApi.createAIConfig({
        provider: formData.provider,
        api_key: formData.api_key.trim(),
        base_url: formData.base_url.trim(),
        model: formData.model.trim(),
      });
      await fetchAIConfig();
      setFormData(prev => ({ ...prev, api_key: '' }));
      setMessage({ type: 'success', text: 'API 配置已保存并激活' });
    } catch (err) {
      setMessage({ type: 'error', text: `保存失败: ${String(err)}` });
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    try {
      await configApi.deleteAIConfig(id);
      await fetchAIConfig();
      setMessage({ type: 'success', text: '配置已删除' });
    } catch (err) {
      setMessage({ type: 'error', text: `删除失败: ${String(err)}` });
    }
  };

  const activeConfig = aiConfig?.configs?.find(c => c.is_active === 1);
  const hasActiveConfig = !!activeConfig;
  const hasEnvFallback = (aiConfig?.envFallbacks?.length ?? 0) > 0;

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-800 mb-6">AI 模型配置</h2>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-md flex items-center space-x-2 ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {hasActiveConfig && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">当前活跃配置</span>
          </div>
          <div className="text-sm text-green-700">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${PROVIDER_COLORS[activeConfig!.provider as AIProvider]}`}>
              {PROVIDER_LABELS[activeConfig!.provider as AIProvider]}
            </span>
            <span className="ml-2">{activeConfig!.model}</span>
          </div>
        </div>
      )}

      {!hasActiveConfig && hasEnvFallback && aiConfig && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Key className="w-5 h-5 text-yellow-600" />
            <span className="font-semibold text-yellow-800">当前使用 .env 环境变量配置</span>
          </div>
          <div className="space-y-1 text-sm text-yellow-700">
            {aiConfig.envFallbacks.map((fb, i) => (
              <div key={i}>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${PROVIDER_COLORS[fb.provider as AIProvider]}`}>
                  {PROVIDER_LABELS[fb.provider as AIProvider]}
                </span>
                <span className="ml-2">{fb.model}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-yellow-600 mt-2">建议在此处配置 API，以便在界面上管理和切换模型</p>
        </div>
      )}

      {!hasActiveConfig && !hasEnvFallback && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-800">未配置任何 AI API</span>
          </div>
          <p className="text-sm text-red-700 mt-1">写作功能需要配置至少一个 AI 模型的 API Key</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">添加 / 更新配置</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">AI 服务商</label>
            <div className="flex space-x-2">
              {(['deepseek', 'qwen', 'minimax'] as AIProvider[]).map(p => (
                <button
                  key={p}
                  onClick={() => handleProviderChange(p)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                    formData.provider === p
                      ? PROVIDER_COLORS[p]
                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {PROVIDER_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center space-x-1"><Key className="w-3.5 h-3.5" /><span>API Key</span></span>
            </label>
            <input
              type="password"
              value={formData.api_key}
              onChange={e => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
              placeholder="输入 API Key..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {activeConfig && (
              <p className="text-xs text-gray-500 mt-1">留空则保留当前已保存的 Key</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center space-x-1"><Globe className="w-3.5 h-3.5" /><span>Base URL</span></span>
            </label>
            <input
              type="text"
              value={formData.base_url}
              onChange={e => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
              placeholder="API 服务地址"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center space-x-1"><Cpu className="w-3.5 h-3.5" /><span>模型名称</span></span>
            </label>
            <input
              type="text"
              value={formData.model}
              onChange={e => setFormData(prev => ({ ...prev, model: e.target.value }))}
              placeholder="模型 ID"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? '保存中...' : '保存并激活'}</span>
          </button>
        </div>
      </div>

      {aiConfig && aiConfig.configs && aiConfig.configs.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">已保存的配置</h3>
          <div className="space-y-2">
            {aiConfig.configs.map(config => (
              <div
                key={config.id}
                className={`p-3 border rounded-lg flex items-center justify-between ${
                  config.is_active ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {config.is_active ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${PROVIDER_COLORS[config.provider as AIProvider]}`}>
                    {PROVIDER_LABELS[config.provider as AIProvider] || config.provider}
                  </span>
                  <span className="text-sm text-gray-600">{config.model}</span>
                  <span className="text-xs text-gray-400">{config.base_url}</span>
                </div>
                <button
                  onClick={() => handleDelete(config.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}