import { useAppStore } from '../../stores/appStore';
import { useState } from 'react';
import { PenTool, Zap, Copy, RotateCw, Download } from 'lucide-react';
import { generateApi } from '../../api/client';

export function WritingWorkspace() {
  const { 
    annotations,
    writingStyles, 
    generationResult, 
    isGenerating
  } = useAppStore();
  
  const [styleMode, setLocalStyleMode] = useState<'imitate' | 'journal_style' | 'custom_prompt'>('imitate');
  const [outputLanguage, setLocalOutputLanguage] = useState<'zh' | 'en'>('zh');
  const [citationFormat, setLocalCitationFormat] = useState('apa');
  const [customPrompt, setCustomPrompt] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<number | null>(null);

  const handleGenerate = () => {
    generateApi.generate({
      tag_ids: [],
      style_mode: styleMode,
      language: outputLanguage,
      citation_format: citationFormat,
      reference_text: referenceText,
      custom_prompt: customPrompt,
      style_id: selectedStyle || undefined
    });
  };

  const handleCopy = () => {
    if (generationResult?.content) {
      navigator.clipboard.writeText(generationResult.content);
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleExport = () => {
    if (generationResult?.content) {
      const blob = new Blob([generationResult.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'generated-content.md';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">写作工作区</h3>
        
        <div className="grid grid-cols-3 gap-4 h-[calc(100vh-200px)]">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">素材选择区</h4>
            
            <div className="space-y-2">
              {annotations.map(annotation => (
                <div key={annotation.id} className="p-2 border border-gray-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: annotation.color }}
                    />
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {annotation.text || '无文本'}
                    </span>
                  </div>
                  {annotation.note && (
                    <p className="text-xs text-gray-500 mt-1">{annotation.note}</p>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                <p>选中标注: {annotations.length} 个</p>
                <p>文献数量: {new Set(annotations.map(a => a.literature_id)).size} 篇</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">写作风格区</h4>
            
            <div className="space-y-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => setLocalStyleMode('imitate')}
                  className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                    styleMode === 'imitate'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  仿写段落
                </button>
                <button
                  onClick={() => setLocalStyleMode('journal_style')}
                  className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                    styleMode === 'journal_style'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  期刊风格
                </button>
                <button
                  onClick={() => setLocalStyleMode('custom_prompt')}
                  className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                    styleMode === 'custom_prompt'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  自定义
                </button>
              </div>
              
              {styleMode === 'custom_prompt' && (
                <div>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="输入自定义写作提示..."
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    rows={4}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">写作风格</label>
                <select
                  value={selectedStyle || ''}
                  onChange={(e) => setSelectedStyle(Number(e.target.value) || null)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">默认风格</option>
                  {writingStyles.map(style => (
                    <option key={style.id} value={style.id}>
                      {style.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">输出语言</label>
                <select
                  value={outputLanguage}
                  onChange={(e) => setLocalOutputLanguage(e.target.value as 'zh' | 'en')}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">引用格式</label>
                <select
                  value={citationFormat}
                  onChange={(e) => setLocalCitationFormat(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="apa">APA</option>
                  <option value="mla">MLA</option>
                  <option value="chicago">Chicago</option>
                  <option value="ieee">IEEE</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">参考文本</label>
                <textarea
                  value={referenceText}
                  onChange={(e) => setReferenceText(e.target.value)}
                  placeholder="粘贴需要仿写的参考文本..."
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  rows={3}
                />
              </div>
            </div>
          </div>
          
          {/* Right Zone - Generation Output */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">生成区</h4>
            
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center space-x-2 mb-4"
            >
              {isGenerating ? (
                <>
                  <Zap className="w-4 h-4 animate-spin" />
                  <span className="text-sm">生成中...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">生成</span>
                </>
              )}
            </button>
            
            {generationResult ? (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-md p-4">
                  <pre className="text-sm whitespace-pre-wrap font-sans">{generationResult.content}</pre>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={handleCopy}
                    className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="text-sm">复制</span>
                  </button>
                  <button
                    onClick={handleRegenerate}
                    className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span className="text-sm">重新生成</span>
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm">导出</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="text-center">
                  <PenTool className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">点击"生成"按钮开始写作</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}