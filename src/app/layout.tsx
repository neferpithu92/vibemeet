import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VIBE — Scopri il mondo intorno a te',
  description:
    'Piattaforma sociale di nuova generazione. Mappa live, eventi, venue e contenuti geolocalizzati nella tua zona.',
  keywords: ['social', 'mappa', 'eventi', 'venue', 'musica', 'nightlife', 'svizzera'],
  openGraph: {
    title: 'VIBE — Scopri il mondo intorno a te',
    description:
      'Mappa live, eventi, venue e contenuti geolocalizzati nella tua zona.',
    siteName: 'VIBE',
    type: 'website',
  },
};

import { ToastProvider } from '@/components/ui/ToastProvider';
import RealtimeObserver from '@/components/layout/RealtimeObserver';
import PageTransition from '@/components/layout/PageTransition';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={`${inter.variable} ${outfit.variable}`}>
      <body className="bg-vibe-dark text-vibe-text font-sans antialiased">
        <ToastProvider>
          <PageTransition>
            {children}
          </PageTransition>
          <RealtimeObserver />
        </ToastProvider>
      </body>
    </html>
  );
}
