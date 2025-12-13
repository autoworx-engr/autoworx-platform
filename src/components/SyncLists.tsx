"use client";

import { useEffect, useRef } from "react";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useEstimatePopupStore } from "@/stores/estimate-popup";
import { useListsStore } from "@/stores/lists";
import type {
  Category,
  Client,
  EmailTemplate,
  Labor,
  Material,
  Service,
  Tag,
  User,
  Vehicle,
  Vendor,
  Status,
  PaymentMethod,
  Invoice,
  Column,
} from "@prisma/client";

export function SyncLists({
  customers = [],
  vehicles = [],
  employees = [],
  templates = [],
  categories = [],
  services = [],
  materials = [],
  labors = [],
  tags = [],
  vendors = [],
  statuses = [],
  paymentMethods = [],
  estimates = [],
  client,
  title,
}: {
  customers?: Client[];
  vehicles?: Vehicle[];
  employees?: User[];
  templates?: EmailTemplate[];
  categories?: Category[];
  services?: Service[];
  materials?: (Material & { tags: Tag[] })[];
  labors?: Labor[];
  tags?: Tag[];
  vendors?: Vendor[];
  statuses?: Column[];
  paymentMethods?: PaymentMethod[];
  estimates?: Invoice[];
  client?: Client | null;
  title?: string;
}) {
  const { reset } = useEstimateCreateStore();
  const { close } = useEstimatePopupStore();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;

    const categoriesFromState = useListsStore.getState().categories;

    useListsStore.setState({
      customers,
      vehicles,
      employees,
      templates,
      categories:
        categoriesFromState?.length > 0 ? categoriesFromState : categories,
      services,
      materials,
      labors,
      tags,
      vendors,
      statuses,
      paymentMethods,
      estimates,
      client,
    });

    hasInitialized.current = true;
  }, []);

  useEffect(() => {
    useListsStore.setState({ vehicles });
  }, [vehicles]);

  useEffect(() => {
    reset();
    close();
    return () => {
      reset();
      close();
    };
  }, []);

  return null;
}
