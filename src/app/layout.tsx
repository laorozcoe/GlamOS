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

export const dynamic = "force-dynamic"; // 👈 ESTO ARREGLA

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
        <link rel="manifest" href="/site.webmanifest" />
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
