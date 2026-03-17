"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTriggerCreate,
} from "@/app/(dashboard)/dashboard/estimate/TabsNav";
import { CreateTab } from "@/app/(dashboard)/dashboard/estimate/create/tabs/CreateTab";
import TemplateAttachmentTab from "@/app/(dashboard)/dashboard/estimate/templates/TemplateAttachmentTab";
import TemplateInspectionTab from "@/app/(dashboard)/dashboard/estimate/templates/TemplateInspectionTab";
import ServiceInfo from "./ServiceInfo";
import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import { SelectStatus } from "@/components/Lists/SelectStatus";
import { SlimInput } from "@/components/SlimInput";
import Create from "@/app/(dashboard)/dashboard/estimate/create/Create";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { Column } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_STATUS: Column = {
  id: 0,
  title: "Pending",
  type: "shop",
  order: 0,
  companyId: 0,
  textColor: "#64748B",
  bgColor: "#FFFFFF",
};

function ServiceCreateHeader() {
  const { invoiceId, setInvoiceId, title, setTitle } = useEstimateCreateStore();
  const [statusOpenDropdown, setStatusOpenDropdown] = useState(false);

  useEffect(() => {
    if (!invoiceId) {
      setInvoiceId(customAlphabet("1234567890", 10)());
    }
  }, [invoiceId, setInvoiceId]);

  return (
    <div className="col-start-1 flex flex-wrap items-center gap-3 rounded-md">
      <div className="rounded-lg bg-stone-200/80 px-3 py-1 font-mono font-semibold text-slate-600/70">
        {invoiceId || "0000000000"}
      </div>

      <div className="flex basis-full flex-wrap items-end gap-3">
        <SlimInput
          name="title"
          className="mx-0.5 rounded-lg py-[5px]"
          required
          value={title}
          placeholder="Enter a title"
          onChange={(e) => setTitle(e.target.value)}
        />

        <SelectStatus
          value={DEFAULT_STATUS}
          open={statusOpenDropdown}
          setOpen={setStatusOpenDropdown}
        />
      </div>
    </div>
  );
}

function ServiceBillSummary() {
  const {
    items,
    subtotal,
    discount,
    grandTotal,
    tax,
    serviceFee,
    deposit,
    totalPayment,
    setSubtotal,
    setDiscount,
    setGrandTotal,
    setDue,
  } = useEstimateCreateStore();

  const [isTaxEnabled, setIsTaxEnabled] = useState(true);
  const [isSuppliesEnabled, setIsSuppliesEnabled] = useState(true);

  const computedTax = isTaxEnabled ? tax : 0;
  const computedServiceFee = isSuppliesEnabled ? serviceFee : 0;

  useEffect(() => {
    let newServicesTotal = 0;
    let newDiscountTotal = 0;

    items.forEach((item) => {
      const { service, materials, labor } = item;

      if (!service) return;

      const materialCost = materials.reduce((acc, material) => {
        return (
          acc +
          (material && material.sell
            ? parseFloat(material.sell.toString()) * Number(material.quantity!)
            : 0)
        );
      }, 0);

      const materialDiscount = materials.reduce((acc, material) => {
        return (
          acc +
          (material && material.discount
            ? parseFloat(material.discount.toString())
            : 0)
        );
      }, 0);

      const laborCost = labor?.charge
        ? Number((Number(labor.charge) * Number(labor.hours)).toFixed(2))
        : 0;

      newServicesTotal += materialCost + laborCost;
      newDiscountTotal +=
        materialDiscount +
        (labor?.discount ? parseFloat(labor.discount.toString()) : 0);
    });

    setSubtotal(newServicesTotal);
    setDiscount(newDiscountTotal);
  }, [items, setDiscount, setSubtotal]);

  useEffect(() => {
    const netAmount = subtotal - discount;
    const taxAdd =
      computedTax > 0 ? Number((netAmount * (computedTax / 100)).toFixed(2)) : 0;
    const suppliesFeeAdd =
      computedServiceFee > 0
        ? Number((netAmount * (computedServiceFee / 100)).toFixed(2))
        : 0;

    setGrandTotal(Number((netAmount + taxAdd + suppliesFeeAdd).toFixed(2)));
  }, [computedServiceFee, computedTax, discount, setGrandTotal, subtotal]);

  useEffect(() => {
    setDue(grandTotal - (deposit + totalPayment));
  }, [deposit, grandTotal, setDue, totalPayment]);

  const summaryRows = useMemo(
    () => [
      ["subtotal", subtotal.toFixed(2)],
      ["discount", discount.toFixed(2)],
      // ["tax", computedTax.toFixed(2)],
      // ["shop supplies", computedServiceFee.toFixed(2)],
      ["deposit", deposit.toFixed(2)],
      ["payment", totalPayment.toFixed(2)],
      ["grand total", grandTotal.toFixed(2)],
    ],
    [
      // computedServiceFee,
      // computedTax,
      deposit,
      discount,
      grandTotal,
      subtotal,
      totalPayment,
    ],
  );

  return (
    <>
      <div className="space-y-1 p-1.5">
        {summaryRows.map(([title, data], index) => {
          const isToggleItem = title === "tax" || title === "shop supplies";
          const toggleState = title === "tax" ? isTaxEnabled : isSuppliesEnabled;
          const toggleSetter =
            title === "tax" ? setIsTaxEnabled : setIsSuppliesEnabled;

          return (
            <div
              key={index}
              className="relative flex items-center justify-between gap-4 rounded-md border border-solid border-slate-600 px-2 py-1"
            >
              <div className="mr-auto text-xs uppercase">{title}</div>

              {isToggleItem && (
                <div
                  onClick={() => toggleSetter((prev) => !prev)}
                  className={`ml-2 flex h-5 w-10 cursor-pointer items-center rounded-full px-1 transition-colors ${toggleState ? "bg-[#6571FF]" : "bg-gray-400"
                    }`}
                >
                  <div
                    className={`h-3 w-3 transform rounded-full bg-white transition-transform ${toggleState ? "translate-x-5" : "translate-x-0"
                      }`}
                  />
                </div>
              )}

              <input
                type="text"
                readOnly
                value={
                  isToggleItem
                    ? `${toggleState ? Number(data).toFixed(2) : 0}%${toggleState && Number(data) > 0
                      ? ` | ${(((subtotal - discount) * Number(data)) / 100).toFixed(2)}`
                      : ""
                    }`
                    : data
                }
                className="w-[130px] rounded-md bg-slate-500 px-2 py-1 text-right text-xs text-white"
              />
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-md bg-[#006d77] p-2 px-4 py-4 text-sm text-white">
        <button
          type="button"
          className="w-full cursor-not-allowed rounded-md bg-gray-500 p-2"
          disabled
        >
          Save Service
        </button>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <div className="gap-3 space-y-4 overflow-clip py-2 md:-my-2 md:min-h-[93vh] xl:flex xl:space-y-0">
      <div className="flex w-full flex-col gap-3 xl:min-w-[68%] ">
        <Title>Service</Title>

        {/* <SyncLists
          title={""}
          customers={[]}
          vehicles={[]}
          categories={[]}
          services={[]}
          materials={[]}
          labors={[]}
          tags={[]}
          vendors={[]}
          statuses={[DEFAULT_STATUS]}
          paymentMethods={[]}
          client={null}
        />

        <ServiceCreateHeader /> */}

        <Tabs
          defaultValue="create"
          className="col-start-1 flex min-h-[40vh] flex-col overflow-clip lg:min-h-[69vh] lg:mt-20"
        >
          <TabsList className="-ml-4 grid grid-cols-4 rounded-bl-none md:inline-flex">
            <TabsTriggerCreate
              value="inspections"
              className="order-4 md:order-1"
            >
              Inspections
            </TabsTriggerCreate>
            <TabsTriggerCreate
              value="attachment"
              className="order-3 md:order-2"
            >
              Attachment
            </TabsTriggerCreate>
            <TabsTriggerCreate value="create" className="order-2 md:order-3">
              Create
            </TabsTriggerCreate>
            <TabsTriggerCreate value="service-info" className="order-1 md:order-4">
              Service Info
            </TabsTriggerCreate>
          </TabsList>

          <TabsContent value="service-info" className="h-full w-full">
            <ServiceInfo />
          </TabsContent>

          <TabsContent value="create" className="h-full w-full">
            <CreateTab />
          </TabsContent>

          <TabsContent value="attachment">
            <TemplateAttachmentTab />
          </TabsContent>

          <TabsContent value="inspections">
            <TemplateInspectionTab />
          </TabsContent>
        </Tabs>
      </div>

      <div className="app-shadow grid w-full flex-grow grid-rows-[1fr,auto,auto] divide-y rounded-md xl:max-w-[32%]">
        <div>
          <Create />
        </div>
        <ServiceBillSummary />
      </div>
    </div>
  );
}
