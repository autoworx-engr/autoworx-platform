/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { SelectClient } from "@/components/Lists/SelectClient";
import { SelectStatus } from "@/components/Lists/SelectStatus";
import { SelectVehicle } from "@/components/Lists/SelectVehicle";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import {
  Client,
  Column,
  Invoice,
  InvoiceTemplate,
  RequestEstimate,
  Vehicle,
} from "@prisma/client";
import { customAlphabet } from "nanoid";
import { useEffect, useState } from "react";
import { CreateEstimateActionsButtons } from "./CreateEstimateActionButtons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlimInput } from "@/components/SlimInput";
import SelectTemplate from "./SelectTemplate";
import { useListsStore } from "@/stores/lists";

export default function Header({
  id,
  vehicle,
  client,
  status,
  invoice,
  isAllServicesCompleted,
  isEdit = false,
  selectedTemplate,
  requestEstimate,
}: {
  id?: string;
  vehicle?: Vehicle;
  client?: Client;
  status?: Column;
  invoice?: Invoice;
  isAllServicesCompleted?: boolean;
  isEdit?: boolean;
  selectedTemplate?: InvoiceTemplate | null;
  requestEstimate?: any;
}) {
  const {
    invoiceId,
    setInvoiceId,
    setTitle,
    title,
    template,
    setTemplate,
    grandTotal,
  } = useEstimateCreateStore();
  const { status: selectedStatus } = useListsStore();

  //dropdown states
  const [clientOpenDropdown, setClientOpenDropdown] = useState(false);
  const [templateOpenDropdown, setTemplateOpenDropdown] = useState(false);
  const [vehicleOpenDropdown, setVehicleOpenDropdown] = useState(false);
  const [statusOpenDropdown, setStatusOpenDropdown] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isTemplate = pathname.includes("templates");
  const isEstimateCreate = pathname.includes("estimate/create");
  const isEstimateEdit = pathname.includes("estimate/edit");

  useEffect(() => {
    if (!id) setInvoiceId(customAlphabet("1234567890", 10)());
  }, [id]);

  useEffect(() => {
    if (client) {
      const params = new URLSearchParams(searchParams?.toString());
      const existingClientId = params.get("clientId");
      if (existingClientId === client.id.toString()) return;
      params.set("clientId", client.id.toString());
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, []);

  useEffect(() => {
    if (template) {
      const params = new URLSearchParams(searchParams?.toString());
      const existingTemplateId = params.get("templateId");
      if (existingTemplateId === template.id) return;
      params.set("templateId", template?.id);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [template]);

  useEffect(() => {
    if (clientOpenDropdown && (vehicleOpenDropdown || statusOpenDropdown)) {
      setVehicleOpenDropdown(false);
      setStatusOpenDropdown(false);
    } else if (
      vehicleOpenDropdown &&
      (clientOpenDropdown || statusOpenDropdown)
    ) {
      setClientOpenDropdown(false);
      setStatusOpenDropdown(false);
    } else if (
      statusOpenDropdown &&
      (clientOpenDropdown || vehicleOpenDropdown)
    ) {
      setClientOpenDropdown(false);
      setVehicleOpenDropdown(false);
    } else if (
      templateOpenDropdown &&
      (clientOpenDropdown || vehicleOpenDropdown || statusOpenDropdown)
    ) {
      setClientOpenDropdown(false);
      setVehicleOpenDropdown(false);
      setStatusOpenDropdown(false);
    }
  }, [
    statusOpenDropdown,
    clientOpenDropdown,
    vehicleOpenDropdown,
    templateOpenDropdown,
  ]);

  return (
    <div className="col-start-1 flex flex-wrap items-center gap-3 rounded-md">
      <div className="rounded-lg bg-stone-200/80 px-3 py-1 font-mono font-semibold text-slate-600/70">
        {invoiceId || template?.id}
      </div>

      {!isTemplate && (
        <CreateEstimateActionsButtons
          status={status! || selectedStatus}
          requestEstimate={requestEstimate}
        />
      )}

      <div className="flex basis-full flex-wrap items-end gap-3">
        {isTemplate ? (
          <SlimInput
            name="title"
            className="py-[5px] mx-0.5 rounded-lg"
            required
            value={title}
            placeholder="Enter a Title"
            onChange={(e) => setTitle(e.target.value)}
          />
        ) : (
          <>
            <SelectClient
              value={client}
              openDropdown={clientOpenDropdown}
              setOpenDropdown={setClientOpenDropdown}
              invoice={invoice}
              confirmOnChange={isEdit}
            />
            <SelectVehicle
              value={vehicle}
              openDropdown={vehicleOpenDropdown}
              setOpenDropdown={setVehicleOpenDropdown}
              invoice={invoice}
              isClear={true}
              isEdit={isEdit}
            />
          </>
        )}

        <SelectStatus
          key={template ? template.id : "no-template"}
          value={status || selectedStatus}
          open={statusOpenDropdown}
          setOpen={setStatusOpenDropdown}
          isAllServicesCompleted={isAllServicesCompleted}
        />
        {!isTemplate &&
          (isEstimateCreate ||
            (isEstimateEdit && template) ||
            (isEstimateEdit && grandTotal === 0)) && (
            <SelectTemplate
              openDropdown={templateOpenDropdown}
              setOpenDropdown={setTemplateOpenDropdown}
              setValue={setTemplate}
              value={template || selectedTemplate}
              name="templateId"
            />
          )}
      </div>
    </div>
  );
}
