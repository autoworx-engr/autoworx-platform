import { google } from "googleapis";
import { db } from "./db";

const GBP_CLIENT_ID = process.env.GBP_CLIENT_ID!;
const GBP_CLIENT_SECRET = process.env.GBP_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/gbp/callback`;

const GBP_SCOPES = ["https://www.googleapis.com/auth/business.manage"];

export function createGbpOAuth2Client() {
  return new google.auth.OAuth2(GBP_CLIENT_ID, GBP_CLIENT_SECRET, REDIRECT_URI);
}

export function generateGbpAuthUrl() {
  const client = createGbpOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: GBP_SCOPES,
    prompt: "consent",
  });
}

export async function exchangeGbpCode(code: string) {
  const client = createGbpOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function refreshGbpToken(refreshToken: string) {
  const client = createGbpOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

export async function getValidGbpToken(companyId: number): Promise<string> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      gbpAccessToken: true,
      gbpRefreshToken: true,
      gbpTokenExpiresAt: true,
    },
  });

  if (!company?.gbpRefreshToken) throw new Error("GBP not connected");

  const isExpired =
    !company.gbpTokenExpiresAt || company.gbpTokenExpiresAt < new Date();

  if (!isExpired && company.gbpAccessToken) {
    return company.gbpAccessToken;
  }

  const credentials = await refreshGbpToken(company.gbpRefreshToken);

  await db.company.update({
    where: { id: companyId },
    data: {
      gbpAccessToken: credentials.access_token ?? undefined,
      gbpTokenExpiresAt: credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : undefined,
    },
  });

  return credentials.access_token!;
}

export async function fetchGbpAccounts(accessToken: string) {
  const res = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error("Failed to fetch GBP accounts");
  return res.json();
}

export async function fetchGbpLocations(
  accessToken: string,
  accountName: string,
) {
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error("Failed to fetch GBP locations");
  return res.json();
}

export async function fetchGbpReviews(
  accessToken: string,
  locationName: string,
  pageToken?: string,
) {
  const url = new URL(
    `https://mybusiness.googleapis.com/v4/${locationName}/reviews`,
  );
  url.searchParams.set("pageSize", "50");
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch GBP reviews");
  return res.json();
}

export async function postGbpReply(
  accessToken: string,
  reviewName: string,
  comment: string,
) {
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment }),
    },
  );
  if (!res.ok) throw new Error("Failed to post reply to Google");
  return res.json();
}

const STAR_RATING_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

export function starRatingToNumber(rating: string): number {
  return STAR_RATING_MAP[rating] ?? 0;
}

export function buildAddressFromGbp(
  storefrontAddress: any,
): string | undefined {
  if (!storefrontAddress) return undefined;
  return [
    storefrontAddress.addressLines?.[0],
    storefrontAddress.locality,
    storefrontAddress.administrativeArea,
  ]
    .filter(Boolean)
    .join(", ");
}
