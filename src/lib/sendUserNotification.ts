"use server";

type TSendUserNotification = {
  userId: number;
  title: string;
  body: string;
  icons?: string;
  deepLink?: string | null;
};

// this function for onesignal
export const sendUserNotification = async ({
  userId,
  title,
  body,
  deepLink,
}: TSendUserNotification) => {
  try {
    const url = "https://api.onesignal.com/notifications?c=push";
    console.log({ url });
    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        Authorization: `Key ${process.env.ONESIGNAL_AUTHORIZATION_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID as string,
        contents: { en: body },
        headings: { en: title },
        include_aliases: {
          external_id: [`user-${userId}`],
        },
        isAnyWeb: true,
        target_channel: "push",
        web_url: (process.env.NEXT_PUBLIC_SITE_URL as string) + deepLink,
      }),
    };

    const res = await fetch(url, options);
    const response = await res.json();
    console.log("Response from OneSignal:", response);

  } catch (err) {
    console.log("error from onesignal server", err);
    throw err;
  }
};
