"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { Box, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DragData, DropData, PendingMove } from "./model";

/** Only targets that accept the dragged kind take part in collision detection. */
const collision: CollisionDetection = (args) => {
  const kind = (args.active.data.current as DragData | undefined)?.kind;
  const droppableContainers = args.droppableContainers.filter(
    (c) => (c.data.current as DropData | undefined)?.accepts === kind,
  );
  const next = { ...args, droppableContainers };
  return args.pointerCoordinates ? pointerWithin(next) : rectIntersection(next);
};

/** Up / Down jump to the previous / next valid drop target. */
const coordinateGetter: KeyboardCoordinateGetter = (event, { context }) => {
  const { active, droppableRects, droppableContainers, collisionRect } = context;
  if (event.code !== "ArrowDown" && event.code !== "ArrowUp") return undefined;
  event.preventDefault();
  const kind = (active?.data.current as DragData | undefined)?.kind;
  if (!kind || !collisionRect) return undefined;
  const rects = droppableContainers
    .getEnabled()
    .filter((c) => (c.data.current as DropData | undefined)?.accepts === kind)
    .map((c) => droppableRects.get(c.id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .sort((a, b) => a.top - b.top);
  const target =
    event.code === "ArrowDown"
      ? rects.find((r) => r.top > collisionRect.top + 1)
      : [...rects].reverse().find((r) => r.top < collisionRect.top - 1);
  return target ? { x: target.left, y: target.top } : undefined;
};

interface Props {
  children: React.ReactNode;
  onDrop: (move: PendingMove) => void;
}

/** Drag & drop wiring for the tree: sensors, valid-target highlighting hook-up, overlay, announcements. */
export function TreeDnd({ children, onDrop }: Props) {
  const t = useTranslations("panels.dnd");
  const [active, setActive] = React.useState<DragData | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  const announcements: Announcements = {
    onDragStart: ({ active: a }) => t("picked", { name: (a.data.current as DragData | undefined)?.label ?? "" }),
    onDragOver: ({ active: a, over }) =>
      over
        ? t("over", {
            name: (a.data.current as DragData | undefined)?.label ?? "",
            target: (over.data.current as DropData | undefined)?.label ?? "",
          })
        : undefined,
    onDragEnd: ({ active: a, over }) =>
      over
        ? t("dropped", {
            name: (a.data.current as DragData | undefined)?.label ?? "",
            target: (over.data.current as DropData | undefined)?.label ?? "",
          })
        : t("cancelled"),
    onDragCancel: () => t("cancelled"),
  };

  const handleStart = (e: DragStartEvent) => setActive((e.active.data.current as DragData) ?? null);
  const handleEnd = (e: DragEndEvent) => {
    setActive(null);
    const from = e.active.data.current as DragData | undefined;
    const to = e.over?.data.current as DropData | undefined;
    if (!from || !to || to.accepts !== from.kind || to.targetId === from.fromId) return;
    onDrop({ kind: from.kind, id: from.id, label: from.label, targetId: to.targetId, targetLabel: to.label });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
      onDragCancel={() => setActive(null)}
      accessibility={{ announcements, screenReaderInstructions: { draggable: t("instructions") } }}
    >
      <div className="group/tree" data-drag={active?.kind}>
        {children}
      </div>
      <DragOverlay dropAnimation={null}>
        {active && (
          <div className="inline-flex h-8 items-center gap-2 rounded border border-primary bg-surface px-3 text-sm font-medium shadow-lg [&_svg]:size-4 [&_svg]:text-subtle">
            {active.kind === "panel" ? <Zap aria-hidden /> : <Box aria-hidden />}
            {active.label}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
