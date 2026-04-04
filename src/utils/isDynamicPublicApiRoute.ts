import { PUBLIC_DYNAMIC_API_ROUTES } from "@/constants/public-route";
import { URLPattern } from "next/server";

export const isDynamicPublicApiRoute = (pathname: string) => {
  const isPublic = PUBLIC_DYNAMIC_API_ROUTES.some(route => {
    const pattern = new URLPattern({ pathname: route });
    return pattern.test({ pathname: pathname });
  });
  return isPublic;
};