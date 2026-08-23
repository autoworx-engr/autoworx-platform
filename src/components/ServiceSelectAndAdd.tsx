import { Category, Service } from "@prisma/client";
import SelectorWithAdd from "./SelectorWithAdd";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCategories,
  getServices,
} from "@/app/(dashboard)/dashboard/pipeline/components/getServices-Categories";
import { useListsStore } from "@/stores/lists";
import { errorToast, successToast } from "@/lib/toast";
import newService from "@/actions/estimate/service/newService";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

export interface Option {
  id: number;
  title: string;
}

export interface ServiceSelectAndAddProps {
  value: string | { id: string | number; title: string };
  onChange: (value: string | { id: string | number; title: string }) => void;
  disabled?: boolean;
}

const ServiceSelectAndAdd = ({
  value,
  onChange,
  disabled = false,
}: ServiceSelectAndAddProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Memoize options to prevent unnecessary re-renders
  const options = useMemo<Option[]>(() => {
    return services.map((service) => ({
      id: service.id,
      title: service.name,
    }));
  }, [services]);
  // Optimize handleAddNew with useCallback to prevent re-renders
  const handleAddNew = useCallback(
    async (newItem: string, category?: Category | null) => {
      if (!category?.id) {
        errorToast("Service Category is required!");
        return;
      }

      try {
        // Authenticated service creation
        const res = await newService({
          name: newItem,
          categoryId: category.id,
        });

        if (res.type === "success") {
          setServices((prev) => [...prev, res.data]);

          successToast("New Service Created");

          // Update form data immediately
          onChange({
            id: res.data.id,
            title: res.data.name,
          });
        } else {
          errorToast(res.message || "Failed to create new service");
        }
      } catch (error) {
        errorHandler(error);
        errorToast("Failed to create new service");
      }
    },
    [onChange],
  );
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [servicesResult, categoriesResult] = await Promise.all([
          getServices(),
          getCategories(),
        ]);

        if (cancelled) return;

        setServices(servicesResult as Service[]);
        useListsStore.setState({
          categories: categoriesResult as Category[],
        });
      } catch (err) {
        console.error("Failed to fetch data:", err);
        errorToast("Failed to load services and categories");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SelectorWithAdd
      label="Service Needed"
      name="searchable"
      options={options}
      value={value}
      onChange={onChange}
      isSearch={true}
      allowClear={true}
      allowAddNew={true}
      onAddNew={handleAddNew}
      addNewLabel="Add new service"
      addNewPlaceholder="Enter service name"
      selectCategory={true}
      placeholder="Full Car Wrap, Front End PPF"
      disabled={disabled || isLoading}
      required={true}
    />
  );
};

export default React.memo(ServiceSelectAndAdd);
