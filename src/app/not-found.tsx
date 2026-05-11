/**
 * Root 404 — Not Found page per Next.js App Router.
 * Non usa hooks client perché deve essere renderizzata come RSC.
 */
export default function NotFound() {
  return (
    <html lang="it">
      <body style={{ margin: 0, padding: 0, background: '#0A0A0F', fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F8F8FF' }}>
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{
            fontSize: '160px',
            fontWeight: 900,
            lineHeight: 1,
            background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 40%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-8px',
            marginBottom: '24px'
          }}>
            404
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px', color: '#F8F8FF' }}>
            Questa pagina non esiste... ancora.
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', maxWidth: '360px', lineHeight: 1.6, marginBottom: '40px' }}>
            Forse era un evento, una venue o un artista che non è ancora sul radar di Vibemeet.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/it/map" style={{
              padding: '14px 28px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
              color: 'white',
              fontSize: '15px',
              fontWeight: 700,
              textDecoration: 'none'
            }}>
              🗺️ Torna alla Mappa
            </a>
            <a href="/it/feed" style={{
              padding: '14px 28px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '15px',
              fontWeight: 600,
              textDecoration: 'none'
            }}>
              🏠 Home Feed
            </a>
          </div>
          <p style={{ marginTop: '48px', fontSize: '12px', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px', textTransform: 'uppercase' }}>
            vibemeet · social map · ticino
          </p>
        </div>
      </body>
    </html>
  );
}
