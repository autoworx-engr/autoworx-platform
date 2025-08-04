import { Category, Service } from '@prisma/client';
import SelectorWithAdd from './SelectorWithAdd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCategories,
  getServices,
} from '@/app/(dashboard)/dashboard/pipeline/components/getServices-Categories';
import {
  getServicesByToken,
  getCategoriesByToken,
} from '@/actions/services/getServicesAndCategoriesByToken';
import { useListsStore } from '@/stores/lists';
import { errorToast, successToast } from '@/lib/toast';
import newService from '@/actions/estimate/service/newService';
import newServiceByToken from '@/actions/estimate/service/newServiceByToken';
import { errorHandler } from '@/error-boundary/globalErrorHandler';

export interface Option {
  id: number;
  title: string;
}

export interface ServiceSelectAndAddProps {
  value: string | { id: string | number; title: string };
  onChange: (value: string | { id: string | number; title: string }) => void;
  disabled?: boolean;
  token?: string; // Add token prop for unauthenticated access
}

const ServiceSelectAndAdd = ({
  value,
  onChange,
  disabled = false,
  token,
}: ServiceSelectAndAddProps) => {
  // Get data from store first to avoid unnecessary API calls (only for authenticated mode)
  const { services: storeServices, categories: storeCategories } =
    useListsStore();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [localServices, setLocalServices] = useState<Service[]>([]);
  const [localCategories, setLocalCategories] = useState<Category[]>([]);

  // For token-based access (unauthenticated), use local state
  // For authenticated access, prefer store but fallback to local state
  const services = token
    ? localServices
    : storeServices.length > 0
      ? storeServices
      : localServices;
  const categories = token
    ? localCategories
    : storeCategories.length > 0
      ? storeCategories
      : localCategories;

  // Memoize options to prevent unnecessary re-renders
  const options = useMemo<Option[]>(() => {
    return services.map((service) => ({
      id: service.id,
      title: service.name,
    }));
  }, [services]);
  // Optimize handleAddNew with useCallback to prevent re-renders
  const handleAddNew = useCallback(
    async (newItem: string, category?: Category) => {
      if (!category?.id) {
        errorToast('Service Category is required!');
        return;
      }

      try {
        let res;

        if (token) {
          // Token-based service creation
          res = await newServiceByToken({
            name: newItem,
            categoryId: category.id,
            token,
          });
        } else {
          // Authenticated service creation
          res = await newService({
            name: newItem,
            categoryId: category.id,
          });
        }

        if (res.type === 'success') {
          if (token) {
            // Update local state for token-based access
            setLocalServices((prev) => [...prev, res.data]);
          } else {
            // Update store state for authenticated access
            useListsStore.setState((state) => ({
              services: [...state.services, res.data],
            }));
          }

          successToast('New Service Created');

          // Update form data immediately
          onChange({
            id: res.data.id,
            title: res.data.name,
          });
        } else {
          errorToast(res.message || 'Failed to create new service');
        }
      } catch (error) {
        // console.error("Error creating service:", error);
        errorHandler(error);
        errorToast('Failed to create new service');
      }
    },
    [onChange, token]
  );
  // Fetch data based on authentication mode
  useEffect(() => {
    const shouldFetchData = token
      ? localServices.length === 0 || localCategories.length === 0
      : storeServices.length === 0 || storeCategories.length === 0;

    if (!shouldFetchData) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const promises = [];

        if (token) {
          // Token-based fetching
          if (localServices.length === 0) {
            promises.push(getServicesByToken(token));
          }
          if (localCategories.length === 0) {
            promises.push(getCategoriesByToken(token));
          }
        } else {
          // Authenticated fetching
          if (storeServices.length === 0) {
            promises.push(getServices());
          }
          if (storeCategories.length === 0) {
            promises.push(getCategories());
          }
        }

        const results = await Promise.all(promises);

        if (token) {
          // Handle token-based results
          let servicesResult: Service[] = [];
          let categoriesResult: Category[] = [];

          if (localServices.length === 0 && localCategories.length === 0) {
            [servicesResult, categoriesResult] = results as [
              Service[],
              Category[],
            ];
          } else if (localServices.length === 0) {
            servicesResult = results[0] as Service[];
          } else if (localCategories.length === 0) {
            categoriesResult = results[0] as Category[];
          }

          if (servicesResult.length > 0) setLocalServices(servicesResult);
          if (categoriesResult.length > 0) setLocalCategories(categoriesResult);
        } else {
          // Handle authenticated results - update store
          let servicesResult: Service[] = [];
          let categoriesResult: Category[] = [];

          if (storeServices.length === 0 && storeCategories.length === 0) {
            [servicesResult, categoriesResult] = results as [
              Service[],
              Category[],
            ];
          } else if (storeServices.length === 0) {
            servicesResult = results[0] as Service[];
          } else if (storeCategories.length === 0) {
            categoriesResult = results[0] as Category[];
          }

          useListsStore.setState((state) => ({
            ...(servicesResult.length > 0 && { services: servicesResult }),
            ...(categoriesResult.length > 0 && {
              categories: categoriesResult,
            }),
          }));
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        errorToast('Failed to load services and categories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [
    token,
    storeServices.length,
    storeCategories.length,
    localServices.length,
    localCategories.length,
  ]);

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
