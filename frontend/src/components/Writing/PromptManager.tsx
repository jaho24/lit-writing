import { useAppStore } from '../../stores/appStore';
import { useState, useCallback } from 'react';
import { WritingStyle, PromptTemplate } from '../../types';
import { ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';

interface PromptManagerProps {
  onComposePrompt: (text: string) => void;
}

export function PromptManager({ onComposePrompt }: PromptManagerProps) {
  const writingStyles = useAppStore(s => s.writingStyles);
  const promptTemplates = useAppStore(s => s.promptTemplates);
  const selectedPromptId = useAppStore(s => s.selectedPromptId);
  const selectedPromptType = useAppStore(s => s.selectedPromptType);
  const setSelectedPromptId = useAppStore(s => s.setSelectedPromptId);
  const deletePromptTemplate = useAppStore(s => s.deletePromptTemplate);
  const createPromptTemplate = useAppStore(s => s.createPromptTemplate);

  const [styleCollapsed, setStyleCollapsed] = useState(false);
  const [templateCollapsed, setTemplateCollapsed] = useState(false);
  const [wordLangCollapsed, setWordLangCollapsed] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [wordCount, setWordCount] = useState('');
  const [language, setLanguage] = useState<'zh' | 'en' | null>(null);

  const composeAndInsert = useCallback(() => {
    const parts: string[] = [];
    if (selectedPromptType === 'style' && selectedPromptId) {
      const style = writingStyles.find(s => s.id === selectedPromptId);
      if (style) parts.push(`风格：${style.name}`);
    }
    if (selectedPromptType === 'template' && selectedPromptId) {
      const template = promptTemplates.find(t => t.id === selectedPromptId);
      if (template) parts.push(`模板：${template.name}`);
    }
    if (wordCount.trim()) parts.push(`字数：${wordCount.trim()}字`);
    if (language) parts.push(`语言：${language === 'zh' ? '中文' : '英文'}`);
    if (parts.length > 0) {
      onComposePrompt(parts.join(' | '));
    }
  }, [selectedPromptType, selectedPromptId, writingStyles, promptTemplates, wordCount, language, onComposePrompt]);

  const handleStyleClick = (style: WritingStyle) => {
    if (selectedPromptId === style.id && selectedPromptType === 'style') {
      setSelectedPromptId(null, null);
    } else {
      setSelectedPromptId(style.id, 'style');
    }
  };

  const handleTemplateClick = (template: PromptTemplate) => {
    if (selectedPromptId === template.id && selectedPromptType === 'template') {
      setSelectedPromptId(null, null);
    } else {
      setSelectedPromptId(template.id, 'template');
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    await deletePromptTemplate(templateId);
  };

  const handleCreateTemplate = async () => {
    if (!newName.trim() || !newPromptText.trim()) return;
    await createPromptTemplate({
      name: newName.trim(),
      prompt_text: newPromptText.trim(),
      category: newCategory,
    });
    setNewName('');
    setNewPromptText('');
    setNewCategory('general');
    setShowCreateForm(false);
  };

  const handleApply = () => {
    composeAndInsert();
  };

  const renderCollapsibleHeader = (
    title: string,
    collapsed: boolean,
    onToggle: () => void
  ) => (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
    >
      <h4 className="text-xs font-semibold text-gray-700">{title}</h4>
      {collapsed ? (
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      )}
    </button>
  );

  const hasAnySelection = (selectedPromptId !== null) || wordCount.trim() || language;

  return (
    <div className="border-b border-gray-200">
      {renderCollapsibleHeader('写作风格', styleCollapsed, () => setStyleCollapsed(!styleCollapsed))}
      {!styleCollapsed && (
        <div className="px-3 pb-2">
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {writingStyles.map(style => (
              <div
                key={style.id}
                onClick={() => handleStyleClick(style)}
                className={`p-1.5 rounded cursor-pointer transition-colors ${
                  selectedPromptId === style.id && selectedPromptType === 'style'
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="text-xs font-medium text-gray-900">{style.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {renderCollapsibleHeader('模板', templateCollapsed, () => setTemplateCollapsed(!templateCollapsed))}
      {!templateCollapsed && (
        <div className="px-3 pb-2">
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {promptTemplates.map(template => (
              <div
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                className={`p-1.5 rounded cursor-pointer transition-colors relative ${
                  selectedPromptId === template.id && selectedPromptType === 'template'
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="text-xs font-medium text-gray-900">{template.name}</div>
                {template.is_builtin === 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(template.id);
                    }}
                    className="absolute right-1 top-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {showCreateForm ? (
            <div className="space-y-1.5 p-2 bg-gray-50 rounded border border-gray-200 mt-1">
              <input
                type="text"
                placeholder="模板名称"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              />
              <textarea
                placeholder="提示词内容"
                value={newPromptText}
                onChange={e => setNewPromptText(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded resize-none"
                rows={2}
              />
              <div className="flex gap-1">
                <button
                  onClick={handleCreateTemplate}
                  className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  创建
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center space-x-1 p-1 text-xs text-blue-600 hover:bg-blue-50 rounded mt-1"
            >
              <Plus className="w-3 h-3" />
              <span>新建模板</span>
            </button>
          )}
        </div>
      )}

      {renderCollapsibleHeader('字数+语言', wordLangCollapsed, () => setWordLangCollapsed(!wordLangCollapsed))}
      {!wordLangCollapsed && (
        <div className="px-3 pb-2 space-y-2">
          <div>
            <input
              type="number"
              placeholder="字数（如 1000）"
              value={wordCount}
              onChange={e => setWordCount(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              min={0}
            />
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setLanguage(language === 'zh' ? null : 'zh')}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                language === 'zh'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              中文
            </button>
            <button
              onClick={() => setLanguage(language === 'en' ? null : 'en')}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                language === 'en'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              英文
            </button>
          </div>
        </div>
      )}

      {hasAnySelection && (
        <div className="px-3 pb-2">
          <button
            onClick={handleApply}
            className="w-full px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            应用到聊天框
          </button>
        </div>
      )}
    </div>
  );
}
