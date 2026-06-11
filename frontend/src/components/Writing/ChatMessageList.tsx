import { useAppStore } from '../../stores/appStore';
import { CitationBlock } from './CitationBlock';
import { Loader2 } from 'lucide-react';

interface ChatMessageListProps {
  onInsertFull: (content: string) => void;
  onInsertSelection: (content: string) => void;
}

export function ChatMessageList({ onInsertFull, onInsertSelection }: ChatMessageListProps) {
  const chatMessages = useAppStore(s => s.chatMessages);
  const isChatGenerating = useAppStore(s => s.isChatGenerating);

  const handleInsertFull = (content: string) => {
    onInsertFull(content);
  };

  const handleInsertSelection = (content: string) => {
    onInsertSelection(content);
  };

  const renderMessageContent = (content: string) => {
    // Simple markdown rendering - preserve whitespace and basic formatting
    return content.split('\n').map((line, index) => (
      <div key={index} className="whitespace-pre-wrap break-words">
        {line}
      </div>
    ));
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {chatMessages.length === 0 && !isChatGenerating ? (
        <div className="text-center text-gray-500 py-8">
          开始对话来生成写作内容
        </div>
      ) : (
        <>
          {chatMessages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-md lg:max-w-lg ${
                message.role === 'user'
                  ? 'bg-blue-50 text-blue-900'
                  : 'bg-white text-gray-900'
              } rounded-lg p-4 shadow-sm`}>
                <div className="text-sm">
                  {message.role === 'user' ? (
                    <div className="text-right">
                      <div className="mb-2">{renderMessageContent(message.content)}</div>
                      {message.annotationIds.length > 0 && (
                        <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded inline-block">
                          引用了 {message.annotationIds.length} 条标注
                        </div>
                      )}
                      {message.promptUsed && (
                        <div className="text-xs text-gray-500 mt-1 inline-block bg-gray-100 px-2 py-1 rounded">
                          {message.promptType === 'style' ? '风格' : '模板'}: {message.promptUsed}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="mb-2">{renderMessageContent(message.content)}</div>
                      {message.citations && message.citations.length > 0 && (
                        <CitationBlock citations={message.citations} />
                      )}
                      {message.role === 'assistant' && (
                        <div className="flex justify-end space-x-2 mt-3">
                          <button
                            onClick={() => handleInsertFull(message.content)}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          >
                            插入到编辑器
                          </button>
                          <button
                            onClick={() => handleInsertSelection(message.content)}
                            className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                          >
                            选择插入
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isChatGenerating && (
            <div className="flex justify-center">
              <div className="flex items-center space-x-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">正在生成...</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}