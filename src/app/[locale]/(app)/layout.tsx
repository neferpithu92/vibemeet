import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';

/**
 * Layout per le route autenticate — include Navbar (desktop) e BottomNav (mobile).
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-vibe-dark">
      <Navbar />
      <main className="md:pt-16 pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
