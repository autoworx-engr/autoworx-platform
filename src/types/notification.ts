export type TOpenService = {
  payments: boolean;
  inventory: boolean;
  workForce: boolean;
  communication: boolean;
  task: boolean;
  pipeline: boolean;
  invoice: boolean;
  leads: boolean;
  estimate: boolean;
};

export type TSwitchValue = {
  // name: string;
  email: boolean;
  push: boolean;
};

export type TNotification = {
  leads: {
    // name: string;
    leadsGenerated: TSwitchValue;
    leadsClosed: TSwitchValue;
    followUp: TSwitchValue;
    leadsAssigned: TSwitchValue;
    stage: TSwitchValue;
  };
  pipeline: {
    // name: string;
    workOrderCreated: TSwitchValue;
    workOrderCompleted: TSwitchValue;
    dueDateProximity: TSwitchValue;
  };
  task: {
    // name: string;
    taskAssigned: TSwitchValue;
    taskFinished: TSwitchValue;
    appointmentCreated: TSwitchValue;
    appointmentReminder: TSwitchValue;
    taskReminder: TSwitchValue;
  };
  estimate: {
    // name: string;
    estimateCreated: TSwitchValue;
    invoiceCreated: TSwitchValue;
  };
  payments: {
    // name: string;

    paymentReceived: TSwitchValue;
    paymentDue: TSwitchValue;
    Deposit: TSwitchValue;
  };
  communication: {
    // name: string;
    internalMessageAlert?: TSwitchValue;
    clientMessageAlert?: TSwitchValue;
    clientCallAlert?: TSwitchValue;
    clientEmailAlert?: TSwitchValue;
    collaborationMessageAlert?: TSwitchValue;
  };
  inventory: {
    // name: string;
    newInventory: TSwitchValue;
    completelyOut: TSwitchValue;
    newlyAdded: TSwitchValue;
    lowInventory: TSwitchValue;
  };
  workForce: {
    // name: string;
    leaveRequest: TSwitchValue;
    performanceChanges: TSwitchValue;
    lateArrivals: TSwitchValue;
    earlyLeave: TSwitchValue;
  };
};
