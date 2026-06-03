import { useAppStore } from '../../stores/appStore';
import { useState, useRef } from 'react';
import { FileText } from 'lucide-react';

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

export function AnnotationOverlay() {
  const { 
    selectedLiterature, 
    annotations
  } = useAppStore();
  
  const [hoveredAnnotation, setHoveredAnnotation] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pageAnnotations = annotations.filter(
    ann => ann.literature_id === selectedLiterature()?.id
  );

  const handleAnnotationClick = (annotation: Annotation) => {
    console.log('Annotation clicked:', annotation);
  };

  if (!selectedLiterature()) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>请选择一篇文献查看标注</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50" ref={containerRef}>
      {pageAnnotations.map(annotation => (
        <div
          key={annotation.id}
          className="annotation-highlight absolute cursor-pointer transition-opacity"
          style={{
            left: annotation.position_x ? `${annotation.position_x}px` : '0',
            top: annotation.position_y ? `${annotation.position_y}px` : '0',
            width: annotation.width ? `${annotation.width}px` : '100px',
            height: annotation.height ? `${annotation.height}px` : '20px',
            backgroundColor: annotation.color,
            opacity: hoveredAnnotation === annotation.id ? 0.5 : 0.3,
          }}
          onMouseEnter={() => setHoveredAnnotation(annotation.id)}
          onMouseLeave={() => setHoveredAnnotation(null)}
          onClick={() => handleAnnotationClick(annotation)}
        />
      ))}
    </div>
  );
}