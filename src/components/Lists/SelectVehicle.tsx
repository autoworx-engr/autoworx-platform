"use client";

import Selector from "@/components/Selector";
import { useListsStore } from "@/stores/lists";
import { Vehicle } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import NewVehicle from "./NewVehicle";
import { SelectProps } from "./select-props";

export function SelectVehicle({
  name = "vehicleId",
  value = null,
  setValue,
  openDropdown,
  setOpenDropdown,
}: SelectProps<Vehicle | null>) {
  const state = useState(value);
  const [vehicle, setVehicle] = setValue ? [value, setValue] : state;
  const vehicleList = useListsStore((x) => x.vehicles);
  const newAddedVehicle = useListsStore((x) => x.newAddedVehicle);

  const search = useSearchParams();
  const clientId = search?.get("clientId");

  useEffect(() => {
    const clientVehicles = clientId
      ? vehicleList?.filter((vehicle) => vehicle.clientId === +clientId)
      : [];

    const selectedVehicle = newAddedVehicle
      ? newAddedVehicle
      : clientVehicles?.[0];

    if (clientId) {
      if (clientVehicles?.length > 0 && !value) {
        setVehicle(selectedVehicle);
        useListsStore.setState({ vehicle: selectedVehicle });
      } else {
        const vehicle = clientVehicles?.find(
          (vehicle) => vehicle.id === value?.id,
        );
        if (vehicle) {
          const selectedVehicle = newAddedVehicle ? newAddedVehicle : value;
          setVehicle(selectedVehicle);
          useListsStore.setState({ vehicle: selectedVehicle });
        } else {
          setVehicle(selectedVehicle);
          useListsStore.setState({ vehicle: selectedVehicle });
        }
      }
    }
  }, [newAddedVehicle, clientId, vehicleList]);

  useEffect(() => {
    return () => {
      if (newAddedVehicle) {
        useListsStore.setState({ newAddedVehicle: null });
      }
    };
  }, []);

  return (
    <>
      <input type="hidden" name={name} value={vehicle?.id ?? ""} />

      <Selector
        disabledDropdown={clientId && !vehicle?.fromRequest ? false : true}
        label={(vehicle: Vehicle | null) =>
          vehicle
            ? `${vehicle.year?.toString() ?? ""} ${vehicle?.make ?? ""} ${vehicle?.model ?? ""}`
            : "Vehicle"
        }
        newButton={
          <NewVehicle
            clientId={Number(clientId)}
            onAdd={(vehicle: Vehicle) => {
              setVehicle(vehicle);
              useListsStore.setState({ vehicle });
              useListsStore.setState(({ vehicles }) => ({
                vehicles: [...vehicles, vehicle],
                newAddedVehicle: vehicle,
              }));
              vehicle && setOpenDropdown && setOpenDropdown(false);
            }}
          />
        }
        items={vehicleList?.filter(
          (vehicle) => vehicle.clientId === +clientId!,
        )}
        onSearch={(search: string) =>
          vehicleList.filter((vehicle) =>
            vehicle.model?.toLowerCase().includes(search.toLowerCase()),
          )
        }
        openState={[
          openDropdown as boolean,
          setOpenDropdown as Dispatch<SetStateAction<boolean>>,
        ]}
        selectedItem={vehicle}
        // setSelectedItem={setVehicle}
        onSelect={(vehicle) => {
          setVehicle(vehicle);
          useListsStore.setState({ vehicle, newAddedVehicle: null });
        }}
        displayList={(item) => {
          return (
            <p>{`${item.year?.toString() ?? ""} ${item?.make ?? ""} ${item?.model ?? ""}`}</p>
          );
        }}
      />
    </>
  );
}
