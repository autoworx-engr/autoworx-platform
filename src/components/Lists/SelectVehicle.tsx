"use client";

import Selector from "@/components/Selector";
import { cn } from "@/lib/cn";
import { useListsStore } from "@/stores/lists";
import { Vehicle } from "@prisma/client";
import { Plus } from "lucide-react";
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
  isClear = false,
  isEdit = false,
}: SelectProps<Vehicle | null>) {
  const state = useState(value);
  const [vehicle, setVehicle] = setValue ? [value, setValue] : state;
  const vehicleList = useListsStore((x) => x.vehicles);
  const newAddedVehicle = useListsStore((x) => x.newAddedVehicle);

  const search = useSearchParams();
  const clientId = search?.get("clientId");

  useEffect(() => {
    if (!vehicleList?.length) return;

    const clientVehicles = clientId
      ? vehicleList?.filter((vehicle) => vehicle.clientId === +clientId)
      : [];

    const selectedVehicle = newAddedVehicle ?? clientVehicles?.[0];

    if (clientId) {
      if (clientVehicles?.length > 0 && !value) {
        if (isEdit == false) {
          setVehicle(selectedVehicle);
          useListsStore.setState({ vehicle: selectedVehicle });
        }
      } else {
        const matchedVehicle = clientVehicles?.find(
          (vehicle) => vehicle.id === value?.id,
        );
        const finalVehicle = matchedVehicle ?? value ?? selectedVehicle;
        setVehicle(finalVehicle);
        useListsStore.setState({ vehicle: finalVehicle });
      }
    }
  }, [newAddedVehicle, clientId, vehicleList, isEdit, setVehicle, value]);

  useEffect(() => {
    return () => {
      if (newAddedVehicle) {
        useListsStore.setState({ newAddedVehicle: null });
      }
    };
  }, [newAddedVehicle]);

  const handleClear = () => {
    setVehicle(null);
    useListsStore.setState({ vehicle: null, newAddedVehicle: null });
  };

  return (
    <>
      <input type="hidden" name={name} value={vehicle?.id ?? ""} />

      <Selector
        className={cn(vehicle ? "w-[200px]" : "w-[150px]")}
        // disabledDropdown={clientId && !vehicle?.fromRequest ? false : true}
        label={(vehicle: Vehicle | null) =>
          vehicle
            ? `${vehicle.year || ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""} ${vehicle.other ?? ""}`
            : "Vehicle"
        }
        newButton={
          clientId && (
            <NewVehicle
              clientId={Number(clientId)}
              newButton={
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[#5A65F0]"
                >
                  <Plus className="w-4 h-4" /> New Vehicle
                </button>
              }
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
          )
        }
        items={vehicleList?.filter(
          (vehicle) => vehicle.clientId === +clientId!,
        )}
        onSearch={(search: string) =>
          vehicleList.filter(
            (vehicle) =>
              vehicle.make?.toLowerCase().includes(search.toLowerCase()) ||
              vehicle.model?.toLowerCase().includes(search.toLowerCase()) ||
              vehicle.other?.toLowerCase().includes(search.toLowerCase()),
          )
        }
        openState={[
          openDropdown as boolean,
          setOpenDropdown as Dispatch<SetStateAction<boolean>>,
        ]}
        selectedItem={vehicle}
        onSelect={(vehicle) => {
          setVehicle(vehicle);
          useListsStore.setState({ vehicle, newAddedVehicle: null });
        }}
        displayList={(item) => (
          <p>{`${item.year || ""} ${item.make ?? ""} ${item.model ?? ""} ${item.other ?? ""}`}</p>
        )}
        footer={
          isClear && vehicle ? (
            <button
              type="button"
              onClick={() => {
                handleClear();
                setOpenDropdown && setOpenDropdown(false);
              }}
              className="flex w-full items-center justify-center rounded-md border border-red-200 bg-red-50/70 px-3 py-2 text-sm font-semibold text-red-400 transition-colors duration-150 hover:bg-red-50"
            >
              Clear Vehicle
            </button>
          ) : null
        }
      />
    </>
  );
}
