import { Client, Invoice, Technician, Vehicle, Prisma } from "@prisma/client";

export type EmployeeWorkInfo = (Technician & {
  invoice:
    | (Invoice & { client: Client | null; vehicle: Vehicle | null })
    | null;
})[];

export type SalesInfo = Prisma.LeadGetPayload<{
  include: {
    Client: {
      include: {
        Invoice: {
          include: {
            vehicle: true;
            column: true;
          };
        };
      };
    };
    column: true;
  };
}>;
