import Layout from "@/components/Layout";
import QueryProvider from "@/components/QueryProvider";
import { TooltipProvider } from "@/components/Tooltip";
import type { Metadata, Viewport } from "next";
import { getServerSession } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { env, PublicEnvScript } from "next-runtime-env";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import TopLoader from "../components/TopLoader";
import "./globals.css";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { authOptions } from "@/authOptions";
// import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: `%s | AutoWorx`,
    default: "AutoWorx",
  },
  openGraph: {
    url: env("NEXT_PUBLIC_SITE_URL"),
    description:
      "Autoworx makes running your shop easier than ever! From hassle-free client management to streamlining garage operations...",
    images: [
      {
        url: `${env("NEXT_PUBLIC_SITE_URL")}/icons/autoworx-logo.png`,
        alt: "AutoWorx Logo",
      },
    ],
  },

  // for PWA specific behavior
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AutoWorx",
  },

  // for better touch behavior
  other: {
    "apple-mobile-web-app-capable": "yes",
    "format-detection": "telephone=no",
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <PublicEnvScript />
      </head>
      <body className={inter.className}>
        <TopLoader />
        <Toaster
          position="top-right"
          reverseOrder={false}
          toastOptions={{
            success: {
              style: {
                border: "1px solid rgba(0, 255, 0, 0.5)",
              },
            },
            error: {
              style: {
                border: "1px solid rgba(255, 0, 0, 0.5)",
              },
            },
          }}
        />
        <QueryProvider>
          <AuthSessionProvider>
            <TooltipProvider delayDuration={150}>
              <Layout session={session}>{children}</Layout>
            </TooltipProvider>
          </AuthSessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
