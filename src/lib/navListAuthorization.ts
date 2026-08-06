import { PermissionsResult } from "@/lib/getPermissions";
import type { CompanyFeaturePermission } from "@/stores/companyFeaturePermissionStore";
import type { NavItem } from "./navItem";
import {
  canAccessWithFeatureKey,
  canAccessWithPermissionKey,
} from "./routeAccess";
import { resolveRouteFeatureKey } from "./routeFeatureKeys";
import { resolveRoutePermissionKey } from "./routePermissionKeys";

/**
 * Role-specific landing pages. These are routing conveniences, not permissions:
 * the rewritten link is what then gets permission-checked, so e.g. a Technician
 * keeps the Pipelines item via `shopPipeline` instead of losing it to
 * `salesPipeline`.
 */
const ROLE_LINK_OVERRIDES: Record<string, Record<string, string>> = {
  Technician: {
    "Analytics and Reporting": "/dashboard/reporting/technicianreporting",
  },
  Sales: {
    "Analytics and Reporting": "/dashboard/reporting/salesreporting",
  },
};

function applyRoleLinkOverride(
  item: NavItem,
  permissions: PermissionsResult | null,
): NavItem {
  const override =
    permissions?.role && ROLE_LINK_OVERRIDES[permissions.role]?.[item.title];
  return override ? { ...item, link: override } : item;
}

/**
 * Filter a nav list by user permissions and, when provided, by company feature
 * entitlements.
 *
 * Visibility is derived from the same route → key maps the route guard uses
 * (ROUTE_PERMISSIONS_MAP / FEATURE_PERMISSIONS_MAP), so a nav item can never be
 * visible-but-404 or hidden-but-reachable. Adding a nav entry needs no change
 * here — only a mapping entry.
 */
export function filterNavList(
  navList: NavItem[],
  permissions: PermissionsResult | null,
  companyFeaturePermission?: CompanyFeaturePermission[] | null,
): NavItem[] {
  const canAccess = (link?: string | null) => {
    if (!link) return true;
    if (
      !canAccessWithPermissionKey(resolveRoutePermissionKey(link), permissions)
    ) {
      return false;
    }
    if (companyFeaturePermission === undefined) return true;
    return canAccessWithFeatureKey(
      resolveRouteFeatureKey(link),
      companyFeaturePermission,
    );
  };

  return navList.reduce<NavItem[]>((visible, source) => {
    const item = applyRoleLinkOverride(source, permissions);

    if (source.subnav) {
      // A dropdown parent with every child filtered out has nothing to show.
      const subnav = source.subnav.filter((sub) => canAccess(sub.link));
      if (subnav.length === 0) return visible;

      // Keep the parent's own link usable when it points at a filtered child.
      const link = canAccess(item.link) ? item.link : subnav[0].link;
      visible.push({ ...item, link, subnav });
      return visible;
    }

    // Nothing to gate on — a decorative entry stays visible.
    if (!item.link && !item.altLinks?.length) {
      visible.push(item);
      return visible;
    }

    // Fall back through altLinks so a one-link item fronting several gated
    // routes (Pipelines) survives on whichever of them the user can open.
    const link = [item.link, ...(item.altLinks ?? [])].find(canAccessStrict);
    if (link) visible.push({ ...item, link });
    return visible;
  }, []);

  /** `canAccess` treats a missing link as "no gate"; here it must be a real link. */
  function canAccessStrict(link?: string | null): link is string {
    return Boolean(link) && canAccess(link);
  }
}
