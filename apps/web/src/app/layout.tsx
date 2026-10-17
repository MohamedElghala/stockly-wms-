import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppLayoutClient from "@/components/layout/AppLayoutClient";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ToastProvider from "@/components/ToastProvider";
import PwaInstallPrompt from "@/components/common/PwaInstallPrompt";

export const viewport: Viewport = {
  themeColor: '#00E599',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Stockly WMS - منظومة إدارة المخازن الذكية",
  description: "منظومة ستوكلي لإدارة المستودعات وسلاسل الإمداد والباركود والـ QR - Stockly WMS",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Stockly WMS",
  },
  icons: {
    icon: [
      { url: '/favicon.ico?v=2.4', sizes: 'any' },
      { url: '/icon.png?v=2.4', type: 'image/png' },
      { url: '/icon.svg?v=2.4', type: 'image/svg+xml' }
    ],
    shortcut: '/favicon.ico?v=2.4',
    apple: '/apple-icon.png?v=2.4'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico?v=2.4" sizes="any" />
        <link rel="icon" href="/icon.svg?v=2.4" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-icon.png?v=2.4" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <LanguageProvider>
            <ToastProvider />
            <PwaInstallPrompt />
            <AppLayoutClient>
              {children}
            </AppLayoutClient>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
