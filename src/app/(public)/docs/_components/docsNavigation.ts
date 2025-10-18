// This file contains the navigation structure for the documentation
import {
  Book,
  Code,
  Globe,
  Home,
  Layers,
  Lightbulb,
  Settings,
} from "lucide-react";

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
    icon: Home,
    children: [
      { title: "Introduction", href: "/" },
      { title: "Installation", href: "/installation" },
      { title: "Quick Start", href: "/quick-start" },
    ],
  },
  {
    title: "Components",
    href: "/components",
    icon: Layers,
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
    icon: Code,
    children: [
      { title: "Authentication", href: "/api/auth" },
      { title: "Endpoints", href: "/api/endpoints" },
      { title: "Error Handling", href: "/api/errors" },
    ],
  },
  {
    title: "Guides",
    href: "/guides",
    icon: Book,
    children: [
      { title: "Deployment", href: "/guides/deployment" },
      { title: "Configuration", href: "/guides/configuration" },
      { title: "Best Practices", href: "/guides/best-practices" },
    ],
  },
  {
    title: "Examples",
    href: "/examples",
    icon: Lightbulb,
    children: [
      { title: "Simple App", href: "/examples/simple" },
      { title: "Advanced App", href: "/examples/advanced" },
    ],
  },
  {
    title: "Resources",
    href: "/resources",
    icon: Globe,
    children: [
      { title: "Community", href: "/resources/community" },
      { title: "Support", href: "/resources/support" },
    ],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];
