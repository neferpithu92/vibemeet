import { redirect } from '@/lib/i18n/navigation';

/**
 * Root page — redirect automatico alla mappa.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/map', locale });
}
