'use client';
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-vibe-dark text-white flex flex-col items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-vibe-surface/40 backdrop-blur-xl rounded-3xl border border-white/10 max-w-lg">
          <div className="w-24 h-24 mx-auto bg-vibe-pink/20 rounded-full flex items-center justify-center mb-6">
            <span className="text-5xl">🚨</span>
          </div>
          <h2 className="text-3xl font-black mb-4 font-display">Fatal Runtime Error</h2>
          <p className="text-white/60 mb-8 leading-relaxed">
            Un errore critico a livello globale ha compromesso il caricamento. Il nostro team di ingegneri è stato informato silenziosamente.
          </p>
          <button 
            className="w-full bg-vibe-purple hover:bg-vibe-pink transition-colors font-bold text-lg py-4 rounded-xl"
            onClick={() => reset()}
          >
            Riavvia VibeMeet
          </button>
        </div>
      </body>
    </html>
  );
}
