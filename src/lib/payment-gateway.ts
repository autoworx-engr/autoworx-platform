/**
 * Payment Gateway Abstraction Layer
 * Provides a unified interface for multiple payment processors (Stripe, Authorize.Net)
 */

export interface PaymentParams {
  companyId: number;
  invoiceId?: string;
  statementId?: string;
  shopBookingId?: string;
  paymentId?: string;
  giftCardSource?: "purchase" | "reload";
  giftCardCode?: string;
  giftCardId?: number;
  amount: string;
  tip?: string;
  payType:
    | "payment"
    | "deposit"
    | "statement"
    | "virtual_shop_deposit"
    | "virtual_shop_gift_card";
  redirectUrl?: string;
}

export interface PaymentLink {
  url?: string;
  token?: string;
  success: boolean;
  message?: string;
}

export interface WebhookResult {
  success: boolean;
  message: string;
  processed?: boolean;
}

export interface AccountVerification {
  success: boolean;
  enabled?: boolean;
  message?: string;
  data?: any;
}

/**
 * Payment Gateway Interface
 * All payment gateways must implement this interface
 */
export interface IPaymentGateway {
  /**
   * Create a payment link/token for customer checkout
   */
  createPaymentLink(params: PaymentParams): Promise<PaymentLink>;

  /**
   * Process webhook from payment gateway
   */
  processWebhook(request: Request): Promise<WebhookResult>;

  /**
   * Verify account credentials and status
   */
  verifyAccount(): Promise<AccountVerification>;

  /**
   * Get gateway name
   */
  getGatewayName(): string;
}

/**
 * Company with payment gateway settings
 */
export interface CompanyWithGateway {
  id: number;
  stripeAccountId?: string | null;
  authorizeNetApiLoginId?: string | null;
  authorizeNetTransactionKey?: string | null;
  paymentGateway: "STRIPE" | "AUTHORIZE_NET" | "BOTH";
}

/**
 * Get the appropriate payment gateway for a company
 */
export function getPaymentGateway(
  company: CompanyWithGateway,
  preferredGateway?: "STRIPE" | "AUTHORIZE_NET",
): "STRIPE" | "AUTHORIZE_NET" {
  // If preferred gateway is specified and available, use it
  if (preferredGateway) {
    if (preferredGateway === "STRIPE" && company.stripeAccountId) {
      return "STRIPE";
    }
    if (
      preferredGateway === "AUTHORIZE_NET" &&
      company.authorizeNetApiLoginId
    ) {
      return "AUTHORIZE_NET";
    }
  }

  // Use company's default gateway
  if (company.paymentGateway === "BOTH") {
    // Default to Stripe if both are enabled
    if (company.stripeAccountId) return "STRIPE";
    if (company.authorizeNetApiLoginId) return "AUTHORIZE_NET";
  } else if (company.paymentGateway === "AUTHORIZE_NET") {
    if (company.authorizeNetApiLoginId) return "AUTHORIZE_NET";
  } else {
    // Default to STRIPE
    if (company.stripeAccountId) return "STRIPE";
  }

  // Fallback
  return "STRIPE";
}

/**
 * Check if a company has any payment gateway configured
 */
export function hasPaymentGatewayConfigured(
  company: CompanyWithGateway,
): boolean {
  return !!(company.stripeAccountId || company.authorizeNetApiLoginId);
}

/**
 * Get list of available payment gateways for a company
 */
export function getAvailableGateways(
  company: CompanyWithGateway,
): Array<"STRIPE" | "AUTHORIZE_NET"> {
  const gateways: Array<"STRIPE" | "AUTHORIZE_NET"> = [];

  if (company.stripeAccountId) {
    gateways.push("STRIPE");
  }

  if (company.authorizeNetApiLoginId && company.authorizeNetTransactionKey) {
    gateways.push("AUTHORIZE_NET");
  }

  return gateways;
}
