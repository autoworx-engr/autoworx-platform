export const smsQueryKey = {
  allSmsByClientId: (clientId: number) => [`sms`, clientId],
};

export const messengerQueryKey = {
  allByClientId: (clientId: number) => [`messenger`, clientId],
};
