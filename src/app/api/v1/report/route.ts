import { meta, json, clientIp, rateLimit } from '@/lib/server';

interface ReportBody {
  slugOrUrl?: unknown;
  reason?: unknown;
}

export async function POST(req: Request) {
  const rl = rateLimit(`rep:${clientIp(req)}`, 5, 3_600_000);
  if (!rl.ok) return json({ error: 'rate_limited' }, 429);

  let raw: ReportBody;
  try {
    raw = (await req.json()) as ReportBody;
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const input = typeof raw.slugOrUrl === 'string' ? raw.slugOrUrl : '';
  const slug = input.split('/f/').pop()?.split('.')[0]?.split('?')[0] || input;
  if (!slug) return json({ error: 'missing_slug' }, 400);
  const reason = typeof raw.reason === 'string' ? raw.reason.slice(0, 500) : '';
  const { error } = await meta().from('reports').insert({ slug, reason });
  if (error) return json({ error: 'db_failed' }, 500);
  return json({ ok: true });
}
