'use client';
import { useRef, useState } from 'react';

const EXPIRY_LABELS: Record<string, string> = {
  '1h': 'Dihapus setelah 1 jam',
  '1d': 'Dihapus setelah 24 jam',
  '7d': 'Dihapus setelah 7 hari',
  '30d': 'Dihapus setelah 30 hari',
  'never': '90 hari jika tidak dibuka',
};

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fmt(n: number): string {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / 1024 ** i).toFixed(2)} ${u[i]}`;
}

// PUT via XHR agar progress upload real (fetch tidak kasih upload-progress)
function putBytes(url: string, contentType: string, buf: ArrayBuffer, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('content-type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress(Math.min(1, e.loaded / e.total));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { onProgress(1); resolve(); }
      else reject(new Error('upload bytes gagal'));
    };
    xhr.onerror = () => reject(new Error('upload bytes gagal'));
    xhr.ontimeout = () => reject(new Error('upload bytes timeout'));
    xhr.timeout = 10 * 60 * 1000;
    xhr.send(buf);
  });
}

export default function UploadCard() {
  const [file, setFile] = useState<File | null>(null);
  const [expiry, setExpiry] = useState('never');
  const [status, setStatus] = useState('Belum ada berkas dipilih.');
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [drag, setDrag] = useState(false);
  const [formTs] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const honeyRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | undefined) => {
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    if (['exe','msi','bat','cmd','sh','ps1','vbs','jar','apk','php','phtml','phar','jsp','jspx','asp','aspx','py','pl','rb','cgi'].includes(ext)) {
      alert(`Format .${ext} dilarang demi keamanan.`);
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      alert('Maksimal 50 MB per berkas.');
      return;
    }
    setFile(f);
    setResult('');
    setStatus(`Dipilih: ${f.name} (${fmt(f.size)})`);
  };

  const reset = () => {
    setFile(null); setResult(''); setPct(0);
    setStatus('Belum ada berkas dipilih.');
    if (inputRef.current) inputRef.current.value = '';
  };

  const upload = async () => {
    if (!file) { alert('Pilih berkas dulu.'); return; }
    setBusy(true); setPct(2);
    try {
      const buf = await file.arrayBuffer();
      const contentHash = await sha256Hex(buf);
      // 1. init (sertakan honeypot + timestamp antibot)
      const initRes = await fetch('/api/v1/upload/init', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filename: file.name, size: file.size, mimeType: file.type, expiry, contentHash, website: honeyRef.current?.value || '', ts: formTs }),
      });
      const init = await initRes.json();
      if (!initRes.ok) throw new Error(init.error || 'init gagal');
      if (init.deduped) {
        setResult(init.url); setPct(100);
        setStatus(`Berkas sudah ada — tautan instan: ${file.name}`);
        return;
      }
      // 2. direct upload to signed URL (bytes tidak lewat server)
      setPct(8);
      setStatus(`Mengunggah: ${file.name} (0%)`);
      await putBytes(init.upload.signedUrl, file.type || 'application/octet-stream', buf, (p) => {
        setPct(Math.round(8 + p * 82));
        setStatus(`Mengunggah: ${file.name} (${Math.round(p * 100)}%)`);
      });
      setPct(92);
      // 3. finalize
      const finRes = await fetch('/api/v1/upload/finalize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ticket: init.ticket }),
      });
      const fin = await finRes.json();
      if (!finRes.ok) throw new Error(fin.error || 'finalize gagal');
      setPct(100);
      setResult(fin.url);
      setStatus(`Sukses: ${file.name} (${expiry})`);
    } catch (e: unknown) {
      setStatus(`Gagal: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stage-container" id="stageContainer">
      <div className="floating-hand hand-left" aria-hidden="true">
        <img src="/assets/hand_left_isolated.png" alt="" />
      </div>
      <div className="upload-card">
        <div className="card-stamp" aria-hidden="true">
          <img src="/assets/stamp_seal.svg" alt="" />
        </div>
        <div className="corner-mark top-left"></div>
        <div className="corner-mark top-right"></div>
        <div className="corner-mark bottom-left"></div>
        <div className="corner-mark bottom-right"></div>

        <div className="card-header">
          <h2 className="card-title">Lembar Unggah</h2>
          <span className="card-spec">MAKS. 50 MB</span>
        </div>

        <div
          className={`dropzone${drag ? ' is-active' : ''}${file ? ' has-file' : ''}`}
          tabIndex={0} role="button" aria-label="Area unggah berkas"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        >
          <div className="drop-icon-wrapper"><span className="drop-icon">{file ? '📄' : '✦'}</span></div>
          <div className="drop-main-text">{file ? file.name : 'Tarik berkas ke sini, atau klik untuk memilih'}</div>
          <div className="drop-sub-text">{file ? `Siap diunggah (${fmt(file.size)})` : 'Foto, dokumen, arsip, media — kecuali format executable (.exe, .apk, .sh)'}</div>
          <input ref={inputRef} type="file" hidden onChange={(e) => pick(e.target.files?.[0])} />
        </div>

        <div className="control-row">
          <div className="control-label">
            <span>Masa Berlaku Tautan</span>
            <span>{EXPIRY_LABELS[expiry]}</span>
          </div>
          <div className="pill-grid">
            {['1h','1d','7d','30d','never'].map((v) => (
              <button key={v} type="button" className={`pill-btn${expiry === v ? ' active' : ''}`} onClick={() => setExpiry(v)}>
                {v === 'never' ? 'Never *' : v === '1h' ? '1 Jam' : v === '1d' ? '1 Hari' : v === '7d' ? '7 Hari' : '30 Hari'}
              </button>
            ))}
          </div>
        </div>

        <div className="action-row">
          <button className="btn-upload" onClick={upload} disabled={busy}>{busy ? 'Mengunggah…' : 'Unggah Sekarang'}</button>
          <button className="btn-reset" onClick={reset}>Bersihkan</button>
        </div>
        {/* Honeypot antibot: tak terlihat manusia, bot iseng isi -> 403 */}
        <input ref={honeyRef} type="text" name="website" autoComplete="off" tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }} />

        {pct > 0 && (
          <div className="upload-progress"><div className="upload-progress-bar" style={{ width: `${pct}%` }}></div></div>
        )}
        <div className="file-meta-bar"><span>{status}</span><span>{file ? fmt(file.size) : ''}</span></div>

        {result && (
          <div className="result-box">
            <div className="result-header">Tautan Siap Dibagikan</div>
            <div className="result-link-display">{result}</div>
            <div className="result-actions">
              <button className="btn-upload btn-sm" onClick={() => { navigator.clipboard.writeText(result); }}>Salin Tautan</button>
              <a className="btn-reset btn-sm" href={result} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Buka</a>
            </div>
          </div>
        )}
      </div>
      <div className="floating-hand hand-right" aria-hidden="true">
        <img src="/assets/hand_right_isolated.png" alt="" />
      </div>
    </div>
  );
}
