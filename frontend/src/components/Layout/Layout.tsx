import { useAppStore } from '../../stores/appStore';
import { LibraryTree } from '../Library/LibraryTree';
import { LiteratureList } from '../Library/LiteratureList';
import { PDFPreview } from '../Preview/PDFPreview';
import { AnnotationList } from '../Annotations/AnnotationList';
import { WritingWorkspace } from '../Writing/WritingWorkspace';
import { UploadDialog } from '../Upload/UploadDialog';
import { TagManager } from '../Tags/TagManager';
import { useState } from 'react';
import { Search, Upload, PenTool, Settings, BookOpen } from 'lucide-react';

export function Layout() {
  const { 
    libraries, 
    selectedLibraryId, 
    literature, 
    annotations, 
    rightPanelTab,
    searchQuery,
    setSearchQuery,
    setRightPanelTab
  } = useAppStore();

  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const literatureCount = literature.length;
  const annotationCount = annotations.length;

  const renderRightPanel = () => {
    switch (rightPanelTab) {
      case 'preview':
        return <PDFPreview />;
      case 'annotations':
        return <AnnotationList />;
      case 'writing':
        return <WritingWorkspace />;
      default:
        return <PDFPreview />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-semibold text-gray-800">LitWrite</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索文献..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={() => setShowUploadDialog(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>导入</span>
            </button>
            
            <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
              <PenTool className="w-4 h-4" />
              <span>写作</span>
            </button>
            
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
              <Settings className="w-4 h-4" />
              <span>设置</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>文献: {literatureCount}</span>
          <span>标注: {annotationCount}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-60 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">我的库</h3>
            <LibraryTree />
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">标签</h3>
            <TagManager />
          </div>
        </div>

        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {selectedLibraryId ? libraries.find(l => l.id === selectedLibraryId)?.name : '全部文献'}
            </h3>
            <LiteratureList />
          </div>
        </div>

        <div className="flex-1 bg-gray-50 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <div className="flex space-x-1">
              <button
                onClick={() => setRightPanelTab('preview')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  rightPanelTab === 'preview'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                预览
              </button>
              <button
                onClick={() => setRightPanelTab('annotations')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  rightPanelTab === 'annotations'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                标注
              </button>
              <button
                onClick={() => setRightPanelTab('writing')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  rightPanelTab === 'writing'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                写作
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {renderRightPanel()}
          </div>
        </div>
      </div>

      {showUploadDialog && (
        <UploadDialog onClose={() => setShowUploadDialog(false)} />
      )}
    </div>
  );
}
