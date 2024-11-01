'use client'

import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/providers/nextui"
import Navbar from '../components/navbar'
import { usePathname } from 'next/navigation'

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const pathname = usePathname();
  const hideNavbar = pathname === '/login';

  return (
    <html lang="PT-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {!hideNavbar && <Navbar />} {/* Só exibe a Navbar se não estiver na página de login */}
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
