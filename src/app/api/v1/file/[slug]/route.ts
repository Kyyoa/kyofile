import { meta, json, formatBytes } from '@/lib/server';
import type { FileRow } from '@/lib/server';

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

  const isExpired = !!(f.expires_at && new Date(f.expires_at) <= new Date());
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://kyofile.galaci.my.id';
  const fileName = f.original_name || `${f.slug}${f.ext ? '.' + f.ext : ''}`;

  return json({
    service: 'kyofile',
    type: 'file_information',
    url: `${site}/f/${f.slug}${f.ext ? '.' + f.ext : ''}`,
    download_url: `${site}/api/v1/download/${f.slug}`,
    name: fileName,
    extension: f.ext || '',
    mime_type: f.mime_type,
    size_bytes: f.size_bytes,
    size: formatBytes(f.size_bytes),
    uploaded_at: f.created_at,
    expires_at: f.expires_at,
    requests_processed: f.download_count,
    content_sha256: f.sha256,
    status: isExpired ? 'expired' : 'active',
    information_url: `${site}/api/v1/file/${f.slug}`,
  });
}
