# Authorize.Net Payment Integration

This document describes the Authorize.Net payment integration alongside the existing Stripe integration.

## Overview

The platform now supports both Stripe and Authorize.Net payment gateways. Companies can choose to use either gateway exclusively or enable both and let customers choose.

## Features

- ✅ Accept Hosted payment page integration
- ✅ Support for payments and deposits
- ✅ Fleet statement payments
- ✅ Webhook notifications for payment events
- ✅ Multi-gateway support (Stripe + Authorize.Net)
- ✅ Credentials stored securely per company

## Database Schema Changes

### New Fields in Company Model

```prisma
model Company {
  authorizeNetApiLoginId       String?
  authorizeNetTransactionKey   String?
  paymentGateway               PaymentGateway @default(STRIPE)
  authorizeNetPayment          AuthorizeNetPayment[]
}
```

### New Enum

```prisma
enum PaymentGateway {
  STRIPE
  AUTHORIZE_NET
  BOTH
}
```

### New Model

```prisma
model AuthorizeNetPayment {
  id            Int      @id @default(autoincrement())
  transactionId String   @unique
  paymentId     Int      @unique
  payment       Payment
  invoiceId     String?
  invoice       Invoice?
  companyId     Int
  company       Company
}
```

### Updated Payment Model

```prisma
model Payment {
  gateway              PaymentGateway @default(STRIPE)
  authorizeNetPayment  AuthorizeNetPayment?
}
```

## Setup Instructions

### 1. Run Database Migration

```bash
npx prisma migrate dev --name add_authorize_net_support
```

### 2. Set Environment Variables

Add to your `.env` file:

```bash
# Authorize.Net Environment
AUTHORIZE_NET_ENVIRONMENT=sandbox  # or 'production' for live
```

### 3. Configure in Admin Panel

1. Go to **Settings → Payments**
2. Scroll to **Authorize.Net** section
3. Enter your **API Login ID** and **Transaction Key**
4. Click **Save Credentials**
5. Select your preferred **Payment Gateway** (Stripe, Authorize.Net, or Both)

### 4. Set Up Webhooks

Configure webhooks in your Authorize.Net account:

1. Log in to Authorize.Net Merchant Interface
2. Go to **Account → Settings → Webhooks**
3. Add webhook endpoint: `https://yourdomain.com/api/authorize-net/webhook`
4. Select event: **Payment Authorization/Capture**
5. Save webhook configuration

## API Endpoints

### Create Payment Link

```typescript
// Server action
import { createAuthorizeNetPaymentLink } from "@/actions/payment/authorizeNetPayment";

const result = await createAuthorizeNetPaymentLink({
  companyId: 1,
  invoiceId: "inv_123",
  amount: "100.00",
  payType: "payment", // or "deposit"
});

// Returns: { success: true, url: "https://test.authorize.net/payment/payment?token=..." }
```

### Webhook Handler

```
POST /api/authorize-net/webhook
```

Handles payment notifications from Authorize.Net:

- Verifies transaction
- Creates payment records
- Updates invoices
- Sends notifications

## Testing

### Sandbox Credentials

For testing, use Authorize.Net sandbox:

- **Environment**: sandbox
- **Test Card**: 4111 1111 1111 1111
- **Expiration**: Any future date
- **CVV**: 123

### Test Flow

1. Create an invoice in the dashboard
2. Open public invoice view
3. Click "Pay Now"
4. Select payment gateway (if both enabled)
5. Enter amount
6. Complete payment on Authorize.Net hosted page
7. Verify payment record created
8. Check invoice status updated

## Payment Flow

### 1. Customer Initiates Payment

```typescript
// Component usage
<PayNow
  due="100.00"
  invoiceId="inv_123"
  companyId={1}
  open={showDialog}
  setOpen={setShowDialog}
  gatewayInfo={{
    paymentGateway: "BOTH",
    hasStripe: true,
    hasAuthorizeNet: true,
  }}
/>
```

### 2. Payment Link Created

The system creates a hosted payment page token with:

- Transaction amount
- Order information (invoice ID)
- Custom fields (company ID, payment type)
- Return URLs

### 3. Customer Completes Payment

Customer is redirected to Authorize.Net hosted page where they:

- Enter card details securely
- Complete payment
- Redirect back to success page

### 4. Webhook Processes Payment

When Authorize.Net processes payment:

1. Webhook received at `/api/authorize-net/webhook`
2. Transaction verified
3. Payment record created
4. Invoice updated
5. Notification sent

## Security Considerations

### Credentials Storage

- API credentials stored encrypted in database
- Per-company credentials (multi-tenant safe)
- Never exposed to client-side

### PCI Compliance

- Card data never touches your server
- Hosted payment page handles all sensitive data
- Authorize.Net is PCI DSS Level 1 certified

### Webhook Verification

- Webhook signatures should be verified (implement in production)
- Check transaction IDs for duplicates
- Validate amounts and metadata

## Error Handling

Common errors and solutions:

### "Invalid credentials"

- Verify API Login ID and Transaction Key
- Check environment setting (sandbox vs production)
- Ensure credentials match environment

### "Webhook not received"

- Verify webhook URL is publicly accessible
- Check Authorize.Net webhook configuration
- Review webhook logs in Authorize.Net dashboard

### "Payment not recorded"

- Check webhook logs in application
- Verify database connectivity
- Review transaction in Authorize.Net

## Comparison: Stripe vs Authorize.Net

| Feature        | Stripe            | Authorize.Net                |
| -------------- | ----------------- | ---------------------------- |
| International  | ✅ 135+ countries | ❌ US, Canada, UK, Australia |
| Setup          | OAuth Connect     | API Credentials              |
| Hosted Page    | Checkout Sessions | Accept Hosted                |
| Recurring      | ✅ Built-in       | ✅ ARB                       |
| Fees           | 2.9% + $0.30      | Variable by processor        |
| PCI Compliance | Level 1           | Level 1                      |

## Migration from Stripe-Only

If you have existing Stripe-only installations:

1. Run the database migration
2. Existing companies default to `paymentGateway: STRIPE`
3. No changes to existing Stripe integration
4. Companies can opt-in to Authorize.Net
5. Existing invoices unaffected

## Troubleshooting

### Enable Debug Logging

```typescript
// In webhook handler
console.log("Authorize.Net Webhook:", JSON.stringify(body, null, 2));
```

### Test Credentials

```typescript
import { verifyAuthorizeNetCredentials } from "@/actions/payment/authorizeNetPayment";

const result = await verifyAuthorizeNetCredentials(apiLoginId, transactionKey);
console.log(result); // { success: true/false, message: "..." }
```

### Check Payment Gateway Settings

```sql
SELECT id, name, paymentGateway,
       authorizeNetApiLoginId IS NOT NULL as hasAuthorizeNet,
       stripeAccountId IS NOT NULL as hasStripe
FROM Company;
```

## Future Enhancements

Potential improvements:

- [ ] Customer Information Manager (CIM) for saved cards
- [ ] Automated Recurring Billing (ARB)
- [ ] Advanced Fraud Detection Suite (AFDS)
- [ ] eCheck/ACH payments
- [ ] Apple Pay / Google Pay
- [ ] Refund processing via API
- [ ] Webhook signature verification

## Support

For issues or questions:

- Review Authorize.Net documentation: https://developer.authorize.net/
- Check webhook logs in Authorize.Net dashboard
- Review application logs for errors
- Test in sandbox environment first

## References

- [Authorize.Net API Documentation](https://developer.authorize.net/api/reference/)
- [Accept Hosted Integration Guide](https://developer.authorize.net/api/reference/features/accept_hosted.html)
- [Webhooks Documentation](https://developer.authorize.net/api/reference/features/webhooks.html)
