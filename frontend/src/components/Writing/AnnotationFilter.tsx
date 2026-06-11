import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { SearchResultCard } from './SearchResultCard';
import { Filter, X, ChevronDown, Search, CheckSquare, Square } from 'lucide-react';

interface AnnotationFilterProps {
  hideHeader?: boolean;
}

export function AnnotationFilter({ hideHeader }: AnnotationFilterProps) {
  const searchResults = useAppStore(s => s.searchResults);
  const selectedAnnotationIds = useAppStore(s => s.selectedAnnotationIds);
  const setSelectedAnnotationIds = useAppStore(s => s.setSelectedAnnotationIds);
  const tags = useAppStore(s => s.tags);
  const selectedWritingTags = useAppStore(s => s.selectedWritingTags);
  const setSelectedWritingTags = useAppStore(s => s.setSelectedWritingTags);
  const searchTagLogic = useAppStore(s => s.searchTagLogic);
  const setSearchTagLogic = useAppStore(s => s.setSearchTagLogic);
  const fetchTags = useAppStore(s => s.fetchTags);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    updatePosition();
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    const scrollHandler = () => updatePosition();
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', scrollHandler, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', scrollHandler, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [dropdownOpen, updatePosition]);

  const handleResultToggle = (resultId: number) => {
    const newIds = selectedAnnotationIds.includes(resultId)
      ? selectedAnnotationIds.filter(id => id !== resultId)
      : [...selectedAnnotationIds, resultId];
    setSelectedAnnotationIds(newIds);
  };

  const handleTagToggle = (tagId: number) => {
    const newSelected = selectedWritingTags.includes(tagId)
      ? selectedWritingTags.filter(id => id !== tagId)
      : [...selectedWritingTags, tagId];
    setSelectedWritingTags(newSelected);
  };

  const removeTag = (tagId: number) => {
    setSelectedWritingTags(selectedWritingTags.filter(id => id !== tagId));
  };

  const selectAll = () => {
    setSelectedAnnotationIds(searchResults.map(r => r.id));
  };

  const deselectAll = () => {
    setSelectedAnnotationIds([]);
  };

  const isAllSelected = searchResults.length > 0 && selectedAnnotationIds.length === searchResults.length;
  const isPartialSelected = selectedAnnotationIds.length > 0 && !isAllSelected;

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const selectedTagObjects = tags.filter(t => selectedWritingTags.includes(t.id));

  return (
    <div className="flex flex-col h-full bg-white">
      {!hideHeader && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-medium text-gray-900">标注筛选</h2>
          </div>
        </div>
      )}

      <div className="p-3 space-y-2 flex-shrink-0">
        <button
          ref={triggerRef}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 transition-colors"
        >
          <span className="text-gray-500 truncate">
            {selectedWritingTags.length === 0
              ? '选择标签筛选...'
              : `已选 ${selectedWritingTags.length} 个标签`}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {selectedTagObjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedTagObjects.map(tag => (
              <span
                key={tag.id}
                className="inline-flex items-center space-x-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                <span>{tag.name}</span>
                <button onClick={() => removeTag(tag.id)} className="p-0.5 rounded-full hover:bg-white/30 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={() => setSearchTagLogic(searchTagLogic === 'AND' ? 'OR' : 'AND')}
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                searchTagLogic === 'AND'
                  ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              {searchTagLogic}
            </button>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {searchResults.length} 条结果 · 已选 {selectedAnnotationIds.length}
            </span>
            <div className="flex items-center space-x-1">
              {isAllSelected || isPartialSelected ? (
                <button
                  onClick={deselectAll}
                  className="text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100 transition-colors flex items-center space-x-1"
                >
                  <Square className="w-3 h-3" />
                  <span>取消全选</span>
                </button>
              ) : (
                <button
                  onClick={selectAll}
                  className="text-xs px-2 py-1 rounded text-blue-600 hover:bg-blue-50 transition-colors flex items-center space-x-1"
                >
                  <CheckSquare className="w-3 h-3" />
                  <span>全选</span>
                </button>
              )}
            </div>
          </div>
        )}

        {searchResults.length === 0 && selectedWritingTags.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-2">选择标签以开始搜索</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 min-h-0">
        {searchResults.map(result => (
          <SearchResultCard
            key={`${result.type}-${result.id}`}
            item={result}
            isSelected={selectedAnnotationIds.includes(result.id)}
            onToggle={handleResultToggle}
          />
        ))}
      </div>

      {dropdownOpen && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, maxHeight: '280px' }}
        >
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索标签..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                autoFocus
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-48 p-1">
            {filteredTags.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-3">无匹配标签</div>
            ) : (
              filteredTags.map(tag => {
                const isTagSelected = selectedWritingTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                    className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50 transition-colors text-left"
                  >
                    <span
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isTagSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}
                    >
                      {isTagSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </span>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="text-gray-700 truncate">{tag.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}