import { db } from "@/lib/db";
import { FormatUtcToTimezone } from "@/utils/FormatUtcToTimezone";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import moment from "moment-timezone";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  CalendarCheck,
  Loader2,
  Ban,
  Phone,
} from "lucide-react";
import { EmergencyRequestStatus } from "@prisma/client";

type Props = {
  params: Promise<{ subdomain: string; id: string }>;
};

const STATUS_CONFIG: Record<
  EmergencyRequestStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  PENDING: {
    label: "Pending Review",
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
    icon: Clock,
  },
  UNDER_REVIEW: {
    label: "Under Review",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: Loader2,
  },
  APPROVED: {
    label: "Approved",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    icon: CheckCircle2,
  },
  ALTERNATIVE_PROPOSED: {
    label: "Alternative Time Proposed",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
    icon: CalendarCheck,
  },
  CLIENT_CONFIRMED: {
    label: "Confirmed",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Not Available",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: XCircle,
  },
  EXPIRED: {
    label: "Expired",
    color: "text-gray-600",
    bg: "bg-gray-50 border-gray-200",
    icon: Ban,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-gray-600",
    bg: "bg-gray-50 border-gray-200",
    icon: Ban,
  },
};

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  // requestedDate/proposedDate are plain "YYYY-MM-DD" strings with no time or
  // timezone component — parse and format them literally so the displayed
  // date never shifts by a day depending on the server's runtime timezone.
  return moment(value, "YYYY-MM-DD").format("dddd, MMMM D, YYYY");
}

function formatTime(value: string | null | undefined) {
  if (!value) return null;
  if (value.includes(":")) {
    const [h, m] = value.split(":");
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m));
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return value;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id, subdomain } = await props.params;
  const requestId = parseInt(id, 10);

  const request = await db.emergencyBookingRequest.findUnique({
    where: { id: requestId },
    select: { shop: { select: { storeName: true, slug: true } } },
  });

  if (!request || request.shop.slug !== subdomain) {
    return { title: "Request Not Found" };
  }

  return {
    title: `Request #${requestId} Status | ${request.shop.storeName}`,
  };
}

export default async function EmergencyStatusPage(props: Props) {
  const { subdomain, id } = await props.params;
  const requestId = parseInt(id, 10);

  if (!Number.isFinite(requestId)) notFound();

  const request = await db.emergencyBookingRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      contactName: true,
      description: true,
      requestedDate: true,
      requestedTime: true,
      flexibleTiming: true,
      vehicleMake: true,
      vehicleModel: true,
      vehicleYear: true,
      adminNotes: true,
      rejectionReason: true,
      proposedDate: true,
      proposedTime: true,
      alternativeNotes: true,
      createdAt: true,
      updatedAt: true,
      expiresAt: true,
      shop: {
        select: {
          storeName: true,
          slug: true,
          logoUrl: true,
          bannerUrl: true,
          company: {
            select: {
              phone: true,
              phoneVisibility: true,
              timezone: true,
            },
          },
        },
      },
    },
  });

  if (!request || request.shop.slug !== subdomain) notFound();

  const cfg = STATUS_CONFIG[request.status];
  const StatusIcon = cfg.icon;
  const timezone = request.shop.company.timezone || moment.tz.guess();
  const defaultBanner =
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=2000";

  const vehicleLabel = [
    request.vehicleYear,
    request.vehicleMake,
    request.vehicleModel,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="relative w-full bg-background border-b overflow-hidden shadow-sm">
        <div className="relative h-28 md:h-36 w-full">
          <img
            src={request.shop.bannerUrl || defaultBanner}
            alt="Shop Banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="absolute inset-0 container max-w-5xl mx-auto px-6 flex items-center gap-6">
            {request.shop.logoUrl && (
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl overflow-hidden border-2 border-white/30 bg-white/10 backdrop-blur-md shadow-xl flex items-center justify-center p-2">
                <img
                  src={request.shop.logoUrl}
                  alt={request.shop.storeName}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight drop-shadow-md">
                {request.shop.storeName}
              </h1>
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wider mt-0.5">
                Request Status
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-xl mx-auto px-4 py-8 space-y-5">
        {/* Status Card */}
        <div className={`rounded-2xl border p-6 ${cfg.bg} space-y-2`}>
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-7 h-7 ${cfg.color}`} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Request #{request.id}
              </p>
              <p className={`text-xl font-bold ${cfg.color}`}>{cfg.label}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 pt-1">
            Submitted{" "}
            {FormatUtcToTimezone(
              request.createdAt,
              timezone,
              "MMM D, YYYY h:mm A",
            )}
          </p>
        </div>

        {/* Admin Notes (shown when set) */}
        {request.adminNotes && (
          <div className="rounded-2xl border bg-white p-5 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Message from Shop
            </p>
            <p className="text-sm text-gray-700">{request.adminNotes}</p>
          </div>
        )}

        {/* Alternative Proposed */}
        {(request.proposedDate ||
          request.proposedTime ||
          request.alternativeNotes) && (
          <div className="rounded-2xl border bg-purple-50 border-purple-200 p-5 space-y-2">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-purple-600" />
              <p className="font-semibold text-purple-700">
                Alternative Time Offered
              </p>
            </div>
            {request.proposedDate && (
              <p className="text-sm text-gray-700">
                <span className="font-medium">Date: </span>
                {formatDate(request.proposedDate)}
              </p>
            )}
            {request.proposedTime && (
              <p className="text-sm text-gray-700">
                <span className="font-medium">Time: </span>
                {formatTime(request.proposedTime)}
              </p>
            )}
            {request.alternativeNotes && (
              <p className="text-sm text-gray-600 italic">
                {request.alternativeNotes}
              </p>
            )}
          </div>
        )}

        {/* Rejection Reason */}
        {request.status === "REJECTED" && request.rejectionReason && (
          <div className="rounded-2xl border bg-red-50 border-red-200 p-5 space-y-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="font-semibold text-red-700">Reason</p>
            </div>
            <p className="text-sm text-gray-700">{request.rejectionReason}</p>
          </div>
        )}

        {/* Request Summary */}
        <div className="rounded-2xl border bg-white p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Your Request
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{request.contactName}</span>
            </div>

            {vehicleLabel && (
              <div className="flex justify-between">
                <span className="text-gray-500">Vehicle</span>
                <span className="font-medium">{vehicleLabel}</span>
              </div>
            )}

            {request.requestedDate && (
              <div className="flex justify-between">
                <span className="text-gray-500">Preferred Date</span>
                <span className="font-medium">
                  {formatDate(request.requestedDate)}
                </span>
              </div>
            )}

            {request.requestedTime && (
              <div className="flex justify-between">
                <span className="text-gray-500">Preferred Time</span>
                <span className="font-medium">
                  {formatTime(request.requestedTime)}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-500">Flexible Timing</span>
              <span className="font-medium">
                {request.flexibleTiming ? "Yes" : "No"}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t space-y-1">
            <p className="text-xs text-gray-400">Description</p>
            <p className="text-sm text-gray-700">{request.description}</p>
          </div>
        </div>

        {/* Contact Shop */}
        {request.shop.company.phone &&
          request.shop.company.phoneVisibility !== false && (
            <a
              href={`tel:${request.shop.company.phone}`}
              className="flex items-center justify-between rounded-2xl border bg-white p-5 hover:bg-gray-50 transition-colors group"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Need Help? Call Us
                </p>
                <p className="text-base font-bold text-gray-800 group-hover:text-primary transition-colors">
                  {request.shop.company.phone}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
            </a>
          )}

        {/* Expiry notice for pending */}
        {(request.status === "PENDING" || request.status === "UNDER_REVIEW") &&
          new Date(request.expiresAt) > new Date() && (
            <p className="text-xs text-center text-gray-400">
              Request expires{" "}
              {FormatUtcToTimezone(
                request.expiresAt,
                timezone,
                "MMM D, YYYY h:mm A",
              )}
            </p>
          )}

        <p className="text-xs text-center text-gray-400">
          Last updated{" "}
          {FormatUtcToTimezone(
            request.updatedAt,
            timezone,
            "MMM D, YYYY h:mm A",
          )}
        </p>
      </main>
    </div>
  );
}
