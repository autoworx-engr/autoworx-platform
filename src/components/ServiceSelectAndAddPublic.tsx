import { Service } from "@prisma/client";
import SelectorWithAdd from "./SelectorWithAdd";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { errorToast, successToast } from "@/lib/toast";
import newServiceByToken from "@/actions/estimate/service/newServiceByToken";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import MultiSelectorWithAdd from "./MultiSelectorWithAdd";
import { getCannedServicesByCompanyId } from "@/actions/services/getCannedServicesByCompanyId";

export interface Option {
  id: number;
  title: string;
}

export interface ServiceSelectAndAddPublicProps {
  value: Array<{ id: string | number; title: string }>;
  onChange: (value: Array<{ id: string | number; title: string }>) => void;
  disabled?: boolean;
  token: string; // Required for public access
  companyId: number;
}

const ServiceSelectAndAddPublic = ({
  value,
  onChange,
  disabled = false,
  token,
  companyId,
}: ServiceSelectAndAddPublicProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [services, setServices] = useState<Service[]>([]);

  // Memoize options to prevent unnecessary re-renders
  const options = useMemo<Option[]>(() => {
    return services.map((service: Service) => ({
      id: service.id,
      title: service.name,
    }));
  }, [services]);

  // Handle adding new service without category requirement
  const handleAddNew = useCallback(
    async (newItem: string) => {
      try {
        const res = await newServiceByToken({
          name: newItem,
          token,
          canned: false,
        });

        if (res.type === "success") {
          setServices((prev) => [...prev, res.data]);
          successToast("New Service Created");

          // Append new service to current selected services
          onChange([...value, { id: res.data.id, title: res.data.name }]);
        } else {
          errorToast(res.message || "Failed to create new service");
        }
      } catch (error) {
        errorHandler(error);
        errorToast("Failed to create new service");
      }
    },
    [onChange, token, value],
  );

  // Fetch only canned services
  useEffect(() => {
    const fetchData = async () => {
      // Don't fetch if token is empty or services already loaded
      if (!token || token.trim() === "" || services.length > 0) return;
      console.log("token", token);
      setIsLoading(true);
      try {
        const cannedServices = await getCannedServicesByCompanyId(companyId);
        setServices(cannedServices);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        errorToast("Failed to load services");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token, services.length]);

  return (
    <MultiSelectorWithAdd
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
      addNewPlaceholder="Enter Service Name"
      selectCategory={false} // No category selection for public form
      placeholder="Full Car Wrap, Front End PPF"
      disabled={disabled || isLoading}
      required={true}
    />
  );
};

export default React.memo(ServiceSelectAndAddPublic);
