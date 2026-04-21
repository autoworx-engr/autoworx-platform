import { ServicePlaybook, ServiceCategory } from "@/types/ai-settings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreVertical,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  HelpCircle,
  ArrowUpRight,
  Clock,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popconfirm } from "antd";

interface PlaybookCardProps {
  playbook: ServicePlaybook;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggle?: () => void;
}

export function PlaybookCard({
  playbook,
  onEdit,
  onDelete,
  onToggle,
}: PlaybookCardProps) {
  const getPriceRange = () => {
    if (playbook.pricing_rules.length === 0) return null;
    const ranges = playbook.pricing_rules
      .filter((r) => r.price_range)
      .map((r) => r.price_range!);
    if (ranges.length === 0) return null;
    const min = Math.min(...ranges.map((r) => r.min));
    const max = Math.max(...ranges.map((r) => r.max));
    return { min, max };
  };

  const priceRange = getPriceRange();

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border-2 bg-card p-5 transition-all duration-200 hover:shadow-lg",
        playbook.is_active
          ? "border-primary/30 hover:border-primary/50"
          : "border-border opacity-75 hover:opacity-100",
      )}
    >
      {/* Status Indicator */}
      <div
        className={cn(
          "pointer-events-none absolute top-0 right-0 h-16 w-16 rounded-bl-3xl transition-colors",
          playbook.is_active ? "bg-green-500/10" : "bg-muted",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute top-3 right-3 h-2.5 w-2.5 rounded-full",
          playbook.is_active
            ? "bg-green-500 animate-pulse"
            : "bg-muted-foreground/50",
        )}
      />

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-semibold text-foreground">
              {playbook.service_name}
            </h3>
            <Badge variant="secondary" className="mt-1">
              {playbook.category}
            </Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              aria-label="Playbook actions"
              className={cn(
                // Mobile/touch: always show (no hover)
                "opacity-100 transition-opacity",
                // Desktop: show on hover/focus
                "md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
              )}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit?.()}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onToggle?.()}>
              {playbook.is_active ? (
                <>
                  <ToggleLeft className="mr-2 h-4 w-4" />
                  Disable
                </>
              ) : (
                <>
                  <ToggleRight className="mr-2 h-4 w-4" />
                  Enable
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            <Popconfirm
              title={`Are you sure you want to delete this service?`}
              onConfirm={() => onDelete?.()}
              okText="Yes"
              cancelText="No"
            >
              <div className="flex gap-2 mr-2 cursor-pointer">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </div>
            </Popconfirm>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Overview */}
      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
        {playbook.overview}
      </p>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-muted/50 p-2">
          <DollarSign className="mx-auto h-4 w-4 text-muted-foreground" />
          <p className="mt-1 text-xs font-medium text-foreground">
            {priceRange
              ? `$${priceRange.min.toLocaleString()}-$${priceRange.max.toLocaleString()}`
              : "Custom"}
          </p>
          <p className="text-[10px] text-muted-foreground">Price Range</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <HelpCircle className="mx-auto h-4 w-4 text-muted-foreground" />
          <p className="mt-1 text-xs font-medium text-foreground">
            {playbook.faqs.length}
          </p>
          <p className="text-[10px] text-muted-foreground">FAQs</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <ArrowUpRight className="mx-auto h-4 w-4 text-muted-foreground" />
          <p className="mt-1 text-xs font-medium text-foreground">
            {playbook.upsells.length}
          </p>
          <p className="text-[10px] text-muted-foreground">Upsells</p>
        </div>
      </div>

      {/* Time Estimate */}
      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>{playbook.time_estimate}</span>
      </div>
    </div>
  );
}
