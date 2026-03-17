import { redirect } from 'next/navigation';

/**
 * Root page — redirect automatico alla mappa.
 */
export default function HomePage() {
  redirect('/map');
}
