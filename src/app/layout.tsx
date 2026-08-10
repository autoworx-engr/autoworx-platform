import { authOptions } from "@/authOptions";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import Layout from "@/components/Layout";
import QueryProvider from "@/components/QueryProvider";
import { TooltipProvider } from "@/components/Tooltip";
import type { Metadata, Viewport } from "next";
import { getServerSession } from "next-auth";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import TopLoader from "../components/TopLoader";
import "./globals.css";
import Script from "next/script";

// import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: `%s | AutoWorx`,
    default: "AutoWorx",
  },
  openGraph: {
    url: process.env.NEXT_PUBLIC_SITE_URL,
    description:
      "Autoworx makes running your shop easier than ever! From hassle-free client management to streamlining garage operations...",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/icons/autoworx-logo.webp`,
        alt: "AutoWorx Logo",
      },
    ],
  },

  // for PWA specific behavior
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AutoWorx",
    startupImage: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/icons/pwa/icon-512x512.png`,
        media: "(device-width: 768px) and (device-height: 1024px)",
      },
    ],
  },

  // for better touch behavior
  other: {
    "apple-mobile-web-app-capable": "yes",
    "format-detection": "telephone=no",
    "mobile-web-app-capable": "yes",
    // "apple-touch-icon": `${env("NEXT_PUBLIC_SITE_URL")}/icons/autoworx-logo-180x180.png`,
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
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // auth failure must not crash public pages
  }
  const employeeType = session?.user?.employeeType;
  const canReceiveCalls = ["Admin", "Manager", "Sales"].includes(
    employeeType as string,
  );

  // if (!session) {
  //   redirect("/login");
  // }
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <Script
          defer
          src="https://statistics.autoworx.tech/script.js"
          data-website-id="2123305e-6384-415f-adf6-79271e62313f"
          strategy="afterInteractive"
        />
        {/* <link
          rel="apple-touch-icon"
          sizes="512x512"
          href="/icons/pwa/icon-512x512.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="192x192"
          href="/icons/pwa/autoworx-logo-192x192.png"
        /> */}
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/pwa/autoworx-logo-180x180.png"
        />
        {/* <link
          rel="apple-touch-icon"
          sizes="167x167"
          href="/icons/pwa/autoworx-logo-167x167.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/icons/pwa/autoworx-logo-152x152.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="120x120"
          href="/icons/pwa/autoworx-logo-120x120.png"
        /> */}

        {/* <link rel="manifest" href="/manifest.json"/> */}
      </head>
      <body className={inter.className} suppressHydrationWarning>
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
              <Layout session={session} canReceiveCalls={canReceiveCalls}>
                {children}
              </Layout>
            </TooltipProvider>
          </AuthSessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
