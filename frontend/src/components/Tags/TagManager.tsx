import { useAppStore } from '../../stores/appStore';
import { useState } from 'react';
import { Plus, X, Edit2, Trash2, ChevronRight, ChevronDown, Palette } from 'lucide-react';

interface Tag {
  id: number;
  name: string;
  color: string;
  description: string | null;
  parent_id: number | null;
  annotation_count?: number;
}

interface TreeNode {
  tag: Tag;
  children: TreeNode[];
}

interface TagManagerProps {
  onTagClick?: (tagId: number) => void;
  selectedTagId?: number | null;
}

export function TagManager({ onTagClick, selectedTagId }: TagManagerProps) {
  const { tags, createTag, updateTag, deleteTag } = useAppStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [localSelectedTagId, setLocalSelectedTagId] = useState<number | null>(null);

  const activeTagId = selectedTagId ?? localSelectedTagId;
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [newTagParentId, setNewTagParentId] = useState<number | null>(null);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [editingTagColor, setEditingTagColor] = useState('');

  const presetColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#84CC16'
  ];

  // Build tree structure from flat tags
  const buildTree = (tags: Tag[]): TreeNode[] => {
    const tagMap = new Map<number, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Create nodes for all tags
    tags.forEach(tag => {
      tagMap.set(tag.id, { tag, children: [] });
    });

    // Build hierarchy
    tags.forEach(tag => {
      const node = tagMap.get(tag.id)!;
      if (tag.parent_id === null) {
        rootNodes.push(node);
      } else {
        const parent = tagMap.get(tag.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    return rootNodes;
  };

  const treeData = buildTree(tags);

  const toggleExpand = (tagId: number) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  };

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      createTag(newTagName.trim(), newTagColor, undefined, newTagParentId);
      setNewTagName('');
      setNewTagColor('#3B82F6');
      setNewTagParentId(null);
      setShowCreateDialog(false);
    }
  };

  const handleEditTag = () => {
    if (editingTag && editingTagName.trim()) {
      updateTag(editingTag.id, editingTagName.trim(), editingTagColor, editingTag.description ?? undefined);
      setEditingTag(null);
      setShowEditDialog(false);
    }
  };

  const handleDeleteTag = (tagId: number) => {
    deleteTag(tagId);
  };

  const handleTagClick = (tagId: number) => {
    if (onTagClick) {
      onTagClick(tagId);
    }
    setLocalSelectedTagId(tagId === activeTagId ? null : tagId);
      onTagClick?.(tagId);
  };

  const TreeNode: React.FC<{ node: TreeNode; level: number }> = ({ node, level }) => {
    const isExpanded = expandedNodes.has(node.tag.id);
    const hasChildren = node.children.length > 0;
    const isHovered = hoveredNode === node.tag.id;
    const isSelected = activeTagId === node.tag.id;

    return (
      <div className="select-none">
        <div
          className={`flex items-center justify-between py-1 px-2 cursor-pointer transition-colors ${
            level > 0 ? 'ml-3' : ''
          } ${isSelected ? 'bg-zotero-selected-bg' : ''}`}
          onMouseEnter={() => setHoveredNode(node.tag.id)}
          onMouseLeave={() => setHoveredNode(null)}
          onClick={() => handleTagClick(node.tag.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.tag.id);
                }}
                className="p-1 hover:bg-zotero-hover-bg rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-zotero-text-tertiary" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zotero-text-tertiary" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-6" />}
            
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: node.tag.color }}
            />
            
            <span className="text-acad-sm text-zotero-text truncate flex-1">
              {node.tag.name}
            </span>
            
            {node.tag.annotation_count && (
              <span className="text-acad-xs text-zotero-text-tertiary">
                {node.tag.annotation_count}
              </span>
            )}
          </div>
          
          {isHovered && (
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTag(node.tag);
                  setEditingTagName(node.tag.name);
                  setEditingTagColor(node.tag.color);
                  setShowEditDialog(true);
                }}
                className="p-1 hover:bg-zotero-hover-bg rounded"
              >
                <Edit2 className="w-3 h-3 text-zotero-text-tertiary hover:text-zotero-text" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTag(node.tag.id);
                }}
                className="p-1 hover:bg-zotero-hover-bg rounded"
              >
                <Trash2 className="w-3 h-3 text-zotero-text-tertiary hover:text-zotero-text" />
              </button>
              
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNewTagParentId(node.tag.id);
                    setNewTagName('');
                    setNewTagColor('#3B82F6');
                    setShowCreateDialog(true);
                  }}
                  className="p-1 hover:bg-zotero-hover-bg rounded"
                >
                  <Plus className="w-3 h-3 text-zotero-text-tertiary hover:text-zotero-text" />
                </button>
              )}
            </div>
          )}
        </div>
        
        {isExpanded && hasChildren && (
          <div className="ml-3">
            {node.children.map(child => (
              <TreeNode key={child.tag.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-acad-sm font-semibold text-zotero-text-secondary">标签</h3>
        <button
          onClick={() => {
            setNewTagParentId(null);
            setNewTagName('');
            setNewTagColor('#3B82F6');
            setShowCreateDialog(true);
          }}
          className="p-1 hover:bg-zotero-hover-bg rounded-md"
        >
          <Plus className="w-4 h-4 text-zotero-text-secondary hover:text-zotero-text" />
        </button>
      </div>
      
      <div className="space-y-1">
        {treeData.length === 0 ? (
          <div className="text-center py-8 text-zotero-text-tertiary text-acad-sm">
            暂无标签，点击 + 创建
          </div>
        ) : (
          treeData.map(node => (
            <TreeNode key={node.tag.id} node={node} level={0} />
          ))
        )}
      </div>
      
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-4 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">新建标签</h3>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="text-zotero-text-tertiary hover:text-zotero-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zotero-text mb-1">
                  标签名称
                </label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full px-3 py-2 border border-zotero-border rounded-md focus:outline-none focus:ring-2 focus:ring-zotero-blue"
                  placeholder="输入标签名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zotero-text mb-2">
                  标签颜色
                </label>
                <div className="flex items-center space-x-2">
                  <Palette className="w-5 h-5 text-zotero-text-tertiary" />
                  <div className="flex space-x-1">
                    {presetColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          newTagColor === color ? 'border-zotero-text' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zotero-text mb-2">
                  父标签 (可选)
                </label>
                <select
                  value={newTagParentId || ''}
                  onChange={(e) => setNewTagParentId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-zotero-border rounded-md focus:outline-none focus:ring-2 focus:ring-zotero-blue"
                >
                  <option value="">无 (根标签)</option>
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 text-zotero-text hover:bg-zotero-hover-bg rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleCreateTag}
                className="px-4 py-2 bg-zotero-blue hover:bg-zotero-blue-hover text-white rounded-md"
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
                className="text-zotero-text-tertiary hover:text-zotero-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zotero-text mb-1">
                  标签名称
                </label>
                <input
                  type="text"
                  value={editingTagName}
                  onChange={(e) => setEditingTagName(e.target.value)}
                  className="w-full px-3 py-2 border border-zotero-border rounded-md focus:outline-none focus:ring-2 focus:ring-zotero-blue"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zotero-text mb-2">
                  标签颜色
                </label>
                <div className="flex items-center space-x-2">
                  <Palette className="w-5 h-5 text-zotero-text-tertiary" />
                  <div className="flex space-x-1">
                    {presetColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setEditingTagColor(color)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          editingTagColor === color ? 'border-zotero-text' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zotero-text mb-2">
                  描述 (可选)
                </label>
                <textarea
                  value={editingTag.description || ''}
                  onChange={(e) => setEditingTagColor(e.target.value)}
                  className="w-full px-3 py-2 border border-zotero-border rounded-md focus:outline-none focus:ring-2 focus:ring-zotero-blue"
                  rows={3}
                  placeholder="添加描述..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowEditDialog(false)}
                className="px-4 py-2 text-zotero-text hover:bg-zotero-hover-bg rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleEditTag}
                className="px-4 py-2 bg-zotero-blue hover:bg-zotero-blue-hover text-white rounded-md"
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