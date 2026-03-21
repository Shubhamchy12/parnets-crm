import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Per-column accent colors (index-based fallback)
const COL_ACCENTS = [
  { dot: '#3b82f6', bg: 'rgba(59,130,246,0.06)',  header: 'rgba(59,130,246,0.10)'  }, // blue
  { dot: '#f59e0b', bg: 'rgba(245,158,11,0.06)',  header: 'rgba(245,158,11,0.10)'  }, // amber
  { dot: '#f97316', bg: 'rgba(249,115,22,0.06)',  header: 'rgba(249,115,22,0.10)'  }, // orange
  { dot: '#8b5cf6', bg: 'rgba(139,92,246,0.06)',  header: 'rgba(139,92,246,0.10)'  }, // violet
  { dot: '#22c55e', bg: 'rgba(34,197,94,0.06)',   header: 'rgba(34,197,94,0.10)'   }, // green
  { dot: '#ef4444', bg: 'rgba(239,68,68,0.06)',   header: 'rgba(239,68,68,0.10)'   }, // red
];

const SortableCard = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
};

const KanbanBoard = ({ columns, onDragEnd, renderCard }) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ alignItems: 'flex-start' }}>
        {columns.map((col, idx) => {
          const accent = COL_ACCENTS[idx % COL_ACCENTS.length];
          return (
            <div
              key={col.id}
              className="flex-shrink-0 flex flex-col rounded-2xl overflow-hidden"
              style={{
                width: 260,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {/* Column header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ background: accent.header, borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: accent.dot }}
                  />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                    {col.title}
                  </span>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: accent.dot, color: '#fff', minWidth: 22, textAlign: 'center' }}
                >
                  {col.items.length}
                </span>
              </div>

              {/* Cards area */}
              <div
                className="flex-1 p-2 space-y-2 overflow-y-auto"
                style={{ minHeight: 180, maxHeight: 'calc(100vh - 260px)', background: accent.bg }}
              >
                <SortableContext
                  items={col.items.map(i => i._id || i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {col.items.map(item => (
                    <SortableCard key={item._id || item.id} id={item._id || item.id}>
                      {renderCard(item, col)}
                    </SortableCard>
                  ))}
                </SortableContext>

                {col.items.length === 0 && (
                  <div
                    className="flex items-center justify-center h-20 rounded-xl border-2 border-dashed text-xs"
                    style={{ borderColor: accent.dot + '40', color: 'var(--text-4)' }}
                  >
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
};

export default KanbanBoard;
