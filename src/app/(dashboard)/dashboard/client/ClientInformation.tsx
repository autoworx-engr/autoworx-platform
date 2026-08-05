import Avatar from "@/components/Avatar";
import { Client, Source, Tag } from "@prisma/client";
import React from "react";
import EditClient from "./EditClient";
import Link from "next/link";
import { MessageCircleMore } from "lucide-react";

const DataField = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start py-2">
    <label className="block w-24 shrink-0 text-sm font-medium text-slate-500 lg:w-28">
      {label}
    </label>
    <div className="flex-1 text-sm font-semibold text-slate-600 leading-relaxed">
      {value || <span className="text-slate-400">N/A</span>}
    </div>
  </div>
);

export default function ClientInformation({
  client,
}: {
  client: Client & { tag: Tag | null; source: Source | null };
}) {
  const normalizeNamePart = (name: unknown) => {
    if (typeof name !== "string") return "";

    const trimmed = name.trim();
    const lowered = trimmed.toLowerCase();

    if (!trimmed || lowered === "null" || lowered === "undefined") {
      return "";
    }

    return trimmed;
  };

  const fullName = [client.firstName, client.lastName]
    .map(normalizeNamePart)
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <div className="mb-3 w-full p-4">
      <h3 className="mb-4 text-xl font-bold tracking-tight text-slate-600">
        Client Details
      </h3>

      {/* Premium Card Container */}
      <div className="relative rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-900/5 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10">
        {/* Action Buttons (Top Right) */}
        <div className="absolute right-4 top-4">
          <div className="flex items-center gap-2">
            {/* Chat Link */}
            <Link
              href={`/dashboard/communication/client/${client.id}?chat=true`}
              className="group p-1 text-primary transition-all duration-300 hover:scale-[1.1] hover:shadow-lg hover:shadow-primary/20 rounded-full"
              title="Open Chat"
            >
              <MessageCircleMore className="h-4 w-4" />
            </Link>

            {/* Edit Button */}
            <EditClient client={client} settingIcon />
          </div>
        </div>

        {/* Profile and Details Wrapper */}
        <div className="flex w-full flex-col items-center gap-6 pt-6 lg:flex-row lg:items-start lg:pt-0">
          {/* Avatar Area */}
          <div className="shrink-0">
            <Avatar
              photo={
                client?.photo?.includes("autoworx-production")
                  ? client.photo
                  : "/images/default.png"
              }
              width={100}
              height={100}
            />
          </div>

          {/* Details Grid */}
          <div className="w-full divide-y divide-slate-100 lg:w-3/5">
            <DataField label="Name" value={fullName} />
            <DataField label="Company" value={client.customerCompany || ""} />
            <DataField label="Email" value={client.email || ""} />
            <DataField label="Phone" value={client.mobile || ""} />
            <DataField label="Address" value={client.address || ""} />
          </div>
        </div>

        {/* Tags Section */}
        <div className="mt-6 flex items-center gap-x-4 border-t border-slate-100 pt-4">
          {client.source?.name && (
            <div className="flex items-center gap-4">
              <label className="block w-24 shrink-0 text-sm font-medium text-slate-500 lg:w-28">
                Source:
              </label>
              <span className="text-sm font-medium text-slate-600">
                {client.source?.name || "Manual Entry"}
              </span>
            </div>
          )}

          {client.tag && (
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider shadow-md"
              style={{
                backgroundColor: client.tag.bgColor,
                color: client.tag.textColor,
              }}
            >
              {client.tag.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
