import { useAppStore } from '../../stores/appStore';
import { useState } from 'react';
import { Folder, Plus, Edit3, Inbox } from 'lucide-react';

export function FolderSidebar() {
  const {
    libraries,
    literature,
    selectedFolderId,
    selectFolder,
    createLibrary,
    renameLibrary,
  } = useAppStore();

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createLibrary(newFolderName.trim());
      setNewFolderName('');
      setCreatingFolder(false);
    }
  };

  const handleStartRename = (libraryId: number, currentName: string) => {
    setRenamingFolderId(libraryId);
    setRenameInputValue(currentName);
  };

  const handleConfirmRename = async () => {
    if (renamingFolderId !== null && renameInputValue.trim()) {
      await renameLibrary(renamingFolderId, renameInputValue.trim());
      setRenamingFolderId(null);
      setRenameInputValue('');
    }
  };

  const handleCancelRename = () => {
    setRenamingFolderId(null);
    setRenameInputValue('');
  };

  const getFolderCount = (libraryId: number) => {
    return literature.filter(l => l.library_id === libraryId).length;
  };

  return (
    <div className="flex flex-col h-full bg-white border-r" style={{ borderColor: '#e0e0e0' }}>
      <div className="p-3 border-b" style={{ borderColor: '#e0e0e0' }}>
        <h2 className="text-xs font-semibold text-gray-700">文件夹</h2>
      </div>

      <div className="flex-1 overflow-auto py-1">
        <button
          onClick={() => selectFolder(null)}
          className={`w-full flex items-center space-x-2 px-3 py-1.5 text-left transition-colors ${
            selectedFolderId === null
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Inbox className="w-4 h-4" style={{ color: selectedFolderId === null ? '#2D6DA4' : '#999' }} />
          <span className="text-xs font-medium truncate">全部文献</span>
          <span className="text-[10px] ml-auto" style={{ color: '#999' }}>{literature.length}</span>
        </button>

        {libraries.map(lib => {
          const isSelected = selectedFolderId === lib.id;
          const isRenaming = renamingFolderId === lib.id;

          return (
            <div key={lib.id}>
              {isRenaming ? (
                <div className="flex items-center space-x-1 px-3 py-1.5">
                  <Folder className="w-4 h-4" style={{ color: '#2D6DA4' }} />
                  <input
                    type="text"
                    value={renameInputValue}
                    onChange={(e) => setRenameInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmRename();
                      if (e.key === 'Escape') handleCancelRename();
                    }}
                    onBlur={handleConfirmRename}
                    className="flex-1 px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  onClick={() => selectFolder(lib.id)}
                  className={`w-full group flex items-center space-x-2 px-3 py-1.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onDoubleClick={() => handleStartRename(lib.id, lib.name)}
                >
                  <Folder className="w-4 h-4" style={{ color: isSelected ? '#2D6DA4' : '#999' }} />
                  <span className="text-xs font-medium truncate">{lib.name}</span>
                  <span className="text-[10px] ml-auto" style={{ color: '#999' }}>{getFolderCount(lib.id)}</span>
                  {!isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(lib.id, lib.name);
                      }}
                      className="hidden group-hover:inline-flex p-0.5 text-gray-400 hover:text-gray-600 rounded"
                      title="重命名"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t p-2" style={{ borderColor: '#e0e0e0' }}>
        {creatingFolder ? (
          <div className="flex items-center space-x-1">
            <Folder className="w-3.5 h-3.5" style={{ color: '#2D6DA4' }} />
            <input
              type="text"
              placeholder="文件夹名称"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); }
              }}
              className="flex-1 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
              autoFocus
            />
          </div>
        ) : (
          <button
            onClick={() => setCreatingFolder(true)}
            className="w-full flex items-center justify-center space-x-1 px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建文件夹</span>
          </button>
        )}
      </div>
    </div>
  );
}
