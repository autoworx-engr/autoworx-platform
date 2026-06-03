import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import { revalidatePath } from "next/cache";
import { fetchTwilioMedia } from "./twilioMedia";
import { persistCompanyMessage } from "./persistCompanyMessage";

export async function processIncomingSMS(
  body: Record<string, string>,
  companyIds: number[],
) {
  const numMedia = parseInt(body.NumMedia, 10) || 0;

  const credential = await db.twilioCredentials.findFirst({
    where: {
      companyId: { in: companyIds },
      phoneNumber: {
        in: [
          body.To.startsWith("+") ? body.To : `+${body.To}`,
          body.To.replace(/^\+/, ""),
        ],
      },
    },
  });

  // Fetch all media files from Twilio in parallel, then upload them in one call.
  const mediaFetches: Promise<File>[] = [];
  for (let i = 0; i < numMedia; i++) {
    const mediaUrl = body[`MediaUrl${i}`];
    if (!mediaUrl) continue;
    mediaFetches.push(
      fetchTwilioMedia(
        mediaUrl,
        credential?.apiKeySid || "",
        credential?.apiKeySecret || "",
      ),
    );
  }

  const fetchedFiles = await Promise.all(mediaFetches);
  const images = await uploadFetchedFiles(fetchedFiles);

  // Pre-fetch entitlements for every company upfront to avoid N+1 in the loop.
  const entitlementsByCompany = new Map(
    await Promise.all(
      companyIds.map(
        async (id) => [id, await getCompanyEntitlements(id)] as const,
      ),
    ),
  );

  for (const companyId of companyIds) {
    const entitlements = entitlementsByCompany.get(companyId)!;
    if (!entitlements.canUseSms) continue;

    try {
      await persistCompanyMessage({
        body,
        companyId,
        entitlements,
        credential,
        images,
      });
    } catch (err) {
      console.error(
        `[sms-receive] failed processing company ${companyId}:`,
        err,
      );
    }
  }

  revalidatePath("/dashboard/communication/client");
}

async function uploadFetchedFiles(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];

  const formData = new FormData();
  for (const file of files) formData.append("file", file);

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  const imgs = await res.json();
  return imgs?.data ?? [];
}
