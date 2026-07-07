"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

async function fetchFacebookPagePicture(
  pageId: string,
  accessToken: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/picture?redirect=false&type=large&access_token=${accessToken}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { url?: string } };
    return json.data?.url ?? null;
  } catch {
    return null;
  }
}

async function fetchInstagramAccountPicture(
  igUserId: string,
  accessToken: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}?fields=profile_picture_url&access_token=${accessToken}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { profile_picture_url?: string };
    return json.profile_picture_url ?? null;
  } catch {
    return null;
  }
}

/**
 * Silently refreshes pictureUrl for all active Facebook Pages and Instagram
 * accounts belonging to this company. Called when the settings page renders.
 */
export async function refreshSettingsPhotos(): Promise<void> {
  try {
    const companyId = await getCompanyId();

    const [pages, igAccounts] = await Promise.all([
      db.facebookPage.findMany({
        where: { companyId, isActive: true },
        select: {
          id: true,
          pageId: true,
          pageAccessToken: true,
          pictureUrl: true,
        },
      }),
      db.instagramAccount.findMany({
        where: { companyId, isActive: true },
        select: {
          id: true,
          igUserId: true,
          pageAccessToken: true,
          pictureUrl: true,
        },
      }),
    ]);

    await Promise.allSettled([
      // Refresh Facebook Page pictures
      ...pages.map(async (page) => {
        const url = await fetchFacebookPagePicture(
          page.pageId,
          page.pageAccessToken,
        );
        if (url && url !== page.pictureUrl) {
          await db.facebookPage.update({
            where: { id: page.id },
            data: { pictureUrl: url },
          });
        }
      }),

      // Refresh Instagram account pictures
      ...igAccounts.map(async (account) => {
        const url = await fetchInstagramAccountPicture(
          account.igUserId,
          account.pageAccessToken,
        );
        if (url && url !== account.pictureUrl) {
          await db.instagramAccount.update({
            where: { id: account.id },
            data: { pictureUrl: url },
          });
        }
      }),
    ]);
  } catch {
    // silent — never break the settings page
  }
}
