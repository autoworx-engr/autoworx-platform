import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import {
  buildAddressFromGbp,
  exchangeGbpCode,
  fetchGbpAccounts,
  fetchGbpLocations,
} from "@/lib/gbp";
import { NextRequest, NextResponse } from "next/server";

const REDIRECT_BASE = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reputation-management`;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${REDIRECT_BASE}?error=${encodeURIComponent(error ?? "access_denied")}`,
    );
  }

  try {
    const companyId = await getCompanyId();
    const tokens = await exchangeGbpCode(code);

    const accountsData = await fetchGbpAccounts(tokens.access_token!);
    const account = accountsData.accounts?.[0];
    if (!account) {
      return NextResponse.redirect(`${REDIRECT_BASE}?error=no_account_found`);
    }

    await db.company.update({
      where: { id: companyId },
      data: {
        gbpAccessToken: tokens.access_token,
        gbpRefreshToken: tokens.refresh_token ?? undefined,
        gbpTokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : undefined,
        gbpAccountId: account.name,
      },
    });

    // Sync locations immediately after connecting
    const locationsData = await fetchGbpLocations(
      tokens.access_token!,
      account.name,
    );
    const locations = locationsData.locations ?? [];

    for (const loc of locations) {
      const googleLocationId = loc.name.split("/").pop() as string;
      await db.gbpLocation.upsert({
        where: {
          companyId_googleLocationId: { companyId, googleLocationId },
        },
        create: {
          companyId,
          googleLocationId,
          googleAccountId: account.name,
          name: loc.title ?? googleLocationId,
          address: buildAddressFromGbp(loc.storefrontAddress),
        },
        update: {
          name: loc.title ?? googleLocationId,
          address: buildAddressFromGbp(loc.storefrontAddress),
          isActive: true,
        },
      });
    }

    return NextResponse.redirect(`${REDIRECT_BASE}?connected=1`);
  } catch (err: any) {
    console.error("[gbp/callback]", err);
    return NextResponse.redirect(
      `${REDIRECT_BASE}?error=${encodeURIComponent(err?.message ?? "unknown")}`,
    );
  }
}
