"use client";

import Selector from "@/components/Selector";
import { useListsStore } from "@/stores/lists";
import { Client } from "@prisma/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import Avatar from "../Avatar";
import NewCustomer from "./NewCustomer";
import { SelectProps } from "./select-props";
import useClientListInfiniteQuery from "@/hooks/query-hook/useClientListInfiniteQuery";
import { Popconfirm } from "antd";

const clientName = (client: Client | null) =>
  client ? `${client.firstName} ${client.lastName ?? ""}`.trim() : "";

export function SelectClient({
  name = "clientId",
  value = null,
  setValue,
  openDropdown,
  setOpenDropdown,
  invoice,
  confirmOnChange = false,
}: SelectProps<Client | null>) {
  const state = useState(value);
  const [client, setClient] = setValue ? [value, setValue] : state;
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Use infinite query for client list

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useClientListInfiniteQuery(debouncedSearchTerm);

  // Flatten the infinite data into a single array`

  const clientList = data?.pages.flatMap((page) => page.clients) ?? [];

  const newAddedCustomer = useListsStore((x) => x.newAddedCustomer);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const params = new URLSearchParams(searchParams!);

  const clientId = params.get("clientId");
  const initialClientSet = useRef(false);

  const [pendingClient, setPendingClient] = useState<Client | null>(null);
  const [selectorKey, setSelectorKey] = useState(0);

  useEffect(() => {
    if (newAddedCustomer && setOpenDropdown) {
      setClient(newAddedCustomer);
      setOpenDropdown(false);
    }
  }, [newAddedCustomer]);

  // Auto-select from URL clientId — guard with ref so clientList refetches don't loop
  useEffect(() => {
    if (initialClientSet.current || !clientId) return;
    if (!invoice) {
      const getClient = clientList?.find(
        (client: Client) => client?.id === Number(clientId),
      );
      if (getClient) {
        initialClientSet.current = true;
        setClient(getClient);
      }
    }
  }, [clientList]);

  useEffect(() => {
    initialClientSet.current = false;
  }, [clientId]);

  useEffect(() => {
    const getClient = clientList?.find(
      (client: Client) => client?.id === Number(clientId),
    );
    getClient && useListsStore.setState({ client: getClient });
    getClient && setClient(getClient);
  }, [clientId]);

  // Set client id in params when client changes
  const handleSetParams = (client: Client) => {
    params.set("clientId", client.id.toString());
    replace(`${pathname}?${params.toString()}`);
    useListsStore.setState({ newAddedVehicle: null });
    client && useListsStore.setState({ client });
  };

  const applyClient = (next: Client) => {
    setClient(next);
    handleSetParams(next);
  };

  const handleSelect = (next: Client) => {
    if (confirmOnChange && client && client.id !== next.id) {
      setPendingClient(next);
      return;
    }
    applyClient(next);
  };

  const cancelClientChange = () => {
    setPendingClient(null);
    setSelectorKey((key) => key + 1);
  };

  return (
    <>
      <input type="hidden" name={name} value={client?.id ?? ""} />

      <Popconfirm
        open={!!pendingClient}
        title="Change client?"
        description={`Switching to ${clientName(
          pendingClient,
        )} will also replace the selected vehicle with one of theirs.`}
        okText="Yes, change"
        cancelText="Cancel"
        placement="bottomLeft"
        onConfirm={() => {
          applyClient(pendingClient!);
          setPendingClient(null);
        }}
        onCancel={cancelClientChange}
        overlayClassName="[&_.ant-popover-inner]:rounded-2xl [&_.ant-popover-inner]:p-4 [&_.ant-popover-message-title]:font-semibold [&_.ant-popover-message-title]:text-slate-800"
        okButtonProps={{
          className:
            "!rounded-lg !border-none !bg-[#6571ff] !font-semibold !shadow-sm !shadow-[#6571ff]/30 hover:!bg-[#525ceb]",
        }}
        cancelButtonProps={{
          className:
            "!rounded-lg !border-slate-200 !font-medium !text-slate-600 hover:!border-slate-300 hover:!bg-slate-50 hover:!text-slate-700",
        }}
      >
        <div className="max-w-[300px]">
          <Selector
            key={selectorKey}
            className="max-w-[300px]"
            label={(client: Client | null) =>
              client ? `${client.firstName} ${client.lastName ?? ""}` : "Client"
            }
            newButton={
              <NewCustomer
                // @ts-ignore
                setClient={(client: Client) => {
                  setClient(client);
                  client && handleSetParams(client);
                }}
              />
            }
            displayList={(client: Client) => (
              <div className="flex gap-3">
                <Avatar photo={client.photo} width={50} height={50} />
                <div>
                  <h3 className="font-bold">
                    {`${client.firstName} ${client.lastName ?? ""}`}{" "}
                    {client?.isFleet && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        Fleet
                      </span>
                    )}
                  </h3>
                  <p>{client.mobile}</p>
                </div>
              </div>
            )}
            items={clientList}
            onSearch={(search: string) => {
              setSearchTerm(search);
              return clientList;
            }}
            openState={[
              openDropdown as boolean,
              setOpenDropdown as Dispatch<SetStateAction<boolean>>,
            ]}
            selectedItem={client}
            onSelect={handleSelect}
            useInfiniteScroll={true}
            hasNextPage={hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={isFetchingNextPage}
          />
        </div>
      </Popconfirm>
    </>
  );
}
