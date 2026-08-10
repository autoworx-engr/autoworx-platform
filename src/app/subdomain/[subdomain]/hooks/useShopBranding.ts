"use client";

import { useEffect } from "react";

/**
 * Custom hook to apply dynamic shop branding (Primary Color & Google Fonts)
 * to the document root based on shop configuration.
 */
export const useShopBranding = (shop: any) => {
  useEffect(() => {
    if (!shop?.themeConfig) return;

    const { primaryColor, fontFamily } = shop.themeConfig;

    // 1. Apply Primary Color (Convert Hex to HSL for Tailwind compatibility)
    if (primaryColor) {
      const hexToHsl = (hex: string) => {
        let r = 0,
          g = 0,
          b = 0;
        // Clean hash if present
        const cleanHex = hex.startsWith("#") ? hex : `#${hex}`;

        if (cleanHex.length === 4) {
          r = parseInt(cleanHex[1] + cleanHex[1], 16);
          g = parseInt(cleanHex[2] + cleanHex[2], 16);
          b = parseInt(cleanHex[3] + cleanHex[3], 16);
        } else if (cleanHex.length === 7) {
          r = parseInt(cleanHex.substring(1, 3), 16);
          g = parseInt(cleanHex.substring(3, 5), 16);
          b = parseInt(cleanHex.substring(5, 7), 16);
        }

        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b),
          min = Math.min(r, g, b);
        let h = 0,
          s = 0,
          l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r:
              h = (g - b) / d + (g < b ? 6 : 0);
              break;
            case g:
              h = (b - r) / d + 2;
              break;
            case b:
              h = (r - g) / d + 4;
              break;
          }
          h /= 6;
        }

        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      };

      try {
        const hslValue = hexToHsl(primaryColor);
        document.documentElement.style.setProperty("--primary", hslValue);
        // Also update ring color if using it
        document.documentElement.style.setProperty("--ring", hslValue);
      } catch (e) {
        console.error("Error setting primary color handle:", e);
      }
    }

    // 2. Apply Google Fonts
    if (fontFamily) {
      const fontId = "dynamic-shop-font";
      let link = document.getElementById(fontId) as HTMLLinkElement;

      if (!link) {
        link = document.createElement("link");
        link.id = fontId;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }

      const formattedFont = fontFamily.replace(/\s+/g, "+");
      link.href = `https://fonts.googleapis.com/css2?family=${formattedFont}:wght@300;400;500;600;700;800;900&display=swap`;

      // Apply font-family to body and tailwind variable
      document.documentElement.style.setProperty(
        "--font-family-base",
        `"${fontFamily}", sans-serif`,
      );
      document.body.style.fontFamily = `"${fontFamily}", sans-serif`;
    }
  }, [shop?.themeConfig?.primaryColor, shop?.themeConfig?.fontFamily]);
};
