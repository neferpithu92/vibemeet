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
    <div className="min-h-screen bg-vibe-dark relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-vibe-purple/10 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-vibe-pink/5 blur-[120px] rounded-full pointer-events-none z-0" />
      
      <UsageTracker />
      <Navbar />
      <MobileHeader />
      <main className="relative z-10 pt-14 md:pt-16 pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
