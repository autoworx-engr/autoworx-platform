'use client';

import Selector from '@/components/Selector';
import { useListsStore } from '@/stores/lists';
import { Client } from '@prisma/client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import Avatar from '../Avatar';
import NewCustomer from './NewCustomer';
import { SelectProps } from './select-props';
import useClientListQuery from '@/hooks/query-hook/useClientListQuery';

export function SelectClient({
  name = 'clientId',
  value = null,
  setValue,
  openDropdown,
  setOpenDropdown,
  invoice,
}: SelectProps<Client | null>) {
  const state = useState(value);
  const [client, setClient] = setValue ? [value, setValue] : state;
  // const clientList = useListsStore((x) => x.customers);
  const { data: clientList = [] } = useClientListQuery();
  const newAddedCustomer = useListsStore((x) => x.newAddedCustomer);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const params = new URLSearchParams(searchParams!);

  const clientId = params.get('clientId');

  useEffect(() => {
    if (newAddedCustomer && setOpenDropdown) {
      setClient(newAddedCustomer);
      setOpenDropdown(false);
    }
  }, [newAddedCustomer]);

  useEffect(() => {
    if (!invoice) {
      const getClient = clientList?.find(
        (client) => client?.id === Number(clientId)
      );
      getClient && setClient(getClient);
    }
  }, [clientList]);

  useEffect(() => {
    const getClient = clientList?.find(
      (client) => client?.id === Number(clientId)
    );
    getClient && useListsStore.setState({ client: getClient });
    getClient && setClient(getClient);
  }, [clientId]);

  // Set client id in params when client changes
  const handleSetParams = (client: Client) => {
    params.set('clientId', client.id.toString());
    replace(`${pathname}?${params.toString()}`);
    useListsStore.setState({ newAddedVehicle: null });
    client && useListsStore.setState({ client });
  };

  return (
    <>
      <input type="hidden" name={name} value={client?.id ?? ''} />

      <Selector
        label={(client: Client | null) =>
          client ? `${client.firstName} ${client.lastName ?? ''}` : 'Client'
        }
        // disabledDropdown={client?.fromRequest!}
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
          <div onClick={() => handleSetParams(client)} className="flex gap-3">
            <Avatar photo={client.photo} width={50} height={50} />
            <div>
              <h3 className="font-bold">
                {`${client.firstName} ${client.lastName ?? ''}`}{' '}
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
        onSearch={(search: string) =>
          clientList.filter((client) =>
            `${client.firstName} ${client.lastName}`
              .toLowerCase()
              .includes(search.toLowerCase())
          )
        }
        openState={[
          openDropdown as boolean,
          setOpenDropdown as Dispatch<SetStateAction<boolean>>,
        ]}
        selectedItem={client}
        setSelectedItem={setClient}
      />
    </>
  );
}
