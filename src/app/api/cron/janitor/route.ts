import {
  meta, poolBackends, backendClient, json, INACTIVE_DAYS, NO_DOWNLOAD_DAYS,
} from '@/lib/server';
import type { FileRow, PoolConfig } from '@/lib/server';

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET || 'dev-cron'}`) {
    return json({ error: 'unauthorized' }, 401);
  }
  const db = meta();
  const now = new Date();
  const inactiveCut = new Date(now.getTime() - INACTIVE_DAYS * 86400e3);
  const noDlCut = new Date(now.getTime() - NO_DOWNLOAD_DAYS * 86400e3);

  const { data: fileRows } = await db
    .from('files')
    .select('slug,backend,path,size_bytes,expires_at,last_access_at,download_count,created_at')
    .limit(1000);
  const files = ((fileRows ?? []) as FileRow[]);
  const victims = files.filter(
    (f) =>
      (f.expires_at && new Date(f.expires_at) <= now) ||
      (!f.expires_at && new Date(f.last_access_at) <= inactiveCut) ||
      (!f.expires_at && f.download_count === 0 && new Date(f.created_at) <= noDlCut),
  );
  const cfgMap = new Map<string, PoolConfig>();
  for (const b of poolBackends()) cfgMap.set(b.id, b);
  let deleted = 0;
  let freed = 0;
  for (const v of victims) {
    const c = cfgMap.get(v.backend);
    if (c) {
      try {
        await backendClient(c.supabase_url, c.service_key).storage.from('uploads').remove([v.path]);
      } catch {
        /* best-effort: lanjut hapus metadata walau object gagal dihapus */
      }
    }
    await db.from('files').delete().eq('slug', v.slug);
    const { data: be } = await db.from('backends').select('used_bytes').eq('id', v.backend).single();
    const used = (be as { used_bytes?: number } | null)?.used_bytes ?? 0;
    await db.from('backends').update({ used_bytes: Math.max(0, used - v.size_bytes) }).eq('id', v.backend);
    deleted += 1;
    freed += v.size_bytes;
  }
  return json({ deleted, freed_bytes: freed, checked: files.length });
}
