import { useAppStore } from '../../stores/appStore';
import { useState } from 'react';
import { Search, Star, StarOff, Flag, Trash2, ArrowUpDown, FileText, ChevronRight, Folder } from 'lucide-react';

interface Literature {
  id: number;
  title: string | null;
  authors: string | null;
  year: number | null;
  journal: string | null;
  doi: string | null;
  file_path: string;
  file_name: string;
  library_id: number | null;
  added_at: string;
  is_starred: number;
  priority: number;
}

interface LiteratureListProps {
  onContextMenu?: (e: React.MouseEvent, target: 'literature' | 'tag', id: number | null) => void;
  onDoubleClick?: (id: number, title: string) => void;
}

export function LiteratureList({ onContextMenu, onDoubleClick }: LiteratureListProps) {
const { 
    literature, 
    selectedLiteratureId, 
    selectLiterature, 
    searchLiterature,
    toggleLiteratureStar,
    setLiteraturePriority,
    deleteLiterature,
    annotations,
    libraries,
    selectedLibraryId
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Literature | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc'
  });
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchLiterature(query);
  };

  const handleSort = (key: keyof Literature) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Literature) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-3 h-3 text-zotero-text-secondary" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUpDown className="w-3 h-3 text-zotero-text" />
    ) : (
      <ArrowUpDown className="w-3 h-3 text-zotero-text" />
    );
  };

  const getTagsForLiterature = (literatureId: number) => {
    const lit = literature.find(l => l.id === literatureId);
    if (lit?.tags && lit.tags.length > 0) {
      const names = lit.tags.map(t => t.name);
      const colors: Record<string, string> = {};
      lit.tags.forEach(t => { colors[t.name] = t.color; });
      return { names, colors };
    }
    const literatureAnnotations = annotations.filter(a => a.literature_id === literatureId);
    const tagNames: string[] = [];
    const tagColors: Record<string, string> = {};
    literatureAnnotations.forEach(a => {
      if (a.tags) {
        a.tags.forEach(t => {
          if (!tagNames.includes(t.name)) {
            tagNames.push(t.name);
            tagColors[t.name] = t.color;
          }
        });
      }
    });
    return { names: tagNames, colors: tagColors };
  };

  const handleToggleStar = (id: number, isStarred: number) => {
    toggleLiteratureStar(id, isStarred === 0);
  };

  const handlePriorityCycle = (id: number, currentPriority: number) => {
    const nextPriority = ((currentPriority + 1) % 3) as 0 | 1 | 2;
    setLiteraturePriority(id, nextPriority);
  };

  const handleDelete = (id: number) => {
    deleteLiterature(id);
  };

  const sortedLiterature = [...literature].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return sortConfig.direction === 'asc' ? 1 : -1;
    if (bValue === null) return sortConfig.direction === 'asc' ? -1 : 1;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' 
        ? aValue - bValue
        : bValue - aValue;
    }
    
    return 0;
  });

  const selectedLib = libraries.find(l => l.id === selectedLibraryId);
  const childLibs = selectedLib ? libraries.filter(l => l.parent_id === selectedLibraryId) : [];
  const showGroups = childLibs.length > 0;

  const groupedLiterature = showGroups ? (() => {
    const groups: { libraryId: number | null; name: string; items: typeof sortedLiterature }[] = [];
    for (const child of childLibs) {
      const items = sortedLiterature.filter(lit => lit.library_id === child.id);
      if (items.length > 0) {
        groups.push({ libraryId: child.id, name: child.name, items });
      }
    }
    const unassigned = sortedLiterature.filter(lit => !childLibs.some(c => c.id === lit.library_id));
    if (unassigned.length > 0) {
      groups.push({ libraryId: null, name: '未分类', items: unassigned });
    }
    if (groups.length === 0) {
      groups.push({ libraryId: null, name: '', items: sortedLiterature });
    }
    return groups;
  })() : [{ libraryId: null, name: '', items: sortedLiterature }];

  const toggleGroup = (libId: number | null) => {
    setCollapsedGroups(prev => {
      const key = libId ?? -1;
      const newSet = new Set(prev);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      return newSet;
    });
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-2 border-b border-zotero-border">
        <div className="relative">
          <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-zotero-text-secondary" />
          <input
            type="text"
            placeholder="搜索文献..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-zotero-border rounded text-acad focus:outline-none focus:ring-1 focus:ring-zotero-blue focus:border-zotero-blue text-acad"
          />
        </div>
      </div>
      
      <div className="overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zotero-border">
              <th 
                className="text-left py-1 px-2 text-acad-sm text-zotero-text-secondary cursor-pointer hover:bg-zotero-hover-bg"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center space-x-1">
                  <span>标题</span>
                  {getSortIcon('title')}
                </div>
              </th>
              <th 
                className="text-left py-1 px-2 text-acad-sm text-zotero-text-secondary cursor-pointer hover:bg-zotero-hover-bg"
                onClick={() => handleSort('authors')}
              >
                <div className="flex items-center space-x-1">
                  <span>作者</span>
                  {getSortIcon('authors')}
                </div>
              </th>
              <th 
                className="text-left py-1 px-2 text-acad-sm text-zotero-text-secondary cursor-pointer hover:bg-zotero-hover-bg"
                onClick={() => handleSort('year')}
              >
                <div className="flex items-center space-x-1">
                  <span>年份</span>
                  {getSortIcon('year')}
                </div>
              </th>
              <th 
                className="text-left py-1 px-2 text-acad-sm text-zotero-text-secondary cursor-pointer hover:bg-zotero-hover-bg"
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center space-x-1">
                  <span>标签</span>
                  {getSortIcon('priority')}
                </div>
              </th>
              <th className="text-center py-1 px-2 text-acad-sm text-zotero-text-secondary w-12">
                <Star className="w-3.5 h-3.5 text-zotero-text-secondary" />
              </th>
              <th className="text-center py-1 px-2 text-acad-sm text-zotero-text-secondary w-12">
                <Flag className="w-3.5 h-3.5 text-zotero-text-secondary" />
              </th>
            </tr>
          </thead>
          <tbody>
            {groupedLiterature.flatMap(group => {
              const groupKey = group.libraryId ?? -1;
              const isCollapsed = collapsedGroups.has(groupKey);
              const groupRows = [];

              if (showGroups && group.name) {
                groupRows.push(
                  <tr
                    key={`group-${groupKey}`}
                    className="cursor-pointer select-none"
                    onClick={() => toggleGroup(group.libraryId)}
                    style={{ background: '#f5f5f5' }}
                  >
                    <td colSpan={5} className="py-1.5 px-2">
                      <div className="flex items-center space-x-1.5">
                        <ChevronRight
                          className="w-3.5 h-3.5 transition-transform"
                          style={{ color: '#666', transform: isCollapsed ? '' : 'rotate(90deg)' }}
                        />
                        <Folder className="w-3.5 h-3.5" style={{ color: '#2D6DA4' }} />
                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#1a1a1a' }}>{group.name}</span>
                        <span style={{ fontSize: '11px', color: '#999' }}>({group.items.length})</span>
                      </div>
                    </td>
                  </tr>
                );
              }

              if (!isCollapsed || !showGroups) {
                group.items.forEach(item => {
                  const isSelected = selectedLiteratureId === item.id;
                  const isStarred = item.is_starred === 1;
                  const { names: tagsForItem, colors: tagColors } = getTagsForLiterature(item.id);

                  groupRows.push(
                    <tr
                      key={item.id}
                      className={`cursor-pointer transition-all duration-150 py-1 px-2 text-acad ${
                        isSelected
                          ? 'bg-zotero-selected-bg border-l-2 border-zotero-blue'
                          : hoveredRow === item.id
                            ? 'bg-zotero-hover-bg'
                            : ''
                      }`}
                      style={{ height: '32px' }}
                      onClick={() => selectLiterature(item.id)}
                      onMouseEnter={() => setHoveredRow(item.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, 'literature', item.id); }}
                      onDoubleClick={() => onDoubleClick?.(item.id, item.title || '无标题')}
                    >
                      <td className="py-1 px-2 truncate">
                        <div className="flex items-center">
                          <div className={`w-1 h-full mr-2 ${
                            item.priority === 0 ? '' :
                            item.priority === 1 ? 'bg-amber-400' : 'bg-red-500'
                          }`} />
                          <span className="truncate">{item.title || '无标题'}</span>
                        </div>
                      </td>
                      <td className="py-1 px-2 truncate text-zotero-text-secondary">
                        {item.authors || '未知'}
                      </td>
                      <td className="py-1 px-2 text-zotero-text-secondary">
                        {item.year || '-'}
                      </td>
                      <td className="py-1 px-2">
                        {tagsForItem.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tagsForItem.map((tagName) => (
                              <span key={tagName} className="flex items-center space-x-0.5">
                                <span
                                  className="w-1.5 h-1.5 rounded-full inline-block"
                                  style={{ backgroundColor: tagColors[tagName] || '#6b7280' }}
                                />
                                <span className="text-[11px]" style={{ color: '#666' }}>{tagName}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px]" style={{ color: '#999' }}>—</span>
                        )}
                      </td>
                      <td className="py-1 px-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStar(item.id, isStarred ? 1 : 0);
                          }}
                          className="p-1 hover:bg-zotero-hover-bg rounded"
                        >
                          {isStarred ? (
                            <Star className="w-4 h-4 text-zotero-star fill-current" />
                          ) : (
                            <StarOff className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-1 px-2 text-center relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePriorityCycle(item.id, item.priority);
                          }}
                          className="p-1 hover:bg-zotero-hover-bg rounded"
                        >
                          <Flag className="w-4 h-4 text-zotero-text-secondary" />
                        </button>
                        {hoveredRow === item.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            className="absolute right-1 top-1 p-1 text-gray-500 hover:text-red-500 hover:bg-zotero-hover-bg rounded"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                });
              }

              return groupRows;
            })}
          </tbody>
        </table>
        
        {sortedLiterature.length === 0 && (
          <div className="text-center py-8 text-zotero-text-secondary">
            <FileText className="w-12 h-12 mx-auto mb-2 text-zotero-text-secondary" />
            <p className="text-acad">没有找到文献</p>
          </div>
        )}
      </div>
    </div>
  );
}