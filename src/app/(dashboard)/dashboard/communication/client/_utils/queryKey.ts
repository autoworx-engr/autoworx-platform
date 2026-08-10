export const smsQueryKey = {
  allSmsByClientId: (clientId: number) => [`sms`, clientId],
};

export const messengerQueryKey = {
  allByClientId: (clientId: number) => [`messenger`, clientId],
};

export const instagramQueryKey = {
  allByClientId: (clientId: number) => [`instagram`, clientId],
};
