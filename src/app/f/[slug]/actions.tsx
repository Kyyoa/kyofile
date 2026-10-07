'use client';
import { useState } from 'react';

interface FileActionsProps {
  url: string;
  downloadUrl: string;
  fileName: string;
  slug: string;
  hash: string;
}

export default function FileActions({ url, downloadUrl, fileName, slug, hash }: FileActionsProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

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

      <div className="file-action-row">
        <a
          href={downloadUrl}
          download={fileName}
          className="btn-upload btn-download-file"
          aria-label={`Unduh berkas ${fileName}`}
        >
          <span aria-hidden="true" style={{ fontSize: '1.15rem' }}>⤓</span>
          <span>Unduh Berkas</span>
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
