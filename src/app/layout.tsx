import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'kyofile — Titip Berkas Cepat',
  description: 'Pilih berkas, dapatkan tautan instan, lalu bagikan. Tanpa akun, tanpa kuki pelacak.',
};

const NAV = [
  { href: '/', label: 'Unggah', icon: '☁' },
  { href: '/fitur', label: 'Fitur', icon: '★' },
  { href: '/api-docs', label: 'API', icon: '⚡' },
  { href: '/ketentuan', label: 'Syarat', icon: '⚖' },
  { href: '/lapor', label: 'Lapor', icon: '⚑' },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;600&family=Spectral:ital,wght@0,400;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="wrap">
          <header className="nav-header">
            <div className="brand-group">
              <a href="/" className="brand-name">kyofile</a>
              <span className="brand-badge">v1.0</span>
            </div>
            <div className="nav-status">
              <span className="status-dot"></span>
              <span>POOL SIAP</span>
            </div>
          </header>

          {children}

          <nav className="bottom-nav" aria-label="Navigasi Utama">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="bottom-nav-item">
                <span className="bottom-nav-icon">{n.icon}</span>
                <span className="bottom-nav-label">{n.label}</span>
              </a>
            ))}
          </nav>

          <div className="site-footer-note">
            &copy; 2026 kyofile &bull; Dijalankan satu manusia, ditenagai banyak mesin.
          </div>
        </div>
      </body>
    </html>
  );
}
