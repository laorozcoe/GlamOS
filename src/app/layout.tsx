import { Outfit } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { getBusiness } from "@/lib/getBusiness"
import BusinessProvider from "@/context/BusinessProvider"


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
      <BusinessProvider business={business}>
        <body className={`${outfit.className} dark:bg-gray-900`}>
          <ThemeProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </ThemeProvider>
        </body>
      </BusinessProvider>
    </html>
  );
}
