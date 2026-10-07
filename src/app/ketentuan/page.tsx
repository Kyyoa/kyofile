const CARDS = [
  { n: '§ 01 / UKURAN', t: 'Batas 50 MB / Berkas', b: 'Setiap unggahan maksimal 50 MB. kyofile untuk pertukaran berkas cepat, bukan arsip tanpa batas.' },
  { n: '§ 02 / KEAMANAN', t: 'Larangan Executable', b: 'Berkas .exe, .msi, .bat, .cmd, .sh, .apk, .vbs, .ps1 ditolak saat verifikasi awal demi melindungi penerima.' },
  { n: '§ 03 / SANITASI', t: 'Anti-XSS & Phishing', b: 'HTML, XHTML, SVG disajikan dengan MIME text/plain. Berkas tidak dirender sebagai halaman web.' },
  { n: '§ 04 / SIKLUS HIDUP', t: 'Inactive Purge', b: 'never berlaku selama berkas masih dibuka. Tanpa akses 90 hari berturut-turut, janitor menghapus otomatis.' },
];
export default function Ketentuan() {
  return (
    <div className="page-container">
      <div className="page-header-block">
        <p className="page-badge">✦ &nbsp; PANDUAN PENGGUNAAN &nbsp; ✦</p>
        <h1 className="page-title">Syarat & Ketentuan</h1>
        <p className="page-desc">Aturan transparan demi keandalan layanan dan keamanan bersama.</p>
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
