"use client";

import { moveTicketStage } from "@/actions/crm/service-tickets";
import {
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  SERVICE_STAGE_LABEL,
  SERVICE_STAGE_ORDER,
} from "@/lib/crm-constants";
import { cn } from "@/lib/utils";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ServiceStage, TicketPriority } from "@prisma/client";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export type KanbanTicket = {
  id: number;
  title: string;
  stage: ServiceStage;
  priority: TicketPriority;
  accountName: string;
  ownerFirstName: string;
  ownerLastName: string | null;
  description: string | null;
};

function stageAccent(stage: ServiceStage) {
  switch (stage) {
    case ServiceStage.ONBOARDING:   return "border-t-violet-500";
    case ServiceStage.IN_PROGRESS:  return "border-t-sky-500";
    case ServiceStage.UNDER_REVIEW: return "border-t-amber-500";
    case ServiceStage.COMPLETED:    return "border-t-emerald-500";
    case ServiceStage.CANCELLED:    return "border-t-rose-500";
  }
}

function resolveDropStage(
  overId: string | number | undefined,
  tickets: KanbanTicket[],
): ServiceStage | null {
  const s = String(overId ?? "");
  if (s.startsWith("stage:")) {
    const raw = s.slice("stage:".length);
    return Object.values(ServiceStage).includes(raw as ServiceStage)
      ? (raw as ServiceStage)
      : null;
  }
  if (s.startsWith("ticket:")) {
    const tid = Number(s.slice("ticket:".length));
    return tickets.find((t) => t.id === tid)?.stage ?? null;
  }
  return null;
}

function TicketContent({ ticket }: { ticket: KanbanTicket }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-1">
        <Link
          href={`/dashboard/service-pipeline/${ticket.id}`}
          className="font-medium text-primary hover:underline"
        >
          {ticket.title}
        </Link>
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
            PRIORITY_COLOR[ticket.priority],
          )}
        >
          {PRIORITY_LABEL[ticket.priority]}
        </span>
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{ticket.accountName}</p>
      <p className="mt-0.5 text-xs text-muted-foreground/70">
        {ticket.ownerFirstName} {ticket.ownerLastName ?? ""}
      </p>
      {ticket.description ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/60">{ticket.description}</p>
      ) : null}
    </div>
  );
}

function ServiceCard({ ticket }: { ticket: KanbanTicket }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `ticket:${ticket.id}`,
    data: { ticketId: ticket.id, stage: ticket.stage },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border border-border bg-card p-3 text-sm shadow-sm transition-all duration-150",
        "hover:shadow-card-hover hover:border-border/80",
        isDragging && "opacity-40 ring-2 ring-primary/40",
      )}
    >
      <div className="flex gap-2">
        <button
          type="button"
          {...listeners}
          {...attributes}
          aria-label="Drag"
          className="mt-0.5 flex shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <TicketContent ticket={ticket} />
      </div>
    </div>
  );
}

function ServiceCardPreview({ ticket }: { ticket: KanbanTicket }) {
  return (
    <div className="cursor-grabbing rounded-lg border border-primary/20 bg-card p-3 text-sm shadow-xl ring-2 ring-primary/30">
      <div className="flex gap-2">
        <span className="mt-0.5 shrink-0 p-0.5 text-muted-foreground/40">
          <GripVertical className="h-4 w-4" />
        </span>
        <TicketContent ticket={ticket} />
      </div>
    </div>
  );
}

function ServiceColumn({
  stage,
  tickets,
}: {
  stage: ServiceStage;
  tickets: KanbanTicket[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage:${stage}`,
    data: { stage },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[380px] min-w-[272px] max-w-[320px] shrink-0 flex-col rounded-xl border border-border bg-card shadow-sm dark:shadow-card-dark",
        "border-t-[3px]",
        stageAccent(stage),
        isOver && "bg-primary/[0.03] ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-[13px] font-semibold text-foreground">
          {SERVICE_STAGE_LABEL[stage]}
        </span>
        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold tabular-nums text-muted-foreground">
          {tickets.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2 sidebar-scroll">
        {tickets.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground/50">Drop here</p>
        ) : (
          tickets.map((t) => <ServiceCard key={t.id} ticket={t} />)
        )}
      </div>
    </div>
  );
}

export function ServiceKanban({ tickets: initial }: { tickets: KanbanTicket[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => { setItems(initial); }, [initial]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byStage = SERVICE_STAGE_ORDER.reduce(
    (acc, s) => { acc[s] = items.filter((t) => t.stage === s); return acc; },
    {} as Record<ServiceStage, KanbanTicket[]>,
  );

  const activeDeal = activeId != null ? items.find((t) => t.id === activeId) : null;

  function onDragStart(e: DragStartEvent) {
    const raw = String(e.active.id);
    if (raw.startsWith("ticket:")) setActiveId(Number(raw.slice("ticket:".length)));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const raw = String(active.id);
    if (!raw.startsWith("ticket:")) return;
    const ticketId = Number(raw.slice("ticket:".length));
    const nextStage = resolveDropStage(over.id, items);
    if (!nextStage) return;
    const current = items.find((t) => t.id === ticketId);
    if (!current || current.stage === nextStage) return;

    const snapshot = items;
    setItems((prev) => prev.map((t) => (t.id === ticketId ? { ...t, stage: nextStage } : t)));

    void (async () => {
      const res = await moveTicketStage(ticketId, nextStage);
      if (!res.ok) {
        setItems(snapshot);
        toast.error(res.error ?? "Could not move ticket");
        return;
      }
      router.refresh();
    })();
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-2 pt-1">
        {SERVICE_STAGE_ORDER.map((s) => (
          <ServiceColumn key={s} stage={s} tickets={byStage[s]} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDeal ? <ServiceCardPreview ticket={activeDeal} /> : null}
      </DragOverlay>
      <p className="mt-3 text-xs text-slate-500">
        Drag tickets between stages. Click a title to open the full record.
      </p>
    </DndContext>
  );
}
