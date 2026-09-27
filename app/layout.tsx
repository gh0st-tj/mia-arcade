import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
});
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#151024',
};

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/apple-touch-icon.png',
  },
  // Added to a phone’s home screen, the arcade opens full-screen like an app.
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Mia’s Arcade',
    statusBarStyle: 'black-translucent',
  },
  title: 'Mia’s Babylon Arcade ✦ Play, learn & shine',
  description:
    'Fifteen playful learning adventures, including two Bluey games and 30 English speaking levels, built with love by Uncle Tom for Mia and her family.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={nunito.variable}>{children}</body>
    </html>
  );
}
