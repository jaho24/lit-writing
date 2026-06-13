import { useAppStore } from '../../stores/appStore';
import { useState, useRef, useEffect } from 'react';
import { Folder, FolderOpen, Plus, MoreVertical, ChevronRight, X } from 'lucide-react';

interface TreeNodeProps {
  library: Library;
  level: number;
  onSelect: (id: number | null) => void;
}

interface Library {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

export function LibraryTree() {
  const { libraries, createLibrary, deleteLibrary } = useAppStore();
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuTarget, setContextMenuTarget] = useState<Library | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameCollectionName, setRenameCollectionName] = useState('');
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const rootLibraries = libraries.filter(lib => lib.parent_id === null);
  const childLibraries = libraries.filter(lib => lib.parent_id !== null);

  const toggleExpand = (id: number) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, library: Library) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuTarget(library);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleCreateSubCollection = () => {
    if (contextMenuTarget && newCollectionName.trim()) {
      createLibrary(newCollectionName.trim(), contextMenuTarget.id);
      setNewCollectionName('');
      setShowCreateDialog(false);
      setShowContextMenu(false);
    }
  };

  const handleRenameCollection = () => {
    if (contextMenuTarget && renameCollectionName.trim()) {
      setRenameCollectionName('');
      setShowRenameDialog(false);
      setShowContextMenu(false);
    }
  };

  const handleDeleteCollection = () => {
    if (contextMenuTarget) {
      deleteLibrary(contextMenuTarget.id);
      setShowContextMenu(false);
    }
  };

  const TreeNode: React.FC<TreeNodeProps> = ({ library, level, onSelect }) => {
    const hasChildren = childLibraries.some(child => child.parent_id === library.id);
    const isExpanded = expandedNodes.has(library.id);
    const isSelected = false;

    return (
      <div>
        <div
          className={`flex items-center px-2 py-1 cursor-pointer rounded-md mx-1 transition-colors ${
            isSelected ? '' : ''
          }`}
          style={{
            paddingLeft: `${level * 16 + 8}px`,
            background: isSelected ? '#e8f0fe' : 'transparent',
            color: isSelected ? '#2D6DA4' : '#1a1a1a',
            fontSize: '13px',
          }}
          onClick={() => onSelect(library.id)}
          onContextMenu={(e) => handleContextMenu(e, library)}
        >
          <div className="flex items-center flex-1">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(library.id);
                }}
                className="mr-1 p-1 rounded"
                style={{ color: '#666' }}
              >
                {isExpanded ? (
                  <ChevronRight className="w-4 h-4 rotate-90" style={{ color: '#666' }} />
                ) : (
                  <ChevronRight className="w-4 h-4" style={{ color: '#666' }} />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-6" />}
            
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 mr-2" style={{ color: '#2D6DA4' }} />
              ) : (
                <Folder className="w-4 h-4 mr-2" style={{ color: '#2D6DA4' }} />
              )
            ) : (
              <Folder className="w-4 h-4 mr-2" style={{ color: '#999' }} />
            )}
            
            <span className="text-sm truncate">{library.name}</span>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowContextMenu(true);
              setContextMenuTarget(library);
              setContextMenuPosition({ x: e.clientX, y: e.clientY });
            }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {childLibraries
              .filter(child => child.parent_id === library.id)
              .map(child => (
                <TreeNode
                  key={child.id}
                  library={child}
                  level={level + 1}
                  onSelect={onSelect}
                />
              ))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      {rootLibraries.map(library => (
        <TreeNode
          key={library.id}
          library={library}
          level={0}
          onSelect={() => {}}
        />
      ))}
      
      <div className="p-2">
        <button
          onClick={() => setShowCreateDialog(true)}
          className="w-full flex items-center justify-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          新建收藏夹
        </button>
      </div>

      {showContextMenu && contextMenuTarget && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50"
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
        >
          <button
            onClick={handleCreateSubCollection}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            新建子收藏夹
          </button>
          <button
            onClick={() => {
              setRenameCollectionName(contextMenuTarget.name);
              setShowRenameDialog(true);
              setShowContextMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
          >
            重命名
          </button>
          <button
            onClick={handleDeleteCollection}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
          >
            删除
          </button>
        </div>
      )}

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-4 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">新建收藏夹</h3>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="收藏夹名称"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleCreateSubCollection}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenameDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-4 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">重命名收藏夹</h3>
              <button
                onClick={() => setShowRenameDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="收藏夹名称"
              value={renameCollectionName}
              onChange={(e) => setRenameCollectionName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowRenameDialog(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleRenameCollection}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}