import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import type React from "react";
import { ClientProviders } from "@/components/ClientProviders";
import RefreshTokenProvider from "@/components/RefreshTokenProvider";
import PageErrorBoundary from "@/components/PageErrorBoundary";
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = {
  title: "Absens",
  description: "AI-Powered Solution for Finding Missing Persons!",
  icons: {
    icon: '/favicon.ico',
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    minimumScale: 0.5,
    userScalable: true,
    viewportFit: "cover",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, minimum-scale=0.5, user-scalable=yes, viewport-fit=cover" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {/* Wrap content with ClientProviders */}
          <ClientProviders>
            {/* Insert the client component that handles token refresh */}
            <RefreshTokenProvider />
            <div className="flex min-h-screen flex-col w-full max-w-full overflow-x-hidden">
              <Navbar />
              <Suspense fallback={<Loader size="lg" />}>
                <main className="flex-1 w-full max-w-full overflow-x-hidden">
                  <PageErrorBoundary>
                    {children}
                  </PageErrorBoundary>
                </main>
              </Suspense>
              <Footer />
            </div>
          </ClientProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
