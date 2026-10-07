const CARDS = [
  { n: '§ 01 / ARSITEKTUR', t: 'Multi-Backend Storage Pool', b: 'Kapasitas terdistribusi di beberapa backend storage independen. Saat satu backend mendekati kuota, sistem otomatis mengalihkan unggahan baru ke node berikutnya tanpa downtime.' },
  { n: '§ 02 / EFISIENSI', t: 'Deduplikasi SHA-256', b: 'Sebelum berkas diunggah, sidik jari hash dihitung di peramban. Jika berkas identik sudah ada di pool, tautan langsung diberikan instan tanpa membuang kuota bytes ganda.' },
  { n: '§ 03 / PEMELIHARAAN', t: 'Pembersihan Otomatis 90 Hari', b: 'Scheduler janitor memeriksa masa berlaku setiap jam. Berkas kedaluwarsa dibersihkan seketika. Berkas never yang tidak dibuka 90 hari ikut dibersihkan agar pool tetap sehat.' },
  { n: '§ 04 / KECEPATAN', t: 'Direct Signed Upload', b: 'Bypass batas transfer serverless via arsitektur 2-tahap: inisiasi tiket bertanda tangan, lalu upload langsung ke storage via signed URL. Bytes tidak lewat server.' },
];

export default function Fitur() {
  return (
    <div className="page-container">
      <div className="page-header-block">
        <p className="page-badge">✦ &nbsp; KAPABILITAS TEKNIS &nbsp; ✦</p>
        <h1 className="page-title">Fitur & Arsitektur</h1>
        <p className="page-desc">Dirancang untuk kecepatan instan, ketahanan kapasitas, dan privasi penuh.</p>
        <div style={{ margin: '14px auto 0', width: 50, height: 1, background: 'var(--line-strong)', opacity: 0.5 }}></div>
      </div>
      <div className="content-grid">
        {CARDS.map((c) => (
          <div key={c.n} className="content-card">
            <div className="content-card-num">{c.n}</div>
            <h2 className="content-card-title">{c.t}</h2>
            <p className="content-card-body">{c.b}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
