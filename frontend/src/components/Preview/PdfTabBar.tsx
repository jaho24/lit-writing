import { useAppStore } from '../../stores/appStore';
import { X, FileText } from 'lucide-react';

export function PdfTabBar() {
  const openTabs = useAppStore(s => s.openTabs);
  const activeTabId = useAppStore(s => s.activeTabId);
  const setActiveTabId = useAppStore(s => s.setActiveTabId);
  const closeTab = useAppStore(s => s.closeTab);

  if (openTabs.length === 0) return null;

  return (
    <div
      className="flex items-end border-b"
      style={{ background: '#f5f5f5', borderColor: '#e0e0e0', minHeight: '34px' }}
    >
      {openTabs.map(tab => {
        const isActive = tab.literatureId === activeTabId;
        return (
          <div
            key={tab.literatureId}
            className="flex items-center cursor-pointer select-none group"
            style={{
              maxWidth: '180px',
              minWidth: '100px',
              padding: '6px 10px',
              borderRight: '1px solid #e0e0e0',
              background: isActive ? '#ffffff' : '#f5f5f5',
              borderBottom: isActive ? '2px solid #2D6DA4' : '2px solid transparent',
              marginBottom: '-1px',
              position: 'relative',
            }}
            onClick={() => setActiveTabId(tab.literatureId)}
          >
            <FileText
              className="flex-shrink-0"
              style={{ width: '14px', height: '14px', color: isActive ? '#2D6DA4' : '#999', marginRight: '6px' }}
            />
            <span
              className="truncate flex-1"
              style={{
                fontSize: '12px',
                color: isActive ? '#1a1a1a' : '#666',
                fontWeight: isActive ? 500 : 400,
                lineHeight: '18px',
              }}
              title={tab.title}
            >
              {tab.title || '无标题'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.literatureId);
              }}
              className="flex-shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity"
              style={{ marginLeft: '4px', lineHeight: 0 }}
            >
              <X style={{ width: '12px', height: '12px', color: '#999' }} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
