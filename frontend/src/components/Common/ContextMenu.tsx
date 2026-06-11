import React, { useState, useEffect, useCallback, useRef } from 'react';

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const [position, setPosition] = useState({ x, y });
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position to prevent overflow
  useEffect(() => {
    const adjustPosition = () => {
      if (!menuRef.current) return;

      const menuWidth = menuRef.current.offsetWidth;
      const menuHeight = menuRef.current.offsetHeight;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let newX = x;
      let newY = y;

      // Adjust X position if menu would overflow right side
      if (x + menuWidth > windowWidth) {
        newX = windowWidth - menuWidth - 8; // 8px padding from edge
        newX = Math.max(8, newX); // Ensure menu doesn't go off left edge
      }

      // Adjust Y position if menu would overflow bottom
      if (y + menuHeight > windowHeight) {
        newY = windowHeight - menuHeight - 8; // 8px padding from bottom
        newY = Math.max(8, newY); // Ensure menu doesn't go off top edge
      }

      setPosition({ x: newX, y: newY });
    };

    adjustPosition();
  }, [x, y]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleItemClick = useCallback((item: ContextMenuItem) => {
    item.onClick();
    onClose();
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-white border border-zotero-border rounded-md shadow-md min-w-[160px] z-[1000]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
      }}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {item.separator ? (
            <div className="h-px bg-gray-200 mx-2 my-1" />
          ) : (
            <button
              onClick={() => handleItemClick(item)}
              className={`w-full text-left px-3 py-1.5 text-acad flex items-center hover:bg-zotero-hover-bg ${
                item.danger ? 'text-red-600' : ''
              }`}
            >
              {item.icon && (
                <span className="w-3.5 h-3.5 mr-2 flex items-center justify-center">
                  {item.icon}
                </span>
              )}
              <span>{item.label}</span>
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}