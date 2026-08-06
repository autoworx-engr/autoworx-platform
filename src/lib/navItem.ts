import type { ReactNode } from "react";

/**
 * Shape shared by every side/mobile nav list (dashboard + super admin).
 *
 * `path` is the 3-segment prefix used for active-state matching, `link` is where
 * the item navigates (absent for pure dropdown parents). Both are matched
 * against ROUTE_PERMISSIONS_MAP / FEATURE_PERMISSIONS_MAP, so a new nav entry
 * only needs a mapping added there to become permission-aware.
 */
export type NavSubItem = {
  title: string;
  link: string;
};

export type NavItem = {
  title: string;
  icon: string | ReactNode;
  link?: string | null;
  path: string;
  subnav?: NavSubItem[] | null;
  /**
   * Alternative destinations, tried in order when `link` is not permitted.
   * Lets one nav item front a group of separately-gated routes (Pipelines →
   * sales / shop / team) without turning it into a dropdown.
   */
  altLinks?: string[];
};
