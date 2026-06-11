import { useAppStore } from '../../stores/appStore';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Annotation {
  id: number;
  literature_id: number;
  page: number;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  color: string;
  type: 'highlight' | 'note' | 'underline';
  text: string | null;
  note: string | null;
  tags?: { id: number; name: string; color: string }[];
  literature?: {
    id: number;
    title: string | null;
    authors: string | null;
  };
}

export function AnnotationList() {
  const { 
    annotations, 
    fetchAnnotationsByTags,
    setSelectedLiterature,
    setCurrentPage,
    selectedLiterature
  } = useAppStore();
  
  const [selectedTag, setSelectedTag] = useState<number | null>(null);
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND');

  const groupedAnnotations = annotations.reduce((acc, annotation) => {
    if (!annotation.tags) return acc;
    
    annotation.tags.forEach(tag => {
      if (!acc[tag.id]) {
        acc[tag.id] = {
          tag,
          annotations: []
        };
      }
      acc[tag.id]!.annotations.push(annotation);
    });
    
    return acc;
  }, {} as Record<number, { tag: { id: number; name: string; color: string }; annotations: Annotation[] }>);

  const handleTagClick = (tagId: number) => {
    setSelectedTag(selectedTag === tagId ? null : tagId);
    if (selectedTag !== tagId) {
      fetchAnnotationsByTags([tagId], filterLogic);
    }
  };

  const handleAnnotationClick = (annotation: Annotation) => {
    if (annotation.literature && annotation.literature.id !== selectedLiterature()?.id) {
      setSelectedLiterature(annotation.literature.id);
      setCurrentPage(annotation.page);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">标注列表</h3>
          
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">筛选逻辑:</span>
              <button
                onClick={() => setFilterLogic('AND')}
                className={`px-3 py-1 text-sm rounded-md ${
                  filterLogic === 'AND'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                AND
              </button>
              <button
                onClick={() => setFilterLogic('OR')}
                className={`px-3 py-1 text-sm rounded-md ${
                  filterLogic === 'OR'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                OR
              </button>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          {Object.values(groupedAnnotations).map(({ tag, annotations }) => (
            <div key={tag.id} className="bg-white rounded-lg shadow-sm">
              <div
                className="flex items-center justify-between p-3 border-b border-gray-200 cursor-pointer"
                onClick={() => handleTagClick(tag.id)}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="font-medium text-gray-900">{tag.name}</span>
                  <span className="text-sm text-gray-500">
                    ({annotations.length} 个标注)
                  </span>
                </div>
                {selectedTag === tag.id ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
              
              {selectedTag === tag.id && (
                <div className="p-3 space-y-2">
                  {annotations.map(annotation => (
                    <div
                      key={annotation.id}
                      className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleAnnotationClick(annotation)}
                    >
                      <div className="flex items-start space-x-3">
<div
                           className="w-2 h-2 rounded-full mt-2"
                           style={{ backgroundColor: annotation.tags?.[0]?.color || annotation.color }}
                         />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">
                            {annotation.text || '无文本'}
                          </p>
                          {annotation.note && (
                            <p className="text-xs text-gray-500 mt-1">
                              {annotation.note}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs text-gray-500">
                              {annotation.literature?.title || '未知文献'}
                            </span>
                            <span className="text-xs text-gray-400">
                              第 {annotation.page} 页
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}