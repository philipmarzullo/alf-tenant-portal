import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff } from 'lucide-react';

export default function DraggableWidget({
  id,
  isCustomizing,
  visible = true,
  label,
  onToggleVisible,
  onRenameLabel,
  children,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isCustomizing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!isCustomizing) {
    // Normal mode — render children with zero overhead
    if (!visible) return null;
    return <>{children}</>;
  }

  // Customize mode
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${
        isDragging ? 'z-50 opacity-75' : ''
      } ${
        !visible ? 'opacity-40' : ''
      }`}
    >
      {/* Customize overlay controls */}
      <div className="absolute -top-2 -left-2 -right-2 -bottom-2 border-2 border-dashed border-aa-blue/30 rounded-xl pointer-events-none" />

      <div className="absolute -top-3 left-2 right-2 flex items-center gap-1 z-10">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 bg-white border border-gray-200 rounded shadow-sm cursor-grab active:cursor-grabbing hover:bg-gray-50"
          title="Drag to reorder"
        >
          <GripVertical size={14} className="text-gray-400" />
        </button>

        {/* Inline label edit */}
        {onRenameLabel && (
          <input
            type="text"
            value={label || ''}
            onChange={(e) => onRenameLabel(e.target.value)}
            className="flex-1 text-xs font-medium text-dark-text bg-white border border-gray-200 rounded px-2 py-0.5 shadow-sm min-w-0"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Visibility toggle */}
        {onToggleVisible && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
            className="p-1 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50"
            title={visible ? 'Hide' : 'Show'}
          >
            {visible ? (
              <Eye size={14} className="text-gray-500" />
            ) : (
              <EyeOff size={14} className="text-gray-300" />
            )}
          </button>
        )}
      </div>

      <div className={isCustomizing ? 'pt-3' : ''}>
        {children}
      </div>
    </div>
  );
}
