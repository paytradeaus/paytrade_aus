"use client";
import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface ColumnOption {
  dataKey: string;
  label: string;
  // Columns marked required cannot be hidden (checkbox disabled). Reorder
  // is still allowed unless the column is also marked locked.
  required?: boolean;
}

interface Props {
  // Full list of columns the table can render. The order in this array
  // is the *fallback* order if the user has no saved preference.
  allColumns: ColumnOption[];
  // Current saved order (subset of dataKeys). Columns not in the saved
  // order get appended at the end in their natural position.
  order: string[];
  // dataKeys the user has hidden.
  hidden: string[];
  // Fired whenever the user changes order or visibility. The parent
  // should debounce-persist this to the server.
  onChange: (next: { order: string[]; hidden: string[] }) => void;
  // Optional: reset preferences to defaults (clears both order and hidden).
  onReset?: () => void;
}

// Build the effective display order given an allColumns list (defines
// the *fallback* natural order) and a saved order. Columns present in
// `order` come first in saved order; anything new in allColumns is
// appended at the end so newly added columns don't silently disappear.
export function buildEffectiveOrder(
  allColumns: ColumnOption[],
  order: string[]
): ColumnOption[] {
  const byKey = new Map(allColumns.map((c) => [c.dataKey, c]));
  const seen = new Set<string>();
  const out: ColumnOption[] = [];
  for (const key of order) {
    const c = byKey.get(key);
    if (c && !seen.has(key)) {
      out.push(c);
      seen.add(key);
    }
  }
  for (const c of allColumns) {
    if (!seen.has(c.dataKey)) out.push(c);
  }
  return out;
}

function SortableRow({
  col,
  hidden,
  onToggle,
}: {
  col: ColumnOption;
  hidden: boolean;
  onToggle: (next: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: col.dataKey });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 8px",
    background: isDragging ? "#f0f4ff" : "transparent",
    borderRadius: 4,
    cursor: "default",
  };
  return (
    <div ref={setNodeRef} style={style}>
      <span
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        style={{
          cursor: "grab",
          padding: "0 4px",
          color: "#888",
          userSelect: "none",
        }}
      >
        <i className="fa-light fa-grip-vertical" />
      </span>
      <input
        type="checkbox"
        id={`col-vis-${col.dataKey}`}
        checked={!hidden}
        disabled={col.required}
        onChange={(e) => onToggle(!e.target.checked)}
        style={{ margin: 0 }}
      />
      <label
        htmlFor={`col-vis-${col.dataKey}`}
        style={{ flex: 1, margin: 0, fontWeight: 400, cursor: "pointer" }}
      >
        {col.label}
        {col.required ? (
          <small style={{ color: "#999", marginLeft: 6 }}>(required)</small>
        ) : null}
      </label>
    </div>
  );
}

export default function ColumnSettingsMenu({
  allColumns,
  order,
  hidden,
  onChange,
  onReset,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const effective = buildEffectiveOrder(allColumns, order);
  const hiddenSet = new Set(hidden);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = effective.findIndex((c) => c.dataKey === active.id);
    const newIndex = effective.findIndex((c) => c.dataKey === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(effective, oldIndex, newIndex).map(
      (c) => c.dataKey
    );
    onChange({ order: reordered, hidden });
  };

  const toggleHidden = (dataKey: string, nextHidden: boolean) => {
    const set = new Set(hidden);
    if (nextHidden) set.add(dataKey);
    else set.delete(dataKey);
    onChange({
      order: effective.map((c) => c.dataKey),
      hidden: Array.from(set),
    });
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className="secondary"
        title="Customise columns"
        onClick={() => setOpen((v) => !v)}
        style={{ minWidth: 0 }}
      >
        <i className="fa-light fa-table-columns" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Column settings"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 1000,
            width: 280,
            maxHeight: 420,
            overflow: "auto",
            background: "#fff",
            border: "1px solid #d6d6d6",
            borderRadius: 6,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            padding: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              paddingBottom: 6,
              borderBottom: "1px solid #eee",
            }}
          >
            <strong style={{ fontSize: 13 }}>Customise columns</strong>
            {onReset && (
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setOpen(false);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#555",
                  fontSize: 12,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Reset
              </button>
            )}
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={effective.map((c) => c.dataKey)}
              strategy={verticalListSortingStrategy}
            >
              {effective.map((col) => (
                <SortableRow
                  key={col.dataKey}
                  col={col}
                  hidden={hiddenSet.has(col.dataKey)}
                  onToggle={(next) => toggleHidden(col.dataKey, next)}
                />
              ))}
            </SortableContext>
          </DndContext>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 11,
              color: "#888",
              lineHeight: 1.3,
            }}
          >
            Drag rows to reorder. Untick to hide. Changes are saved to your
            account.
          </p>
        </div>
      )}
    </div>
  );
}
