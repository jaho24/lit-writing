import { useAppStore } from '../../stores/appStore';
import { useState } from 'react';
import { Plus, X, Edit2, Trash2, Palette } from 'lucide-react';

interface Tag {
  id: number;
  name: string;
  color: string;
  description: string | null;
  annotation_count?: number;
}

export function TagManager() {
  const { tags, createTag, updateTag, deleteTag } = useAppStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [editingTagColor, setEditingTagColor] = useState('');

  const presetColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#84CC16'
  ];

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      createTag(newTagName.trim(), newTagColor);
      setNewTagName('');
      setNewTagColor('#3B82F6');
      setShowCreateDialog(false);
    }
  };

  const handleEditTag = () => {
    if (editingTag && editingTagName.trim()) {
      updateTag(editingTag.id, editingTagName.trim(), editingTagColor);
      setEditingTag(null);
      setShowEditDialog(false);
    }
  };

  const handleDeleteTag = (tagId: number) => {
    deleteTag(tagId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">标签</h3>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="p-1 hover:bg-gray-100 rounded-md"
        >
          <Plus className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      
      <div className="space-y-2">
        {tags.map(tag => (
          <div
            key={tag.id}
            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer"
            onClick={() => {
              console.log('Tag clicked:', tag);
            }}
          >
            <div className="flex items-center space-x-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <span className="text-sm text-gray-700">{tag.name}</span>
              {tag.annotation_count && (
                <span className="text-xs text-gray-500">
                  ({tag.annotation_count})
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTag(tag);
                  setEditingTagName(tag.name);
                  setEditingTagColor(tag.color);
                  setShowEditDialog(true);
                }}
                className="p-1 hover:bg-gray-200 rounded-md"
              >
                <Edit2 className="w-3 h-3 text-gray-400" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTag(tag.id);
                }}
                className="p-1 hover:bg-gray-200 rounded-md"
              >
                <Trash2 className="w-3 h-3 text-gray-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-4 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">新建标签</h3>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标签名称
                </label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入标签名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标签颜色
                </label>
                <div className="flex items-center space-x-2">
                  <Palette className="w-5 h-5 text-gray-400" />
                  <div className="flex space-x-1">
                    {presetColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          newTagColor === color ? 'border-gray-400' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleCreateTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showEditDialog && editingTag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-4 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">编辑标签</h3>
              <button
                onClick={() => setShowEditDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标签名称
                </label>
                <input
                  type="text"
                  value={editingTagName}
                  onChange={(e) => setEditingTagName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标签颜色
                </label>
                <div className="flex items-center space-x-2">
                  <Palette className="w-5 h-5 text-gray-400" />
                  <div className="flex space-x-1">
                    {presetColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setEditingTagColor(color)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          editingTagColor === color ? 'border-gray-400' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowEditDialog(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleEditTag}
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