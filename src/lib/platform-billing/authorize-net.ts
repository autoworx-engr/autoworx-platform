import { db } from "@/lib/db";

const ApiContracts = require("authorizenet").APIContracts;
const ApiControllers = require("authorizenet").APIControllers;
const SDKConstants = require("authorizenet").Constants;

/**
 * Get Platform Authorize.Net Credentials from Environment
 */
function getPlatformAuthNetCredentials() {
  const apiLoginId = process.env.PLATFORM_AUTHNET_API_LOGIN_ID;
  const transactionKey = process.env.PLATFORM_AUTHNET_TRANSACTION_KEY;

  if (!apiLoginId || !transactionKey) {
    throw new Error("Platform Authorize.Net credentials not configured");
  }

  const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(apiLoginId);
  merchantAuthenticationType.setTransactionKey(transactionKey);

  return merchantAuthenticationType;
}

/**
 * Get the current environment (production or sandbox)
 */
function getEnvironment() {
  const env = process.env.PLATFORM_AUTHNET_ENVIRONMENT || process.env.NODE_ENV || "sandbox";
  return env === "production" ? SDKConstants.endpoint.production : SDKConstants.endpoint.sandbox;
}

/**
 * 1. Create Customer Profile and Payment Profile (CIM)
 * This uses a payment nonce from Accept.js/Accept Hosted
 */
export async function createPlatformCustomerProfile(
  companyId: number,
  email: string,
  opaqueData: { dataDescriptor: string; dataValue: string }
) {
  const merchantAuthenticationType = getPlatformAuthNetCredentials();

  const paymentType = new ApiContracts.PaymentType();
  const opaqueDataType = new ApiContracts.OpaqueDataType();
  opaqueDataType.setDataDescriptor(opaqueData.dataDescriptor);
  opaqueDataType.setDataValue(opaqueData.dataValue);
  paymentType.setOpaqueData(opaqueDataType);

  const customerPaymentProfileType = new ApiContracts.CustomerPaymentProfileType();
  customerPaymentProfileType.setCustomerType(ApiContracts.CustomerTypeEnum.INDIVIDUAL);
  customerPaymentProfileType.setPayment(paymentType);

  const paymentProfileList = [customerPaymentProfileType];

  const customerProfileType = new ApiContracts.CustomerProfileType();
  customerProfileType.setMerchantCustomerId(`AWX-COMP-${companyId}`);
  customerProfileType.setDescription(`Company ID: ${companyId}`);
  customerProfileType.setEmail(email);
  customerProfileType.setPaymentProfiles(paymentProfileList);

  const createRequest = new ApiContracts.CreateCustomerProfileRequest();
  createRequest.setMerchantAuthentication(merchantAuthenticationType);
  createRequest.setProfile(customerProfileType);

  return new Promise<{ customerProfileId: string; customerPaymentProfileId: string }>(
    (resolve, reject) => {
      const ctrl = new ApiControllers.CreateCustomerProfileController(createRequest.getJSON());
      ctrl.setEnvironment(getEnvironment());

      ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new ApiContracts.CreateCustomerProfileResponse(apiResponse);

        if (response != null && response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
          const profileId = response.getCustomerProfileId();
          const paymentIds = response.getCustomerPaymentProfileIdList().getNumericString();
          resolve({ customerProfileId: profileId, customerPaymentProfileId: paymentIds[0] });
        } else {
          const error = response?.getMessages().getMessage()[0];
          reject(new Error(error?.getText() || "Failed to create customer profile"));
        }
      });
    }
  );
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
    const ctrl = new ApiControllers.ARBCreateSubscriptionController(createRequest.getJSON());
    ctrl.setEnvironment(getEnvironment());

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new ApiContracts.ARBCreateSubscriptionResponse(apiResponse);

      if (response != null && response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
        resolve({ subscriptionId: response.getSubscriptionId() });
      } else {
        const error = response?.getMessages().getMessage()[0];
        reject(new Error(error?.getText() || "Failed to create ARB subscription"));
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
    const ctrl = new ApiControllers.ARBCancelSubscriptionController(cancelRequest.getJSON());
    ctrl.setEnvironment(getEnvironment());

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new ApiContracts.ARBCancelSubscriptionResponse(apiResponse);

      if (response != null && response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
        resolve({ success: true });
      } else {
        const error = response?.getMessages().getMessage()[0];
        reject(new Error(error?.getText() || "Failed to cancel ARB subscription"));
      }
    });
  });
}
