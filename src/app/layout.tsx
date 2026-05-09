import type { ReactNode } from 'react';
import { Outfit } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { getBusiness } from "@/lib/getBusiness";
import BusinessProvider from "@/context/BusinessProvider";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const dynamic = "force-dynamic";

const outfit = Outfit({
  subsets: ["latin"],
});

// Only allow safe CSS value characters to prevent injection
const SAFE_CSS_VALUE = /^[a-zA-Z0-9#(),.\s%/-]+$/;

function buildThemeVars(themeColors: unknown): Record<string, string> | undefined {
  if (!themeColors || typeof themeColors !== 'object' || Array.isArray(themeColors)) {
    return undefined;
  }
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(themeColors as Record<string, unknown>)) {
    if (key.startsWith('--') && typeof val === 'string' && SAFE_CSS_VALUE.test(val)) {
      result[key] = val;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const business = await getBusiness();
  const themeVars = buildThemeVars(business?.themeColors);

  return (
    <html lang="es" style={themeVars as React.CSSProperties}>
      <link rel="apple-touch-icon" sizes="180x180" href={`/${business?.slug}/apple-touch-icon.png`} />
      <link rel="icon" type="image/png" sizes="32x32" href={`/${business?.slug}/favicon-32x32.png`} />
      <link rel="icon" type="image/png" sizes="16x16" href={`/${business?.slug}/favicon-16x16.png`} />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"></meta>
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <BusinessProvider business={business}>
        <body className={`${outfit.className} dark:bg-gray-900 overscroll-none`}>
          <ToastContainer style={{ zIndex: 999999 }} />
          <ThemeProvider>
            <SidebarProvider>
              {children}
            </SidebarProvider>
          </ThemeProvider>
        </body>
      </BusinessProvider>
    </html>
  );
}
