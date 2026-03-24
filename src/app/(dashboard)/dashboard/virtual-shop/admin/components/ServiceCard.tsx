import Image from "next/image";
import { Pencil, SquarePen, Trash2 } from "lucide-react";

export type Service = {
  id: number;
  name: string;
  category: string;
  price: number;
  duration: number;
  imageUrl?: string;
};

type ServiceCardProps = {
  service: Service;
  onEdit?: (service: Service) => void;
  onDelete?: (service: Service) => void;
};

export default function ServiceCard({
  service,
  onEdit,
  onDelete,
}: ServiceCardProps) {
  return (
    <div className="group flex flex-col lg:flex-row lg:justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-slate-300 hover:shadow-md sm:px-4 sm:py-3">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:h-16 sm:w-16">
          {service.imageUrl ? (
            <Image
              src={service.imageUrl}
              alt={service.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-400">
              No Image
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="line-clamp-2 text-sm font-semibold text-slate-700 sm:text-base sm:line-clamp-1">
                {service.name}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 sm:text-xs">
                {service.category}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="font-semibold text-slate-700">${service.price}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">{service.duration} min</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2 sm:mt-0 sm:border-t-0 sm:pt-0">
        <button
          onClick={() => onEdit?.(service)}
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:border-0 sm:bg-transparent sm:p-1.5"
          aria-label="Edit service"
        >
          <SquarePen size={18} color="#6571FF" />
        </button>
        <button
          onClick={() => onDelete?.(service)}
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-2 text-rose-500 transition-colors hover:bg-rose-100 hover:text-rose-600 sm:border-0 sm:bg-transparent sm:p-1.5"
          aria-label="Delete service"
        >
          <Trash2 size={18} color="#EF4444" />
        </button>
      </div>
    </div>
  );
}
