import {
  meta, poolBackends, backendClient, ipHash, clientIp, randomSlug,
  signTicket, expiryToDate, rateLimit, json,
  MAX_FILE_BYTES, BLOCKED_EXT, TICKET_TTL_SEC,
} from '@/lib/server';
import type { BackendRow, FileRow, PoolConfig } from '@/lib/server';

interface InitBody {
  filename?: unknown;
  size?: unknown;
  mimeType?: unknown;
  expiry?: unknown;
  contentHash?: unknown;
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`init:${ip}`, 3, 60_000);
  if (!rl.ok) return json({ error: 'rate_limited', retry_after: rl.retryAfter }, 429);

  let raw: InitBody;
  try {
    raw = (await req.json()) as InitBody;
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const filename = typeof raw.filename === 'string' ? raw.filename : '';
  const size = typeof raw.size === 'number' ? raw.size : 0;
  const mimeType = typeof raw.mimeType === 'string' ? raw.mimeType : '';
  const expiry = typeof raw.expiry === 'string' ? raw.expiry : '';
  const contentHash = typeof raw.contentHash === 'string' ? raw.contentHash : '';
  if (!filename || !size || !contentHash) return json({ error: 'missing_fields' }, 400);
  if (size <= 0 || size > MAX_FILE_BYTES) return json({ error: 'size_limit_50mb' }, 400);
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (BLOCKED_EXT.has(ext)) return json({ error: 'blocked_executable' }, 400);
  if (!['1h', '1d', '7d', '30d', 'never'].includes(expiry)) return json({ error: 'bad_expiry' }, 400);

  const db = meta();
  // 3 bacaan DB jalan paralel (bukan serial) — hemat ~2 roundtrip
  const [banRes, sameRes, beRes] = await Promise.all([
    db.from('bans').select('until').eq('ip_hash', ipHash(ip)).maybeSingle(),
    db.from('files').select('slug,ext,expires_at').eq('sha256', contentHash).limit(5),
    db.from('backends').select('id,quota_bytes,used_bytes').eq('enabled', true),
  ]);
  const banRow = banRes.data as { until?: string | null } | null;
  const banUntil = banRow?.until;
  if (banRow && (!banUntil || new Date(banUntil) > new Date())) return json({ error: 'banned' }, 403);

  // dedup: hash already stored & still live?
  const sameRows = sameRes.data;
  const now = new Date();
  const same = ((sameRows ?? []) as Pick<FileRow, 'slug' | 'ext' | 'expires_at'>[]);
  const live = same.find((f) => !f.expires_at || new Date(f.expires_at) > now);
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  if (live) return json({ deduped: true, slug: live.slug, url: `${site}/f/${live.slug}${live.ext ? '.' + live.ext : ''}` });

  // pick backend with most headroom
  const { data: backendRows } = beRes;
  const poolCfg = new Map<string, PoolConfig>();
  for (const b of poolBackends()) poolCfg.set(b.id, b);
  const rows = ((backendRows ?? []) as BackendRow[]);
  const cands = rows
    .filter((r) => poolCfg.has(r.id) && r.quota_bytes - r.used_bytes > size)
    .sort((a, b) => b.quota_bytes - b.used_bytes - (a.quota_bytes - a.used_bytes));
  if (!cands.length) return json({ error: 'insufficient_storage', message: 'semua storage backend penuh' }, 507);
  const chosen = cands[0];
  const cfg = poolCfg.get(chosen.id);
  if (!cfg) return json({ error: 'backend_unavailable' }, 502);

  const slug = randomSlug(7);
  const path = `${slug}${ext ? '.' + ext : ''}`;
  const svc = backendClient(cfg.supabase_url, cfg.service_key);
  const { data: signed, error } = await svc.storage.from('uploads').createSignedUploadUrl(path);
  if (error || !signed) return json({ error: 'backend_unavailable' }, 502);

  const ticket = signTicket({
    slug, ext, name: filename, size, mimeType: mimeType || 'application/octet-stream',
    sha256: contentHash, expiry, backend: chosen.id, path,
    ip_hash: ipHash(ip), exp: Math.floor(Date.now() / 1000) + TICKET_TTL_SEC,
  });
  return json({
    slug, ticket, expires_at: expiryToDate(expiry),
    upload: { signedUrl: signed.signedUrl, token: signed.token },
  });
}
