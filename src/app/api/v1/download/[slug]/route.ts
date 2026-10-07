import { meta, json, poolBackends, backendClient } from '@/lib/server';
import type { FileRow, PoolConfig } from '@/lib/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const raw = params.slug || '';
  const slug = raw.split('.')[0];
  if (!slug) return json({ error: 'missing_slug' }, 400);

  const db = meta();
  const { data } = await db.from('files').select('*').eq('slug', slug).maybeSingle();
  const f = data as FileRow | null;
  if (!f) return json({ error: 'not_found' }, 404);
  if (f.expires_at && new Date(f.expires_at) <= new Date()) {
    return json({ error: 'expired' }, 410);
  }

  const poolMap = new Map<string, PoolConfig>();
  for (const b of poolBackends()) poolMap.set(b.id, b);
  const cfg = poolMap.get(f.backend);
  if (!cfg) return json({ error: 'backend_unavailable' }, 502);

  const svc = backendClient(cfg.supabase_url, cfg.service_key);
  const downloadName = f.original_name || f.path;
  const { data: signed, error } = await svc.storage
    .from('uploads')
    .createSignedUrl(f.path, 60, { download: downloadName });

  if (error || !signed?.signedUrl) {
    return json({ error: 'download_failed' }, 502);
  }

  // update counter & access time
  await db
    .from('files')
    .update({
      last_access_at: new Date().toISOString(),
      download_count: (f.download_count || 0) + 1,
    })
    .eq('slug', slug);

  return Response.redirect(signed.signedUrl, 302);
}
