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
  // Get data from store for authenticated users
  const { services, categories } = useListsStore();
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
          // Update store state for authenticated access
          useListsStore.setState((state) => ({
            services: [...state.services, res.data],
          }));

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
  // Fetch data for authenticated users
  useEffect(() => {
    const shouldFetchData = services.length === 0 || categories.length === 0;

    if (!shouldFetchData) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const promises = [];

        // Authenticated fetching
        if (services.length === 0) {
          promises.push(getServices());
        }
        if (categories.length === 0) {
          promises.push(getCategories());
        }

        const results = await Promise.all(promises);

        // Handle authenticated results - update store
        let servicesResult: Service[] = [];
        let categoriesResult: Category[] = [];

        if (services.length === 0 && categories.length === 0) {
          [servicesResult, categoriesResult] = results as [
            Service[],
            Category[],
          ];
        } else if (services.length === 0) {
          servicesResult = results[0] as Service[];
        } else if (categories.length === 0) {
          categoriesResult = results[0] as Category[];
        }

        useListsStore.setState((state) => ({
          ...(servicesResult.length > 0 && { services: servicesResult }),
          ...(categoriesResult.length > 0 && {
            categories: categoriesResult,
          }),
        }));
      } catch (err) {
        console.error("Failed to fetch data:", err);
        errorToast("Failed to load services and categories");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [services.length, categories.length]);

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
