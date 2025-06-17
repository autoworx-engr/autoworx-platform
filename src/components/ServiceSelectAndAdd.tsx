import { Category, Service } from "@prisma/client";
import SelectorWithAdd from "./SelectorWithAdd";
import React, { useEffect, useState } from "react";
import {
  getCategories,
  getServices,
} from "@/app/(dashboard)/dashboard/pipeline/components/getServices-Categories";
import { useListsStore } from "@/stores/lists";
import { errorToast, successToast } from "@/lib/toast";
import newService from "@/actions/estimate/service/newService";

export interface Option {
  id: number;
  title: string;
}

export interface SelectorWithAddProps {
  value: string | { id: string | number; title: string };
  onChange: (value: string | { id: string | number; title: string }) => void;
}

const ServiceSelectAndAdd = ({ value, onChange }: SelectorWithAddProps) => {
  const [options, setOptions] = useState<Option[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Handle adding new service
  const handleAddNew = async (newItem: string, category?: Category) => {
    if (!category?.id) {
      return errorToast("Service Category is required!");
    }

    try {
      const res = await newService({
        name: newItem,
        categoryId: category?.id!,
      });

      if (res.type === "success") {
        // Add to listsStore
        useListsStore.setState((state) => {
          return { services: [...state.services, res.data] };
        });

        // Update local services state
        setServices((prev) => [...prev, res.data]);

        successToast("New Service Created");

        const newData = {
          id: res.data.id,
          title: res.data.name,
        };
        // Update form data immediately
        onChange(newData);
      } else {
        errorToast(res.message || "Failed to create new service");
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  // Update listsStore when services/categories change
  useEffect(() => {
    useListsStore.setState({
      services,
      categories,
    });
  }, [services, categories]);

  // Format services into options
  useEffect(() => {
    if (services?.length) {
      const formattedOptions: Option[] = services.map((service) => ({
        id: service.id,
        title: service.name,
      }));
      setOptions(formattedOptions);
    }
  }, [services]);

  // Fetch services and categories on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [servicesRes, categoriesRes] = await Promise.all([
          getServices(),
          getCategories(),
        ]);
        setServices(servicesRes);
        setCategories(categoriesRes);

        console.log("Services:", servicesRes);
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);
  return (
    <>
      <SelectorWithAdd
        label="Service Needed*"
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
        placeholder="Oil Change, Brake Repair, etc."
        disabled={isLoading}
      />
    </>
  );
};

export default ServiceSelectAndAdd;
