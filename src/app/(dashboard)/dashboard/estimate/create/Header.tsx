"use client";

import { SelectClient } from "@/components/Lists/SelectClient";
import { SelectStatus } from "@/components/Lists/SelectStatus";
import { SelectVehicle } from "@/components/Lists/SelectVehicle";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { Client, Column, Invoice, Vehicle } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { useEffect, useState } from "react";
import { CreateEstimateActionsButtons } from "./CreateEstimateActionButtons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlimInput } from "@/components/SlimInput";

export default function Header({
  id,
  vehicle,
  client,
  status,
  invoice,
  isAllServicesCompleted,
  isEdit = false,
}: {
  id?: string;
  vehicle?: Vehicle;
  client?: Client;
  status?: Column;
  invoice?: Invoice;
  isAllServicesCompleted?: boolean;
  isEdit?: boolean;
}) {
  const { invoiceId, setInvoiceId, setTitle, title } = useEstimateCreateStore();

  //dropdown states
  const [clientOpenDropdown, setClientOpenDropdown] = useState(false);
  const [vehicleOpenDropdown, setVehicleOpenDropdown] = useState(false);
  const [statusOpenDropdown, setStatusOpenDropdown] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isTemplate = pathname.includes("templates");
  useEffect(() => {
    if (!id) setInvoiceId(customAlphabet("1234567890", 10)());
  }, [id]);

  useEffect(() => {
    if (client) {
      const params = new URLSearchParams(searchParams?.toString());
      params.set("clientId", client.id.toString());
      router.push(`${pathname}?${params.toString()}`);
    }
  }, []);

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
    }
  }, [statusOpenDropdown, clientOpenDropdown, vehicleOpenDropdown]);

  return (
    <div className="app-shadow col-start-1 flex flex-wrap items-center gap-3 rounded-md p-3">
      <div className="mr-auto flex gap-1">
        <p>{invoiceId}</p>
      </div>

      <CreateEstimateActionsButtons status={status!} />

      <div className="flex basis-full flex-wrap items-end gap-3">
        {isTemplate ? (
          <SlimInput
            name="title"
            className="py-2"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        ) : (
          <>
            <SelectClient
              value={client}
              openDropdown={clientOpenDropdown}
              setOpenDropdown={setClientOpenDropdown}
              invoice={invoice}
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
          value={status}
          open={statusOpenDropdown}
          setOpen={setStatusOpenDropdown}
          isAllServicesCompleted={isAllServicesCompleted}
        />
      </div>
    </div>
  );
}
