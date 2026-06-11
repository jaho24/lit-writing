import { useAppStore } from '../../stores/appStore';
import { useState } from 'react';
import { WritingStyle, PromptTemplate } from '../../types';
import { ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';

interface PromptManagerProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function PromptManager({ isCollapsed, onToggleCollapse }: PromptManagerProps) {
  const writingStyles = useAppStore(s => s.writingStyles);
  const promptTemplates = useAppStore(s => s.promptTemplates);
  const selectedPromptId = useAppStore(s => s.selectedPromptId);
  const selectedPromptType = useAppStore(s => s.selectedPromptType);
  const setSelectedPromptId = useAppStore(s => s.setSelectedPromptId);
  const deletePromptTemplate = useAppStore(s => s.deletePromptTemplate);
  const createPromptTemplate = useAppStore(s => s.createPromptTemplate);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [newCategory, setNewCategory] = useState('general');

  const handleStyleClick = (style: WritingStyle) => {
    setSelectedPromptId(style.id, 'style');
  };

  const handleTemplateClick = (template: PromptTemplate) => {
    setSelectedPromptId(template.id, 'template');
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

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50"
      >
        <h3 className="text-sm font-medium text-gray-900">提示词管理</h3>
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      
      {!isCollapsed && (
        <div className="p-3 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-2">写作风格</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {writingStyles.map(style => (
                <div
                  key={style.id}
                  onClick={() => handleStyleClick(style)}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    selectedPromptId === style.id && selectedPromptType === 'style'
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900">{style.name}</div>
                  {style.description && (
                    <div className="text-xs text-gray-500 mt-1">{style.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-2">提示词模板</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {promptTemplates.map(template => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  className={`p-2 rounded cursor-pointer transition-colors relative ${
                    selectedPromptId === template.id && selectedPromptType === 'template'
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900">{template.name}</div>
                  {template.category && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded mt-1">
                      {template.category}
                    </span>
                  )}
                  {template.is_builtin === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(template.id);
                      }}
                      className="absolute right-2 top-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {showCreateForm ? (
            <div className="space-y-2 p-2 bg-gray-50 rounded border border-gray-200">
              <input
                type="text"
                placeholder="模板名称"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
              <textarea
                placeholder="提示词内容"
                value={newPromptText}
                onChange={e => setNewPromptText(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded resize-none"
                rows={3}
              />
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              >
                <option value="general">通用</option>
                <option value="summary">总结</option>
                <option value="analysis">分析</option>
                <option value="comparison">对比</option>
                <option value="polish">润色</option>
                <option value="custom">自定义</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateTemplate}
                  className="flex-1 px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  创建
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-2 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center space-x-2 p-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
            >
              <Plus className="w-4 h-4" />
              <span>新建</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}