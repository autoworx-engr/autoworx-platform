/**
 * generate-search-registry.ts
 *
 * Auto-generates a search registry from your Next.js App Router file structure.
 * Reads page.tsx files, extracts metadata (title, description), detects forms,
 * and writes a typed registry to lib/search-registry.generated.ts
 *
 * Usage:
 *   yarn generate:search
 *
 * Add to package.json scripts:
 *   "generate:search": "tsx scripts/generate-search-registry.ts"
 *   "prebuild": "yarn generate:search"
 */

import fs from "fs";
import path from "path";
import {
  resolveRoutePermissionKey,
  type RoutePermissionKey,
} from "../src/lib/routePermissionKeys";
import {
  resolveRouteFeatureKey,
  type RouteFeatureKey,
} from "../src/lib/routeFeatureKeys";

// ─── Config ──────────────────────────────────────────────────────────────────

const APP_DIR = path.resolve(process.cwd(), "src/app");
const OUTPUT_FILE = path.resolve(
  process.cwd(),
  "src/lib/search-registry.generated.ts",
);

// Directory segments to skip entirely during crawl
const EXCLUDED_SEGMENTS = new Set([
  "api", // API routes
  "_components", // private folders
  "_lib",
]);

// Routes that start with any of these prefixes are excluded from the registry.
// These are public/auth/utility pages not useful in an authenticated app search.
const EXCLUDED_HREF_PREFIXES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/delete-account",
  "/privacy-policy",
  "/terms-and-conditions",
  "/meta-data-deletion",
  "/contact",
  "/solution",
  "/docs",
  "/greetings",
  "/test-work",
  "/under-cons",
  "/leads", // public lead capture page
  "/leadurl",
  "/booking-url",
  "/bookingurl",
  "/subdomain", // public virtual shop storefront
  "/s", // short-link redirects (/s/[shortCode])
  "/stripe/payment", // post-payment landing pages
  "/public-invoice", // client-facing invoice view
  "/reports", // token-based public report view
  "/awx-dashboard",
  "/api-docs",
  "/dashboard/communication/photo",
  "/dashboard/estimate/photo",
  "/dashboard/settings/my-account/leave-requests",
  "/clickup/reporting",
];

// Keyword stopwords — short/common words that add noise to search
const STOPWORDS = new Set([
  "and",
  "the",
  "for",
  "not",
  "use",
  "how",
  "its",
  "our",
  "you",
  "your",
  "are",
  "with",
  "this",
  "that",
  "from",
  "has",
  "can",
  "all",
  "new",
]);

// Patterns that signal a "form" page
const FORM_SIGNALS = [
  /<form[\s>]/i,
  /useForm\s*\(/,
  /<Form[\s/>]/,
  /FormField/,
  /zodResolver/,
  /handleSubmit/,
  /<input[\s>]/i,
  /<textarea[\s>]/i,
];

// Patterns that signal a "settings" page
const SETTINGS_SIGNALS = [/settings/i, /preferences/i, /profile/i, /account/i];

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemType = "page" | "form" | "settings" | "section";

interface SearchItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  type: ItemType;
  keywords: string[];
  permissionKey?: RoutePermissionKey;
  featureKey?: RouteFeatureKey;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the href contains Next.js parallel slot (@slot) or
 * intercepted route ((.)segment) segments — these are not navigable URLs.
 */
function isNextJsInternalRoute(href: string): boolean {
  return href
    .split("/")
    .some((seg) => seg.startsWith("@") || /^\(\..*\)/.test(seg));
}

/**
 * Returns true if the href matches any excluded prefix.
 */
function isExcludedHref(href: string): boolean {
  return EXCLUDED_HREF_PREFIXES.some(
    (prefix) => href === prefix || href.startsWith(prefix + "/"),
  );
}

function collectPageFiles(dir: string): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) {
    console.warn(`⚠  App directory not found: ${dir}`);
    return results;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip excluded segments and hidden folders
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      if (EXCLUDED_SEGMENTS.has(entry.name)) continue;

      results.push(...collectPageFiles(fullPath));
    } else if (entry.isFile() && /^page\.(tsx|jsx|ts|js)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Convert a file path to a URL-style href.
 * Strips: APP_DIR prefix, /page.tsx suffix, route groups (parenthesised segments),
 * and dynamic segments become their bracket form.
 *
 * Examples:
 *   app/dashboard/page.tsx           → /dashboard
 *   app/(marketing)/about/page.tsx   → /about
 *   app/invoices/[id]/page.tsx       → /invoices/[id]
 */
function filePathToHref(filePath: string): string {
  const relative = path.relative(APP_DIR, filePath); // e.g. "dashboard/page.tsx"
  const withoutFile = relative.replace(/[\\/]page\.(tsx|jsx|ts|js)$/, ""); // "dashboard"

  const segments = withoutFile.split(path.sep).filter((seg) => {
    // Drop route groups like (marketing), (auth)
    return !/^\(.*\)$/.test(seg);
  });

  if (segments.length === 0 || (segments.length === 1 && segments[0] === "")) {
    return "/";
  }

  let href = "/" + segments.join("/");

  // Special case: Reporting tabs require a ?view query parameter to correctly select the active tab.
  const reportingTabs = ["revenue", "inventory", "leads", "payments", "teams"];
  const isReportingTab =
    href.startsWith("/dashboard/reporting/") &&
    reportingTabs.includes(href.split("/").pop() || "");
  if (isReportingTab) {
    const tabName = href.split("/").pop();
    href = `${href}?view=${tabName}`;
  }

  return href;
}

/**
 * Derive a human-readable label from a URL path segment.
 * /invoices/new  → "New Invoice"   (last non-dynamic segment + context)
 */
function hrefToLabel(href: string): string {
  if (href === "/") return "Home";

  const cleanHref = href.split("?")[0];
  const segments = cleanHref.split("/").filter(Boolean);

  return segments
    .map((seg) => {
      if (/^\[.*\]$/.test(seg)) return null; // skip [id] segments
      // Split on hyphens/underscores and capitalise
      return seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    })
    .filter(Boolean)
    .join(" › "); // e.g. "Invoices › New"
}

/**
 * Extract the `title` and `description` fields from a static metadata export.
 *
 * Handles:
 *   export const metadata = { title: "...", description: "..." }
 *   export const metadata: Metadata = { title: "...", description: "..." }
 *
 * Note: Only reads inside the metadata export block to avoid matching
 * unrelated `title` or `description` fields elsewhere in the file.
 */
function extractStaticMetadata(source: string): {
  title?: string;
  description?: string;
} {
  // Narrow to just the metadata export block to avoid matching title/description
  // fields in unrelated component config objects elsewhere in the file.
  const metadataBlockMatch = source.match(
    /export\s+const\s+metadata[^=]*=\s*(\{[\s\S]*?\n\})/,
  );
  const scope = metadataBlockMatch ? metadataBlockMatch[1] : source;

  const titleMatch = scope.match(/title\s*:\s*["'`]([^"'`]+)["'`]/);
  const descMatch = scope.match(/description\s*:\s*["'`]([^"'`]+)["'`]/);
  return {
    title: titleMatch?.[1],
    description: descMatch?.[1],
  };
}

/**
 * Determine the item type by inspecting the page source.
 */
function detectType(href: string, source: string): ItemType {
  if (SETTINGS_SIGNALS.some((re) => re.test(href))) return "settings";
  if (FORM_SIGNALS.some((re) => re.test(source))) return "form";
  return "page";
}

/**
 * Derive keywords from the href path segments (useful for fuzzy matching).
 */
function deriveKeywords(href: string, label: string): string[] {
  const cleanHref = href.split("?")[0]; // strip query string
  const fromPath = cleanHref
    .split("/")
    .filter((s) => s && !/^\[.*\]$/.test(s))
    .map((s) => s.toLowerCase().replace(/[-_]/g, " "));

  const fromLabel = label
    .toLowerCase()
    .split(/[\s›]+/)
    .filter((w) => w.length > 2);

  return [...new Set([...fromPath, ...fromLabel])].filter(
    (w) => w.length > 2 && !STOPWORDS.has(w),
  );
}

/**
 * Slugify a href into a stable string ID.
 */
function hrefToId(href: string): string {
  const cleanHref = href.split("?")[0]; // strip query string
  return cleanHref === "/"
    ? "home"
    : cleanHref.replace(/^\//, "").replace(/\//g, "-");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function generate(): void {
  console.log("🔍 Scanning app directory:", APP_DIR);

  const pageFiles = collectPageFiles(APP_DIR);
  console.log(`   Found ${pageFiles.length} page file(s)`);

  const items: SearchItem[] = [];
  const skipped: string[] = [];

  for (const file of pageFiles) {
    const href = filePathToHref(file);

    // Skip any route that contains a dynamic segment like [id] or [clientId].
    // These require a real ID to navigate to and aren't useful as static search entries.
    const hasDynamicSegment = href.split("/").some((s) => /^\[.*\]$/.test(s));
    if (hasDynamicSegment) {
      skipped.push(`[dynamic-segment] ${href}`);
      continue;
    }

    // Skip Next.js parallel slots (@modal) and intercepted routes ((.)photo)
    if (isNextJsInternalRoute(href)) {
      skipped.push(`[internal-route] ${href}`);
      continue;
    }

    // Skip public/auth/utility routes not useful in app search
    if (isExcludedHref(href)) {
      skipped.push(`[excluded-prefix] ${href}`);
      continue;
    }

    let source = "";
    try {
      source = fs.readFileSync(file, "utf-8");
    } catch {
      console.warn(`   ⚠  Could not read: ${file}`);
      continue;
    }

    const { title, description } = extractStaticMetadata(source);
    const label = title ?? hrefToLabel(href);
    const type = detectType(href, source);
    const keywords = deriveKeywords(href, label);

    const item: SearchItem = {
      id: hrefToId(href),
      label,
      href,
      type,
      keywords,
    };

    if (description) item.description = description;

    // Precompute the permission + company feature keys so the client filters on
    // the keys directly instead of doing a route → key lookup for every item on
    // every render.
    const permissionKey = resolveRoutePermissionKey(href);
    if (permissionKey) item.permissionKey = permissionKey;

    const featureKey = resolveRouteFeatureKey(href);
    if (featureKey) item.featureKey = featureKey;

    items.push(item);
  }

  // Sort: root first, then alphabetically by href
  items.sort((a, b) => {
    if (a.href === "/") return -1;
    if (b.href === "/") return 1;
    return a.href.localeCompare(b.href);
  });

  if (skipped.length) {
    const dynamicOnly = skipped.filter((s) =>
      s.startsWith("[dynamic-segment]"),
    ).length;
    const internal = skipped.filter((s) =>
      s.startsWith("[internal-route]"),
    ).length;
    const excluded = skipped.filter((s) =>
      s.startsWith("[excluded-prefix]"),
    ).length;
    console.log(
      `   Skipped ${skipped.length} route(s): ${dynamicOnly} dynamic-only, ${internal} internal (@modal/(.)intercept), ${excluded} excluded prefixes`,
    );
  }

  // ─── Write output ────────────────────────────────────────────────────────

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const banner = `/**
 * AUTO-GENERATED — do not edit manually.
 * Run: yarn generate:search
 * Generated: ${new Date().toISOString()}
 * Source: ${path.relative(process.cwd(), APP_DIR).replace(/\\/g, "/")}
 */
`;

  const typeDefinition = `import type { RoutePermissionKey } from "./routePermissionKeys";
import type { RouteFeatureKey } from "./routeFeatureKeys";

export type SearchItemType = "page" | "form" | "settings" | "section";

export interface SearchItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  type: SearchItemType;
  keywords: string[];
  /** User-permission key(s) guarding this route, resolved from ROUTE_PERMISSIONS_MAP at generation time. */
  permissionKey?: RoutePermissionKey;
  /** Company feature key(s) guarding this route, resolved from FEATURE_PERMISSIONS_MAP at generation time. */
  featureKey?: RouteFeatureKey;
}
`;

  const registryExport = `
export const generatedRegistry: SearchItem[] = ${JSON.stringify(items, null, 2)};
`;

  const countComment = `\n// ${items.length} route(s) registered\n`;

  fs.writeFileSync(
    OUTPUT_FILE,
    banner + typeDefinition + registryExport + countComment,
    "utf-8",
  );

  console.log(
    `\n✅ Registry written to: ${path.relative(process.cwd(), OUTPUT_FILE)}`,
  );
  console.log(
    `   ${items.length} items: ${items.filter((i) => i.type === "page").length} pages, ${items.filter((i) => i.type === "form").length} forms, ${items.filter((i) => i.type === "settings").length} settings`,
  );
  console.log(
    `   ${items.filter((i) => i.permissionKey).length} permission-guarded, ${items.filter((i) => i.featureKey).length} feature-guarded, ${items.filter((i) => !i.permissionKey && !i.featureKey).length} ungated\n`,
  );
}

generate();
