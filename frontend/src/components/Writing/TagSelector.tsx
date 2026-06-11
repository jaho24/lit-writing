import { useAppStore } from '../../stores/appStore';

interface TagSelectorProps {
  onToggleLogic: () => void;
}

export function TagSelector({ onToggleLogic }: TagSelectorProps) {
  const tags = useAppStore(s => s.tags);
  const selectedWritingTags = useAppStore(s => s.selectedWritingTags);
  const setSelectedWritingTags = useAppStore(s => s.setSelectedWritingTags);
  const searchTagLogic = useAppStore(s => s.searchTagLogic);

  const handleTagClick = (tagId: number) => {
    const newSelectedTags = selectedWritingTags.includes(tagId)
      ? selectedWritingTags.filter(id => id !== tagId)
      : [...selectedWritingTags, tagId];
    setSelectedWritingTags(newSelectedTags);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">标签筛选</h3>
        <button
          onClick={onToggleLogic}
          className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
            searchTagLogic === 'AND'
              ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
          }`}
        >
          {searchTagLogic}
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
        {tags.map(tag => {
          const isSelected = selectedWritingTags.includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => handleTagClick(tag.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                isSelected
                  ? 'text-white shadow-sm scale-105'
                  : 'text-gray-600 hover:text-gray-800 hover:shadow-sm'
              }`}
              style={{
                backgroundColor: isSelected ? tag.color : 'transparent',
                border: `1.5px solid ${tag.color}`,
              }}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
