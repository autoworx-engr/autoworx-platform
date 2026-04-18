export const smsQueryKey = {
  allSmsByClientId: (clientId: number) => [`sms`, clientId],
};

export const metaQueryKey = {
  allByClientId: (clientId: number) => [`meta`, clientId],
};
