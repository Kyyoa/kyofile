export default function ApiDocs() {
  return (
    <div className="page-container">
      <div className="page-header-block">
        <p className="page-badge">✦ &nbsp; PENGEMBANG & INTEGRASI &nbsp; ✦</p>
        <h1 className="page-title">Dokumentasi API v1</h1>
        <p className="page-desc">Tanpa API key. Dua tahap aman: inisiasi tiket lalu finalisasi.</p>
        <div style={{ margin: '14px auto 0', width: 50, height: 1, background: 'var(--line-strong)', opacity: 0.5 }}></div>
      </div>

      <div className="terminal-card">
        <h2 className="terminal-title">1. Inisiasi (POST /api/v1/upload/init)</h2>
        <pre className="terminal-pre">{`POST /api/v1/upload/init
Body: { "filename", "size", "mimeType", "expiry", "contentHash" }
-> { slug, ticket, upload: { signedUrl } }
   atau { deduped: true, url } bila hash sudah ada`}</pre>
      </div>

      <div className="terminal-card">
        <h2 className="terminal-title">2. Finalisasi (POST /api/v1/upload/finalize)</h2>
        <pre className="terminal-pre">{`PUT <signedUrl>  (bytes langsung, maks 50 MB)
POST /api/v1/upload/finalize
Body: { "ticket" }
-> { url, slug, size_bytes, expires_at }`}</pre>
      </div>
    </div>
  );
}
