import { useAppStore } from '../../stores/appStore';
import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';

interface Annotation {
  id: number;
  literature_id: number;
  page: number;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  color: string;
  type: 'highlight' | 'note';
  text: string | null;
  note: string | null;
  tags?: { id: number; name: string; color: string }[];
  literature?: {
    id: number;
    title: string | null;
    authors: string | null;
  };
}

export function AnnotationPopup({ annotation, onClose }: { annotation: Annotation | null; onClose: () => void }) {
  const { 
    updateAnnotation, 
    setAnnotationTags, 
    deleteAnnotation 
  } = useAppStore();
  
  const [note, setNote] = useState(annotation?.note || '');
  const [selectedTags, setSelectedTags] = useState<number[]>(annotation?.tags?.map(t => t.id) || []);

  useEffect(() => {
    if (annotation) {
      setNote(annotation.note || '');
      setSelectedTags(annotation.tags?.map(t => t.id) || []);
    }
  }, [annotation]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    if (annotation) {
      updateAnnotation(annotation.id, { note: e.target.value });
    }
  };

  const handleTagToggle = (tagId: number) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(newSelectedTags);
    if (annotation) {
      setAnnotationTags(annotation.id, newSelectedTags);
    }
  };

  const handleDelete = () => {
    if (annotation) {
      deleteAnnotation(annotation.id);
      onClose();
    }
  };

  if (!annotation) {
    return null;
  }

  return (
    <div className="annotation-popup">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">标注详情</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">原文</h4>
          <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">
            {annotation.text || '无文本'}
          </p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">笔记</h4>
          <textarea
            value={note}
            onChange={handleNoteChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="添加笔记..."
          />
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">标签</h4>
          <div className="flex flex-wrap gap-2">
            {annotation.tags?.map(tag => (
              <button
                key={tag.id}
                onClick={() => handleTagToggle(tag.id)}
                className={`px-3 py-1 text-xs rounded-full flex items-center space-x-1 ${
                  selectedTags.includes(tag.id)
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span>{tag.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">来源文献</h4>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm font-medium text-gray-900">
              {annotation.literature?.title || '未知标题'}
            </p>
            <p className="text-sm text-gray-600">
              {annotation.literature?.authors || '未知作者'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              第 {annotation.page} 页
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 mt-6">
        <button
          onClick={handleDelete}
          className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>删除</span>
        </button>
      </div>
    </div>
  );
}