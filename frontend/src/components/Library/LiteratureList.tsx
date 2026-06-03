import { useAppStore } from '../../stores/appStore';
import { useState } from 'react';
import { Search, FileText, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

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
}

export function LiteratureList() {
  const { 
    literature, 
    selectedLiteratureId, 
    selectLiterature, 
    searchLiterature 
  } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Literature | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc'
  });

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

  const getSortIcon = (key: keyof Literature) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-gray-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-gray-600" />
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索文献..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th 
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center space-x-1">
                  <span>标题</span>
                  {getSortIcon('title')}
                </div>
              </th>
              <th 
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('authors')}
              >
                <div className="flex items-center space-x-1">
                  <span>作者</span>
                  {getSortIcon('authors')}
                </div>
              </th>
              <th 
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('year')}
              >
                <div className="flex items-center space-x-1">
                  <span>年份</span>
                  {getSortIcon('year')}
                </div>
              </th>
              <th 
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('journal')}
              >
                <div className="flex items-center space-x-1">
                  <span>期刊</span>
                  {getSortIcon('journal')}
                </div>
              </th>
              <th 
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('doi')}
              >
                <div className="flex items-center space-x-1">
                  <span>DOI</span>
                  {getSortIcon('doi')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedLiterature.map((item) => (
              <tr
                key={item.id}
                className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedLiteratureId === item.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => selectLiterature(item.id)}
              >
                <td className="px-3 py-2 text-sm text-gray-900 truncate">
                  {item.title || '无标题'}
                </td>
                <td className="px-3 py-2 text-sm text-gray-500 truncate">
                  {item.authors || '未知'}
                </td>
                <td className="px-3 py-2 text-sm text-gray-500">
                  {item.year || '-'}
                </td>
                <td className="px-3 py-2 text-sm text-gray-500 truncate">
                  {item.journal || '无期刊'}
                </td>
                <td className="px-3 py-2 text-sm text-gray-500 truncate">
                  {item.doi || '无DOI'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {sortedLiterature.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>没有找到文献</p>
          </div>
        )}
      </div>
    </div>
  );
}