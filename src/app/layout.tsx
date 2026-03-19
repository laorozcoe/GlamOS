import { Outfit } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { getBusiness } from "@/lib/getBusiness";
import BusinessProvider from "@/context/BusinessProvider";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { Metadata } from 'next';

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


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const business = await getBusiness();

  // 2. Determinamos qué clase CSS aplicar
  const isEvora = business?.name?.toLowerCase().includes('evora');
  const themeClass = isEvora ? 'theme-evora' : '';

  return (
    <html lang="es">
      <link rel="apple-touch-icon" sizes="180x180" href={`/${business?.slug}/apple-touch-icon.png`} />
      <link rel="icon" type="image/png" sizes="32x32" href={`/${business?.slug}/favicon-32x32.png`} />
      <link rel="icon" type="image/png" sizes="16x16" href={`/${business?.slug}/favicon-16x16.png`} />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"></meta>
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <BusinessProvider business={business}>
        {/* 3. Inyectamos la clase del tema dinámicamente en el body */}
        <body className={`${outfit.className} ${themeClass} dark:bg-gray-900 overscroll-none`}>
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