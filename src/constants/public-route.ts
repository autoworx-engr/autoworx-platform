export const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/"];

export const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/refresh-token",
  "/api/auth/providers",
  "/api/auth/signin",
  "/api/auth/callback/credentials",
  "/api/auth/csrf",
  "/api/sales-agent",
  "/api/task",
  "/api/ai-train-company",
  "/api/notifications/client-abuse",
  // Webhook endpoints
  "/api/pusher/collaboration",
  "/api/stripe/invoice-pay-hook",
  "/api/twilio/token",
  "/api/twilio/register-voip",
  "/api/infobip",
  "/api/lead-generate",
  "/api/authorize-net/webhook",
  "/api/platform/webhook",
  "/api/infobip/mms/receive",
  "/api/infobip/email/receive",
  "/api/twilio/call-recording",
  "/api/twilio/call-state",
  "/api/twilio/call-status",
  "/api/twilio/incoming",
  "/api/twilio/receive",
  "/api/twilio/whisper",
  "/api/twilio/token",
  "/api/invoice/track-view",
  "/api/upload",
  "/api/communication/client-hub/send-twilio-message",
];

export const PUBLIC_DYNAMIC_API_ROUTES = [
  "/api/infobip/sms/receive/:companyIds",
  "/api/twilio/sms-receive/:companyIds",
  "/api/twilio/call-recording/:recordingSid",
  "/api/admin/client/:id/sales-agent",
  // Public shop resolve by subdomain slug
  "/api/virtual-shop/configure/subdomain/:slug",
];
