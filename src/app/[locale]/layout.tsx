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

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/lib/i18n/config';
import { ToastProvider } from '@/components/ui/ToastProvider';
import RealtimeObserver from '@/components/layout/RealtimeObserver';
import PageTransition from '@/components/layout/PageTransition';
import SafeHomeWidget from '@/components/safety/SafeHomeWidget';
import CookieBanner from '@/components/legal/CookieBanner';

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${outfit.variable}`}>
      <body className="bg-vibe-dark text-vibe-text font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ToastProvider>
            <PageTransition>
              {children}
            </PageTransition>
            <RealtimeObserver />
            <SafeHomeWidget />
            <CookieBanner />
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
