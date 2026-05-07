export { default } from "next-auth/middleware";

export const config = {
  // Protect dashboard routes; portal is intentionally public
  matcher: ["/dashboard/:path*"],
};
