"use client";

import { moveDealStage } from "@/actions/crm/deals";
import { KANBAN_STAGE_ORDER, STAGE_LABEL } from "@/lib/crm-constants";
import { formatMoney } from "@/lib/format";
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
import { DealStage } from "@prisma/client";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export type KanbanDeal = {
  id: number;
  title: string;
  stage: DealStage;
  value: number | null;
  probability: number | null;
  accountName: string;
  ownerFirstName: string;
  ownerLastName: string | null;
};

export { KANBAN_STAGE_ORDER } from "@/lib/crm-constants";

function stageDropId(stage: DealStage) {
  return `stage:${stage}`;
}

function parseStageFromDropId(id: string | number | undefined): DealStage | null {
  const s = String(id ?? "");
  if (!s.startsWith("stage:")) return null;
  const raw = s.slice("stage:".length);
  return Object.values(DealStage).includes(raw as DealStage)
    ? (raw as DealStage)
    : null;
}

function resolveDropStage(
  overId: string | number | undefined,
  deals: KanbanDeal[],
): DealStage | null {
  const sid = parseStageFromDropId(overId);
  if (sid) return sid;
  const raw = String(overId ?? "");
  if (raw.startsWith("deal:")) {
    const dealId = Number(raw.slice("deal:".length));
    const hit = deals.find((d) => d.id === dealId);
    return hit?.stage ?? null;
  }
  return null;
}

function columnAccent(stage: DealStage) {
  switch (stage) {
    case DealStage.LEAD:
      return "border-t-slate-400";
    case DealStage.QUALIFIED:
      return "border-t-sky-500";
    case DealStage.PROPOSAL:
      return "border-t-violet-500";
    case DealStage.NEGOTIATION:
      return "border-t-amber-500";
    case DealStage.WON:
      return "border-t-emerald-500";
    case DealStage.LOST:
      return "border-t-rose-500";
    default:
      return "border-t-slate-300";
  }
}

function DealCardContent({ deal }: { deal: KanbanDeal }) {
  return (
    <div className="min-w-0 flex-1">
      <Link
        href={`/dashboard/deals/${deal.id}`}
        className="font-medium text-primary hover:underline"
      >
        {deal.title}
      </Link>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{deal.accountName}</p>
      <p className="mt-0.5 text-xs text-muted-foreground/70">
        {deal.ownerFirstName} {deal.ownerLastName ?? ""}
      </p>
      <p className="mt-1 text-xs font-semibold text-foreground tabular-nums">
        {formatMoney(deal.value)}
        {deal.probability != null && deal.probability > 0 ? (
          <span className="ml-2 font-normal text-muted-foreground">
            · {deal.probability}%
          </span>
        ) : null}
      </p>
    </div>
  );
}

function KanbanCard({ deal }: { deal: KanbanDeal }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `deal:${deal.id}`,
    data: { dealId: deal.id, stage: deal.stage },
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
          className="mt-0.5 flex shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
          aria-label="Drag to change stage"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <DealCardContent deal={deal} />
      </div>
    </div>
  );
}

function KanbanCardPreview({ deal }: { deal: KanbanDeal }) {
  return (
    <div className="cursor-grabbing rounded-lg border border-primary/20 bg-card p-3 text-sm shadow-xl ring-2 ring-primary/30">
      <div className="flex gap-2">
        <span className="mt-0.5 flex shrink-0 p-0.5 text-muted-foreground/40">
          <GripVertical className="h-4 w-4" />
        </span>
        <DealCardContent deal={deal} />
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  deals,
}: {
  stage: DealStage;
  deals: KanbanDeal[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stageDropId(stage),
    data: { stage },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[380px] min-w-[272px] max-w-[320px] shrink-0 flex-col rounded-xl border border-border bg-card shadow-sm dark:shadow-card-dark",
        "border-t-[3px]",
        columnAccent(stage),
        isOver && "bg-primary/[0.03] ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-[13px] font-semibold text-foreground">{STAGE_LABEL[stage]}</span>
        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold tabular-nums text-muted-foreground">
          {deals.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2 sidebar-scroll">
        {deals.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground/50">
            Drop deals here
          </p>
        ) : (
          deals.map((d) => <KanbanCard key={d.id} deal={d} />)
        )}
      </div>
    </div>
  );
}

type Props = {
  deals: KanbanDeal[];
};

export function PipelineKanban({ deals: initialDeals }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<KanbanDeal[]>(initialDeals);
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    setItems(initialDeals);
  }, [initialDeals]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const activeDeal = activeId != null ? items.find((d) => d.id === activeId) : null;

  const byStage = KANBAN_STAGE_ORDER.reduce(
    (acc, stage) => {
      acc[stage] = items.filter((d) => d.stage === stage);
      return acc;
    },
    {} as Record<DealStage, KanbanDeal[]>,
  );

  function handleDragStart(event: DragStartEvent) {
    const raw = String(event.active.id);
    if (!raw.startsWith("deal:")) return;
    const id = Number(raw.slice("deal:".length));
    if (Number.isFinite(id)) setActiveId(id);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const rawDeal = String(active.id);
    if (!rawDeal.startsWith("deal:")) return;
    const dealId = Number(rawDeal.slice("deal:".length));
    if (!Number.isFinite(dealId)) return;

    const nextStage = resolveDropStage(over.id, items);
    if (nextStage == null) return;

    const current = items.find((d) => d.id === dealId);
    if (!current || current.stage === nextStage) return;

    const prevSnapshot = items;

    setItems((rows) =>
      rows.map((d) => (d.id === dealId ? { ...d, stage: nextStage } : d)),
    );

    void (async () => {
      const res = await moveDealStage(dealId, nextStage);
      if (!res.ok) {
        setItems(prevSnapshot);
        toast.error(res.error ?? "Could not move deal");
        return;
      }
      router.refresh();
    })();
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-2 pt-1">
        {KANBAN_STAGE_ORDER.map((stage) => (
          <KanbanColumn key={stage} stage={stage} deals={byStage[stage]} />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDeal ? <KanbanCardPreview deal={activeDeal} /> : null}
      </DragOverlay>

      <p className="mt-3 text-xs text-muted-foreground">
        Drag the grip handle to move a deal between stages. Click the title to open the record.
      </p>
    </DndContext>
  );
}
