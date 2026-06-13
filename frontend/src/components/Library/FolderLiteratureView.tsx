import { useAppStore } from '../../stores/appStore';
import { useState } from 'react';
import { Star, StarOff, FolderInput, Trash2, Search, BookOpen } from 'lucide-react';

interface FolderLiteratureViewProps {
  onDoubleClick: (id: number, title: string) => void;
}

export function FolderLiteratureView({ onDoubleClick }: FolderLiteratureViewProps) {
  const {
    literature,
    libraries,
    selectedFolderId,
    selectedLiteratureId,
    selectLiterature,
    toggleLiteratureStar,
    deleteLiterature,
    assignLiteratureToFolder,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [movingLiteratureId, setMovingLiteratureId] = useState<number | null>(null);

  const filteredLiterature = (() => {
    let items = selectedFolderId === null
      ? literature
      : literature.filter(l => l.library_id === selectedFolderId);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(l =>
        (l.title?.toLowerCase().includes(q)) ||
        (l.authors?.toLowerCase().includes(q)) ||
        (l.year?.toString().includes(q)) ||
        (l.journal?.toLowerCase().includes(q))
      );
    }
    return items;
  })();

  const folderName = selectedFolderId === null
    ? '全部文献'
    : libraries.find(l => l.id === selectedFolderId)?.name || '未知文件夹';

  const handleToggleStar = (id: number, isStarred: number) => {
    toggleLiteratureStar(id, isStarred === 0);
  };

  const handleAssignToFolder = async (libraryId: number | null) => {
    if (movingLiteratureId !== null) {
      await assignLiteratureToFolder(movingLiteratureId, libraryId);
      setMovingLiteratureId(null);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">{folderName} ({filteredLiterature.length})</h2>
        <div className="relative w-48">
          <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {movingLiteratureId !== null && (
        <div className="mb-4 border border-blue-200 bg-blue-50 p-3 rounded">
          <div className="text-xs font-medium text-blue-700 mb-2">移动文献到文件夹：</div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => handleAssignToFolder(null)}
              className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-white"
            >
              未归档
            </button>
            {libraries.map(lib => (
              <button
                key={lib.id}
                onClick={() => handleAssignToFolder(lib.id)}
                className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-white flex items-center space-x-1"
              >
                <span>{lib.name}</span>
              </button>
            ))}
            <button
              onClick={() => setMovingLiteratureId(null)}
              className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 text-gray-500"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {filteredLiterature.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">{searchQuery.trim() ? '没有匹配的文献' : '此文件夹中没有文献'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredLiterature.map(item => {
            const isSelected = selectedLiteratureId === item.id;
            const isStarred = item.is_starred === 1;
            const isMovingItem = movingLiteratureId === item.id;

            return (
              <div
                key={item.id}
                draggable
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  isMovingItem
                    ? 'border-blue-400 bg-blue-50'
                    : isSelected
                      ? 'border-blue-300 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
                onClick={() => {
                  if (movingLiteratureId !== null) return;
                  selectLiterature(item.id);
                }}
                onDoubleClick={() => onDoubleClick(item.id, item.title || '无标题')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {item.title || '无标题'}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                      <span>{item.authors || '未知作者'}</span>
                      {item.year && <span>· {item.year}</span>}
                      {item.journal && <span>· {item.journal}</span>}
                    </div>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map(tag => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px]"
                            style={{ backgroundColor: tag.color + '20', color: tag.color }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                            <span>{tag.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStar(item.id, isStarred ? 1 : 0);
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {isStarred ? (
                        <Star className="w-4 h-4 text-amber-500 fill-current" />
                      ) : (
                        <StarOff className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMovingLiteratureId(item.id);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded"
                      title="移动到文件夹"
                    >
                      <FolderInput className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLiterature(item.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
