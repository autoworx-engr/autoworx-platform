type ConversationMessages = {
  smsLastMessage: string | null;
  emailLastMessage: string | null;
  messengerLastMessage?: string | null;
  instagramLastMessage?: string | null;
};

export function getManualUnreadChannels(track: ConversationMessages) {
  return {
    sms: Boolean(track.smsLastMessage?.trim()),
    email: Boolean(track.emailLastMessage?.trim()),
    messenger: Boolean(track.messengerLastMessage?.trim()),
    instagram: Boolean(track.instagramLastMessage?.trim()),
  };
}
