import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { WritingStyle, PromptTemplate } from '../../types';
import { Send, X, Edit3 } from 'lucide-react';

interface ChatInputBarProps {
  onSend: (instruction: string) => void;
  isGenerating: boolean;
}

export function ChatInputBar({ onSend, isGenerating }: ChatInputBarProps) {
  const [inputValue, setInputValue] = useState('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editPromptText, setEditPromptText] = useState('');

  const selectedPromptId = useAppStore(s => s.selectedPromptId);
  const selectedPromptType = useAppStore(s => s.selectedPromptType);
  const promptTemplates = useAppStore(s => s.promptTemplates);
  const writingStyles = useAppStore(s => s.writingStyles);
  const setSelectedPromptId = useAppStore(s => s.setSelectedPromptId);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSend(inputValue);
      setInputValue('');
      setIsEditingPrompt(false);
      setEditPromptText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEditPrompt = () => {
    if (selectedPromptId && selectedPromptType) {
      const prompt = selectedPromptType === 'style'
        ? writingStyles.find(s => s.id === selectedPromptId)
        : promptTemplates.find(t => t.id === selectedPromptId);
      
      if (prompt) {
        setEditPromptText(
          selectedPromptType === 'style' 
            ? (prompt as WritingStyle).style_prompt 
            : (prompt as PromptTemplate).prompt_text || ''
        );
        setIsEditingPrompt(true);
      }
    }
  };

  const handleSaveEdit = () => {
    setIsEditingPrompt(false);
  };

  const handleCancelEdit = () => {
    setIsEditingPrompt(false);
    setEditPromptText('');
  };

  const handleDeselectPrompt = () => {
    setSelectedPromptId(null, null);
  };

  const getSelectedPrompt = () => {
    if (!selectedPromptId || !selectedPromptType) return null;
    
    return selectedPromptType === 'style'
      ? writingStyles.find(s => s.id === selectedPromptId)
      : promptTemplates.find(t => t.id === selectedPromptId);
  };

  const selectedPrompt = getSelectedPrompt();

  return (
    <div className="border-t border-gray-200 p-4">
      {selectedPrompt && (
        <div className="mb-3 flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-gray-100 rounded-full px-3 py-1">
            <span className="text-xs font-medium text-gray-700">
              {selectedPromptType === 'style' ? '风格' : '模板'}: {selectedPrompt.name}
            </span>
            <button
              onClick={handleDeselectPrompt}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-3 h-3" />
            </button>
            <button
              onClick={handleEditPrompt}
              className="text-gray-500 hover:text-gray-700"
            >
              <Edit3 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
      
      {isEditingPrompt && (
        <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
          <textarea
            value={editPromptText}
            onChange={(e) => setEditPromptText(e.target.value)}
            className="w-full p-2 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
            placeholder="编辑提示词..."
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              取消
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              保存
            </button>
          </div>
        </div>
      )}
      
      <div className="flex space-x-2">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入您的指令..."
          className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          rows={1}
          style={{ minHeight: '40px', maxHeight: '120px' }}
        />
        <button
          onClick={handleSend}
          disabled={isGenerating || !inputValue.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}