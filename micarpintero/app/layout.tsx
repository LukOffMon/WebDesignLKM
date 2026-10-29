import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';
import './globals.css';

export const metadata: Metadata = {
  title: `${APP_NAME} · ${APP_TAGLINE}`,
  description:
    'Diseña muebles a medida en 3D, obtén el despiece, el plano de corte optimizado, el presupuesto y un PDF de fabricación. Todo en tu navegador.',
  icons: { icon: 'icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#1c1917',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
