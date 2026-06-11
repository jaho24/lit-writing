import { useRef, useCallback, useState, useEffect } from 'react';
import { Panel, Group, Separator, usePanelRef } from 'react-resizable-panels';
import { AnnotationFilter } from './AnnotationFilter';
import { AIChatDialog } from './AIChatDialog';
import { NotebookEditor, EditorHandle } from './NotebookEditor';
import { Filter, MessageSquare, FileText, PanelLeftClose, PanelLeft } from 'lucide-react';

function PanelHeader({
  icon: Icon,
  title,
  panelRef,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  panelRef: ReturnType<typeof usePanelRef>;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const check = () => setCollapsed(panel.isCollapsed());
    check();
    const interval = setInterval(check, 200);
    return () => clearInterval(interval);
  }, [panelRef]);

  const toggle = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }, [panelRef]);

  const ToggleIcon = collapsed ? PanelLeft : PanelLeftClose;

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white select-none flex-shrink-0">
      <div className="flex items-center space-x-2 min-w-0">
        <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-700 truncate">{title}</span>
      </div>
      <button
        onClick={toggle}
        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        title={collapsed ? '展开' : '收起'}
      >
        <ToggleIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

export function WritingWorkspace() {
  const editorRef = useRef<EditorHandle>(null);
  const filterPanelRef = usePanelRef();
  const chatPanelRef = usePanelRef();
  const editorPanelRef = usePanelRef();

  return (
    <Group orientation="horizontal" className="h-full w-full" resizeTargetMinimumSize={{ coarse: 28, fine: 12 }}>
      <Panel
        defaultSize={30}
        minSize={20}
        maxSize={60}
        collapsible
        panelRef={filterPanelRef}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <PanelHeader icon={Filter} title="标注筛选" panelRef={filterPanelRef} />
          <div className="flex-1 overflow-y-auto">
            <AnnotationFilter hideHeader />
          </div>
        </div>
      </Panel>

      <Separator className="w-2 flex items-center justify-center group/sep">
        <div className="w-[2px] h-8 rounded-full bg-gray-300 group-hover/sep:bg-blue-400 group-data-[separator=active]/sep:bg-blue-500 transition-colors" />
      </Separator>

      <Panel
        defaultSize={35}
        minSize={20}
        maxSize={55}
        collapsible
        panelRef={chatPanelRef}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <PanelHeader icon={MessageSquare} title="AI 写作助手" panelRef={chatPanelRef} />
          <div className="flex-1 overflow-y-auto">
            <AIChatDialog editorRef={editorRef} hideHeader />
          </div>
        </div>
      </Panel>

      <Separator className="w-2 flex items-center justify-center group/sep">
        <div className="w-[2px] h-8 rounded-full bg-gray-300 group-hover/sep:bg-blue-400 group-data-[separator=active]/sep:bg-blue-500 transition-colors" />
      </Separator>

      <Panel
        defaultSize={35}
        minSize={25}
        maxSize={60}
        collapsible
        panelRef={editorPanelRef}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <PanelHeader icon={FileText} title="编辑器" panelRef={editorPanelRef} />
          <NotebookEditor editorRef={editorRef} />
        </div>
      </Panel>
    </Group>
  );
}
