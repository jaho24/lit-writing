import { Annotation, Literature, Tag } from '../../types';
import { Check } from 'lucide-react';

interface AnnotationCardProps {
  annotation: Annotation;
  literature: Literature | undefined;
  annotationTags: Tag[];
  isSelected: boolean;
  onToggle: (id: number) => void;
}

export function AnnotationCard({
  annotation,
  literature,
  annotationTags,
  isSelected,
  onToggle,
}: AnnotationCardProps) {
  return (
    <div
      className={`bg-white border rounded-lg p-3 transition-all cursor-pointer hover:shadow-md ${
        isSelected ? 'border-blue-400' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start space-x-3">
        <button
          onClick={() => onToggle(annotation.id)}
          className={`mt-1 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-blue-500 border-blue-500'
              : 'border-gray-300 hover:border-blue-400'
          }`}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          {annotation.text && (
            <div className="text-sm text-gray-900 mb-1 line-clamp-3">
              {annotation.text}
            </div>
          )}

          {annotation.note && (
            <div className="text-sm italic text-gray-600 mb-2">
              {annotation.note}
            </div>
          )}

          {literature && (
            <div className="text-xs text-gray-500 mb-2">
              {literature.title} ({literature.authors}) {literature.year}
            </div>
          )}

          {annotationTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {annotationTags.map(tag => (
                <span
                  key={tag.id}
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: tag.color + '20',
                    color: tag.color,
                    border: `1px solid ${tag.color}40`,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}