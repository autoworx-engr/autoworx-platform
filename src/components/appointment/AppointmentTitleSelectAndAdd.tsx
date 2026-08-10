import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import SelectorWithAdd from "../SelectorWithAdd";
import { useListsStore } from "@/stores/lists";
import { errorToast, successToast } from "@/lib/toast";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { createAppointmentTitle } from "@/actions/appointment/createAppointmentTitle";
import { getAppointmentTitles } from "@/actions/appointment/getAppointmentTitles";
import { deleteAppointmentTitle } from "@/actions/appointment/deleteAppointmentTitle";

export interface Option {
  id: number | string;
  title: string;
}

export interface AppointmentTitleSelectAndAddProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

// Predefined appointment titles
const DEFAULT_APPOINTMENT_TITLES = [
  "Free Consultation",
  "Design Consultation",
  "Post-Service Inspection",
  "Install: Drop-Off",
  "Install: Waiting",
  "Virtual Appointment",
  "Vehicle Pick-up",
];

const AppointmentTitleSelectAndAdd = ({
  value,
  onChange,
  disabled = false,
}: AppointmentTitleSelectAndAddProps) => {
  // Get data from store for authenticated users
  const { appointmentTitles } = useListsStore();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Always hold the latest selected value so the delete handler can decide
  // whether to clear the field without relying on a stale closure.
  const valueRef = useRef(value);
  valueRef.current = value;

  // Memoize options to prevent unnecessary re-renders
  const options = useMemo<Option[]>(() => {
    return appointmentTitles.map((title) => ({
      id: title.id,
      title: title.name,
    }));
  }, [appointmentTitles]);

  // Optimize handleAddNew with useCallback to prevent re-renders
  const handleAddNew = useCallback(
    async (newItem: string) => {
      try {
        // Call API to save to database
        const res = await createAppointmentTitle({
          name: newItem,
        });

        if (res.type === "success") {
          // Update store state
          useListsStore.setState((state) => ({
            appointmentTitles: [...state.appointmentTitles, res.data],
          }));

          successToast("New Appointment Title Added");

          // Update form data immediately with the new title as string
          onChange(res.data.name);

          // Return the new item to SelectorWithAdd so it can be selected
          return { id: res.data.id, title: res.data.name };
        } else {
          errorToast(res.message || "Failed to create appointment title");
        }
      } catch (error) {
        errorHandler(error);
        errorToast("Failed to add new appointment title");
      }
    },
    [onChange],
  );

  // Delete an existing appointment title (persisted, numeric id only)
  const handleDelete = useCallback(
    async (id: string | number) => {
      const numericId = Number(id);
      if (!numericId || Number.isNaN(numericId)) return;

      const removedTitle = appointmentTitles.find((t) => t.id === numericId);

      try {
        const res = await deleteAppointmentTitle({ id: numericId });

        if (res.type === "success") {
          // Remove from store state
          useListsStore.setState((state) => ({
            appointmentTitles: state.appointmentTitles.filter(
              (t) => t.id !== numericId,
            ),
          }));

          // Clear the field if the deleted title was the selected one,
          // otherwise it gets re-added as a "custom" option and looks selected.
          const deletedName = removedTitle?.name ?? res.data?.name;
          if (deletedName && deletedName === valueRef.current) {
            onChange("");
          }

          successToast("Appointment Title Removed");
        } else {
          errorToast(res.message || "Failed to remove appointment title");
        }
      } catch (error) {
        errorHandler(error);
        errorToast("Failed to remove appointment title");
      }
    },
    [appointmentTitles, onChange],
  );

  // Fetch data for authenticated users
  useEffect(() => {
    const shouldFetchData = appointmentTitles.length === 0;

    if (!shouldFetchData) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await getAppointmentTitles();

        if (result.type === "success") {
          // If no appointment titles exist, create default ones
          if (result.data.length === 0) {
            const defaultTitlePromises = DEFAULT_APPOINTMENT_TITLES.map(
              (title) => createAppointmentTitle({ name: title }),
            );

            try {
              const defaultResults = await Promise.all(defaultTitlePromises);
              const createdTitles = defaultResults
                .filter((result) => result.type === "success")
                .map((result) =>
                  result.type === "success" ? result.data : undefined,
                )
                .filter(
                  (data): data is NonNullable<typeof data> =>
                    data !== undefined,
                );

              useListsStore.setState({
                appointmentTitles: createdTitles,
              });
            } catch (createError) {
              console.error("Failed to create default titles:", createError);
              errorToast("Failed to create default appointment titles");
            }
          } else {
            useListsStore.setState({
              appointmentTitles: result.data,
            });
          }
        } else {
          errorToast("Failed to load appointment titles");
        }
      } catch (err) {
        console.error("Failed to fetch appointment titles:", err);
        errorToast("Failed to load appointment titles");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [appointmentTitles.length]);

  // Convert value to the format expected by SelectorWithAdd
  const selectorValue = useMemo(() => {
    if (!value) return "";
    // For string values, check if it exists in options first
    const existingOption = options.find((opt) => opt.title === value);
    return existingOption ? existingOption.id.toString() : `custom_${value}`;
  }, [value, options]);

  // Enhanced options that include the current value if it doesn't exist in the list
  const enhancedOptions = useMemo(() => {
    // If value is a string and doesn't exist in options, add it as a custom option
    if (value && value.trim()) {
      const existsInOptions = options.some((opt) => opt.title === value);
      if (!existsInOptions) {
        return [{ id: `custom_${value}`, title: value }, ...options];
      }
    }

    return options;
  }, [options, value]);

  // Handle change from SelectorWithAdd and convert back to our expected format
  const handleSelectorChange = useCallback(
    (newValue: string | { id: string | number; title: string }) => {
      if (typeof newValue === "string") {
        // If it's a string, try to find the matching option
        const matchingOption = enhancedOptions.find(
          (opt) => opt.id.toString() === newValue,
        );
        if (matchingOption) {
          // Always return just the title string for consistency
          onChange(matchingOption.title);
        } else {
          onChange(newValue);
        }
      } else {
        // If it's an object, return just the title string
        onChange(newValue.title);
      }
    },
    [onChange, enhancedOptions],
  );

  return (
    <SelectorWithAdd
      label={isLoading ? "Appointment Title (loading…)" : "Appointment Title"}
      name="appointmentTitle"
      options={enhancedOptions}
      value={selectorValue}
      onChange={handleSelectorChange}
      isSearch={true}
      allowClear={true}
      allowAddNew={true}
      onAddNew={handleAddNew}
      allowDelete={true}
      onDelete={handleDelete}
      deleteConfirmTitle="Remove appointment title"
      deleteConfirmDescription="Are you sure you want to remove this appointment title?"
      addNewLabel="Add new appointment title"
      addNewPlaceholder="Enter appointment title"
      selectCategory={false}
      placeholder="Free Consultation, Design Consultation..."
      disabled={disabled}
      required={true}
    />
  );
};

export default React.memo(AppointmentTitleSelectAndAdd);
