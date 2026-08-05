"use client";

import { createDraftEstimate } from "@/actions/estimate/invoice/createDraft";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { errorToast, successToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  EmergencyRequestStatus,
  updateUrgentRequest,
  UpdateUrgentRequestPayload,
  UrgentRequest,
} from "@/service/virtual-shop/api";
import { fToNow } from "@/utils/formatDate";
import {
  AlertTriangle,
  Calendar,
  Car,
  CheckCircle,
  ChevronLeft,
  Clock,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Receipt,
  Store,
  User,
  X,
} from "lucide-react";
import { customAlphabet } from "nanoid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  request: UrgentRequest;
  accessToken: string;
  shopId: string;
};

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

const STATUS_ACTIONS: {
  value: EmergencyRequestStatus;
  label: string;
  className: string;
}[] = [
  {
    value: "UNDER_REVIEW",
    label: "Mark Under Review",
    className:
      "border border-primary bg-primary/10 text-primary hover:bg-primary/20",
  },
  {
    value: "APPROVED",
    label: "Approve",
    className:
      "border border-green-600 bg-green-50 text-green-700 hover:bg-green-100",
  },
  {
    value: "ALTERNATIVE_PROPOSED",
    label: "Propose Alternative",
    className:
      "border border-purple-600 bg-purple-50 text-purple-700 hover:bg-purple-100",
  },
  {
    value: "REJECTED",
    label: "Reject",
    className: "border border-red-600 bg-red-50 text-red-700 hover:bg-red-100",
  },
];

export default function UrgentRequestDetail({
  request: initialRequest,
  accessToken,
  shopId,
}: Props) {
  const router = useRouter();
  const [request, setRequest] = useState(initialRequest);
  const [activeAction, setActiveAction] = useState<
    EmergencyRequestStatus | "SAVE_NOTES" | null
  >(null);
  const isBusy = activeAction !== null;
  const [pendingEstimate, startTransition] = useTransition();
  const [adminNotes, setAdminNotes] = useState(request.adminNotes ?? "");
  const [rejectionReason, setRejectionReason] = useState(
    request.rejectionReason ?? "",
  );
  const [proposedDate, setProposedDate] = useState(request.proposedDate ?? "");
  const [proposedTime, setProposedTime] = useState(request.proposedTime ?? "");
  const [alternativeNotes, setAlternativeNotes] = useState(
    request.alternativeNotes ?? "",
  );

  const statusStyle = STATUS_STYLES[request.status] ?? {
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

  const requestedServices: any[] = Array.isArray(request.requestedServices)
    ? request.requestedServices
    : [];

  const handleStatusUpdate = async (status: EmergencyRequestStatus) => {
    setActiveAction(status);
    try {
      const payload: UpdateUrgentRequestPayload = {
        status,
        ...(adminNotes ? { adminNotes } : {}),
        ...(rejectionReason ? { rejectionReason } : {}),
        ...(proposedDate ? { proposedDate } : {}),
        ...(proposedTime ? { proposedTime } : {}),
        ...(alternativeNotes ? { alternativeNotes } : {}),
      };
      const updated = await updateUrgentRequest(
        request.id,
        payload,
        accessToken,
      );
      setRequest(updated);
      successToast("Request updated successfully");
    } catch {
      errorToast("Failed to update request");
    } finally {
      setActiveAction(null);
    }
  };

  const handleQuickEstimate = () => {
    const clientId = request?.client?.id;
    if (!clientId) {
      errorToast("Client not found for this request. Cannot create estimate.");
      return;
    }

    startTransition(async () => {
      try {
        const draftId = customAlphabet("1234567890", 10)();
        const res = await createDraftEstimate({
          id: draftId,
          clientId,
          vehicleId: request?.vehicle?.id,
          requestedServices: Array.isArray(request.requestedServices)
            ? request.requestedServices.map((s) => ({
                shopServiceId: s.shopServiceId,
                vehicleType: s.vehicleType,
              }))
            : [],
        });

        if (res.type === "success") {
          successToast("Draft estimate created successfully");
          router.push(
            `/dashboard/estimate/edit/${res.data.id}?clientId=${request?.client?.id}`,
          );
        } else {
          errorToast("Failed to create estimate");
        }
      } catch (err) {
        errorToast("Error creating estimate");
      }
    });
  };

  const handleSaveNotes = async () => {
    setActiveAction("SAVE_NOTES");
    try {
      const payload: UpdateUrgentRequestPayload = {
        ...(adminNotes !== (request.adminNotes ?? "") ? { adminNotes } : {}),
        ...(proposedDate !== (request.proposedDate ?? "")
          ? { proposedDate }
          : {}),
        ...(proposedTime !== (request.proposedTime ?? "")
          ? { proposedTime }
          : {}),
        ...(alternativeNotes !== (request.alternativeNotes ?? "")
          ? { alternativeNotes }
          : {}),
        ...(rejectionReason !== (request.rejectionReason ?? "")
          ? { rejectionReason }
          : {}),
      };
      const updated = await updateUrgentRequest(
        request.id,
        payload,
        accessToken,
      );
      setRequest(updated);
      successToast("Notes saved");
    } catch {
      errorToast("Failed to save notes");
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href={`/dashboard/virtual-shop/admin/${shopId}/urgent-requests`}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary w-fit"
      >
        <ChevronLeft size={16} />
        Back to Urgent Requests
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30">
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-800">
                Urgent Request #{request.id}
              </h1>
              <Badge
                className={cn(
                  "border text-[11px] font-semibold",
                  statusStyle.className,
                )}
              >
                {statusStyle.label}
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              {request.shop?.storeName} &bull; Submitted{" "}
              {fToNow(request.createdAt)}
            </p>
          </div>
        </div>

        {request.client?.id && (
          <Link
            href={`/dashboard/communication/client/${request.client.id}?chat=true`}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-opacity hover:opacity-90"
          >
            <MessageCircle size={16} />
            Open Chat
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Client Info */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Contact Information
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow
                icon={<User size={15} />}
                label="Name"
                value={clientName}
              />
              <InfoRow
                icon={<Mail size={15} />}
                label="Email"
                value={request.contactEmail}
              />
              <InfoRow
                icon={<Phone size={15} />}
                label="Phone"
                value={request.contactPhone}
              />
              {request.shop && (
                <InfoRow
                  icon={<Store size={15} />}
                  label="Shop"
                  value={request.shop.storeName}
                />
              )}
            </div>
          </section>

          {/* Description */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Description
            </h2>
            <p className="text-sm leading-relaxed text-slate-700">
              {request.description}
            </p>
          </section>

          {/* Vehicle */}
          {vehicleLabel && (
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Vehicle
              </h2>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Car size={16} className="text-slate-400" />
                {vehicleLabel}
              </div>
            </section>
          )}

          {/* Services */}
          {requestedServices.length > 0 && (
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Requested Services ({requestedServices.length})
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs font-semibold text-primary border-primary/20 hover:bg-primary/5"
                  onClick={handleQuickEstimate}
                  disabled={pendingEstimate || !request.client?.id}
                  title={
                    !request.client?.id
                      ? "Client profile is required to create an estimate"
                      : undefined
                  }
                >
                  {pendingEstimate ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Receipt size={13} />
                  )}
                  Quick Estimate
                </Button>
              </div>
              <div className="space-y-2">
                {requestedServices.map((svc: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  >
                    <CheckCircle size={14} className="text-primary" />
                    <span>Service #{svc.shopServiceId ?? i + 1}</span>
                    {svc.vehicleType && (
                      <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">
                        {svc.vehicleType}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Timing */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Timing Preferences
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow
                icon={<Calendar size={15} />}
                label="Requested Date"
                value={request.requestedDate ?? "Not specified"}
              />
              <InfoRow
                icon={<Clock size={15} />}
                label="Requested Time"
                value={request.requestedTime ?? "Not specified"}
              />
              <InfoRow
                icon={<CheckCircle size={15} />}
                label="Flexible Timing"
                value={request.flexibleTiming ? "Yes" : "No"}
              />
              <InfoRow
                icon={<Clock size={15} />}
                label="Expires"
                value={fToNow(request.expiresAt) ?? "—"}
              />
            </div>
          </section>

          {/* Admin Notes — if already set */}
          {request.adminNotes && (
            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
                Admin Notes
              </h2>
              <p className="text-sm text-primary/80">{request.adminNotes}</p>
            </section>
          )}

          {request.rejectionReason && (
            <section className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-red-500">
                Rejection Reason
              </h2>
              <p className="text-sm text-red-800">{request.rejectionReason}</p>
            </section>
          )}

          {(request.proposedDate ||
            request.proposedTime ||
            request.alternativeNotes) && (
            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
                Alternative Proposal
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {request.proposedDate && (
                  <InfoRow
                    icon={<Calendar size={15} />}
                    label="Proposed Date"
                    value={request.proposedDate}
                  />
                )}
                {request.proposedTime && (
                  <InfoRow
                    icon={<Clock size={15} />}
                    label="Proposed Time"
                    value={request.proposedTime}
                  />
                )}
              </div>
              {request.alternativeNotes && (
                <p className="text-sm text-primary/80">
                  {request.alternativeNotes}
                </p>
              )}
            </section>
          )}
        </div>

        {/* Right: Actions Panel */}
        <div className="space-y-5">
          {/* Status Actions */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Update Status
            </h2>
            <div className="flex flex-col gap-2">
              {STATUS_ACTIONS.map((action) => (
                <button
                  key={action.value}
                  onClick={() => handleStatusUpdate(action.value)}
                  disabled={isBusy || request.status === action.value}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0",
                    action.className,
                    request.status === action.value &&
                      "ring-2 ring-offset-1 ring-current",
                  )}
                >
                  {activeAction === action.value ? (
                    <Loader2 size={14} className="animate-spin inline mr-1" />
                  ) : null}
                  {action.label}
                </button>
              ))}
            </div>
          </section>

          {/* Admin Notes Form */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Notes & Response
            </h2>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Admin Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder="Internal notes..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Rejection Reason
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={2}
                  placeholder="If rejecting, explain why..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <Separator />

              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Alternative Proposal
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={proposedDate}
                      onChange={(e) => {
                        setProposedDate(e.target.value);
                        if (!e.target.value) setProposedTime("");
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pr-8 text-sm text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-clear-button]:hidden"
                    />
                    {proposedDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setProposedDate("");
                          setProposedTime("");
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Time
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={proposedTime}
                      onChange={(e) => setProposedTime(e.target.value)}
                      disabled={!proposedDate}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pr-8 text-sm text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-clear-button]:hidden"
                    />
                    {proposedTime && (
                      <button
                        type="button"
                        onClick={() => setProposedTime("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Alternative Notes
                </label>
                <textarea
                  value={alternativeNotes}
                  onChange={(e) => setAlternativeNotes(e.target.value)}
                  rows={2}
                  placeholder="Details for the client..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <Button
                onClick={handleSaveNotes}
                disabled={isBusy}
                className="w-full rounded-xl bg-gradient-to-r from-primary to-[#5a66ee] text-white shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30"
              >
                {activeAction === "SAVE_NOTES" ? (
                  <Loader2 size={14} className="animate-spin mr-1" />
                ) : null}
                Save Notes
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-xs font-medium text-slate-400 uppercase tracking-wider">
        {icon}
        {label}
      </span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}
