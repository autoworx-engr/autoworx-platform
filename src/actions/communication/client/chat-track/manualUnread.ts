type ConversationMessages = {
  smsLastMessage: string | null;
  emailLastMessage: string | null;
};

export function getManualUnreadChannels(track: ConversationMessages) {
  return {
    sms: Boolean(track.smsLastMessage?.trim()),
    email: Boolean(track.emailLastMessage?.trim()),
  };
}
