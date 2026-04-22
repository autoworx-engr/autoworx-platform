export interface CustomEventProps {
  originalData: {
    id: number;
    userId: number;
    title: string;
    date?: string;
    startTime: string;
    invoiceGrandTotal?: number;
    client?: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      mobile: string;
    };
    endTime: string;
    priority?: "Low" | "Medium" | "High";
    vehicle?: {
      model: string;
      make: string;
      year: number;
    };
    serviceCategory?: {
      id: number;
      name: string;
      color?: string;
    };
    taskUser?: [
      {
        id: number;
        taskId: number;
        userId: number;
        eventId: string;
        createdAt: string;
        updatedAt: string;
        user?: {
          id: number;
          firstName: string;
          lastName: string;
          employeeType: string;
        };
      },
    ];
  };
  serviceType?: string;
  serviceCategoryColor?: string;
  serviceCategoryName?: string;
}

export type ServiceType =
  | "Low"
  | "Medium"
  | "High"
  | "Task"
  | "Appointment"
  | "Holiday"
  | "Weekend";
