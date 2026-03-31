export interface CustomEventProps {
  originalData: {
    id: number;
    userId: number;
    title: string;
    date?: string;
    startTime: string;
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
}

export type ServiceType = CustomEventProps["serviceType"];
