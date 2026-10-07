'use client';
import { useState } from 'react';
export default function Lapor() {
  const [done, setDone] = useState(false);
  return (
    <div className="page-container">
      <div className="page-header-block">
        <p className="page-badge">✦ &nbsp; PENGADUAN & INTEGRITAS &nbsp; ✦</p>
        <h1 className="page-title">Lapor Penyalahgunaan</h1>
        <p className="page-desc">Temukan malware, phishing, atau konten ilegal? Bantu jaga keamanan.</p>
      </div>
      <div className="form-card">
        {done ? <p>Terima kasih — laporan diterima dan masuk antrean moderasi.</p> : (
        <form onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget as HTMLFormElement);
          await fetch('/api/v1/report', { method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ slugOrUrl: fd.get('url'), reason: `${fd.get('reason')}: ${fd.get('details')}`, website: fd.get('website') || '', ts: Number(fd.get('ts')) || 0 }) });
          setDone(true);
        }}>
          <input type="hidden" name="ts" value={Date.now()} />
          {/* Honeypot antibot */}
          <input type="text" name="website" autoComplete="off" tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }} />
          <div className="form-group">
            <label className="form-label">Tautan berkas</label>
            <input name="url" className="form-input" placeholder="https://kyofile.example/f/xxxxxx" required />
          </div>
          <div className="form-group">
            <label className="form-label">Kategori</label>
            <select name="reason" className="form-input" required defaultValue="malware">
              <option value="malware">Malware / virus</option>
              <option value="phishing">Phishing / penipuan</option>
              <option value="illegal">Konten ilegal</option>
              <option value="copyright">Hak cipta</option>
              <option value="other">Lainnya</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Keterangan</label>
            <textarea name="details" className="form-textarea" rows={4} placeholder="Alasan singkat..." />
          </div>
          <button className="btn-upload" style={{ width: '100%' }}>Kirim Pengaduan</button>
        </form>
        )}
      </div>
    </div>
  );
}
