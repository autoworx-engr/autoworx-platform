"use server";
import { nanoid } from "nanoid";
import { db } from "./db";

const prisma = db;

export interface CreateShortLinkOptions {
  originalUrl: string;
  title?: string;
  description?: string;
  customCode?: string;
  expiresAt?: Date;
  createdBy?: number;
  companyId?: number;
}

export interface ShortLinkStats {
  id: number;
  shortCode: string;
  originalUrl: string;
  title?: string | null;
  clicks: number;
  isActive: boolean;
  expiresAt?: Date | null;
  createdAt: Date;
}

/**
 * Generates a unique short code for URLs
 */
function generateShortCode(length: number = 6): string {
  // Use only URL-safe characters: letters and numbers
  const alphabet =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return nanoid(length).replace(
    /[^a-zA-Z0-9]/g,
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  );
}

/**
 * Find existing short link by original URL only (ignores user/company filters)
 */
export async function findExistingShortLink(originalUrl: string): Promise<{
  success: boolean;
  shortCode?: string;
  shortUrl?: string;
  error?: string;
}> {
  try {
    const existingLink = await prisma.shortLink.findFirst({
      where: {
        originalUrl,
        isActive: true,
      },
      orderBy: { createdAt: "desc" }, // Get the most recent one
    });

    if (existingLink) {
      // Check if it's expired
      if (existingLink.expiresAt && existingLink.expiresAt < new Date()) {
        return { success: false, error: "Existing link has expired" };
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXTAUTH_URL ||
        "http://localhost:3000";
      const shortUrl = `${baseUrl}/s/${existingLink.shortCode}`;

      return {
        success: true,
        shortCode: existingLink.shortCode,
        shortUrl,
      };
    }

    return { success: false, error: "No existing link found" };
  } catch (error) {
    console.error("Error finding existing short link:", error);
    return { success: false, error: "Failed to find existing short link" };
  }
}

/**
 * Creates a new short link or returns existing one
 */
export async function createShortLink(
  options: CreateShortLinkOptions,
): Promise<{
  success: boolean;
  shortCode?: string;
  shortUrl?: string;
  error?: string;
  isExisting?: boolean;
}> {
  try {
    // Validate URL
    try {
      new URL(options.originalUrl);
    } catch {
      return { success: false, error: "Invalid URL provided" };
    }

    // First, try to find an existing short link
    const existingResult = await findExistingShortLink(options.originalUrl);

    if (existingResult.success) {
      console.log("🔗 Found existing short link:", {
        originalUrl: options.originalUrl,
        shortCode: existingResult.shortCode,
        shortUrl: existingResult.shortUrl,
      });
      return {
        ...existingResult,
        isExisting: true,
      };
    }

    let shortCode = options.customCode;

    // Generate unique short code if not provided
    if (!shortCode) {
      let attempts = 0;
      const maxAttempts = 10;

      do {
        shortCode = generateShortCode();
        attempts++;

        // Check if code already exists
        const existing = await prisma.shortLink.findUnique({
          where: { shortCode },
        });

        if (!existing) break;

        if (attempts >= maxAttempts) {
          return {
            success: false,
            error: "Unable to generate unique short code",
          };
        }
      } while (true);
    } else {
      // Check if custom code is available
      const existing = await prisma.shortLink.findUnique({
        where: { shortCode },
      });

      if (existing) {
        return { success: false, error: "Custom short code already exists" };
      }
    }

    // Create the short link
    const shortLink = await prisma.shortLink.create({
      data: {
        shortCode,
        originalUrl: options.originalUrl,
        title: options.title,
        description: options.description,
        expiresAt: options.expiresAt,
        createdBy: options.createdBy,
        companyId: options.companyId,
      },
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";
    const shortUrl = `${baseUrl}/s/${shortCode}`;

    return {
      success: true,
      shortCode,
      shortUrl,
      isExisting: false,
    };
  } catch (error) {
    console.error("Error creating short link:", error);
    return { success: false, error: "Failed to create short link" };
  }
}

/**
 * Get short link without incrementing click count (for metadata generation)
 */
export async function getShortLinkInfo(shortCode: string): Promise<{
  success: boolean;
  originalUrl?: string;
  error?: string;
}> {
  try {
    const shortLink = await prisma.shortLink.findUnique({
      where: { shortCode },
    });

    if (!shortLink) {
      return { success: false, error: "Short link not found" };
    }

    if (!shortLink.isActive) {
      return { success: false, error: "Short link is disabled" };
    }

    if (shortLink.expiresAt && shortLink.expiresAt < new Date()) {
      return { success: false, error: "Short link has expired" };
    }

    return {
      success: true,
      originalUrl: shortLink.originalUrl,
    };
  } catch (error) {
    console.error("Error retrieving short link info:", error);
    return { success: false, error: "Failed to retrieve short link" };
  }
}

/**
 * Retrieves and tracks a short link click
 */
export async function getShortLink(shortCode: string): Promise<{
  success: boolean;
  originalUrl?: string;
  error?: string;
}> {
  try {
    const shortLink = await prisma.shortLink.findUnique({
      where: { shortCode },
    });

    if (!shortLink) {
      return { success: false, error: "Short link not found" };
    }

    if (!shortLink.isActive) {
      return { success: false, error: "Short link is disabled" };
    }

    if (shortLink.expiresAt && shortLink.expiresAt < new Date()) {
      return { success: false, error: "Short link has expired" };
    }

    console.log("🔗 Incrementing click count for:", shortCode);

    // Increment click count
    await prisma.shortLink.update({
      where: { id: shortLink.id },
      data: { clicks: { increment: 1 } },
    });

    return {
      success: true,
      originalUrl: shortLink.originalUrl,
    };
  } catch (error) {
    console.error("Error retrieving short link:", error);
    return { success: false, error: "Failed to retrieve short link" };
  }
}

/**
 * Get short link statistics
 */
export async function getShortLinkStats(shortCode: string): Promise<{
  success: boolean;
  data?: ShortLinkStats;
  error?: string;
}> {
  try {
    const shortLink = await prisma.shortLink.findUnique({
      where: { shortCode },
      select: {
        id: true,
        shortCode: true,
        originalUrl: true,
        title: true,
        clicks: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    if (!shortLink) {
      return { success: false, error: "Short link not found" };
    }

    return {
      success: true,
      data: shortLink,
    };
  } catch (error) {
    console.error("Error getting short link stats:", error);
    return { success: false, error: "Failed to get statistics" };
  }
}

/**
 * Update short link
 */
export async function updateShortLink(
  shortCode: string,
  updates: {
    title?: string;
    description?: string;
    isActive?: boolean;
    expiresAt?: Date | null;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.shortLink.update({
      where: { shortCode },
      data: updates,
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating short link:", error);
    return { success: false, error: "Failed to update short link" };
  }
}

/**
 * Delete short link
 */
export async function deleteShortLink(
  shortCode: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.shortLink.delete({
      where: { shortCode },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting short link:", error);
    return { success: false, error: "Failed to delete short link" };
  }
}

/**
 * Get or create a short link for an invoice
 */
export async function getOrCreateInvoiceShortLink(
  invoiceId: string,
  clientName?: string,
  createdBy?: number,
  companyId?: number,
): Promise<{
  success: boolean;
  shortCode?: string;
  shortUrl?: string;
  originalUrl?: string;
  isExisting?: boolean;
  error?: string;
}> {
  try {
    const originalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoiceId}`;

    const result = await createShortLink({
      originalUrl,
      title: `Invoice ${invoiceId}${clientName ? ` - ${clientName}` : ""}`,
      description: `Public invoice link${clientName ? ` for ${clientName}` : ""}`,
      createdBy,
      companyId,
    });

    return {
      ...result,
      originalUrl,
    };
  } catch (error) {
    console.error("Error getting/creating invoice short link:", error);
    return {
      success: false,
      error: "Failed to get/create invoice short link",
      originalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoiceId}`,
    };
  }
}
/**
 * Get or create a short link for an fleet
 */
export async function getOrCreateFleetShortLink(
  statementId: string,
  clientName?: string,
  createdBy?: number,
  companyId?: number,
): Promise<{
  success: boolean;
  shortCode?: string;
  shortUrl?: string;
  originalUrl?: string;
  isExisting?: boolean;
  error?: string;
}> {
  try {
    const originalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${statementId}?fleet=true`;

    const result = await createShortLink({
      originalUrl,
      title: `Fleet Statement ${statementId}${clientName ? ` - ${clientName}` : ""}`,
      description: `Public fleet statement link${clientName ? ` for ${clientName}` : ""}`,
      createdBy,
      companyId,
    });

    return {
      ...result,
      originalUrl,
    };
  } catch (error) {
    console.error("Error getting/creating fleet statement short link:", error);
    return {
      success: false,
      error: "Failed to get/create fleet statement short link",
      originalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${statementId}?fleet=true`,
    };
  }
}

/**
 * List short links for a user or company
 */
export async function listShortLinks(filters: {
  createdBy?: number;
  companyId?: number;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{
  success: boolean;
  data?: ShortLinkStats[];
  total?: number;
  error?: string;
}> {
  try {
    const where: any = {};

    if (filters.createdBy !== undefined) where.createdBy = filters.createdBy;
    if (filters.companyId !== undefined) where.companyId = filters.companyId;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    const [shortLinks, total] = await Promise.all([
      prisma.shortLink.findMany({
        where,
        select: {
          id: true,
          shortCode: true,
          originalUrl: true,
          title: true,
          clicks: true,
          isActive: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.shortLink.count({ where }),
    ]);

    return {
      success: true,
      data: shortLinks,
      total,
    };
  } catch (error) {
    console.error("Error listing short links:", error);
    return { success: false, error: "Failed to list short links" };
  }
}
