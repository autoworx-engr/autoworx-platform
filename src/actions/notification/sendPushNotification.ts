"use server";

type TSendPushNotification = {
  userId: number;
  title: string;
  body: string;
  icons?: string;
  deepLink?: string | null;
};

// this function for onesignal
export const sendPushNotification = async ({
  userId,
  title,
  body,
  deepLink,
  icons,
}: TSendPushNotification) => {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL as string;
    const resolvedWebUrl = deepLink ? `${siteUrl}${deepLink}` : siteUrl;

    const url = "https://api.onesignal.com/notifications?c=push";
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
        target_channel: "push",
        headings: { en: title },
        include_aliases: {
          external_id: [`user-${userId}`],
        },
        isAnyWeb: true,
        isIos: true,
        isAndroid: true,

        // 2. ROUTING & DEEP LINKS
        web_url: resolvedWebUrl,
        // app_url: resolvedAppUrl, // Uncomment if using custom mobile URI schemes

        // Pass the deepLink directly to mobile frontend via the 'data' payload
        // Your iOS/Android app will read this 'route' key when the user taps the notification
        data: {
          route: deepLink || "/",
        },
        // 3. ICONS & MEDIA (If an icon URL is provided)
        ...(icons && {
          large_icon: icons,
          chrome_web_icon: icons,
          ios_attachments: { id: icons },
        }),
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
