import { redirect } from '@/lib/i18n/navigation';

/**
 * Root page — redirect automatico alla mappa.
 */
export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  redirect({ href: '/map', locale });
}
