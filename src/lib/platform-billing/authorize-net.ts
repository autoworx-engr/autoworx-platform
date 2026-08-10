const ApiContracts = require("authorizenet").APIContracts;
const ApiControllers = require("authorizenet").APIControllers;
const SDKConstants = require("authorizenet").Constants;

/**
 * Get Platform Authorize.Net Credentials from Environment
 */
function getPlatformAuthNetCredentials() {
  const rawApiLoginId = process.env.PLATFORM_AUTHNET_API_LOGIN_ID || "";
  const rawTransactionKey = process.env.PLATFORM_AUTHNET_TRANSACTION_KEY || "";
  const apiLoginId = rawApiLoginId.trim();
  const transactionKey = rawTransactionKey.trim();

  if (!apiLoginId || !transactionKey) {
    throw new Error("Platform Authorize.Net credentials not configured");
  }

  const merchantAuthenticationType =
    new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(apiLoginId);
  merchantAuthenticationType.setTransactionKey(transactionKey);

  return merchantAuthenticationType;
}

/**
 * Get the current environment (production or sandbox)
 */
function getEnvironment() {
  const explicit = (process.env.PLATFORM_AUTHNET_ENVIRONMENT || "")
    .trim()
    .toLowerCase();

  if (explicit === "production" || explicit === "live") {
    return SDKConstants.endpoint.production;
  }

  if (
    explicit === "sandbox" ||
    explicit === "test" ||
    explicit === "development"
  ) {
    return SDKConstants.endpoint.sandbox;
  }

  // No explicit override: default to sandbox. We deliberately do NOT fall
  // back to NODE_ENV — staging deployments on Railway run a production build
  // (NODE_ENV=production), so keying live billing off NODE_ENV would charge
  // real cards from non-production environments. Live billing must be opted
  // into explicitly via PLATFORM_AUTHNET_ENVIRONMENT=production.
  return SDKConstants.endpoint.sandbox;
}

function extractNumericIdFromErrorText(errorText: string): string | null {
  const matches = errorText.match(/\b(\d{5,})\b/g);
  if (!matches || matches.length === 0) return null;
  return matches[matches.length - 1];
}

function readPaymentProfileId(profile: any): string | undefined {
  if (!profile) return undefined;
  if (typeof profile.getCustomerPaymentProfileId === "function") {
    return profile.getCustomerPaymentProfileId();
  }
  return profile.customerPaymentProfileId || profile.paymentProfileId;
}

/**
 * 1. Create Customer Profile and Payment Profile (CIM)
 * This uses a payment nonce from Accept.js/Accept Hosted
 */
export async function createPlatformCustomerProfile(
  companyId: number,
  email: string,
  firstName: string,
  lastName: string,
  opaqueData: { dataDescriptor: string; dataValue: string },
) {
  const merchantAuthenticationType = getPlatformAuthNetCredentials();

  const paymentType = new ApiContracts.PaymentType();
  const opaqueDataType = new ApiContracts.OpaqueDataType();
  opaqueDataType.setDataDescriptor(opaqueData.dataDescriptor);
  opaqueDataType.setDataValue(opaqueData.dataValue);
  paymentType.setOpaqueData(opaqueDataType);

  const customerPaymentProfileType =
    new ApiContracts.CustomerPaymentProfileType();
  customerPaymentProfileType.setCustomerType(
    ApiContracts.CustomerTypeEnum.INDIVIDUAL,
  );
  customerPaymentProfileType.setPayment(paymentType);

  const billTo = new ApiContracts.CustomerAddressType();
  billTo.setFirstName(firstName);
  billTo.setLastName(lastName);
  customerPaymentProfileType.setBillTo(billTo);

  const paymentProfileList = [customerPaymentProfileType];

  const customerProfileType = new ApiContracts.CustomerProfileType();
  customerProfileType.setMerchantCustomerId(`AWX-COMP-${companyId}`);
  customerProfileType.setDescription(`Company ID: ${companyId}`);
  customerProfileType.setEmail(email);
  customerProfileType.setPaymentProfiles(paymentProfileList);

  const createRequest = new ApiContracts.CreateCustomerProfileRequest();
  createRequest.setMerchantAuthentication(merchantAuthenticationType);
  createRequest.setProfile(customerProfileType);

  return new Promise<{
    customerProfileId: string;
    customerPaymentProfileId: string;
  }>((resolve, reject) => {
    const ctrl = new ApiControllers.CreateCustomerProfileController(
      createRequest.getJSON(),
    );
    ctrl.setEnvironment(getEnvironment());

    ctrl.execute(async () => {
      const apiResponse = ctrl.getResponse();
      const response = new ApiContracts.CreateCustomerProfileResponse(
        apiResponse,
      );

      if (
        response != null &&
        response.getMessages().getResultCode() ===
          ApiContracts.MessageTypeEnum.OK
      ) {
        const profileId = response.getCustomerProfileId();
        const paymentIds = response
          .getCustomerPaymentProfileIdList()
          .getNumericString();
        resolve({
          customerProfileId: profileId,
          customerPaymentProfileId: paymentIds[0],
        });
      } else {
        const error = response?.getMessages().getMessage()[0];
        const errorText = error?.getText() || "";
        const errorCode = error?.getCode() || "";

        if (errorCode === "E00039") {
          console.log(
            "Detected duplicate customer profile, attempting recovery...",
          );
          const match = errorText.match(/(\d+)/);
          if (match) {
            const customerProfileId = match[1];
            try {
              const profile = await getCustomerProfile(customerProfileId);
              const pps =
                typeof profile.getPaymentProfiles === "function"
                  ? profile.getPaymentProfiles()
                  : profile.paymentProfiles || [];
              if (pps && pps.length > 0) {
                const paymentProfileId =
                  typeof pps[0].getCustomerPaymentProfileId === "function"
                    ? pps[0].getCustomerPaymentProfileId()
                    : pps[0].customerPaymentProfileId ||
                      pps[0].paymentProfileId;

                console.log(
                  `Recovered IDs: Customer=${customerProfileId}, Payment=${paymentProfileId}`,
                );
                return resolve({
                  customerProfileId,
                  customerPaymentProfileId: paymentProfileId,
                });
              }
            } catch (e) {
              console.error("Duplicate recovery failed:", e);
            }
          }
        }

        reject(new Error(errorText || "Failed to create customer profile"));
      }
    });
  });
}

/**
 * 2. Create Payment Profile (for existing customers)
 */
export async function createPlatformPaymentProfile(
  customerProfileId: string,
  firstName: string,
  lastName: string,
  opaqueData: { dataDescriptor: string; dataValue: string },
  attemptedLimitRecovery = false,
) {
  const merchantAuthenticationType = getPlatformAuthNetCredentials();

  const paymentType = new ApiContracts.PaymentType();
  const opaqueDataType = new ApiContracts.OpaqueDataType();
  opaqueDataType.setDataDescriptor(opaqueData.dataDescriptor);
  opaqueDataType.setDataValue(opaqueData.dataValue);
  paymentType.setOpaqueData(opaqueDataType);

  const billTo = new ApiContracts.CustomerAddressType();
  billTo.setFirstName(firstName);
  billTo.setLastName(lastName);

  const customerPaymentProfileType =
    new ApiContracts.CustomerPaymentProfileType();
  customerPaymentProfileType.setCustomerType(
    ApiContracts.CustomerTypeEnum.INDIVIDUAL,
  );
  customerPaymentProfileType.setPayment(paymentType);
  customerPaymentProfileType.setBillTo(billTo);

  const createRequest = new ApiContracts.CreateCustomerPaymentProfileRequest();
  createRequest.setMerchantAuthentication(merchantAuthenticationType);
  createRequest.setCustomerProfileId(customerProfileId);
  createRequest.setPaymentProfile(customerPaymentProfileType);

  return new Promise<{ customerPaymentProfileId: string }>(
    (resolve, reject) => {
      const ctrl = new ApiControllers.CreateCustomerPaymentProfileController(
        createRequest.getJSON(),
      );
      ctrl.setEnvironment(getEnvironment());

      ctrl.execute(async () => {
        const apiResponse = ctrl.getResponse();
        const response = new ApiContracts.CreateCustomerPaymentProfileResponse(
          apiResponse,
        );

        if (
          response != null &&
          response.getMessages().getResultCode() ===
            ApiContracts.MessageTypeEnum.OK
        ) {
          resolve({
            customerPaymentProfileId: response.getCustomerPaymentProfileId(),
          });
        } else {
          const error = response?.getMessages().getMessage()[0];
          const errorText = error?.getText() || "";
          const errorCode = error?.getCode() || "";

          console.log(`Authorize.Net Error: [${errorCode}] ${errorText}`);

          // Handle duplicate profile by reusing the exact duplicate id from
          // gateway response when available. This avoids charging a wrong card.
          if (errorCode === "E00039") {
            const duplicatePaymentProfileId =
              extractNumericIdFromErrorText(errorText);
            if (duplicatePaymentProfileId) {
              console.log(
                `Recovered duplicate Payment Profile ID from response: ${duplicatePaymentProfileId}`,
              );
              return resolve({
                customerPaymentProfileId: duplicatePaymentProfileId,
              });
            }

            console.log(
              "Duplicate payment profile detected without explicit ID, attempting cautious recovery...",
            );
            try {
              const profile = await getCustomerProfile(customerProfileId);
              const pps =
                typeof profile.getPaymentProfiles === "function"
                  ? profile.getPaymentProfiles()
                  : profile.paymentProfiles || [];
              if (pps && pps.length === 1) {
                const paymentProfileId = readPaymentProfileId(pps[0]);
                if (!paymentProfileId) {
                  throw new Error(
                    "Unable to read recovered payment profile identifier",
                  );
                }
                console.log(
                  `Recovered Payment Profile ID via single-profile fallback: ${paymentProfileId}`,
                );
                return resolve({
                  customerPaymentProfileId: paymentProfileId,
                });
              }
            } catch (e) {
              console.error("Payment profile recovery via fetch failed:", e);
            }
          }

          // Max profiles reached (E00042): try to free one removable old
          // profile, then retry once with the new card. Never fallback to
          // charging an arbitrary existing card.
          if (errorCode === "E00042") {
            if (!attemptedLimitRecovery) {
              console.log(
                "Maximum payment profiles reached, attempting safe profile rotation...",
              );
              try {
                const profile = await getCustomerProfile(customerProfileId);
                const pps =
                  typeof profile.getPaymentProfiles === "function"
                    ? profile.getPaymentProfiles()
                    : profile.paymentProfiles || [];
                const existingIds = (pps || [])
                  .map((p: any) => readPaymentProfileId(p))
                  .filter(Boolean) as string[];

                let deletedProfileId: string | null = null;
                for (const existingId of existingIds) {
                  try {
                    await deletePlatformCustomerPaymentProfile(
                      customerProfileId,
                      existingId,
                    );
                    deletedProfileId = existingId;
                    break;
                  } catch (deleteErr: any) {
                    const deleteMessage = deleteErr?.message || "";
                    // E00105: profile linked to active/suspended subscription.
                    if (
                      /E00105/i.test(deleteMessage) ||
                      /active or suspended subscription/i.test(deleteMessage)
                    ) {
                      continue;
                    }
                  }
                }

                if (deletedProfileId) {
                  console.log(
                    `Deleted old payment profile ${deletedProfileId}, retrying creation...`,
                  );
                  const retried = await createPlatformPaymentProfile(
                    customerProfileId,
                    firstName,
                    lastName,
                    opaqueData,
                    true,
                  );
                  return resolve(retried);
                }
              } catch (rotationErr) {
                console.error(
                  "Automatic payment profile rotation failed:",
                  rotationErr,
                );
              }
            }

            reject(
              new Error(
                "Maximum saved payment methods reached and no removable old method was found. Please remove an old card first, then retry.",
              ),
            );
            return;
          }

          reject(new Error(errorText || "Failed to create payment profile"));
        }
      });
    },
  );
}

/**
 * Validate a Customer Payment Profile (confirms it is usable for transactions)
 * Returns true on success, throws on failure.
 */
export async function validateCustomerPaymentProfile(
  customerProfileId: string,
  customerPaymentProfileId: string,
): Promise<void> {
  const merchantAuthenticationType = getPlatformAuthNetCredentials();

  const explicit = (process.env.PLATFORM_AUTHNET_ENVIRONMENT || "")
    .trim()
    .toLowerCase();
  // Live validation only when explicitly opted in — never via NODE_ENV, which
  // is "production" on staging too (see getEnvironment above).
  const isLiveValidation = explicit === "production" || explicit === "live";

  const validateRequest =
    new ApiContracts.ValidateCustomerPaymentProfileRequest();
  validateRequest.setMerchantAuthentication(merchantAuthenticationType);
  validateRequest.setCustomerProfileId(customerProfileId);
  validateRequest.setCustomerPaymentProfileId(customerPaymentProfileId);
  validateRequest.setValidationMode(
    isLiveValidation
      ? ApiContracts.ValidationModeEnum.LIVEMODE
      : ApiContracts.ValidationModeEnum.TESTMODE,
  );

  return new Promise<void>((resolve, reject) => {
    const ctrl = new ApiControllers.ValidateCustomerPaymentProfileController(
      validateRequest.getJSON(),
    );
    ctrl.setEnvironment(getEnvironment());

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new ApiContracts.ValidateCustomerPaymentProfileResponse(
        apiResponse,
      );

      if (
        response != null &&
        response.getMessages().getResultCode() ===
          ApiContracts.MessageTypeEnum.OK
      ) {
        resolve();
      } else {
        const error = response?.getMessages().getMessage()[0];
        reject(
          new Error(error?.getText() || "Payment profile validation failed"),
        );
      }
    });
  });
}

/**
 * 2. Create ARB Subscription
 */
export async function createPlatformARBSubscription({
  customerProfileId,
  customerPaymentProfileId,
  amount,
  intervalMonths = 1,
  startDate = new Date(),
  planName,
}: {
  customerProfileId: string;
  customerPaymentProfileId: string;
  amount: number;
  intervalMonths: number;
  startDate: Date;
  planName: string;
}) {
  const merchantAuthenticationType = getPlatformAuthNetCredentials();

  const interval = new ApiContracts.PaymentScheduleType.Interval();
  interval.setLength(intervalMonths);
  interval.setUnit(ApiContracts.ARBSubscriptionUnitEnum.MONTHS);

  const paymentSchedule = new ApiContracts.PaymentScheduleType();
  paymentSchedule.setInterval(interval);
  paymentSchedule.setStartDate(startDate.toISOString().substring(0, 10)); // YYYY-MM-DD
  paymentSchedule.setTotalOccurrences(9999); // Indefinite recurring

  const customerProfileIdType = new ApiContracts.CustomerProfileIdType();
  customerProfileIdType.setCustomerProfileId(customerProfileId);
  customerProfileIdType.setCustomerPaymentProfileId(customerPaymentProfileId);

  const arbSubscription = new ApiContracts.ARBSubscriptionType();
  arbSubscription.setName(`Autoworx: ${planName}`);
  arbSubscription.setPaymentSchedule(paymentSchedule);
  arbSubscription.setAmount(amount.toFixed(2));
  arbSubscription.setProfile(customerProfileIdType);

  const createRequest = new ApiContracts.ARBCreateSubscriptionRequest();
  createRequest.setMerchantAuthentication(merchantAuthenticationType);
  createRequest.setSubscription(arbSubscription);

  return new Promise<{ subscriptionId: string }>((resolve, reject) => {
    const ctrl = new ApiControllers.ARBCreateSubscriptionController(
      createRequest.getJSON(),
    );
    ctrl.setEnvironment(getEnvironment());

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new ApiContracts.ARBCreateSubscriptionResponse(
        apiResponse,
      );

      if (
        response != null &&
        response.getMessages().getResultCode() ===
          ApiContracts.MessageTypeEnum.OK
      ) {
        resolve({ subscriptionId: response.getSubscriptionId() });
      } else {
        const error = response?.getMessages().getMessage()[0];
        reject(
          new Error(error?.getText() || "Failed to create ARB subscription"),
        );
      }
    });
  });
}

/**
 * 3. Cancel ARB Subscription
 */
export async function cancelPlatformARBSubscription(subscriptionId: string) {
  const merchantAuthenticationType = getPlatformAuthNetCredentials();

  const cancelRequest = new ApiContracts.ARBCancelSubscriptionRequest();
  cancelRequest.setMerchantAuthentication(merchantAuthenticationType);
  cancelRequest.setSubscriptionId(subscriptionId);

  return new Promise<{ success: boolean }>((resolve, reject) => {
    const ctrl = new ApiControllers.ARBCancelSubscriptionController(
      cancelRequest.getJSON(),
    );
    ctrl.setEnvironment(getEnvironment());

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new ApiContracts.ARBCancelSubscriptionResponse(
        apiResponse,
      );

      if (
        response != null &&
        response.getMessages().getResultCode() ===
          ApiContracts.MessageTypeEnum.OK
      ) {
        resolve({ success: true });
      } else {
        const error = response?.getMessages().getMessage()[0];
        reject(
          new Error(error?.getText() || "Failed to cancel ARB subscription"),
        );
      }
    });
  });
}

/**
 * 4. Update ARB Subscription Amount (e.g. for custom pricing)
 */
export async function updatePlatformARBSubscriptionAmount(
  subscriptionId: string,
  newAmount: number,
) {
  const merchantAuthenticationType = getPlatformAuthNetCredentials();

  const subscription = new ApiContracts.ARBSubscriptionType();
  subscription.setAmount(newAmount.toFixed(2));

  const updateRequest = new ApiContracts.ARBUpdateSubscriptionRequest();
  updateRequest.setMerchantAuthentication(merchantAuthenticationType);
  updateRequest.setSubscriptionId(subscriptionId);
  updateRequest.setSubscription(subscription);

  return new Promise<{ success: boolean }>((resolve, reject) => {
    const ctrl = new ApiControllers.ARBUpdateSubscriptionController(
      updateRequest.getJSON(),
    );
    ctrl.setEnvironment(getEnvironment());

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new ApiContracts.ARBUpdateSubscriptionResponse(
        apiResponse,
      );

      if (
        response != null &&
        response.getMessages().getResultCode() ===
          ApiContracts.MessageTypeEnum.OK
      ) {
        resolve({ success: true });
      } else {
        const error = response?.getMessages().getMessage()[0];
        reject(
          new Error(
            error?.getText() || "Failed to update ARB subscription amount",
          ),
        );
      }
    });
  });
}

/**
 * 5. Get Customer Profile
 */
export async function getCustomerProfile(customerProfileId: string) {
  const merchantAuthenticationType = getPlatformAuthNetCredentials();

  const getRequest = new ApiContracts.GetCustomerProfileRequest();
  getRequest.setMerchantAuthentication(merchantAuthenticationType);
  getRequest.setCustomerProfileId(customerProfileId);

  return new Promise<any>((resolve, reject) => {
    const ctrl = new ApiControllers.GetCustomerProfileController(
      getRequest.getJSON(),
    );
    ctrl.setEnvironment(getEnvironment());

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new ApiContracts.GetCustomerProfileResponse(apiResponse);

      if (
        response != null &&
        response.getMessages().getResultCode() ===
          ApiContracts.MessageTypeEnum.OK
      ) {
        resolve(response.getProfile());
      } else {
        const error = response?.getMessages().getMessage()[0];
        reject(new Error(error?.getText() || "Failed to get customer profile"));
      }
    });
  });
}

export async function deletePlatformCustomerPaymentProfile(
  customerProfileId: string,
  customerPaymentProfileId: string,
) {
  const merchantAuthenticationType = getPlatformAuthNetCredentials();

  const deleteRequest = new ApiContracts.DeleteCustomerPaymentProfileRequest();
  deleteRequest.setMerchantAuthentication(merchantAuthenticationType);
  deleteRequest.setCustomerProfileId(customerProfileId);
  deleteRequest.setCustomerPaymentProfileId(customerPaymentProfileId);

  return new Promise<void>((resolve, reject) => {
    const ctrl = new ApiControllers.DeleteCustomerPaymentProfileController(
      deleteRequest.getJSON(),
    );
    ctrl.setEnvironment(getEnvironment());

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new ApiContracts.DeleteCustomerPaymentProfileResponse(
        apiResponse,
      );

      if (
        response != null &&
        response.getMessages().getResultCode() ===
          ApiContracts.MessageTypeEnum.OK
      ) {
        resolve();
      } else {
        const error = response?.getMessages().getMessage()[0];
        reject(
          new Error(error?.getText() || "Failed to delete payment profile"),
        );
      }
    });
  });
}

/**
 * 6. Charge Customer Profile (One-time Transaction)
 */
export async function chargePlatformCustomerProfile({
  customerProfileId,
  customerPaymentProfileId,
  amount,
  description,
}: {
  customerProfileId: string;
  customerPaymentProfileId: string;
  amount: number;
  description: string;
}) {
  const merchantAuthenticationType = getPlatformAuthNetCredentials();

  // We use a plain object for the transaction request to ensure proper XML element ordering.
  // Authorize.Net's XML schema is very strict about the order of fields (transactionType MUST be first).
  const transactionRequest = {
    transactionType: "authCaptureTransaction",
    amount: amount.toFixed(2),
    profile: {
      customerProfileId: customerProfileId,
      paymentProfile: {
        paymentProfileId: customerPaymentProfileId,
      },
    },
  };

  const createRequest = new ApiContracts.CreateTransactionRequest();
  createRequest.setMerchantAuthentication(merchantAuthenticationType);
  createRequest.setTransactionRequest(transactionRequest);

  return new Promise<{ transactionId: string }>((resolve, reject) => {
    const ctrl = new ApiControllers.CreateTransactionController(
      createRequest.getJSON(),
    );
    ctrl.setEnvironment(getEnvironment());

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new ApiContracts.CreateTransactionResponse(apiResponse);

      if (
        response != null &&
        response.getMessages().getResultCode() ===
          ApiContracts.MessageTypeEnum.OK
      ) {
        const transResponse = response.getTransactionResponse();
        if (transResponse && transResponse.getResponseCode() === "1") {
          resolve({ transactionId: transResponse.getTransId() });
        } else {
          reject(
            new Error(
              transResponse?.getErrors()?.getError()[0].getErrorText() ||
                "Transaction failed",
            ),
          );
        }
      } else {
        const error = response?.getMessages().getMessage()[0];
        reject(
          new Error(error?.getText() || "Failed to charge customer profile"),
        );
      }
    });
  });
}

/**
 * 7. Get Transaction Details (used to resolve subscription from transId)
 */
export async function getPlatformTransactionDetails(transId: string) {
  const merchantAuthenticationType = getPlatformAuthNetCredentials();

  const getRequest = new ApiContracts.GetTransactionDetailsRequest();
  getRequest.setMerchantAuthentication(merchantAuthenticationType);
  getRequest.setTransId(transId);

  return new Promise<any>((resolve, reject) => {
    const ctrl = new ApiControllers.GetTransactionDetailsController(
      getRequest.getJSON(),
    );
    ctrl.setEnvironment(getEnvironment());

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new ApiContracts.GetTransactionDetailsResponse(
        apiResponse,
      );

      if (
        response != null &&
        response.getMessages().getResultCode() ===
          ApiContracts.MessageTypeEnum.OK
      ) {
        const transaction = response.getTransaction
          ? response.getTransaction()
          : (response as any).transaction;
        const transactionJson =
          transaction && typeof transaction.getJSON === "function"
            ? transaction.getJSON()
            : transaction;
        resolve(transactionJson);
      } else {
        const error = response?.getMessages().getMessage()[0];
        reject(
          new Error(error?.getText() || "Failed to get transaction details"),
        );
      }
    });
  });
}
