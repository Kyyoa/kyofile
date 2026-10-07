import UploadCard from './upload-card';

export default function Home() {
  return (
    <section className="hero-stage">
      <div className="bg-radar" aria-hidden="true"><img src="/assets/radar_reticle.svg" alt="" /></div>
      <div className="bg-cloud-left" aria-hidden="true"><img src="/assets/cloud_accents.svg" alt="" /></div>
      <div className="bg-cloud-right" aria-hidden="true"><img src="/assets/cloud_accents.svg" alt="" /></div>
      <div className="angel-backdrop" aria-hidden="true"><img src="/assets/angel_isolated.png" alt="" /></div>
      <div className="hero-solo-bird" aria-hidden="true"><img src="/assets/poster_bird.png" alt="" /></div>

      <div className="hero-content">
        <p className="hero-pretitle">✦ &nbsp; LAYANAN TITIP & BERBAGI BERKAS &nbsp; ✦</p>
        <h1 className="hero-title">kyofile</h1>
        <p className="hero-subtitle">Pilih berkas, dapatkan tautan instan, lalu bagikan. Tanpa akun, tanpa kuki pelacak.</p>
        <div style={{ margin: '14px auto 0', width: 50, height: 1, background: 'var(--line-strong)', opacity: 0.5 }}></div>
      </div>

      <UploadCard />
    </section>
  );
}
