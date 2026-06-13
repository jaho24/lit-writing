import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../stores/appStore';
import { ChatMessageList } from './ChatMessageList';
import { ChatInputBar } from './ChatInputBar';
import { PromptManager } from './PromptManager';
import { ChevronDown, Plus, X } from 'lucide-react';
import { EditorHandle } from './NotebookEditor';

interface AIChatDialogProps {
  editorRef: React.RefObject<EditorHandle | null>;
  hideHeader?: boolean;
}

export function AIChatDialog({ editorRef, hideHeader }: AIChatDialogProps) {
  const currentChatId = useAppStore(s => s.currentChatId);
  const isChatGenerating = useAppStore(s => s.isChatGenerating);
  const chatThreads = useAppStore(s => s.chatThreads);
  const sendChatMessage = useAppStore(s => s.sendChatMessage);
  const deleteChatThread = useAppStore(s => s.deleteChatThread);
  const fetchChatThreads = useAppStore(s => s.fetchChatThreads);
  const fetchPromptTemplates = useAppStore(s => s.fetchPromptTemplates);
  const fetchWritingStyles = useAppStore(s => s.fetchWritingStyles);

  const [isThreadDropdownOpen, setIsThreadDropdownOpen] = useState(false);
  const promptInsertRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    fetchChatThreads();
    fetchPromptTemplates();
    fetchWritingStyles();
  }, [fetchChatThreads, fetchPromptTemplates, fetchWritingStyles]);

  const handleSend = (instruction: string) => {
    sendChatMessage(instruction);
  };

  const handleInsertFull = (content: string) => {
    if (editorRef.current) {
      editorRef.current.insertAtCursor(content);
    }
  };

  const handleInsertSelection = (content: string) => {
    if (editorRef.current) {
      editorRef.current.insertAtCursor(content);
    }
  };

  const handleThreadDelete = (threadId: number) => {
    deleteChatThread(threadId);
  };

  const handleCreateThread = async () => {
    await useAppStore.getState().createChatThread('新对话');
  };

  const handleComposePrompt = (text: string) => {
    if (promptInsertRef.current) {
      promptInsertRef.current(text);
    }
  };

  const getCurrentThreadTitle = () => {
    if (!currentChatId) return '新对话';
    const thread = chatThreads.find(t => t.id === currentChatId);
    return thread ? thread.title : '新对话';
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {!hideHeader && (
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">AI 写作助手</h2>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <button
                onClick={() => setIsThreadDropdownOpen(!isThreadDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200"
              >
                <span>{getCurrentThreadTitle()}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {isThreadDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white shadow-lg rounded border border-gray-200 z-20 min-w-[200px]">
                  <div className="p-2">
                    <button
                      onClick={handleCreateThread}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-100 rounded"
                    >
                      <Plus className="w-4 h-4" />
                      <span>新建对话</span>
                    </button>
                  </div>
                  <div className="border-t border-gray-200 max-h-[200px] overflow-auto">
                    {chatThreads.map(thread => (
                      <div
                        key={thread.id}
                        className="flex items-center justify-between px-3 py-2 hover:bg-gray-100"
                      >
                        <span className="text-sm truncate">{thread.title}</span>
                        <button
                          onClick={() => handleThreadDelete(thread.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <PromptManager onComposePrompt={handleComposePrompt} />
        <ChatMessageList
          onInsertFull={handleInsertFull}
          onInsertSelection={handleInsertSelection}
        />
      </div>
      
      <ChatInputBar
        onSend={handleSend}
        isGenerating={isChatGenerating}
        promptInsertRef={promptInsertRef}
      />
    </div>
  );
}
