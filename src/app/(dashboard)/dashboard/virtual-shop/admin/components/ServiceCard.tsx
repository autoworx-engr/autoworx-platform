import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";

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
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gray-100">
          {service.imageUrl ? (
            <Image
              src={service.imageUrl}
              alt={service.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400 text-xs">
              No Image
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{service.name}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {service.category}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            ${service.price} &bull; {service.duration} min
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onEdit?.(service)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Edit service"
        >
          <Pencil size={18} />
        </button>
        <button
          onClick={() => onDelete?.(service)}
          className="text-red-400 hover:text-red-600 transition-colors"
          aria-label="Delete service"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
