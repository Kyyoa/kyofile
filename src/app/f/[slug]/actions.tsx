'use client';
import { useState } from 'react';

interface FileActionsProps {
  url: string;
  downloadUrl: string;
  fileName: string;
  slug: string;
  hash: string;
  sizeBytes: number;
}

function fmtDl(n: number): string {
  if (!n || n <= 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / 1024 ** i).toFixed(1)} ${u[i]}`;
}

export default function FileActions({ url, downloadUrl, fileName, slug, hash, sizeBytes }: FileActionsProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [dlPct, setDlPct] = useState(-1);
  const [dlLabel, setDlLabel] = useState('Unduh Berkas');

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2400);
    } catch {
      // fallback
    }
  };

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      // fallback
    }
  };

  // Unduh via fetch+blob biar ada progress real — jangan href buta.
  const startDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (dlPct >= 0) return;
    setDlPct(0);
    setDlLabel('Menyiapkan…');
    try {
      const res = await fetch(downloadUrl);
      if (!res.ok || !res.body) throw new Error('download gagal dimulai');
      const total = Number(res.headers.get('content-length')) || sizeBytes || 0;
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        if (total > 0) {
          const p = Math.min(99, Math.round((got / total) * 100));
          setDlPct(p);
          setDlLabel(`${fmtDl(got)} / ${fmtDl(total)} (${p}%)`);
        } else {
          setDlLabel(`${fmtDl(got)} terunduh…`);
        }
      }
      setDlPct(100);
      setDlLabel('Menyimpan…');
      const blob = new Blob(chunks as BlobPart[]);
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);
      setDlLabel('Selesai ✓');
      setTimeout(() => { setDlPct(-1); setDlLabel('Unduh Berkas'); }, 4000);
    } catch {
      setDlLabel('Gagal — coba lagi');
      setTimeout(() => { setDlPct(-1); setDlLabel('Unduh Berkas'); }, 3000);
    }
  };

  return (
    <>
      <div className="file-hash-bar" onClick={copyHash} role="button" tabIndex={0} title="Klik untuk menyalin SHA-256 lengkap" style={{ cursor: 'pointer' }}>
        <span className="hash-key">SHA-256</span>
        <span className="hash-val" style={{ fontSize: '0.74rem', letterSpacing: '0.03em', userSelect: 'all' }}>
          {hash}
        </span>
        <span style={{ fontSize: '0.68rem', color: 'var(--ink-muted)', flexShrink: 0, textTransform: 'uppercase' }}>
          {copiedHash ? '✓ TERSALIN' : '⎘ SALIN'}
        </span>
      </div>

      {dlPct >= 0 && (
        <div className="upload-progress" style={{ marginBottom: 12 }}>
          <div className="upload-progress-bar" style={{ width: `${dlPct}%` }}></div>
        </div>
      )}

      <div className="file-action-row">
        <a
          href={downloadUrl}
          download={fileName}
          onClick={startDownload}
          className="btn-upload btn-download-file"
          aria-label={`Unduh berkas ${fileName}`}
        >
          <span aria-hidden="true" style={{ fontSize: '1.15rem' }}>⤓</span>
          <span>{dlLabel}</span>
        </a>

        <button
          type="button"
          className="btn-reset"
          onClick={copyUrl}
          aria-label="Salin tautan berkas ke papan klip"
        >
          <span aria-hidden="true">{copiedUrl ? '✓' : '⎘'}</span>
          <span>{copiedUrl ? 'Tersalin!' : 'Salin Tautan'}</span>
        </button>

        <a
          href={`/api/v1/file/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="btn-reset"
          title="Buka metadata JSON mesin"
        >
          <span>⚡</span>
          <span>Info JSON</span>
        </a>
      </div>
    </>
  );
}
