export const protocol =
  process.env.NODE_ENV === "production" ? "https" : "http";

// Strip protocol and trailing slashes to prevent matching logic from breaking
// if NEXT_PUBLIC_ROOT_DOMAIN is set incorrectly (e.g. "https://dev.autoworx.tech/")
const rawRootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
export const rootDomain = rawRootDomain
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");
