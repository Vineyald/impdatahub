'use client';

import "./globals.css";

import Navbar from '../components/navbar';
import { usePathname, useSearchParams } from 'next/navigation';
import { Breadcrumbs, BreadcrumbItem } from "@nextui-org/react";
import { Suspense } from "react";
import { NextUIProviders } from "@/providers/nextui";

function BreadcrumbsComponent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  if (!pathname) return null; // Adiciona um fallback caso o pathname seja nulo
  
  const pathSegments = pathname.split('/').filter((segment) => segment);

  if (searchParams) {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      pathSegments.push(pageParam);
    }
  }

  return (
    <Breadcrumbs>
      {pathSegments.map((segment, index) => {
        const href = '/' + pathSegments.slice(0, index + 1).join('/');
        return (
          <BreadcrumbItem key={index} href={href}>
            {segment}
          </BreadcrumbItem>
        );
      })}
    </Breadcrumbs>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
  session: never;
}>) {

  const pathname = usePathname();
  const hideNavbar = pathname === '/login';

  return (
    <html lang="PT-BR">
      <body className="grain">
          <NextUIProviders>
            {!hideNavbar && <Navbar />}
            <div className="container mx-auto pt-2">
              <Suspense fallback={<div>Carregando...</div>}>
                <BreadcrumbsComponent />
              </Suspense>
            </div>
            <main>{children}</main>
          </NextUIProviders>
      </body>
    </html>
  );
}
