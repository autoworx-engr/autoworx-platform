"use client";

import Selector from "@/components/Selector";
import { cn } from "@/lib/cn";
import { useListsStore } from "@/stores/lists";
import { Vehicle } from "@prisma/client";
import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import ClearSelectionButton from "./ClearSelectionButton";
import NewVehicle from "./NewVehicle";
import { SelectProps } from "./select-props";

const firstVehicleOf = (vehicles: Vehicle[] | undefined, clientId: string) =>
  vehicles?.find((vehicle) => vehicle.clientId === +clientId) ?? null;

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

  // Mirrors the current selection so the effect below can read it without
  // depending on it — a dependency would make a manual "Clear Vehicle"
  // immediately re-select the client's first vehicle.
  const vehicleRef = useRef(vehicle);
  // Declared before the effect below so the ref is already up to date by the
  // time that one runs in the same commit.
  useEffect(() => {
    vehicleRef.current = vehicle;
  });
  // Set when a client switch left us with nothing to select because the new
  // client's vehicles hadn't arrived from the server yet.
  const awaitingClientRef = useRef<string | null>(null);

  useEffect(() => {
    if (!clientId || Number.isNaN(+clientId)) return;

    const applyVehicle = (next: Vehicle | null) => {
      setVehicle(next);
      useListsStore.setState({ vehicle: next });
    };

    if (newAddedVehicle) {
      awaitingClientRef.current = null;
      applyVehicle(newAddedVehicle);
      return;
    }

    const current = vehicleRef.current;

    if (current && current.clientId === +clientId) {
      awaitingClientRef.current = null;
      if (useListsStore.getState().vehicle?.id !== current.id) {
        useListsStore.setState({ vehicle: current });
      }
      return;
    }

    const first = firstVehicleOf(vehicleList, clientId);

    // A vehicle belongs to exactly one client, so a selection pointing at a
    // different client means the user just switched clients. Drop it and take
    // one of the new client's instead.
    if (current) {
      // `vehicleList` is refetched server-side for the new client and may still
      // be the previous client's — remember the switch so the pick can happen
      // once the right list lands.
      awaitingClientRef.current = first ? null : clientId;
      applyVehicle(first);
      return;
    }

    // Nothing selected: fill in from the client's vehicles once they arrive
    // after a switch, or on a create page. On an edit page we never invent a
    // vehicle the record didn't have.
    if (first && (awaitingClientRef.current === clientId || !isEdit)) {
      awaitingClientRef.current = null;
      applyVehicle(first);
    }
  }, [newAddedVehicle, clientId, vehicleList, isEdit, setVehicle]);

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
            <ClearSelectionButton
              label="Clear Vehicle"
              onClear={() => {
                handleClear();
                setOpenDropdown && setOpenDropdown(false);
              }}
            />
          ) : null
        }
      />
    </>
  );
}
