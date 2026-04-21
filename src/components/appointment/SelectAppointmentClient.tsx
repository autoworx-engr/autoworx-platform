"use client";

import Selector from "@/components/Selector";
import { useListsStore } from "@/stores/lists";
import { Client } from "@prisma/client";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import Avatar from "../Avatar";

import useClientListQuery from "@/hooks/query-hook/useClientListQuery";
import { queryKeys } from "@/lib/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import NewCustomer from "../Lists/NewCustomer";
import { SelectProps } from "../Lists/select-props";
import { usePathname } from "next/navigation";
import useClientListInfiniteQuery from "@/hooks/query-hook/useClientListInfiniteQuery";

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

  useEffect(() => {
    if (clientId && clientList.length > 0) {
      const matchedClient = clientList.find((c) => c.id === clientId);
      if (matchedClient) {
        setClient(matchedClient);
      } else {
        setClient(null);
      }
    }
  }, [clientId, clientList]);

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
        disabledDropdown={Boolean(
          (fromLead && clientId) || client?.fromRequest,
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
