"use client";

import Selector from "@/components/Selector";
import { InvoiceTemplate } from "@prisma/client";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import useTemplateListInfiniteQuery from "@/hooks/query-hook/useTemplateListInfiniteQuery";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEstimateCreateStore } from "@/stores/estimate-create";

interface SelectTemplateProps {
  name?: string;
  value?: InvoiceTemplate | null;
  setValue?: any;
  openDropdown?: boolean;
  setOpenDropdown?: Dispatch<SetStateAction<boolean>>;
}

export default function SelectTemplate({
  value = null,
  setValue,
  openDropdown,
  setOpenDropdown,
}: SelectTemplateProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = useState(value);
  const [template, setTemplate] = setValue ? [value, setValue] : state;
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Infinite query
  const { data: templateList, isLoading } =
    useTemplateListInfiniteQuery(debouncedSearchTerm);

  const handleSelect = (t: InvoiceTemplate | null) => {
    setTemplate(t);
  };

  const handleClear = () => {
    setTemplate(null);

    // remove everything the template added, restoring whatever was there before it was applied
    const { templateSnapshot } = useEstimateCreateStore.getState();
    if (templateSnapshot) {
      useEstimateCreateStore.setState({
        ...templateSnapshot,
        templateSnapshot: null,
      });
    } else {
      useEstimateCreateStore.setState({
        items: [],
        tasks: [],
        photos: [],
        subtotal: 0,
        discount: 0,
        tax: 0,
        serviceFee: 0,
        vehicleExtraCost: 0,
        deposit: 0,
        grandTotal: 0,
        due: 0,
        internalNotes: "",
        terms: "",
        policy: "",
        customerNotes: "",
        customerComments: "",
        damageNotes: "",
        title: "",
        currentSelectedCategoryId: null,
        inspections: Array.from({ length: 15 }, () => ({
          title: "",
          driver: false,
          passenger: false,
          notes: "",
        })),
      });
    }

    const params = new URLSearchParams(searchParams?.toString());
    params.delete("templateId"); // <-- remove the param

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      <input type="hidden" name={"templateId"} value={template?.id ?? ""} />

      <Selector
        className="w-[150px]"
        label={(t: InvoiceTemplate | null) => t?.title ?? "Template"}
        newButton={null}
        displayList={(t: InvoiceTemplate) => (
          <div
            onClick={() => handleSelect(t)}
            className="flex flex-col gap-1 cursor-pointer p-2 hover:bg-gray-100"
          >
            <h3 className="font-bold">{t.title}</h3>
          </div>
        )}
        items={templateList || []}
        onSearch={(search: string) => {
          setSearchTerm(search);
          return templateList || [];
        }}
        isLoading={isLoading}
        openState={[
          openDropdown as boolean,
          setOpenDropdown as Dispatch<SetStateAction<boolean>>,
        ]}
        selectedItem={template}
        setSelectedItem={setTemplate}
        // useInfiniteScroll
        // hasNextPage={hasNextPage}
        // fetchNextPage={fetchNextPage}
        // isFetchingNextPage={isFetchingNextPage}
        footer={
          template ? (
            <button
              type="button"
              onClick={() => {
                handleClear();
                setOpenDropdown && setOpenDropdown(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Clear Template
            </button>
          ) : null
        }
      />
    </>
  );
}
