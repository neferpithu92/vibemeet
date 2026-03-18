import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';

/**
 * Layout per le route di autenticazione (login, register).
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-vibe-dark bg-grid-pattern flex items-center justify-center p-4 relative overflow-hidden">
      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-50">
        <LanguageSwitcher />
      </div>

      {/* Ambient glows */}
      <div className="absolute w-96 h-96 rounded-full bg-vibe-purple/10 blur-[120px] -top-48 -left-48" />
      <div className="absolute w-96 h-96 rounded-full bg-vibe-pink/8 blur-[120px] -bottom-48 -right-48" />
      <div className="absolute w-64 h-64 rounded-full bg-vibe-cyan/5 blur-[80px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
