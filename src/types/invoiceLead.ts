import {
  Client,
  Lead,
  Prisma,
  Tag,
  Task,
  User,
  Vehicle,
  Technician,
} from "@prisma/client";

interface InvoiceTag {
  id: number;
  tag: Tag;
}

export interface Employee {
  id: number;
  firstName: string;
  lastName: string | null;
}
export type Column = {
  id: number | null;
  title: string;
  type: string;
};
export interface ShopLead {
  invoiceId: string;
  name: string;
  email: string;
  phone: string;
  clientId: number | null;
  vehicle: string;
  vehicleId: number | null;
  services: {
    completed: string[];
    incomplete: string[];
    unAssigned: string[];
  };
  deliveredAt: Date | null;
  createdAt: string;
  workOrderStatus?: string;
  tags: InvoiceTag[];
  technicians: Technician[];
  tasks?: Task[];
  assignedTo: User | Employee | null;
  columnId: number | null;
  dueBalance: number;
  appointment?: {
    id: number;
    date: Date | null;
    startTime: string | null;
    endTime: string | null;
  } | null;
}
export interface SalesLead {
  leadId: number;
  name: string;
  email: string | null;
  phone: string | null;
  vehicle: string;
  services: string;
  source: string;
  comments: string | null;
  createdAt: Date;
  companyId: number;
  columnId: number;
  assignedSalesUserId: number | null;
  isEstimateCreated: boolean | null;
  salesUser: {
    id: number;
    firstName: string;
    lastName: string | null;
  } | null;
  tasks: Task[];
  client?:
    | (Client & {
        vehicle?: Vehicle | null;
        appointments?: {
          id: number;
          date: Date | null;
          startTime: string | null;
          endTime: string | null;
        }[];
      })
    | null;
  leadTags: { id: number; tag: Tag }[];
  totalClientMessage?: number;
}

export interface LeadWithSalesUser extends Lead {
  salesUser: {
    id: number;
    firstName: string;
    lastName: string | null;
  } | null;
  tasks: Task[];
  latestAppointment?: {
    id: number;
    date: Date | null;
    startTime: string | null;
    endTime: string | null;
  } | null;
  client?:
    | (Client & {
        vehicle?: Vehicle | null;
        appointments?: {
          id: number;
          date: Date | null;
          startTime: string | null;
          endTime: string | null;
        }[];
      })
    | null;
  column?: Column | null;
  leadTags: {
    id: number;
    tag: Tag;
  }[];
  totalMessage: number;
  invoiceId?: string | null;

  taskCount?: number;
}

export interface ColumnWithLeads extends Column {
  leads: LeadWithSalesUser[];
  totalLeads: number;
  hasMoreLeads?: boolean;
}

// export type Lead = ShopLead | SalesLead;
export interface ShopPipelineData {
  id: number | null;
  title: string;
  leads: ShopLead[];
  hasMore?: boolean;
  totalCount?: number;
}
export interface SalesPipelineData {
  id: number | null;
  title: string;
  leads?: SalesLead[];
}

export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    client: true;
    vehicle: true;
    invoiceItems: {
      include: {
        service: {
          include: {
            Technician: true;
          };
        };
      };
    };
    tags: {
      select: {
        id: true;
        tag: true;
      };
    };
    tasks: true;
    assignedTo: true;
    column: true;
  };
}>;
