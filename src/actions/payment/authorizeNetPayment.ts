"use server";

import { db } from "@/lib/db";
import { env } from "next-runtime-env";
const ApiContracts = require("authorizenet").APIContracts;
const ApiControllers = require("authorizenet").APIControllers;
const SDKConstants = require("authorizenet").Constants;
import { PaymentParams, PaymentLink } from "@/lib/payment-gateway";

/**
 * Create Authorize.Net payment form token using Accept Hosted
 */
export const createAuthorizeNetPaymentLink = async ({
  companyId,
  invoiceId,
  statementId,
  shopBookingId,
  paymentId,
  amount,
  payType,
}: PaymentParams): Promise<PaymentLink> => {
  try {
    if (!invoiceId && !statementId && !shopBookingId && !paymentId) {
      throw new Error("Invoice, Statement or Booking ID is required");
    }

    const company = await db.company.findFirst({
      where: { id: companyId },
      select: {
        authorizeNetApiLoginId: true,
        authorizeNetTransactionKey: true,
      },
    });

    if (!company) {
      throw new Error("Company not found");
    }

    if (
      !company.authorizeNetApiLoginId ||
      !company.authorizeNetTransactionKey
    ) {
      throw new Error("Authorize.Net credentials not configured");
    }

    // Fetch related records so we can validate amounts and get customer email
    const invoice = invoiceId
      ? await db.invoice.findFirst({
          where: { id: invoiceId },
          select: {
            due: true,
            client: {
              select: {
                email: true,
              },
            },
          },
        })
      : null;

    const statement = statementId
      ? await db.fleetStatement.findFirst({
          where: { id: statementId },
          select: {
            Fleet: {
              select: {
                client: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        })
      : null;

    const shopBooking = shopBookingId
      ? await db.shopBooking.findUnique({
          where: { id: Number(shopBookingId) },
          select: {
            invoiceId: true,
          },
        })
      : null;

    const pendingPayment = paymentId
      ? await db.payment.findUnique({
          where: { id: Number(paymentId) },
          select: {
            id: true,
            companyId: true,
          },
        })
      : null;

    if (
      paymentId &&
      (!pendingPayment || pendingPayment.companyId !== companyId)
    ) {
      throw new Error("Gift card payment session not found");
    }

    // Validate amount
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new Error("Invalid payment amount");
    }

    // For payment type, validate against invoice due amount
    if (payType === "payment" && invoiceId) {
      if (
        invoice &&
        parseFloat(invoice.due?.toString() || "0") < paymentAmount
      ) {
        throw new Error("Payment amount exceeds due amount");
      }
    }

    // Set up merchant authentication
    const merchantAuthenticationType =
      new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(company.authorizeNetApiLoginId);
    merchantAuthenticationType.setTransactionKey(
      company.authorizeNetTransactionKey,
    );

    // Create transaction request
    const transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(
      ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION,
    );
    transactionRequestType.setAmount(paymentAmount);

    // Set up order information
    const orderType = new ApiContracts.OrderType();
    const productName = invoiceId
      ? `INVOICE-${invoiceId}`
      : statementId
        ? `STATEMENT-${statementId}`
        : shopBookingId
          ? `BOOKING-${shopBookingId}`
          : `GIFTCARD-${paymentId}`;

    // Encode payType into invoiceNumber so the webhook can
    // reliably distinguish deposits vs normal payments and
    // statements, similar to how Stripe uses metadata.
    let invoiceNumberForGateway = "";
    if (invoiceId) {
      if (payType === "deposit") {
        invoiceNumberForGateway = `DEP-${invoiceId}`;
      } else {
        // Treat everything else on an invoice as a normal payment
        invoiceNumberForGateway = `INV-${invoiceId}`;
      }
    } else if (statementId) {
      invoiceNumberForGateway = `STM-${statementId}`;
    } else if (shopBookingId) {
      invoiceNumberForGateway = `VSB-DEP-${shopBookingId}`;
    } else if (paymentId) {
      invoiceNumberForGateway = `VSGC-${paymentId}`;
    }

    const isDepositPayment =
      payType === "deposit" || payType === "virtual_shop_deposit";
    const isGiftCardPayment = payType === "virtual_shop_gift_card";

    orderType.setInvoiceNumber(invoiceNumberForGateway);
    orderType.setDescription(
      `${isGiftCardPayment ? "Gift Card" : isDepositPayment ? "Deposit" : "Payment"} for ${productName}`,
    );
    transactionRequestType.setOrder(orderType);

    // Add line items for the payment form to display properly
    const lineItemsArray = [];
    const lineItem = new ApiContracts.LineItemType();
    lineItem.setItemId(
      invoiceId || statementId || shopBookingId || paymentId || "1",
    );
    lineItem.setName(productName);
    lineItem.setDescription(
      isGiftCardPayment
        ? "Gift Card Payment"
        : isDepositPayment
          ? "Deposit Payment"
          : "Payment",
    );
    lineItem.setQuantity("1");
    lineItem.setUnitPrice(paymentAmount.toString());
    lineItemsArray.push(lineItem);

    // Wrap in ArrayOfLineItem
    const lineItems = new ApiContracts.ArrayOfLineItem();
    lineItems.setLineItem(lineItemsArray);
    transactionRequestType.setLineItems(lineItems);

    // Add customer information (required for form to render properly)
    const customer = new ApiContracts.CustomerDataType();
    customer.setType(ApiContracts.CustomerTypeEnum.INDIVIDUAL);

    // Prefer the real client email from the related invoice/statement if available
    const customerEmail =
      invoice?.client?.email || statement?.Fleet?.client?.email || undefined;

    if (customerEmail) {
      customer.setEmail(customerEmail);
    }

    transactionRequestType.setCustomer(customer);

    // Add metadata as custom fields
    const userFieldsArray = [];

    const customField1 = new ApiContracts.UserField();
    customField1.setName("companyId");
    customField1.setValue(companyId.toString());
    userFieldsArray.push(customField1);

    const customField2 = new ApiContracts.UserField();
    customField2.setName("payType");
    customField2.setValue(payType);
    userFieldsArray.push(customField2);

    if (invoiceId) {
      const customField3 = new ApiContracts.UserField();
      customField3.setName("invoiceId");
      customField3.setValue(invoiceId);
      userFieldsArray.push(customField3);
    } else if (statementId) {
      const customField3 = new ApiContracts.UserField();
      customField3.setName("statementId");
      customField3.setValue(statementId);
      userFieldsArray.push(customField3);
    } else if (paymentId) {
      const customField3 = new ApiContracts.UserField();
      customField3.setName("paymentId");
      customField3.setValue(paymentId);
      userFieldsArray.push(customField3);
    } else if (shopBookingId) {
      const customField3 = new ApiContracts.UserField();
      customField3.setName("shopBookingId");
      customField3.setValue(shopBookingId);
      userFieldsArray.push(customField3);
      if (shopBooking?.invoiceId) {
        const customField4 = new ApiContracts.UserField();
        customField4.setName("invoiceId");
        customField4.setValue(shopBooking.invoiceId);
        userFieldsArray.push(customField4);
      }
    }

    // Set user fields with proper structure
    const transactionUserFields =
      new ApiContracts.TransactionRequestType.UserFields();
    transactionUserFields.setUserField(userFieldsArray);
    transactionRequestType.setUserFields(transactionUserFields);

    // Configure hosted payment page settings to control look & flow
    const settings = [];

    // Button text (optional, from sample)
    const buttonSetting = new ApiContracts.SettingType();
    buttonSetting.setSettingName("hostedPaymentButtonOptions");
    buttonSetting.setSettingValue('{"text": "Pay"}');
    settings.push(buttonSetting);

    // Order options, per official get-an-accept-payment-page.js sample
    const orderSetting = new ApiContracts.SettingType();
    orderSetting.setSettingName("hostedPaymentOrderOptions");
    orderSetting.setSettingValue('{"show": false}');
    settings.push(orderSetting);

    // Hide billing & shipping address blocks on the hosted form.
    // Note: the account's Payment Form > Form Fields settings must
    // also NOT mark these fields as "Required", otherwise Authorize.Net
    // can still enforce them even if they are hidden here.
    const billingOptions = new ApiContracts.SettingType();
    billingOptions.setSettingName("hostedPaymentBillingAddressOptions");
    billingOptions.setSettingValue('{"show": false, "required": false}');
    settings.push(billingOptions);

    const shippingOptions = new ApiContracts.SettingType();
    shippingOptions.setSettingName("hostedPaymentShippingAddressOptions");
    shippingOptions.setSettingValue('{"show": false, "required": false}');
    settings.push(shippingOptions);

    // Disable the built-in receipt page so there is no extra
    // "Continue" screen. With showReceipt=false, Authorize.Net sends
    // a transactResponse message via the iframe communicator, which
    // we listen for in PayNow.tsx to close the modal and reload.
    const returnOptions = new ApiContracts.SettingType();
    returnOptions.setSettingName("hostedPaymentReturnOptions");
    returnOptions.setSettingValue('{"showReceipt": false}');
    settings.push(returnOptions);

    // Configure iframe communicator URL so Authorize.Net can send
    // transactResponse / cancel / resizeWindow messages to our
    // domain. This URL must:
    //  - be HTTPS
    //  - be on the same domain as the page hosting the iframe
    // NEXT_PUBLIC_APP_URL should point to that origin in both
    // dev (ngrok/dev-tunnel) and production.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      const normalized = appUrl.replace(/\/+$/, "");
      const communicatorSetting = new ApiContracts.SettingType();
      communicatorSetting.setSettingName("hostedPaymentIFrameCommunicatorUrl");
      communicatorSetting.setSettingValue(
        JSON.stringify({ url: `${normalized}/IFrameCommunicator.html` }),
      );
      settings.push(communicatorSetting);
    } else {
      console.warn(
        "NEXT_PUBLIC_APP_URL is not set; hostedPaymentIFrameCommunicatorUrl will not be configured for Authorize.Net.",
      );
    }

    // Wrap settings in proper structure
    const hostedPaymentSettings = new ApiContracts.ArrayOfSetting();
    hostedPaymentSettings.setSetting(settings);

    // Create the API request
    const getRequest = new ApiContracts.GetHostedPaymentPageRequest();
    getRequest.setMerchantAuthentication(merchantAuthenticationType);
    getRequest.setTransactionRequest(transactionRequestType);
    getRequest.setHostedPaymentSettings(hostedPaymentSettings);

    // Log the complete request for debugging
    console.log(
      "🚀 ~ Authorize.Net Request:",
      JSON.stringify(getRequest.getJSON(), null, 2),
    );

    // Execute the request
    return new Promise((resolve, reject) => {
      const ctrl = new ApiControllers.GetHostedPaymentPageController(
        getRequest.getJSON(),
      );

      // Set endpoint to production or sandbox. We intentionally
      // do NOT fall back to NODE_ENV here; if
      // AUTHORIZE_NET_ENVIRONMENT is not explicitly set to
      // "production", we default to sandbox so that sandbox
      // credentials are never sent to production hosts by
      // accident.
      const environment =
        process.env.AUTHORIZE_NET_ENVIRONMENT === "production"
          ? "production"
          : "sandbox";
      console.log(
        "🚀 ~ createAuthorizeNetPaymentLink ~ environment:",
        environment,
      );
      console.log(
        "🚀 ~ process.env.AUTHORIZE_NET_ENVIRONMENT",
        process.env.AUTHORIZE_NET_ENVIRONMENT,
      );

      if (environment === "production") {
        ctrl.setEnvironment(SDKConstants.endpoint.production);
      } else {
        ctrl.setEnvironment(SDKConstants.endpoint.sandbox);
      }

      ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new ApiContracts.GetHostedPaymentPageResponse(
          apiResponse,
        );
        console.log("🚀 ~ createAuthorizeNetPaymentLink ~ response:", response);

        if (response != null) {
          if (
            response.getMessages().getResultCode() ===
            ApiContracts.MessageTypeEnum.OK
          ) {
            const token = response.getToken();
            console.log("✅ Token generated successfully:", token);

            // Construct the hosted payment page URL (for POST
            // submission), using the same environment logic as
            // above so there is no mismatch between token
            // generation and form host.
            const environment =
              process.env.AUTHORIZE_NET_ENVIRONMENT === "production"
                ? "production"
                : "sandbox";
            console.log(
              "🚀 ~ createAuthorizeNetPaymentLink ~ environment:",
              environment,
            );
            const hostedPaymentUrl =
              environment === "production"
                ? `https://accept.authorize.net/payment/payment`
                : `https://test.authorize.net/payment/payment`;

            console.log("🔗 Environment:", environment);
            console.log("🔗 Payment Form URL:", hostedPaymentUrl);

            resolve({
              success: true,
              url: hostedPaymentUrl,
              token: token,
            });
          } else {
            const errorMessages = response.getMessages().getMessage();
            console.error("Authorize.Net API Error Response:", {
              resultCode: response.getMessages().getResultCode(),
              messages: errorMessages,
              fullResponse: JSON.stringify(response, null, 2),
            });
            const errorText =
              errorMessages && errorMessages.length > 0
                ? errorMessages[0].getText()
                : "Unknown error occurred";
            const errorCode =
              errorMessages && errorMessages.length > 0
                ? errorMessages[0].getCode()
                : "";
            reject(new Error(`${errorText} (Code: ${errorCode})`));
          }
        } else {
          reject(new Error("No response from Authorize.Net"));
        }
      });
    });
  } catch (error: any) {
    console.error("Authorize.Net Payment Link Error:", error);
    return {
      success: false,
      message: error?.message ?? "Failed to create Authorize.Net payment link",
    };
  }
};

/**
 * Verify Authorize.Net credentials
 */
export const verifyAuthorizeNetCredentials = async (
  apiLoginId: string,
  transactionKey: string,
): Promise<{ success: boolean; message?: string }> => {
  try {
    const merchantAuthenticationType =
      new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(apiLoginId);
    merchantAuthenticationType.setTransactionKey(transactionKey);

    const getRequest = new ApiContracts.GetMerchantDetailsRequest();
    getRequest.setMerchantAuthentication(merchantAuthenticationType);

    return new Promise((resolve) => {
      const ctrl = new ApiControllers.GetMerchantDetailsController(
        getRequest.getJSON(),
      );

      if (process.env.AUTHORIZE_NET_ENVIRONMENT === "production") {
        ctrl.setEnvironment(SDKConstants.endpoint.production);
      } else {
        ctrl.setEnvironment(SDKConstants.endpoint.sandbox);
      }

      ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new ApiContracts.GetMerchantDetailsResponse(
          apiResponse,
        );

        if (response != null) {
          if (
            response.getMessages().getResultCode() ===
            ApiContracts.MessageTypeEnum.OK
          ) {
            resolve({ success: true });
          } else {
            const errorMessages = response.getMessages().getMessage();
            const errorText =
              errorMessages && errorMessages.length > 0
                ? errorMessages[0].getText()
                : "Invalid credentials";
            resolve({ success: false, message: errorText });
          }
        } else {
          resolve({
            success: false,
            message: "No response from Authorize.Net",
          });
        }
      });
    });
  } catch (error: any) {
    return {
      success: false,
      message: error?.message ?? "Failed to verify credentials",
    };
  }
};
