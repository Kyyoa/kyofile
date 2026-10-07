import {
  meta, poolBackends, backendClient, json, clientIp, rateLimit,
  verifyTicket, expiryToDate,
} from '@/lib/server';
import type { PoolConfig } from '@/lib/server';

interface FinalizeBody {
  ticket?: unknown;
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`fin:${ip}`, 8, 3_600_000);
  if (!rl.ok) return json({ error: 'rate_limited' }, 429);

  let raw: FinalizeBody;
  try {
    raw = (await req.json()) as FinalizeBody;
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const ticket = typeof raw.ticket === 'string' ? raw.ticket : '';
  const t = verifyTicket(ticket);
  if (!t) return json({ error: 'bad_ticket' }, 400);

  const poolCfg = new Map<string, PoolConfig>();
  for (const b of poolBackends()) poolCfg.set(b.id, b);
  const cfg = poolCfg.get(t.backend);
  if (!cfg) return json({ error: 'bad_backend' }, 400);
  const svc = backendClient(cfg.supabase_url, cfg.service_key);
  const db = meta();
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const expires_at = expiryToDate(t.expiry);
  // verify-exists + baca used_bytes jalan paralel (insert tetap sesudah verify biar tidak orphan)
  const [listedRes, beRes] = await Promise.all([
    svc.storage.from('uploads').list('', { search: t.slug }),
    db.from('backends').select('used_bytes').eq('id', t.backend).single(),
  ]);
  const listed = listedRes.data as { name?: string }[] | null;
  const found = (listed ?? []).some((o) => o?.name === t.path);
  if (!found) return json({ error: 'upload_not_found' }, 400);
  const { error } = await db.from('files').insert({
    slug: t.slug, ext: t.ext || '', original_name: t.name || `${t.slug}${t.ext ? '.' + t.ext : ''}`,
    size_bytes: t.size, mime_type: t.mimeType, sha256: t.sha256, expires_at,
    backend: t.backend, path: t.path, ip_hash: t.ip_hash,
  });
  if (error) return json({ error: 'db_insert_failed', detail: error.message }, 500);
  const used = ((beRes.data as { used_bytes?: number } | null)?.used_bytes) ?? 0;
  await db.from('backends').update({ used_bytes: used + t.size }).eq('id', t.backend);
  return json({ url: `${site}/f/${t.slug}${t.ext ? '.' + t.ext : ''}`, slug: t.slug, size: t.size, expires_at });
}
