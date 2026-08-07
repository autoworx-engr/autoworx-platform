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
  vehicles,
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
    const vehiclesFromState = useListsStore.getState().vehicles;

    useListsStore.setState({
      customers,
      vehicles: vehicles ?? vehiclesFromState,
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
    // `vehicles` is only passed by callers that actually manage the vehicle
    // list for the current page (e.g. estimate create/edit). Instances like
    // the dashboard layout's <SyncLists categories={categories} /> don't
    // pass it at all, and must not clobber the real list with an empty one
    // on every re-render (this ran on every dynamic re-render of the
    // layout, wiping the vehicle dropdown on the estimate edit page).
    if (vehicles === undefined) return;
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
