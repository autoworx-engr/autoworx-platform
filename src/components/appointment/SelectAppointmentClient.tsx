"use client";

import Selector from "@/components/Selector";
import { useListsStore } from "@/stores/lists";
import { Client } from "@prisma/client";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import Avatar from "../Avatar";

import useClientListInfiniteQuery from "@/hooks/query-hook/useClientListInfiniteQuery";
import { queryKeys } from "@/lib/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import NewCustomer from "../Lists/NewCustomer";
import { SelectProps } from "../Lists/select-props";

export function SelectAppointmentClient({
  name = "clientId",
  clientId = null,
  fromLead = false,
  value = null,
  setValue,
  openDropdown,
  setOpenDropdown,
  setIsAppointmentModalOpen,
}: SelectProps<Partial<
  Client & {
    Lead: { id: number; companyId: number; columnId: number };
  }
> | null>) {
  const state = useState(value);
  const [client, setClient] = setValue ? [value, setValue] : state;
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useClientListInfiniteQuery(debouncedSearchTerm);
  const clientList = data?.pages.flatMap((page) => page.clients) ?? [];

  const newAddedCustomer = useListsStore((x) => x.newAddedCustomer);
  const queryClient = useQueryClient();
  const pathname = usePathname();

  // Guard so we only auto-select the initial client once, not on every clientList refetch
  const initialClientSet = useRef(false);
  // Ids already looked up, resolved or not. This effect re-runs on every render
  // (clientList is a fresh array each time), so without it a client id that
  // can't be resolved — Lead.clientId has no foreign key and may point at a
  // deleted client — would refetch in an endless loop.
  const attemptedClientId = useRef<number | null>(null);
  // Drives the spinner while the prefilled client is still being resolved.
  const [isResolvingClient, setIsResolvingClient] = useState(false);

  useEffect(() => {
    if (initialClientSet.current) return;
    if (!clientId) return;

    if (!fromLead) {
      const matchedClient = clientList.find((c) => c.id === clientId);
      if (matchedClient) {
        initialClientSet.current = true;
        setClient(matchedClient);
        return;
      }
    }

    if (attemptedClientId.current === clientId) return;
    attemptedClientId.current = clientId;
    setIsResolvingClient(true);
    fetch(`/api/client/client-details/${clientId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          initialClientSet.current = true;
          setClient(data.data);
        }
      })
      .catch(() => {})
      // Cleared on failure too, so a bad response can't spin forever.
      .finally(() => setIsResolvingClient(false));
  }, [fromLead, clientId, clientList]);

  useEffect(() => {
    if (newAddedCustomer && setOpenDropdown) {
      setClient(newAddedCustomer);
      setOpenDropdown(false);
      queryClient.setQueryData(
        [queryKeys.clientList],
        (oldData: Client[] | undefined) => {
          return oldData ? [...oldData, newAddedCustomer] : [newAddedCustomer];
        },
      );
    }
  }, [newAddedCustomer]);

  // Set client id in params when client changes
  const handleSetParams = (client: Partial<Client>) => {
    setClient(client);
    useListsStore.setState({ newAddedVehicle: null });
  };

  return (
    <>
      <input type="hidden" name={name} value={client?.id ?? ""} />

      <Selector
        className="min-w-full"
        label={(client: Partial<Client> | null) =>
          client ? `${client.firstName} ${client.lastName ?? ""}` : "Client"
        }
        // A lead's client is fixed, but only once it actually resolved —
        // an unresolvable id would otherwise leave an empty locked field.
        disabledDropdown={Boolean(
          (fromLead && (client || isResolvingClient)) || client?.fromRequest,
        )}
        newButton={
          <NewCustomer
            // @ts-ignore
            setClient={(client: Client) => {
              if (pathname.includes("/dashboard/client")) {
                return;
              }
              setClient(client);
              client && handleSetParams(client);
            }}
          />
        }
        displayList={(client: Partial<Client>) => (
          <div onClick={() => handleSetParams(client)} className="flex gap-3">
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
              <p>
                {client.mobile} {client.email}
              </p>
            </div>
          </div>
        )}
        items={clientList}
        isLoading={isResolvingClient}
        onSearch={(search: string) => {
          setSearchTerm(search);
          return clientList;
        }}
        openState={[
          openDropdown as boolean,
          setOpenDropdown as Dispatch<SetStateAction<boolean>>,
        ]}
        selectedItem={client}
        setSelectedItem={setClient}
        useInfiniteScroll
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    </>
  );
}
