import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useIsAdminOrManager } from "@/utils/useIsAdminOrManager";
import { Popconfirm } from "antd";
import { Check, Square, Trash2 } from "lucide-react";
import moment from "moment";
import Image from "next/image";

interface ImageContentCardProps {
  img: {
    id: number | string;
    photo: string;
    technicianName: string;
    timestamp: string;
    invoiceId?: string;
    technicianId?: number;
  };
  selectedIds: number[];
  toggleSelect: (id: number) => void;
  handleDelete: (id: number) => void;
}
export const ImageContentCard = ({
  img,
  selectedIds,
  toggleSelect,
  handleDelete,
}: ImageContentCardProps) => {
  const currentUser = useGetCurrentUser();
  const isAdminOrManager = useIsAdminOrManager();

  const isDisabled = !isAdminOrManager && currentUser?.id !== img.technicianId;
  return (
    <div key={img.id} className="relative rounded border p-2 shadow-sm">
      <div className="h-40 w-full overflow-hidden rounded relative">
        <Image
          src={img.photo}
          alt={`photo-${img.id}`}
          width={800}
          height={400}
          className="h-full w-full object-cover"
        />
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <button
            onClick={() => toggleSelect(img.id as number)}
            className={`flex items-center gap-1 rounded text-sm px-0.5 py-0.5 transition-all ${selectedIds.includes(img.id as number) ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"}`}
          >
            {selectedIds.includes(img.id as number) ? (
              <Check className="h-5 w-5" />
            ) : (
              <Square className="h-5 w-5" />
            )}
          </button>

          <Popconfirm
            title="Are you sure you want to delete this image?"
            onConfirm={() => handleDelete(img.id as number)}
            okText="Yes"
            cancelText="No"
          >
            <button disabled={isDisabled} 
            className={`flex items-center gap-1 rounded bg-red-500 px-2 py-1 text-sm text-white 
            ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-red-600 transition-all"}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </Popconfirm>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <div>
          <p className="font-semibold">Reported By: {img.technicianName}</p>
          <p className="text-muted-foreground">
            {moment(img.timestamp).format("MMM DD, YYYY hh:mm A")}
          </p>
        </div>
      </div>
    </div>
  );
};
