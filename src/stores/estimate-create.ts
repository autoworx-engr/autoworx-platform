import { FullPayment } from "@/types/db";
import {
  Column,
  Coupon,
  InvoiceTemplate,
  Labor,
  Material,
  Service,
  Tag,
  Task,
} from "@prisma/client";
import { create } from "zustand";

export interface Item {
  id?: string | number; // nanoid
  service: Service | null;
  materials: (Material | null)[];
  labor: Labor | null;
  tags: Tag[];
  serviceDesc: string;
}

export type InspectionType = {
  title: string;
  driver: boolean;
  passenger: boolean;
  notes: string | null;
};
interface EstimateCreateStore {
  invoiceId: string;
  title: string;
  subtotal: number;
  discount: number;
  tax: number;
  serviceFee: number;
  vehicleExtraCost: number;
  deposit: number;
  grandTotal: number;
  type: string;
  due: number;
  totalPayment: number;
  internalNotes: string;
  terms: string;
  policy: string;
  customerNotes: string;
  customerComments: string;
  photos: { id?: number; photo?: string }[];
  tasks: { id: undefined | number; task: string }[];
  items: Item[];
  payment: FullPayment;
  currentSelectedCategoryId: number | null;
  coupon: Coupon | null;
  inspections: InspectionType[];
  damageNotes: string | null;
  template?: InvoiceTemplate | null;
  templateSnapshot?:
    | (Partial<EstimateCreateStore> & { status?: Column | null })
    | null;
  paymentModalOpen: boolean;
  setPaymentModalOpen: (paymentModalOpen: boolean) => void;
  setInvoiceId: (invoiceId: string) => void;
  setType: (type: string) => void;
  setSubtotal: (subtotal: number) => void;
  setDiscount: (discount: number) => void;
  setTax: (tax: number) => void;
  setServiceFee: (serviceFee: number) => void;
  setVehicleExtraCost: (vehicleExtraCost: number) => void;
  setGrandTotal: (grandTotal: number) => void;
  setDue: (due: number) => void;
  setDeposit: (deposit: number) => void;
  setInternalNotes: (internalNotes: string) => void;
  setTerms: (terms: string) => void;
  setPolicy: (policy: string) => void;
  setCustomerNotes: (customerNotes: string) => void;
  setCustomerComments: (customerComments: string) => void;
  setCoupon: (coupon: Coupon) => void;
  setTitle: (title: string) => void;
  setTemplate?: (template: InvoiceTemplate) => void;
  setPhotos: (photos: { id?: number; photo?: string }[]) => void;
  addPhoto: (photo: string) => void;
  removePhoto: (photo: string) => void;
  setTasks: (tasks: { id: undefined | number; task: string }[]) => void;
  addTask: (task: Task) => void;
  removeTask: (taskId: number) => void;
  setCurrentSelectedCategoryId: (categoryId: number) => void;
  setInspections: (inspections: InspectionType[]) => void;
  updateInspection: (index: number, inspection: InspectionType) => void;
  setDamageNotes: (damageNotes: string) => void;
  setTotalPayment: (totalPayment: number) => void;
  reset: () => void;
  removeMaterial: ({
    itemIndex,
    materialIndex,
  }: {
    itemIndex: number;
    materialIndex: number;
  }) => void;
}

export const useEstimateCreateStore = create<EstimateCreateStore>((set) => ({
  invoiceId: "",
  type: "",
  title: "",
  template: null,
  templateSnapshot: null,
  subtotal: 0,
  discount: 0,
  tax: 0,
  serviceFee: 0,
  vehicleExtraCost: 0,
  deposit: 0,
  grandTotal: 0,
  due: 0,
  totalPayment: 0,
  internalNotes: "",
  terms: "",
  policy: "",
  customerNotes: "",
  customerComments: "",
  photos: [],
  tasks: [],
  items: [],
  payment: null,
  currentSelectedCategoryId: null,
  coupon: null,
  inspections: Array.from({ length: 15 }, () => ({
    title: "",
    driver: false,
    passenger: false,
    notes: "",
  })),
  damageNotes: "",
  paymentModalOpen: false,

  setPaymentModalOpen: (paymentModalOpen: boolean) => set({ paymentModalOpen }),
  setInvoiceId: (invoiceId: string) => set({ invoiceId }),
  setType: (type: string) => set({ type }),
  setSubtotal: (subtotal: number) => set({ subtotal }),
  setDiscount: (discount: number) => set({ discount }),
  setTax: (tax: number) => set({ tax }),
  setServiceFee: (serviceFee: number) => set({ serviceFee }),
  setVehicleExtraCost: (vehicleExtraCost: number) => set({ vehicleExtraCost }),
  setGrandTotal: (grandTotal: number) => set({ grandTotal }),
  setDue: (due: number) => set({ due }),
  setDeposit: (deposit: number) => set({ deposit }),
  setTotalPayment: (totalPayment: number) => set({ totalPayment }),
  setInternalNotes: (internalNotes: string) => set({ internalNotes }),
  setTerms: (terms: string) => set({ terms }),
  setPolicy: (policy: string) => set({ policy }),
  setCustomerNotes: (customerNotes: string) => set({ customerNotes }),
  setCustomerComments: (customerComments: string) => set({ customerComments }),
  setCoupon: (coupon: Coupon) => set({ coupon }),
  setTitle: (title: string) => {
    set({ title });
  },
  setTemplate: (template: InvoiceTemplate) => {
    set({ template });
  },
  setPhotos: (photos: { id?: number; photo?: string }[]) => set({ photos }),
  addPhoto: (photo: string) =>
    set((x: any) => ({ photos: [...x.photos, photo] })),
  removePhoto: (photo: string) =>
    set((x: any) => ({ photos: x.photos.filter((p: string) => p !== photo) })),

  setTasks: (tasks: { id: undefined | number; task: string }[]) =>
    set({ tasks }),
  addTask: (task: Task) => set((x: any) => ({ tasks: [...x.tasks, task] })),
  removeTask: (taskId: number) =>
    set((x: any) => ({ tasks: x.tasks.filter((t: Task) => t.id !== taskId) })),

  setCurrentSelectedCategoryId: (categoryId: number) =>
    set({ currentSelectedCategoryId: categoryId }),

  setInspections: (inspections: InspectionType[]) => set({ inspections }),
  updateInspection: (index: number, inspection: InspectionType) =>
    set((state) => {
      const updatedInspections = [...state.inspections];
      updatedInspections[index] = inspection;
      return { inspections: updatedInspections };
    }),
  setDamageNotes: (damageNotes: string) => set({ damageNotes }),
  reset: () =>
    set({
      invoiceId: "",
      title: "",
      template: null,
      templateSnapshot: null,
      subtotal: 0,
      discount: 0,
      deposit: 0,
      tax: 0,
      serviceFee: 0,
      vehicleExtraCost: 0,
      grandTotal: 0,
      totalPayment: 0,
      due: 0,
      internalNotes: "",
      type: "",
      terms: "",
      policy: "",
      customerNotes: "",
      customerComments: "",
      photos: [],
      tasks: [],
      items: [],
      currentSelectedCategoryId: null,
      inspections: Array.from({ length: 15 }, () => ({
        title: "",
        driver: false,
        passenger: false,
        notes: "",
      })),
      damageNotes: "",
      paymentModalOpen: false,
    }),

  removeMaterial({ itemIndex, materialIndex }) {
    set((state) => {
      const items = state.items.map((item, index) => {
        if (index === itemIndex && item.materials.length > 0) {
          const materials = item.materials.filter((material, i) => {
            if (i !== materialIndex) {
              return {
                ...material,
                cost: Number(material?.cost || 0).toFixed(2),
                sell: Number(material?.sell || 0).toFixed(2),
                discount: Number(material?.discount || 0).toFixed(2),
              };
            }
          });

          return { ...item, materials };
        }
        return item;
      });

      return { items };
    });
  },
}));
