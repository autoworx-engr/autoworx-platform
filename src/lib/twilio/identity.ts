export const WEB_SUFFIX = "_web";
export const MOBILE_SUFFIX = "_mobile";

export const INCOMING_DIAL_SUFFIXES = [WEB_SUFFIX, MOBILE_SUFFIX, ""] as const;

export function baseIdentity(phoneNumber: string) {
  return phoneNumber.replace(/[^a-zA-Z0-9_\-.~]/g, "");
}

export function webIdentity(phoneNumber: string) {
  return `${baseIdentity(phoneNumber)}${WEB_SUFFIX}`;
}

export function mobileIdentity(phoneNumber: string) {
  return `${baseIdentity(phoneNumber)}${MOBILE_SUFFIX}`;
}

export function stripIdentitySuffix(identity: string) {
  return identity.replace(/_(web|mobile)$/, "");
}
