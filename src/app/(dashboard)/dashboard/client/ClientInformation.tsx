import Avatar from "@/components/Avatar";
import { Client, Source, Tag } from "@prisma/client";
import React from "react";
import EditClient from "./EditClient";
import Link from "next/link";
import { MessageCircleMore } from "lucide-react";

export default function ClientInformation({
  client,
}: {
  client: Client & { tag: Tag | null; source: Source | null };
}) {
  return (
    <div className="mb-3 hidden w-full p-2 lg:block">
      <h3 className="text-lg font-semibold">Client Details</h3>
      <div className="rounded-md border border-gray-200 p-3">
        <div className="relative flex w-full items-center rounded pt-8">
          <div className="absolute right-1 top-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/communication/client/${client.id}?chat=true`}
              >
                <MessageCircleMore className="w-4 h-4 text-[#6571FF]" />
              </Link>
              <EditClient client={client} settingIcon />
            </div>
          </div>
          <div className="mr-8 flex flex-col items-center">
            <Avatar photo={client.photo} width={100} height={100} />
          </div>

          <div className="w-full space-y-2 text-sm">
            <div className="mb-1 flex items-center">
              <label className="mr-6 block w-20 text-gray-600">Name</label>
              <input
                type="text"
                value={client.firstName + " " + client.lastName}
                readOnly
                className="block w-full rounded border border-gray-200 px-4 py-2 text-gray-600"
              />
            </div>
            <div className="mb-1 flex items-center">
              <label className="mr-6 block w-20 text-gray-600">Email</label>
              <input
                type="email"
                value={client.email!}
                readOnly
                className="block w-full rounded border border-gray-200 px-4 py-2 text-gray-600"
              />
            </div>
            <div className="mb-1 flex items-center">
              <label className="mr-6 block w-20 text-gray-600">Phone</label>
              <input
                type="text"
                value={client.mobile!}
                readOnly
                className="block w-full rounded border border-gray-200 px-4 py-2 text-gray-600"
              />
            </div>
            <div className="flex items-center">
              <label className="mr-6 block w-20 text-gray-600">Address</label>
              <input
                type="text"
                value={`${client.address || ""} ${client.city || ""} ${client.state || ""} ${client.zip || ""}`}
                readOnly
                className="block w-full rounded border border-gray-200 px-4 py-2 text-gray-600"
              />
            </div>
          </div>
        </div>
        <div className="tags mt-4 flex items-center gap-x-4">
          {client.tag && (
            <span
              className="rounded-sm px-3 py-1 text-xs"
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
