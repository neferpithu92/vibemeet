'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Vibemeet branded 404 page — dark theme, animated neon glitch effect.
 */
export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html lang="it">
      <body style={{ margin: 0, padding: 0, background: '#0d0a14', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');

          * { box-sizing: border-box; }

          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-16px); }
          }
          @keyframes glitch1 {
            0%, 100% { clip-path: inset(0 0 95% 0); transform: translateX(-4px); }
            25% { clip-path: inset(40% 0 50% 0); transform: translateX(4px); }
            50% { clip-path: inset(80% 0 10% 0); transform: translateX(-2px); }
            75% { clip-path: inset(20% 0 70% 0); transform: translateX(2px); }
          }
          @keyframes glitch2 {
            0%, 100% { clip-path: inset(80% 0 10% 0); transform: translateX(4px); }
            25% { clip-path: inset(20% 0 60% 0); transform: translateX(-4px); }
            50% { clip-path: inset(60% 0 25% 0); transform: translateX(2px); }
            75% { clip-path: inset(5% 0 85% 0); transform: translateX(-2px); }
          }
          @keyframes pulse-ring {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(2.5); opacity: 0; }
          }
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes star-twinkle {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 1; }
          }

          .page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
            padding: 24px;
          }

          .bg-gradient {
            position: fixed;
            inset: 0;
            background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,0.18) 0%, transparent 70%),
                        radial-gradient(ellipse 60% 40% at 80% 100%, rgba(236,72,153,0.12) 0%, transparent 70%);
            pointer-events: none;
          }

          .star {
            position: fixed;
            border-radius: 50%;
            background: white;
            animation: star-twinkle var(--dur, 3s) ease-in-out infinite var(--delay, 0s);
          }

          .logo {
            font-size: 22px;
            font-weight: 900;
            background: linear-gradient(135deg, #a78bfa, #ec4899);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -0.5px;
            margin-bottom: 48px;
            animation: fade-in 0.6s ease both;
          }

          .avatar-group {
            position: relative;
            width: 120px;
            height: 120px;
            margin-bottom: 32px;
            animation: float 4s ease-in-out infinite;
          }

          .avatar-sphere {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: linear-gradient(135deg, #a78bfa, #7c3aed, #ec4899);
            padding: 4px;
            box-shadow: 0 16px 64px rgba(124,58,237,0.5), 0 4px 16px rgba(0,0,0,0.4);
          }
          .avatar-inner {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: #1a1025;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            position: relative;
            overflow: hidden;
          }
          .avatar-shine {
            position: absolute;
            top: 12px; left: 16px;
            width: 28px; height: 18px;
            border-radius: 50%;
            background: rgba(255,255,255,0.3);
            transform: rotate(-30deg);
            filter: blur(4px);
          }

          .pulse-ring {
            position: absolute;
            inset: -20px;
            border-radius: 50%;
            border: 2px solid rgba(124,58,237,0.5);
            animation: pulse-ring 2s ease-out infinite;
          }
          .pulse-ring:nth-child(2) { animation-delay: 0.7s; }
          .pulse-ring:nth-child(3) { animation-delay: 1.4s; }

          .number-container {
            position: relative;
            margin-bottom: 24px;
            animation: fade-in 0.6s ease 0.2s both;
          }
          .number {
            font-size: clamp(80px, 20vw, 160px);
            font-weight: 900;
            line-height: 1;
            background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 40%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -8px;
          }
          .glitch-layer {
            position: absolute;
            inset: 0;
            font-size: clamp(80px, 20vw, 160px);
            font-weight: 900;
            line-height: 1;
            letter-spacing: -8px;
            color: #a78bfa;
            animation: glitch1 3s steps(1) infinite;
            opacity: 0.5;
          }
          .glitch-layer2 {
            position: absolute;
            inset: 0;
            font-size: clamp(80px, 20vw, 160px);
            font-weight: 900;
            line-height: 1;
            letter-spacing: -8px;
            color: #ec4899;
            animation: glitch2 3s steps(1) infinite 0.15s;
            opacity: 0.5;
          }

          .title {
            font-size: clamp(20px, 5vw, 28px);
            font-weight: 700;
            color: white;
            text-align: center;
            margin-bottom: 12px;
            animation: fade-in 0.6s ease 0.3s both;
          }
          .subtitle {
            font-size: 15px;
            color: rgba(255,255,255,0.5);
            text-align: center;
            max-width: 360px;
            line-height: 1.6;
            margin-bottom: 40px;
            animation: fade-in 0.6s ease 0.4s both;
          }

          .btn-group {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            justify-content: center;
            animation: fade-in 0.6s ease 0.5s both;
          }
          .btn-primary {
            padding: 14px 28px;
            border-radius: 14px;
            background: linear-gradient(135deg, #7c3aed, #ec4899);
            color: white;
            font-size: 15px;
            font-weight: 700;
            text-decoration: none;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 8px 24px rgba(124,58,237,0.4);
          }
          .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(124,58,237,0.6); }
          .btn-secondary {
            padding: 14px 28px;
            border-radius: 14px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.12);
            color: rgba(255,255,255,0.8);
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            transition: background 0.2s;
          }
          .btn-secondary:hover { background: rgba(255,255,255,0.1); }

          .tagline {
            margin-top: 48px;
            font-size: 12px;
            color: rgba(255,255,255,0.2);
            letter-spacing: 2px;
            text-transform: uppercase;
            animation: fade-in 0.6s ease 0.7s both;
          }
        `}</style>

        <div className="bg-gradient" />

        {/* Stars */}
        {mounted && Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              '--dur': (Math.random() * 3 + 2) + 's',
              '--delay': (Math.random() * 4) + 's',
            } as React.CSSProperties}
          />
        ))}

        <div className="page">
          {/* Logo */}
          <div className="logo">⚡ VIBEMEET</div>

          {/* 3D Avatar with pulse */}
          <div className="avatar-group">
            <div className="pulse-ring" />
            <div className="pulse-ring" style={{ animationDelay: '0.7s' }} />
            <div className="avatar-sphere">
              <div className="avatar-inner">
                <span>🌐</span>
                <div className="avatar-shine" />
              </div>
            </div>
          </div>

          {/* 404 with glitch */}
          <div className="number-container">
            <div className="number">404</div>
            <div className="glitch-layer">404</div>
            <div className="glitch-layer2">404</div>
          </div>

          <h1 className="title">Questa pagina non esiste... ancora.</h1>
          <p className="subtitle">
            Forse era un evento, una venue o un artista che non è ancora sul radar di Vibemeet.
            Torna alla mappa e scopri cosa succede vicino a te.
          </p>

          <div className="btn-group">
            <Link href="/it/map" className="btn-primary">
              🗺️ Torna alla Mappa
            </Link>
            <Link href="/it/feed" className="btn-secondary">
              🏠 Home Feed
            </Link>
          </div>

          <div className="tagline">vibemeet · social map · ticino</div>
        </div>
      </body>
    </html>
  );
}
