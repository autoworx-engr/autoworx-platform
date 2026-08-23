"use client";

import Selector from "@/components/Selector";
import useVehicleByClientIdQuery from "@/hooks/query-hook/useVehicleByClientIdQuery";
import { queryKeys } from "@/lib/queryKeys";
import { useListsStore } from "@/stores/lists";
import { Vehicle } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import NewVehicle from "../Lists/NewVehicle";
import { SelectProps } from "../Lists/select-props";
import { TruncatedText } from "@/components/ui/TruncatedText";
import { normalizeSearch } from "@/utils/normalizeSearch";

/** One label for the trigger, the rows and the search box to agree on. */
const vehicleLabel = (vehicle: Partial<Vehicle>) =>
  [vehicle.year, vehicle.make, vehicle.model, vehicle.other]
    .filter(Boolean)
    .join(" ")
    .trim();

export function SelectAppointmentVehicle({
  name = "vehicleId",
  vehicleId = null,
  fromLead = false,
  value = null,
  setValue,
  openDropdown,
  setOpenDropdown,
  isClear = false,
  isEdit = false,
  clientId = null,
  setIsAppointmentModalOpen,
}: SelectProps<Partial<Vehicle> | null>) {
  const pathname = usePathname();
  const state = useState(value);

  const [vehicle, setVehicle] = setValue ? [value, setValue] : state;
  // const vehicleList = useListsStore((x) => x.vehicles);
  const newAddedVehicle = useListsStore((x) => x.newAddedVehicle);

  const isClientIdNumber = !isNaN(Number(clientId)) && clientId !== null;

  const { data: clientVehicles = [], isLoading: isLoadingVehicles } =
    useVehicleByClientIdQuery(Number(clientId), {
      enabled: isClientIdNumber,
    });

  useEffect(() => {
    if (vehicleId && clientVehicles.length > 0) {
      const matchedVehicle = clientVehicles.find((v) => v.id === vehicleId);
      if (matchedVehicle) {
        setVehicle(matchedVehicle);
      } else {
        setVehicle(null);
      }
    }
  }, [vehicleId, clientVehicles]);

  const queryClient = useQueryClient();

  const prevClientId = useRef<number | null>(null);

  useEffect(() => {
    const numericClientId = isClientIdNumber ? Number(clientId) : null;

    if (!numericClientId) {
      prevClientId.current = null;
      return;
    }

    const clientChanged = prevClientId.current !== numericClientId;

    const requestedVehicle = vehicleId
      ? clientVehicles?.find((v) => v.id === vehicleId)
      : undefined;

    if (clientChanged && !isEdit) {
      prevClientId.current = numericClientId;
      setVehicle(
        requestedVehicle ?? newAddedVehicle ?? clientVehicles?.[0] ?? null,
      );
      return;
    }
    prevClientId.current = numericClientId;

    const selectedVehicle =
      requestedVehicle ?? newAddedVehicle ?? clientVehicles?.[0];
    if (clientVehicles?.length > 0 && !value) {
      if (isEdit == false) {
        setVehicle(selectedVehicle);
      }
    } else if (clientVehicles?.length > 0) {
      const matchedVehicle = clientVehicles?.find(
        (vehicle) => vehicle.id === value?.id,
      );

      const finalVehicle = matchedVehicle ?? selectedVehicle;
      setVehicle(finalVehicle);
    } else {
      setVehicle(null);
    }
  }, [newAddedVehicle, clientId, clientVehicles, vehicleId]);

  useEffect(() => {
    return () => {
      if (newAddedVehicle) {
        useListsStore.setState({ newAddedVehicle: null });
      }
    };
  }, []);

  // The selected vehicle isn't always part of the client's list (it can come
  // from the lead), and it still has to be listed so it can show as ticked.
  const vehicleOptions = useMemo(() => {
    if (!vehicle?.id) return clientVehicles;
    return clientVehicles.some((option) => option.id === vehicle.id)
      ? clientVehicles
      : [vehicle as Vehicle, ...clientVehicles];
  }, [clientVehicles, vehicle]);

  const handleClear = () => {
    setVehicle(null);
    useListsStore.setState({ vehicle: null, newAddedVehicle: null });
    setIsAppointmentModalOpen && setIsAppointmentModalOpen(true);
  };
  return (
    <>
      <input type="hidden" name={name} value={vehicle?.id ?? ""} />

      <div className="flex items-center gap-2">
        <Selector
          className="min-w-full"
          disabledDropdown={clientId && !vehicle?.fromRequest ? false : true}
          label={(vehicle: Partial<Vehicle> | null) =>
            vehicle ? vehicleLabel(vehicle) : "Vehicle"
          }
          newButton={
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
                if (pathname.includes("/dashboard/client")) {
                  return;
                }
                setVehicle(vehicle);
                useListsStore.setState({ vehicle });
                useListsStore.setState(() => ({
                  newAddedVehicle: vehicle,
                }));
                queryClient.setQueryData(
                  queryKeys.vehicleByClientId(Number(clientId)),
                  (oldVehicle: Vehicle[]) => {
                    return oldVehicle && oldVehicle.length > 0
                      ? [...oldVehicle, vehicle]
                      : [];
                  },
                );
                vehicle && setOpenDropdown && setOpenDropdown(false);
              }}
              setIsAppointmentModalOpen={setIsAppointmentModalOpen}
            />
          }
          items={vehicleOptions}
          isLoading={isLoadingVehicles}
          // Matched against the whole displayed label plus VIN/plate. Filtering
          // on model and `other` alone meant searching the year or make of the
          // vehicle you were looking at returned "No results found".
          onSearch={(search: string) => {
            const query = normalizeSearch(search);
            return vehicleOptions.filter((option) =>
              [
                vehicleLabel(option),
                option.vin ?? "",
                option.license ?? "",
              ].some((field) => normalizeSearch(field).includes(query)),
            );
          }}
          openState={[
            openDropdown as boolean,
            setOpenDropdown as Dispatch<SetStateAction<boolean>>,
          ]}
          selectedItem={vehicle}
          onSelect={(vehicle) => {
            setVehicle(vehicle);
          }}
          displayList={(item) => <TruncatedText text={vehicleLabel(item)} />}
          footer={
            isClear && vehicle ? (
              <button
                type="button"
                onClick={() => {
                  handleClear();
                  setOpenDropdown && setOpenDropdown(false);
                }}
                className="flex w-full items-center justify-center rounded-md border border-red-200 bg-red-50/70 px-3 py-2 text-sm font-semibold text-red-600 transition-colors duration-150 hover:bg-red-100"
              >
                Clear Vehicle
              </button>
            ) : null
          }
        />
      </div>
    </>
  );
}
