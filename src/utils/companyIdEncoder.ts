// Simple encoding/decoding utility for hiding company IDs in URLs
export function encodeCompanyId(companyId: string): string {
  // Base64 encode the company ID with a prefix to make it less obvious
  const encoded = Buffer.from(
    `awx_${companyId}_${Date.now().toString(36)}`,
  ).toString("base64");
  return encoded.replace(/[+=]/g, "").substring(0, 16); // Remove padding and truncate
}

export function decodeCompanyId(encodedId: string): string[] | [] {
  try {
    // Pad the encoded string if necessary
    const padded =
      encodedId + "==".substring(0, (4 - (encodedId.length % 4)) % 4);
    const decoded = Buffer.from(padded, "base64").toString();

    // Extract company ID from the decoded string
    const match = decoded.match(/^awx_(\d+)_(\d+)_/);
    return match ? [match[1], match[2]] : [];
  } catch (error) {
    return [];
  }
}

// Alternative: Use a simple hash-based approach
export function hashCompanyId(companyId: string): string {
  // Simple hash function (not cryptographically secure, but good for obfuscation)
  let hash = 0;
  const str = `company_${companyId}_autoworx`;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}

// For the hash approach, you'd need to store a mapping in your database
// or use a more sophisticated encoding that can be reversed
