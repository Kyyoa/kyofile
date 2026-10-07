import type { Metadata } from 'next';
import Link from 'next/link';
import { meta, formatBytes } from '@/lib/server';
import type { FileRow } from '@/lib/server';
import FileActions from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: { slug: string };
  searchParams?: { dl?: string; download?: string };
}

function parseSlug(raw: string): string {
  if (!raw) return '';
  return raw.includes('.') ? raw.split('.')[0] : raw;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = parseSlug(params.slug);
  if (!slug) return { title: 'Berkas Tidak Ditemukan — kyofile' };

  try {
    const db = meta();
    const { data } = await db.from('files').select('original_name,ext,size_bytes,mime_type').eq('slug', slug).maybeSingle();
    const f = data as Pick<FileRow, 'original_name' | 'ext' | 'size_bytes' | 'mime_type'> | null;
    if (!f) return { title: 'Berkas Tidak Ditemukan — kyofile' };
    const name = f.original_name || `${slug}${f.ext ? '.' + f.ext : ''}`;
    const desc = `Informasi berkas ${name} di kyofile: ${formatBytes(f.size_bytes)}, tipe ${f.mime_type}. Unduh langsung secara aman.`;
    return {
      title: `${name} — Lembar Berkas kyofile`,
      description: desc,
      openGraph: {
        title: `${name} — kyofile`,
        description: desc,
      },
    };
  } catch {
    return { title: 'Lembar Berkas — kyofile' };
  }
}

export default async function FilePage({ params, searchParams }: PageProps) {
  const slug = parseSlug(params.slug);
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://kyofile.galaci.my.id';

  // jika ada param ?dl=1 atau ?download=1, redirect langsung ke endpoint download
  if (searchParams?.dl === '1' || searchParams?.download === '1') {
    return (
      <meta httpEquiv="refresh" content={`0;url=/api/v1/download/${slug}`} />
    );
  }

  const db = meta();
  const { data } = await db.from('files').select('*').eq('slug', slug).maybeSingle();
  const f = data as FileRow | null;

  if (!f) {
    return (
      <section className="hero-stage">
        <div className="bg-radar" aria-hidden="true"><img src="/assets/radar_reticle.svg" alt="" /></div>
        <div className="bg-cloud-left" aria-hidden="true"><img src="/assets/cloud_accents.svg" alt="" /></div>
        <div className="bg-cloud-right" aria-hidden="true"><img src="/assets/cloud_accents.svg" alt="" /></div>
        <div className="angel-backdrop" aria-hidden="true"><img src="/assets/angel_isolated.png" alt="" /></div>

        <div className="stage-container" style={{ maxWidth: 540 }}>
          <div className="upload-card" style={{ textAlign: 'center', padding: '40px 28px' }}>
            <div className="card-stamp" aria-hidden="true"><img src="/assets/stamp_seal.svg" alt="" /></div>
            <div className="corner-mark top-left"></div>
            <div className="corner-mark top-right"></div>
            <div className="corner-mark bottom-left"></div>
            <div className="corner-mark bottom-right"></div>

            <p className="hero-pretitle" style={{ color: 'var(--accent)' }}>✦ &nbsp; STATUS 404 &nbsp; ✦</p>
            <h1 className="file-card-title" style={{ marginTop: 8 }}>Berkas Tidak Ditemukan</h1>
            <p className="file-card-desc" style={{ maxWidth: 420, margin: '12px auto 26px' }}>
              Tautan berkas yang Anda tuju mungkin salah, telah dihapus oleh pengunggah, atau belum pernah ada di arsip.
            </p>
            <Link href="/" className="btn-upload" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Kembali ke Lembar Unggah
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const isExpired = !!(f.expires_at && new Date(f.expires_at) <= new Date());
  if (isExpired) {
    return (
      <section className="hero-stage">
        <div className="bg-radar" aria-hidden="true"><img src="/assets/radar_reticle.svg" alt="" /></div>
        <div className="bg-cloud-left" aria-hidden="true"><img src="/assets/cloud_accents.svg" alt="" /></div>
        <div className="bg-cloud-right" aria-hidden="true"><img src="/assets/cloud_accents.svg" alt="" /></div>
        <div className="angel-backdrop" aria-hidden="true"><img src="/assets/angel_isolated.png" alt="" /></div>

        <div className="stage-container" style={{ maxWidth: 540 }}>
          <div className="upload-card" style={{ textAlign: 'center', padding: '40px 28px' }}>
            <div className="card-stamp" aria-hidden="true"><img src="/assets/stamp_seal.svg" alt="" /></div>
            <div className="corner-mark top-left"></div>
            <div className="corner-mark top-right"></div>
            <div className="corner-mark bottom-left"></div>
            <div className="corner-mark bottom-right"></div>

            <p className="hero-pretitle" style={{ color: 'var(--accent)' }}>✦ &nbsp; STATUS 410 &nbsp; ✦</p>
            <h1 className="file-card-title" style={{ marginTop: 8 }}>Masa Berlaku Telah Berakhir</h1>
            <p className="file-card-desc" style={{ maxWidth: 420, margin: '12px auto 26px' }}>
              Tautan berkas ini telah kedaluwarsa sesuai batas waktu penyimpanan atau telah dibersihkan oleh sistem janitor otomatis.
            </p>
            <Link href="/" className="btn-upload" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Unggah Berkas Baru
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const fileName = f.original_name || `${f.slug}${f.ext ? '.' + f.ext : ''}`;
  const filePageUrl = `${site}/f/${f.slug}${f.ext ? '.' + f.ext : ''}`;
  const downloadUrl = `/api/v1/download/${f.slug}`;
  const infoApiUrl = `${site}/api/v1/file/${f.slug}`;
  const createdDate = new Date(f.created_at).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  let expiryText = '90 hari jika tidak dibuka';
  if (f.expires_at) {
    const exp = new Date(f.expires_at);
    expiryText = exp.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  }

  return (
    <section className="hero-stage">
      <div className="bg-radar" aria-hidden="true"><img src="/assets/radar_reticle.svg" alt="" /></div>
      <div className="bg-cloud-left" aria-hidden="true"><img src="/assets/cloud_accents.svg" alt="" /></div>
      <div className="bg-cloud-right" aria-hidden="true"><img src="/assets/cloud_accents.svg" alt="" /></div>
      <div className="angel-backdrop" aria-hidden="true"><img src="/assets/angel_isolated.png" alt="" /></div>
      <div className="hero-solo-bird" aria-hidden="true"><img src="/assets/poster_bird.png" alt="" /></div>

      <div className="hero-content">
        <p className="hero-pretitle">✦ &nbsp; LEMBAR INFORMASI BERKAS &nbsp; ✦</p>
        <h1 className="hero-title">kyofile</h1>
        <p className="hero-subtitle">Berkas terverifikasi di node penyimpanan. Siap diunduh langsung ke perangkat Anda.</p>
        <div style={{ margin: '14px auto 0', width: 50, height: 1, background: 'var(--line-strong)', opacity: 0.5 }}></div>
      </div>

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
            <h2 className="card-title" style={{ fontSize: '0.82rem', letterSpacing: '0.12em', color: 'var(--accent)' }}>
              FILE INFORMATION &bull; ARSIP
            </h2>
            <span className="card-spec">NODE {f.backend.toUpperCase()}</span>
          </div>

          <h3 className="file-card-title">{fileName}</h3>

          <p className="file-card-desc">
            Informasi berkas <strong>{fileName}</strong> di kyofile: {formatBytes(f.size_bytes)}, tipe {f.mime_type || 'octet-stream'}, diunggah {createdDate}, dan telah diminta {f.download_count || 0} kali.
          </p>

          <div className="file-stat-grid">
            <div className="file-stat-box">
              <div className="file-stat-label">Ukuran</div>
              <div className="file-stat-value">{formatBytes(f.size_bytes)}</div>
            </div>
            <div className="file-stat-box">
              <div className="file-stat-label">Tipe</div>
              <div className="file-stat-value">{f.mime_type || 'octet-stream'}</div>
            </div>
            <div className="file-stat-box">
              <div className="file-stat-label">Ekstensi</div>
              <div className="file-stat-value">{f.ext ? `.${f.ext}` : '—'}</div>
            </div>
            <div className="file-stat-box">
              <div className="file-stat-label">Request Diproses</div>
              <div className="file-stat-value">{f.download_count || 0} kali</div>
            </div>
          </div>

          <div className="file-meta-bar" style={{ marginBottom: 16 }}>
            <span>Masa Berlaku: <code>{expiryText}</code></span>
            <span>Status: <strong style={{ color: 'var(--ink-deep)' }}>Aktif</strong></span>
          </div>

          <FileActions
            url={filePageUrl}
            downloadUrl={downloadUrl}
            fileName={fileName}
            slug={f.slug}
            hash={f.sha256}
          />

          <div className="file-footer-meta">
            <div>URL Berkas: <a href={filePageUrl}>{filePageUrl}</a></div>
            <div>Informasi Mesin: <a href={infoApiUrl} target="_blank" rel="noreferrer">{infoApiUrl}</a></div>
            <div style={{ marginTop: 4 }}>
              <Link href={`/lapor?slug=${f.slug}`} style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>
                ⚑ Laporkan berkas jika melanggar ketentuan layanan
              </Link>
            </div>
          </div>
        </div>

        <div className="floating-hand hand-right" aria-hidden="true">
          <img src="/assets/hand_right_isolated.png" alt="" />
        </div>
      </div>
    </section>
  );
}
