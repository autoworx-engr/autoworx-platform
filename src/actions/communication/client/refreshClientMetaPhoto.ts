"use server";

import { db } from "@/lib/db";

async function fetchProfilePic(
  id: string,
  accessToken: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${id}?fields=profile_pic&access_token=${accessToken}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { profile_pic?: string };
    return data.profile_pic ?? null;
  } catch {
    return null;
  }
}

/**
 * Silently re-fetches the Meta profile picture for a client and updates the DB.
 * Fire-and-forget — call without await from the UI.
 */
export async function refreshClientMetaPhoto(clientId: number): Promise<void> {
  try {
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: {
        photo: true,
        facebookProfiles: {
          take: 1,
          select: {
            psid: true,
            facebookPage: { select: { pageAccessToken: true } },
          },
        },
        instagramProfiles: {
          take: 1,
          select: {
            igsid: true,
            igAccount: { select: { pageAccessToken: true } },
          },
        },
      },
    });

    if (!client) return;

    let freshPhoto: string | null = null;

    // Try Messenger first
    const fbProfile = client.facebookProfiles[0];
    if (fbProfile?.facebookPage?.pageAccessToken) {
      freshPhoto = await fetchProfilePic(
        fbProfile.psid,
        fbProfile.facebookPage.pageAccessToken,
      );
    }

    // Instagram overwrites if available (more likely to be up-to-date)
    const igProfile = client.instagramProfiles[0];
    if (igProfile?.igAccount?.pageAccessToken) {
      const igPhoto = await fetchProfilePic(
        igProfile.igsid,
        igProfile.igAccount.pageAccessToken,
      );
      if (igPhoto) freshPhoto = igPhoto;
    }

    if (freshPhoto && freshPhoto !== client.photo) {
      await db.client.update({
        where: { id: clientId },
        data: { photo: freshPhoto },
      });
    }
  } catch {
    // silent — background refresh, never breaks the UI
  }
}
