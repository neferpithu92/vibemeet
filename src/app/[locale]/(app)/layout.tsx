import { Navbar } from '@/components/layout/Navbar';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { UsageTracker } from '@/components/layout/UsageTracker';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-vibe-dark">
      <UsageTracker />
      <Navbar />
      <MobileHeader />
      <main className="pt-14 md:pt-16 pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
