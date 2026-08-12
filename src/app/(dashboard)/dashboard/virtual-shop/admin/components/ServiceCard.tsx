import { Switch } from "@/components/Switch";
import { useUpdateShopServiceStatus } from "@/hooks/virtual-shop/service/useShopService";
import { formatDuration } from "@/lib/formatDuration";
import { Popconfirm, Tooltip } from "antd";
import { ImageIcon, PencilLineIcon, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "nextjs-toploader/app";
import { useState } from "react";

export type Service = {
  id: number;
  name: string;
  shortDescription?: string;
  category: string;
  price: number;
  duration: number;
  imageUrl?: string;
  isActive: boolean;
};

type ServiceCardProps = {
  service: Service;
  shopId?: number;
  onEdit?: (service: Service) => void;
  onDelete?: (service: Service) => void;
};

export default function ServiceCard({
  service,
  shopId,
  onEdit,
  onDelete,
}: ServiceCardProps) {
  const router = useRouter();
  const [imageFailed, setImageFailed] = useState(false);
  const {
    mutateAsync: updateServiceStatus,
    isPending: isUpdatingStatus,
    variables: statusVariables,
  } = useUpdateShopServiceStatus();

  const isTogglingStatus =
    isUpdatingStatus && statusVariables?.id === service.id;

  const switchTooltip = isTogglingStatus
    ? "Updating status..."
    : service.isActive
      ? "Click to deactivate service"
      : "Click to activate service";

  const handleToggleStatus = async (isActive: boolean) => {
    if (!shopId) return;

    try {
      await updateServiceStatus({
        id: service.id,
        isActive,
        shopId,
      });
      router.refresh();
    } catch {}
  };

  return (
    <div className="group flex flex-col lg:flex-row lg:justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-slate-300 hover:shadow-md sm:px-4 sm:py-3">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:h-16 sm:w-16">
          {service.imageUrl && !imageFailed ? (
            <Image
              src={service.imageUrl}
              alt={service.name}
              fill
              className="object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
              <ImageIcon size={50} strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="line-clamp-2 text-sm font-semibold text-slate-700 sm:text-base sm:line-clamp-1">
                {service.name}
              </span>
              {service.category && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 sm:text-xs">
                  {service.category}
                </span>
              )}
            </div>
            {service.shortDescription && (
              <p className="line-clamp-1 text-xs text-slate-400">
                {service.shortDescription}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="font-semibold text-slate-700">
                ${service.price}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">
                {formatDuration(service.duration)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2 sm:mt-0 sm:border-t-0 sm:pt-0">
        <div className="mr-1 flex items-center gap-2">
          {/* {isTogglingStatus &&
            <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-500">
              <Loader2 size={16} color="#6571FF" className="animate-spin" />
              {service.isActive ? "Deactivating..." : "Activating..."}
            </span>
          } */}
          <Tooltip title={switchTooltip}>
            <span className="inline-flex">
              <Switch
                checked={service.isActive}
                setChecked={handleToggleStatus}
                disabled={isTogglingStatus}
                aria-label={`${service.name} status`}
              />
            </span>
          </Tooltip>
        </div>
        <button
          onClick={() => onEdit?.(service)}
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:border-0 sm:bg-transparent sm:p-1.5"
          aria-label="Edit service"
        >
          <PencilLineIcon size={18} color="#6571FF" />
        </button>
        <Popconfirm
          title="Delete service"
          description={`Are you sure you want to delete "${service.name}"?`}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
          onConfirm={() => onDelete?.(service)}
        >
          <button
            type="button"
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-2 text-rose-500 transition-colors hover:bg-rose-100 hover:text-rose-600 sm:border-0 sm:bg-transparent sm:p-1.5"
            aria-label="Delete service"
          >
            <Trash2 size={18} color="#EF4444" />
          </button>
        </Popconfirm>
      </div>
    </div>
  );
}
