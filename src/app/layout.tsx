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
// import type { Metadata, Viewport } from 'next';

// // Nota: En versiones recientes de Next.js, el viewport se exporta por separado
// export const viewport: Viewport = {
//   themeColor: '#ffffff',
//   width: 'device-width',
//   initialScale: 1,
//   maximumScale: 1,
//   userScalable: false, // Evita que se haga zoom al tocar inputs en iOS
// };

// export const metadata: Metadata = {
//   title: 'Brillarte Bloom',
//   description: 'Sistema de reservas',
//   manifest: '/site.webmanifest', // Aquí enlazas tu archivo de manifiesto
//   appleWebApp: {
//     capable: true, // ESTE ES EL QUE QUITA LAS BARRAS
//     title: 'Brillarte',
//     statusBarStyle: 'black-translucent', // Hace que la barra de la batería/hora se vea bien
//   },
// };

// export const dynamic = "force-dynamic"; // 👈 ESTO ARREGLA

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
    <html lang="en">
      <Head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <BusinessProvider business={business}>
        <body className={`${outfit.className} dark:bg-gray-900`}>
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
