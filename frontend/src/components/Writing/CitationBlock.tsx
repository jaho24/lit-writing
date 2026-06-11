import { CitationItem } from '../../types';
import { useAppStore } from '../../stores/appStore';

interface CitationBlockProps {
  citations: CitationItem[];
}

export function CitationBlock({ citations }: CitationBlockProps) {
  const openTab = useAppStore(s => s.openTab);

  if (!citations || citations.length === 0) return null;

  const handleClick = (literatureId: number, title: string) => {
    openTab(literatureId, title);
  };

  return (
    <div className="border-t border-gray-200 pt-3 mt-4">
      <h5 className="text-xs font-semibold text-gray-600 mb-2">参考文献</h5>
      <div className="space-y-1.5">
        {citations.map((c, idx) => (
          <div
            key={idx}
            className="flex items-start group cursor-pointer"
            onClick={() => handleClick(c.literature_id, c.title)}
          >
            <span className="text-xs text-blue-600 font-medium mr-1.5 flex-shrink-0">
              {c.marker}
            </span>
            <p className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
              {c.authors} ({c.year || 'n.d.'}). {c.title}.{' '}
              <em>{c.journal}</em>
              {c.doi ? `. DOI: ${c.doi}` : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}