// This file contains the navigation structure for the documentation
import { GrHomeRounded } from "react-icons/gr";
import {
  LuBook,
  LuCode,
  LuGlobe,
  LuLayers,
  LuLightbulb,
  LuSettings,
} from "react-icons/lu";

export interface NavItem {
  title: string;
  href: string;
  icon?: any;
  children?: NavItem[];
  isExpanded?: boolean;
}

export const docsNavigation: NavItem[] = [
  {
    title: "Getting Started",
    href: "/",
    icon: GrHomeRounded,
    children: [
      { title: "Introduction", href: "/" },
      { title: "Installation", href: "/installation" },
      { title: "Quick Start", href: "/quick-start" },
    ],
  },
  {
    title: "Components",
    href: "/components",
    icon: LuLayers,
    children: [
      { title: "Buttons", href: "/components/buttons" },
      { title: "Cards", href: "/components/cards" },
      { title: "Forms", href: "/components/forms" },
      { title: "Modals", href: "/components/modals" },
    ],
  },
  {
    title: "API Reference",
    href: "/api",
    icon: LuCode,
    children: [
      { title: "Authentication", href: "/api/auth" },
      { title: "Endpoints", href: "/api/endpoints" },
      { title: "Error Handling", href: "/api/errors" },
    ],
  },
  {
    title: "Guides",
    href: "/guides",
    icon: LuBook,
    children: [
      { title: "Deployment", href: "/guides/deployment" },
      { title: "Configuration", href: "/guides/configuration" },
      { title: "Best Practices", href: "/guides/best-practices" },
    ],
  },
  {
    title: "Examples",
    href: "/examples",
    icon: LuLightbulb,
    children: [
      { title: "Simple App", href: "/examples/simple" },
      { title: "Advanced App", href: "/examples/advanced" },
    ],
  },
  {
    title: "Resources",
    href: "/resources",
    icon: LuGlobe,
    children: [
      { title: "Community", href: "/resources/community" },
      { title: "Support", href: "/resources/support" },
    ],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: LuSettings,
  },
];
