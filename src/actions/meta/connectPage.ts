"use server";

import { type MetaPendingPayload } from "@/app/api/meta/callback/route";
import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { redirect } from "next/navigation";

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Server action invoked by the page-selection form at `/meta-select`.
 *
 * Receives the encrypted `MetaPendingPayload` (set in the OAuth callback) and
 * the `pageId` the user selected, then:
 * 1. Decrypts and validates the payload
 * 2. Subscribes the selected page to webhook events (`messages`, `messaging_postbacks`)
 * 3. Deactivates any previously connected Meta integration for the company
 * 4. Upserts `MetaCredentials` with the encrypted page access token
 * 5. Redirects to `/dashboard/settings/communications?meta=connected`
 *
 * @param formData - Must contain `data` (encrypted payload) and `pageId` fields
 */
export async function connectMetaPage(formData: FormData) {
  const rawData = formData.get("data") as string;
  const pageId = formData.get("pageId") as string;

  if (!rawData || !pageId) {
    redirect("/dashboard/settings/communications?meta=error");
  }

  let payload: MetaPendingPayload;
  try {
    const decrypted = decrypt(
      Buffer.from(rawData, "base64url").toString("utf8"),
    );
    payload = JSON.parse(decrypted) as MetaPendingPayload;
  } catch {
    redirect("/dashboard/settings/communications?meta=error");
  }

  const { companyId, metaUserId, pages } = payload;
  const page = pages.find((p) => p.id === pageId);

  if (!page) {
    redirect("/dashboard/settings/communications?meta=error");
  }

  try {
    const pageToken = page.access_token;

    // Resolve Instagram username if the account ID was found during OAuth but
    // the username lookup wasn't cached (e.g. network hiccup during callback)
    let instagramUsername = page.instagramUsername;
    if (page.instagramAccountId && !instagramUsername) {
      const igUserRes = await fetch(
        `${GRAPH}/${page.instagramAccountId}?fields=username&access_token=${pageToken}`,
      );
      const igUserData = (await igUserRes.json()) as { username?: string };
      instagramUsername = igUserData.username;
    }

    // Subscribe the selected page to webhook events so Meta POSTs incoming
    // messages to /api/meta/webhook
    const subRes = await fetch(`${GRAPH}/${page.id}/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscribed_fields: ["messages", "messaging_postbacks"],
        access_token: pageToken,
      }),
    });
    if (!subRes.ok) {
      const err = await subRes.json();
      console.error("[meta/connectPage] Webhook subscription failed:", err);
    }

    // One company → one active Meta integration at a time
    await db.metaCredentials.updateMany({
      where: { companyId, isActive: true },
      data: { isActive: false },
    });

    // Store the page access token encrypted with AES-256-GCM
    await db.metaCredentials.upsert({
      where: { companyId_pageId: { companyId, pageId: page.id } },
      create: {
        companyId,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: encrypt(pageToken),
        instagramAccountId: page.instagramAccountId,
        instagramUsername,
        metaUserId,
        isActive: true,
      },
      update: {
        pageName: page.name,
        pageAccessToken: encrypt(pageToken),
        instagramAccountId: page.instagramAccountId,
        instagramUsername,
        metaUserId,
        isActive: true,
      },
    });
  } catch (err) {
    console.error(
      "[meta/connectPage] Error:",
      err instanceof Error ? err.message : err,
    );
    redirect("/dashboard/settings/communications?meta=error");
  }

  redirect("/dashboard/settings/communications?meta=connected");
}
