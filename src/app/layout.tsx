import { Outfit } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { getBusiness } from "@/lib/getBusiness"
import BusinessProvider from "@/context/BusinessProvider"
import Head from 'next/head';
import { ToastContainer } from 'react-toastify';
// ⚠️ IMPORTANTE: Importar los estilos CSS obligatoriamente
import 'react-toastify/dist/ReactToastify.css';
import type { Metadata } from 'next';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'Brillarte Bloom',
  description: 'Sistema de agenda y punto de venta',
  appleWebApp: {
    capable: true,
    title: 'Brillarte',
    statusBarStyle: 'default',
  },
};

export const dynamic = "force-dynamic"; // 👈 ESTO ARREGLA la busqueda del bussiness id

const outfit = Outfit({
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const business = await getBusiness()
  console.log(business)
  return (
    <html lang="es">
      <Head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"></meta>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* <link rel="manifest" href="/manifest.json" /> */}
      </Head>
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
