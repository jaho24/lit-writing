import { useAppStore } from '../../stores/appStore';
import { LibraryTree } from '../Library/LibraryTree';
import { LiteratureList } from '../Library/LiteratureList';
import { PDFPreview } from '../Preview/PDFPreview';
import { AnnotationList } from '../Annotations/AnnotationList';
import { WritingWorkspace } from '../Writing/WritingWorkspace';
import { UploadDialog } from '../Upload/UploadDialog';
import { TagManager } from '../Tags/TagManager';
import { SettingsPanel } from '../Settings/SettingsPanel';
import { ContextMenu } from '../Common/ContextMenu';
import { PdfTabBar } from '../Preview/PdfTabBar';
import { useState, useEffect, useCallback } from 'react';
import { Search, Upload, PenTool, BookOpen, ChevronLeft, ChevronRight, Star, Trash2, Edit2, Copy, Tag as TagIcon } from 'lucide-react';

interface ContextMenuState {
  x: number;
  y: number;
  target: 'literature' | 'tag' | null;
  id: number | null;
}

export function Layout() {
  const {
    literature,
    annotations,
    rightPanelTab,
    searchQuery,
    setSearchQuery,
    setRightPanelTab,
    selectedLiteratureId,
    toggleLiteratureStar,
deleteLiterature,
    deleteTag,
    fetchLiterature,
    fetchLiteratureByTag,
    openTab,
    activeTabId,
  } = useAppStore();

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [leftSplitterPosition, setLeftSplitterPosition] = useState(60);
  const [middleWidth, setMiddleWidth] = useState(280);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  const literatureCount = literature.length;
  const annotationCount = annotations.length;

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

  const handleContextMenu = useCallback((e: React.MouseEvent, target: 'literature' | 'tag', id: number | null = null) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, target, id });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [contextMenu]);

  const handleLeftSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const container = (e.target as HTMLElement).parentElement;
    if (!container) return;
    const containerHeight = container.clientHeight;
    const startPct = leftSplitterPosition;

    const handleMouseMove = (ev: MouseEvent) => {
      const deltaY = ev.clientY - startY;
      const newPct = Math.max(15, Math.min(85, startPct + (deltaY / containerHeight) * 100));
      setLeftSplitterPosition(newPct);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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

  const handleTagClick = (tagId: number) => {
    if (selectedTagId === tagId) {
      setSelectedTagId(null);
      fetchLiterature();
    } else {
      setSelectedTagId(tagId);
      fetchLiteratureByTag(tagId);
    }
  };

  const contextMenuItems = contextMenu?.target === 'literature' && contextMenu.id
    ? [
        { label: '在预览中打开', icon: <BookOpen className="w-3.5 h-3.5" />, onClick: () => {
        const lit = literature.find(l => l.id === contextMenu.id!);
        if (lit) openTab(contextMenu.id!, lit.title || '无标题');
      } },
        { label: selectedLiteratureId === contextMenu.id ? '取消收藏' : '收藏', icon: <Star className="w-3.5 h-3.5" />, onClick: () => { toggleLiteratureStar(contextMenu.id!, true); } },
        { separator: true, label: '', onClick: () => {} },
        { label: '复制标题', icon: <Copy className="w-3.5 h-3.5" />, onClick: () => { const lit = literature.find(l => l.id === contextMenu.id); if (lit?.title) navigator.clipboard.writeText(lit.title); } },
        { separator: true, label: '', onClick: () => {} },
        { label: '删除', icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => { deleteLiterature(contextMenu.id!); }, danger: true },
      ]
    : contextMenu?.target === 'tag' && contextMenu.id
      ? [
          { label: '编辑标签', icon: <Edit2 className="w-3.5 h-3.5" />, onClick: () => {} },
          { label: '按此标签筛选', icon: <TagIcon className="w-3.5 h-3.5" />, onClick: () => { handleTagClick(contextMenu.id!); } },
          { separator: true, label: '', onClick: () => {} },
          { label: '删除标签', icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => { deleteTag(contextMenu.id!); }, danger: true },
        ]
      : [];

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
        <div
          className="flex flex-col border-r bg-white transition-all duration-200"
          style={{ width: leftCollapsed ? '40px' : '220px', borderColor: '#e0e0e0' }}
        >
          <div className="p-2 border-b flex items-center justify-between" style={{ borderColor: '#e0e0e0' }}>
            {!leftCollapsed && (
              <span className="text-[12px] font-semibold" style={{ color: '#1a1a1a' }}>我的库</span>
            )}
            <button
              onClick={() => setLeftCollapsed(!leftCollapsed)}
              className="p-1 rounded hover:bg-gray-100"
            >
              {leftCollapsed ? (
                <ChevronRight className="w-4 h-4" style={{ color: '#666' }} />
              ) : (
                <ChevronLeft className="w-4 h-4" style={{ color: '#666' }} />
              )}
            </button>
          </div>

          {!leftCollapsed && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div style={{ height: `${leftSplitterPosition}%` }} className="overflow-auto">
                <div className="p-2">
                  <LibraryTree />
                </div>
              </div>

              <div
                className="cursor-ns-resize"
                style={{ height: '4px', background: '#e0e0e0' }}
                onMouseDown={handleLeftSplitterMouseDown}
              />

              <div style={{ height: `${100 - leftSplitterPosition}%` }} className="overflow-auto">
                <div className="p-2">
                  <TagManager onTagClick={handleTagClick} selectedTagId={selectedTagId} />
                </div>
              </div>
            </div>
          )}
        </div>

        {rightPanelTab !== 'writing' && (
        <div
          className="flex flex-col border-r bg-white"
          style={{ width: `${middleWidth}px`, borderColor: '#e0e0e0' }}
        >
          <div className="p-2 border-b" style={{ borderColor: '#e0e0e0' }}>
            <span className="text-[12px] font-semibold" style={{ color: '#1a1a1a' }}>文献列表</span>
          </div>
          <div className="flex-1 overflow-auto">
            <LiteratureList onContextMenu={handleContextMenu} onDoubleClick={handleDoubleClickLiterature} />
          </div>
        </div>
        )}

        {rightPanelTab !== 'writing' && (
        <div
          className="cursor-ew-resize hover:bg-gray-200"
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

      {contextMenu && contextMenuItems.length > 0 && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={closeContextMenu}
        />
      )}

      {showUploadDialog && (
        <UploadDialog onClose={() => setShowUploadDialog(false)} />
      )}
    </div>
  );
}
