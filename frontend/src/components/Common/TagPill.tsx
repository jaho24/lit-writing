import { Tag } from '../../types';

interface TagPillProps {
  tag: Tag;
}

export function TagPill({ tag }: TagPillProps) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: tag.color + '20',
        color: tag.color,
        border: `1px solid ${tag.color}40`,
      }}
    >
      {tag.name}
    </span>
  );
}