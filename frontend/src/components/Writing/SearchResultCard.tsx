import { Tag, SearchResultItem } from '../../types';
import { TagPill } from '../Common/TagPill';
import { Check } from 'lucide-react';

interface SearchResultCardProps {
  item: SearchResultItem;
  isSelected: boolean;
  onToggle: (id: number) => void;
}

export function SearchResultCard({ item, isSelected, onToggle }: SearchResultCardProps) {
  const renderWithHighlights = (text: string, ranges: [number, number][]): React.ReactNode => {
    if (!ranges || ranges.length === 0) return text;
    const parts: React.ReactNode[] = [];
    let last = 0;
    for (const [start, end] of ranges) {
      if (start > last) parts.push(text.substring(last, start));
      parts.push(
        <mark key={start} className="bg-yellow-200 rounded px-0.5">
          {text.substring(start, end)}
        </mark>
      );
      last = end;
    }
    if (last < text.length) parts.push(text.substring(last));
    return parts;
  };

  return (
    <div
      className={`flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-all border ${
        isSelected
          ? 'border-blue-400 bg-blue-50/80 shadow-sm'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
      }`}
      onClick={() => onToggle(item.id)}
    >
      <div
        className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          isSelected
            ? 'bg-blue-500 border-blue-500'
            : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
              item.type === 'annotation'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {item.type === 'annotation' ? '标注' : '文献'}
          </span>
          <span className="text-xs font-medium text-gray-800 truncate">{item.title}</span>
        </div>

        <div className="text-[11px] text-gray-500 mb-1">
          {item.type === 'literature' ? (
            <>
              {item.authors && <span>{item.authors}</span>}
              {item.year && <span> ({item.year})</span>}
              {item.journal && <span>, {item.journal}</span>}
            </>
          ) : (
            <span>文献 ID: {item.literatureId}</span>
          )}
        </div>

        {item.excerpt && (
          <div className="text-xs text-gray-600 mb-1.5 line-clamp-2">
            {renderWithHighlights(item.excerpt, item.highlightRanges)}
          </div>
        )}

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag: Tag) => (
              <TagPill key={tag.id} tag={tag} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
