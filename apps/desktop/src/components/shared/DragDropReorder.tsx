import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { memo, type ReactNode, useCallback } from "react";
import { cn } from "@/lib/utils";

type DragDropReorderProps<T> = {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  uniqueId: (item: T) => string;
};

function DragDropReorderInner<T>({
  items,
  onReorder,
  renderItem,
  uniqueId,
}: DragDropReorderProps<T>) {
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      if (result.source.index === result.destination.index) return;

      const reordered = Array.from(items);
      const removed = reordered.splice(result.source.index, 1)[0];
      if (removed === undefined) return;
      reordered.splice(result.destination.index, 0, removed);
      onReorder(reordered);
    },
    [items, onReorder],
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="droppable">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {items.map((item, index) => (
              <Draggable key={uniqueId(item)} draggableId={uniqueId(item)} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    style={provided.draggableProps.style}
                  >
                    <div
                      className={cn(
                        "group flex items-stretch rounded-[12px]",
                        snapshot.isDragging &&
                          "shadow-[0_8px_28px_-6px_rgba(0,0,0,0.15),0_0_0_1px_var(--border-subtle)]",
                        snapshot.dropAnimation &&
                          "transition-transform duration-[0.25s] ease-[cubic-bezier(0.22,1,0.36,1)]",
                      )}
                    >
                      <div
                        {...provided.dragHandleProps}
                        className={cn(
                          "flex w-7 shrink-0 cursor-grab items-center justify-center rounded-l-[12px] text-[var(--text-secondary)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-[var(--text-primary)] active:cursor-grabbing",
                          snapshot.isDragging && "opacity-100 text-[var(--text-primary)]",
                        )}
                      >
                        <GripVertical className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

export const DragDropReorder = memo(DragDropReorderInner) as typeof DragDropReorderInner;
