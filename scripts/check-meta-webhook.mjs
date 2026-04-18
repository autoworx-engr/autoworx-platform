/**
 * One-off diagnostic: checks which webhook fields are subscribed for the
 * MetaCredentials connected to companyId 1.
 *
 * Run with:  node scripts/check-meta-webhook.mjs
 */

import { createDecipheriv } from "crypto";
import { PrismaClient } from "@prisma/client";

const ENCRYPTION_KEY_HEX =
  "2a3edc346bb229bce849c94a115ba83784d2b4bc1e8dd7da0c7e1ef424f4fed6";
const COMPANY_ID = 1;
const GRAPH = "https://graph.facebook.com/v21.0";

function decrypt(encryptedText) {
  const key = Buffer.from(ENCRYPTION_KEY_HEX, "hex");
  const [ivHex, authTagHex, dataHex] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(dataHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

const prisma = new PrismaClient();

const rows = await prisma.metaCredentials.findMany({
  where: { companyId: COMPANY_ID },
  orderBy: { id: "desc" },
});

await prisma.$disconnect();

if (!rows.length) {
  console.log("No MetaCredentials found for companyId", COMPANY_ID);
  process.exit(0);
}

console.log(`Found ${rows.length} MetaCredentials row(s) for companyId ${COMPANY_ID}:\n`);

for (const row of rows) {
  console.log("─────────────────────────────────────────");
  console.log("  DB id:               ", row.id);
  console.log("  pageId:              ", row.pageId);
  console.log("  pageName:            ", row.pageName);
  console.log("  instagramAccountId:  ", row.instagramAccountId ?? "(none)");
  console.log("  instagramUsername:   ", row.instagramUsername ?? "(none)");
  console.log("  isActive:            ", row.isActive);

  let pageToken;
  try {
    pageToken = decrypt(row.pageAccessToken);
    console.log("  token decrypted:      OK (first 20 chars:", pageToken.slice(0, 20) + "…)");
  } catch (err) {
    console.error("  token decrypt ERROR:", err.message);
    continue;
  }

  // Check subscribed fields
  console.log("\n  Calling GET", `${GRAPH}/${row.pageId}/subscribed_apps?access_token=<token>`, "\n");
  const res = await fetch(`${GRAPH}/${row.pageId}/subscribed_apps?access_token=${pageToken}`);
  const data = await res.json();
  console.log("  HTTP status:", res.status);
  console.log("  Response:", JSON.stringify(data, null, 2));
}

console.log("\n─────────────────────────────────────────");
console.log("Done.");
