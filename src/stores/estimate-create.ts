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
  setInvoiceId: (invoiceId: string) => void;
  setType: (type: string) => void;
  setSubtotal: (subtotal: number) => void;
  setDiscount: (discount: number) => void;
  setTax: (tax: number) => void;
  setServiceFee: (serviceFee: number) => void;
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

  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
}

export const useEstimateCreateStore = create<EstimateCreateStore>((set) => ({
  invoiceId: "",
  type: "",
  title: "",
  template: null,
  subtotal: 0,
  discount: 0,
  tax: 0,
  serviceFee: 0,
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
isDirty: false,
  setInvoiceId: (invoiceId: string) => set({ invoiceId }),
  setType: (type: string) => set({ type }),
  setSubtotal: (subtotal: number) => set({ subtotal, isDirty:true }),
  setDiscount: (discount: number) => set({ discount, isDirty:true }),
  setTax: (tax: number) => set({ tax, isDirty:true }),
  setServiceFee: (serviceFee: number) => set({ serviceFee, isDirty:true }),
  setGrandTotal: (grandTotal: number) => set({ grandTotal, isDirty:true }),
  setDue: (due: number) => set({ due, isDirty:true }),
  setDeposit: (deposit: number) => set({ deposit, isDirty:true }),
  setTotalPayment: (totalPayment: number) => set({ totalPayment, isDirty:true }),
  setInternalNotes: (internalNotes: string) => set({ internalNotes, isDirty:true }),
  setTerms: (terms: string) => set({ terms }),
  setPolicy: (policy: string) => set({ policy  }),
  setCustomerNotes: (customerNotes: string) => set({ customerNotes,isDirty:true }),
  setCustomerComments: (customerComments: string) => set({ customerComments, isDirty:true }),
  setCoupon: (coupon: Coupon) => set({ coupon , isDirty:true}),
  setTitle: (title: string) => {
    set({ title, isDirty:true });
  },
  setTemplate: (template: InvoiceTemplate) => {
    set({ template, isDirty:true });
  },
  setPhotos: (photos: { id?: number; photo?: string }[]) => set({ photos, isDirty:true }),
  addPhoto: (photo: string) =>
    set((x: any) => ({ photos: [...x.photos, photo] , isDirty:true})),
  removePhoto: (photo: string) =>
    set((x: any) => ({ photos: x.photos.filter((p: string) => p !== photo), isDirty:true })),

  setTasks: (tasks: { id: undefined | number; task: string }[]) =>
    set({ tasks, isDirty:true}),
  addTask: (task: Task) => set((x: any) => ({ tasks: [...x.tasks, task], isDirty:true })),
  removeTask: (taskId: number) =>
    set((x: any) => ({ tasks: x.tasks.filter((t: Task) => t.id !== taskId), isDirty:true })),

  setCurrentSelectedCategoryId: (categoryId: number) =>
    set({ currentSelectedCategoryId: categoryId }),

  setInspections: (inspections: InspectionType[]) => set({ inspections, isDirty:true }),
  updateInspection: (index: number, inspection: InspectionType) =>
    set((state) => {
      const updatedInspections = [...state.inspections];
      updatedInspections[index] = inspection;
      return { inspections: updatedInspections, isDirty:true};
    }),
  setDamageNotes: (damageNotes: string) => set({ damageNotes, isDirty:true }),
  reset: () =>
    set({
      invoiceId: "",
      title: "",
      template: null,
      subtotal: 0,
      discount: 0,
      deposit: 0,
      tax: 0,
      serviceFee: 0,
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
      isDirty: false,
    }),
    setDirty: (dirty: boolean) => set({ isDirty: dirty }),
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

      return { items, isDirty: false, };
    });
  },
}));
