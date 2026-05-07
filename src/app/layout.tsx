import { authOptions } from "@/authOptions";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import Layout from "@/components/Layout";
import { ThemeProvider } from "@/components/ThemeProvider";
import type { Metadata, Viewport } from "next";
import { getServerSession } from "next-auth";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import TopLoader from "../components/TopLoader";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Luminar CRM",
    default: "Luminar  CRM",
  },
  description: "Lightweight workspace CRM for accounts, contacts, deals, and activities.",
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
    <html lang="en" suppressHydrationWarning className={plusJakarta.variable}>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/pwa/autoworx-logo-180x180.png" />
      </head>
      <body className={`${plusJakarta.className} font-sans`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          <TopLoader />
          <Toaster
            position="top-right"
            reverseOrder={false}
            toastOptions={{
              className:
                "!rounded-xl !border !shadow-card dark:!bg-zinc-900 dark:!border-zinc-700 dark:!text-zinc-100",
              success: { iconTheme: { primary: "#0d9488", secondary: "#fff" } },
              error: { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
            }}
          />
          <AuthSessionProvider>
            <Layout session={session}>{children}</Layout>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
