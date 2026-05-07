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
    default: "Luminar CRM",
  },
  description: "Luminar CRM — lightweight revenue workspace for pipeline, clients, invoicing, and team management.",
  icons: {
    icon: "/icons/luminar-crm-logo.svg",
    apple: "/icons/luminar-crm-logo.svg",
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
    <html lang="en" suppressHydrationWarning className={plusJakarta.variable}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/icons/luminar-crm-logo.svg" />
        <link rel="apple-touch-icon" href="/icons/luminar-crm-logo.svg" />
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
