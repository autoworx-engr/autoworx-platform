"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { errorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  EmergencyRequestStatus,
  UrgentRequest,
  UrgentRequestsListResponse,
  getUrgentRequests,
} from "@/service/virtual-shop/api";
import { fToNow } from "@/utils/formatDate";
import {
  AlertTriangle,
  Calendar,
  Car,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Loader2,
  MessageCircle,
  RefreshCw,
  Store,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

type Props = {
  initialData: UrgentRequestsListResponse | null;
  initialPage: number;
  initialLimit: number;
  initialStatus?: EmergencyRequestStatus;
  initialShopId?: number;
  accessToken: string;
};

const STATUS_TABS: { label: string; value: EmergencyRequestStatus | "ALL" }[] =
  [
    { label: "All", value: "ALL" },
    { label: "Pending", value: "PENDING" },
    { label: "Under Review", value: "UNDER_REVIEW" },
    { label: "Approved", value: "APPROVED" },
    { label: "Alternative Proposed", value: "ALTERNATIVE_PROPOSED" },
    { label: "Rejected", value: "REJECTED" },
    { label: "Expired", value: "EXPIRED" },
  ];

const STATUS_STYLES: Record<
  EmergencyRequestStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  ALTERNATIVE_PROPOSED: {
    label: "Alt. Proposed",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  CLIENT_CONFIRMED: {
    label: "Confirmed",
    className: "bg-teal-100 text-teal-700 border-teal-200",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-slate-100 text-slate-500 border-slate-200",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-500 border-slate-200",
  },
};

export default function UrgentRequestsClient({
  initialData,
  initialPage,
  initialLimit,
  initialStatus,
  initialShopId,
  accessToken,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [requests, setRequests] = useState<UrgentRequest[]>(
    initialData?.data ?? [],
  );
  const [meta, setMeta] = useState(
    initialData?.meta ?? {
      total: 0,
      page: initialPage,
      limit: initialLimit,
      totalPages: 0,
    },
  );
  const [activeStatus, setActiveStatus] = useState<
    EmergencyRequestStatus | "ALL"
  >(initialStatus ?? "ALL");
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRequests = useCallback(
    async (nextPage: number, status: EmergencyRequestStatus | "ALL") => {
      setIsLoading(true);
      try {
        const result = await getUrgentRequests(
          {
            page: nextPage,
            limit: initialLimit,
            ...(status !== "ALL" ? { status } : {}),
            ...(initialShopId ? { shopId: initialShopId } : {}),
          },
          accessToken,
        );
        setRequests(result.data);
        setMeta(result.meta);
        setPage(nextPage);
      } catch {
        errorToast("Failed to load urgent requests");
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, initialLimit, initialShopId],
  );

  const handleStatusChange = (status: EmergencyRequestStatus | "ALL") => {
    setActiveStatus(status);
    fetchRequests(1, status);
  };

  const handlePageChange = (nextPage: number) => {
    fetchRequests(nextPage, activeStatus);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">
              Urgent Service Requests
            </h1>
            <p className="text-sm text-slate-500">
              {meta.total} total request{meta.total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-slate-500 hover:text-primary"
          onClick={() => fetchRequests(page, activeStatus)}
          disabled={isLoading}
        >
          <RefreshCw size={18} className={cn(isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <ScrollArea className="w-full">
        <div className="flex gap-1.5 pb-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleStatusChange(tab.value)}
              className={cn(
                "shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200",
                activeStatus === tab.value
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 text-slate-400">
          <AlertTriangle size={36} className="opacity-30" />
          <p className="text-sm font-medium">No urgent requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <UrgentRequestCard
              key={req.id}
              request={req}
              shopId={initialShopId ?? req.shopId}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-slate-500">
            Page {meta.page} of {meta.totalPages} &bull; {meta.total} results
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(meta.page - 1)}
              disabled={meta.page <= 1 || isLoading}
              className="rounded-xl"
            >
              <ChevronLeft size={16} />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(meta.page + 1)}
              disabled={meta.page >= meta.totalPages || isLoading}
              className="rounded-xl"
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function UrgentRequestCard({
  request,
  shopId,
}: {
  request: UrgentRequest;
  shopId: number;
}) {
  const status = STATUS_STYLES[request.status] ?? {
    label: request.status,
    className: "bg-slate-100 text-slate-500 border-slate-200",
  };

  const clientName = request.client
    ? `${request.client.firstName ?? ""} ${request.client.lastName ?? ""}`.trim() ||
      request.contactName
    : request.contactName;

  const vehicleLabel = request.vehicle
    ? `${request.vehicle.year} ${request.vehicle.make} ${request.vehicle.model}`
    : request.vehicleMake
      ? `${request.vehicleYear ?? ""} ${request.vehicleMake} ${request.vehicleModel ?? ""}`.trim()
      : null;

  const servicesCount = Array.isArray(request.requestedServices)
    ? request.requestedServices.length
    : 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: Info */}
        <div className="flex flex-1 flex-col gap-3">
          {/* Top row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <User size={14} className="text-slate-400" />
              {clientName}
            </span>
            <Badge
              className={cn(
                "border text-[11px] font-semibold",
                status.className,
              )}
            >
              {status.label}
            </Badge>
            {request.shop && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Store size={12} />
                {request.shop.storeName}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
            {request.description}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            {vehicleLabel && (
              <span className="flex items-center gap-1">
                <Car size={12} />
                {vehicleLabel}
              </span>
            )}
            {servicesCount > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle size={12} />
                {servicesCount} service{servicesCount !== 1 ? "s" : ""}
              </span>
            )}
            {request.requestedDate && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {request.requestedDate}
                {request.requestedTime ? ` at ${request.requestedTime}` : ""}
                {request.flexibleTiming && " (flexible)"}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {fToNow(request.createdAt)}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link
            href={`/dashboard/virtual-shop/admin/${shopId}/urgent-requests/${request.id}`}
            className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Eye size={15} />
            View Details
          </Link>
          {request.client?.id && (
            <Link
              href={`/dashboard/communication/client/${request.client.id}`}
              className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
            >
              <MessageCircle size={15} />
              Open Chat
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
