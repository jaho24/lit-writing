import { useAppStore } from '../../stores/appStore';
import { LiteratureList } from '../Library/LiteratureList';
import { PDFPreview } from '../Preview/PDFPreview';
import { AnnotationList } from '../Annotations/AnnotationList';
import { WritingWorkspace } from '../Writing/WritingWorkspace';
import { UploadDialog } from '../Upload/UploadDialog';
import { SettingsPanel } from '../Settings/SettingsPanel';
import { PdfTabBar } from '../Preview/PdfTabBar';
import { useState, useEffect } from 'react';
import { Search, Upload, PenTool, BookOpen } from 'lucide-react';

export function Layout() {
  const {
    literature,
    annotations,
    rightPanelTab,
    searchQuery,
    setSearchQuery,
    setRightPanelTab,
    fetchLiterature,
    fetchLibraries,
    openTab,
    activeTabId,
  } = useAppStore();

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [middleWidth, setMiddleWidth] = useState(280);

  const literatureCount = literature.length;
  const annotationCount = annotations.length;

  useEffect(() => {
    fetchLiterature();
    fetchLibraries();
  }, [fetchLiterature, fetchLibraries]);

  const handleDoubleClickLiterature = (id: number, title: string) => {
    openTab(id, title);
  };

  const renderRightPanel = () => {
    switch (rightPanelTab) {
      case 'preview':
        if (activeTabId) {
          const tab = useAppStore.getState().openTabs.find(t => t.literatureId === activeTabId);
          return <PDFPreview literatureId={activeTabId} initialPage={tab?.page} initialScale={tab?.scale} />;
        }
        return (
          <div className="flex items-center justify-center h-full" style={{ color: '#999' }}>
            <div className="text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-2" style={{ color: '#ccc' }} />
              <p style={{ fontSize: '13px' }}>双击文献打开PDF预览</p>
            </div>
          </div>
        );
      case 'annotations':
        return <AnnotationList />;
      case 'writing':
        return <WritingWorkspace />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <PDFPreview literatureId={activeTabId || 0} />;
    }
  };

  const handleMiddleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = middleWidth;

    const handleMouseMove = (ev: MouseEvent) => {
      const deltaX = ev.clientX - startX;
      const newWidth = Math.max(200, Math.min(500, startWidth + deltaX));
      setMiddleWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: '#f5f5f5' }}>
      <div className="border-b px-4 py-2 flex items-center justify-between" style={{ background: '#f5f5f5', borderColor: '#e0e0e0' }}>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5" style={{ color: '#2D6DA4' }} />
            <span className="text-base font-semibold" style={{ color: '#1a1a1a' }}>LitWrite</span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2 w-3.5 h-3.5" style={{ color: '#999' }} />
            <input
              type="text"
              placeholder="搜索文献..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 w-56 border rounded text-[13px] focus:outline-none focus:ring-1"
              style={{ background: '#fff', borderColor: '#e0e0e0', color: '#1a1a1a', '--tw-ring-color': '#2D6DA4' } as React.CSSProperties}
            />
          </div>

          <button
            onClick={() => setShowUploadDialog(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-white rounded text-[12px] hover:opacity-90"
            style={{ background: '#2D6DA4' }}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>导入</span>
          </button>

          <button
            onClick={() => setRightPanelTab('writing')}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-white rounded text-[12px] hover:opacity-90"
            style={{ background: '#388E3C' }}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>写作</span>
          </button>
        </div>

        <div className="flex items-center space-x-3 text-[12px]" style={{ color: '#666' }}>
          <span>文献: {literatureCount}</span>
          <span>标注: {annotationCount}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {rightPanelTab === 'preview' && (
        <div
          className="flex flex-col border-r bg-white flex-shrink-0"
          style={{ width: `${middleWidth}px`, borderColor: '#e0e0e0' }}
        >
          <div className="p-2 border-b" style={{ borderColor: '#e0e0e0' }}>
            <span className="text-[12px] font-semibold" style={{ color: '#1a1a1a' }}>文献列表</span>
          </div>
          <div className="flex-1 overflow-auto">
            <LiteratureList onDoubleClick={handleDoubleClickLiterature} />
          </div>
        </div>
        )}

        {rightPanelTab === 'preview' && (
        <div
          className="cursor-ew-resize hover:bg-gray-200 flex-shrink-0"
          style={{ width: '4px', background: '#e0e0e0' }}
          onMouseDown={handleMiddleSplitterMouseDown}
        />
        )}

        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#f5f5f5' }}>
          <div className="bg-white border-b px-3 py-1.5 flex items-center space-x-1" style={{ borderColor: '#e0e0e0' }}>
            {(['preview', 'annotations', 'writing', 'settings'] as const).map(tab => {
              const labels: Record<string, string> = { preview: '预览', annotations: '标注', writing: '写作', settings: '设置' };
              const isActive = rightPanelTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setRightPanelTab(tab)}
                  className="px-3 py-1.5 rounded text-[13px] transition-colors"
                  style={{
                    background: isActive ? '#e8f0fe' : 'transparent',
                    color: isActive ? '#2D6DA4' : '#666',
                  }}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {rightPanelTab === 'preview' && <PdfTabBar />}

          <div className="flex-1 overflow-hidden">
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
