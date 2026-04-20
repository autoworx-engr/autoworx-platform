import { PUBLIC_DYNAMIC_API_ROUTES } from "@/constants/public-route";

function routeToRegex(route: string): RegExp {
  const escaped = route.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const pattern = escaped.replace(/:([^/]+)/g, "[^/]+");
  return new RegExp(`^${pattern}$`);
}

export const isDynamicPublicApiRoute = (pathname: string) => {
  return PUBLIC_DYNAMIC_API_ROUTES.some((route) =>
    routeToRegex(route).test(pathname),
  );
};
