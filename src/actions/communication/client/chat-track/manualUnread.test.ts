import { getManualUnreadChannels } from "./manualUnread";

describe("getManualUnreadChannels", () => {
  it("allows an SMS thread to be marked unread after a company reply", () => {
    expect(
      getManualUnreadChannels({
        smsLastMessage: "We can have your car ready tomorrow.",
        emailLastMessage: "",
      }),
    ).toEqual({ sms: true, email: false, messenger: false, instagram: false });
  });

  it("ignores empty channels", () => {
    expect(
      getManualUnreadChannels({
        smsLastMessage: "   ",
        emailLastMessage: null,
      }),
    ).toEqual({ sms: false, email: false, messenger: false, instagram: false });
  });

  it("covers messenger and instagram threads too", () => {
    expect(
      getManualUnreadChannels({
        smsLastMessage: null,
        emailLastMessage: null,
        messengerLastMessage: "Sent you the quote 👍",
        instagramLastMessage: "Thanks!",
      }),
    ).toEqual({ sms: false, email: false, messenger: true, instagram: true });
  });
});
