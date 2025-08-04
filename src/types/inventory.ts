interface Category {
  companyId: number;
  createdAt: Date;
  id: number;
  name: string;
  updatedAt: Date;
}

interface Vendor {
  address: string;
  city: string;
  companyId: number;
  companyName: string;
  createdAt: Date;
  email: string;
  id: number;
  name: string;
  notes: string;
  phone: string;
  state: string;
  updatedAt: Date;
  website: string;
  zip: string;
}

export interface ProductCardProps {
  category?: Category | null;
  categoryId?: number | null;
  companyId: number;
  createdAt: Date;
  description?: string | null;
  id: number;
  lot?: string | null;
  lowInventoryAlert?: number | null;
  name: string;
  price?: string | null;
  quantity?: number | null;
  receipt?: string | null;
  type: string;
  unit?: string | null;
  updatedAt: Date;
  userId?: number | null;
  vendor?: Vendor | null;
  vendorId?: number | null;
}
