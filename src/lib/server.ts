import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ---- Config ----
export const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
export const INACTIVE_DAYS = parseInt(process.env.INACTIVE_DAYS || '90', 10);
export const NO_DOWNLOAD_DAYS = parseInt(process.env.NO_DOWNLOAD_DAYS || '30', 10);
export const IP_SALT = process.env.IP_SALT || 'kyofile-local-salt-change-me';
export const TICKET_SECRET = process.env.TICKET_SECRET || 'kyofile-dev-ticket-secret-change-me';
export const TICKET_TTL_SEC = 15 * 60;

export const BLOCKED_EXT = new Set([
  'exe', 'msi', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'vba', 'jar', 'apk',
  'com', 'scr', 'pif', 'hta', 'wsf', 'cpl', 'gadget', 'msc',
  'php', 'phtml', 'phar', 'jsp', 'jspx', 'asp', 'aspx', 'py', 'pl', 'rb', 'cgi',
]);

// True jika ekstensi AKHIR atau ekstensi GANDA mana pun diblokir
// (mis. shell.php.txt -> ['shell','php','txt'] mengandung 'php' -> blokir).
export function blockedExtension(filename: string): string | null {
  const parts = filename.toLowerCase().split('.');
  if (parts.length < 2) return null;
  for (const p of parts.slice(1)) {
    if (p && BLOCKED_EXT.has(p)) return p;
  }
  return null;
}

// Sanitasi nama file: buang path separator, kontrol char, titik leading; max 255.
export function sanitizeFilename(raw: string): string {
  if (!raw) return '';
  let n = raw.replace(/[\\/\0]/g, '').replace(/[\x00-\x1f\x7f]/g, '').trim();
  n = n.replace(/^\.+/, '');
  if (n.length > 255) n = n.slice(0, 255);
  return n;
}

// Honeypot + timestamp antibot (lenien: field absen = client API lama -> lolos,
// tapi kalau field ada dan aneh -> tolak).
export function antibotCheck(body: { website?: unknown; ts?: unknown }): string | null {
  if (typeof body.website === 'string' && body.website.length > 0) return 'bot_detected';
  if (body.ts !== undefined) {
    const ts = typeof body.ts === 'number' ? body.ts : 0;
    if (!ts) return 'bot_detected';
    const age = Date.now() - ts;
    if (age < 1200) return 'too_fast';
    if (age > 2 * 3600e3) return 'stale_form';
  }
  return null;
}

export const RAW_TEXT_EXT = new Set(['html', 'htm', 'xhtml', 'svg']);

// ---- Supabase admin clients ----
let metaClient: SupabaseClient | null = null;

export function meta(): SupabaseClient {
  if (!metaClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE belum diset');
    metaClient = createClient(url, key, { auth: { persistSession: false } });
  }
  return metaClient;
}

export interface PoolBackend {
  id: string;
  supabase_url: string;
  anon_key: string;
  quota_bytes: number;
  used_bytes: number;
  enabled: boolean;
}

export interface PoolConfig {
  id: string;
  supabase_url: string;
  anon_key: string;
  service_key: string;
  quota_bytes: number;
}

// SUPABASE_POOL = JSON array: [{id, supabase_url, anon_key, service_key, quota_bytes}]
export function poolBackends(): PoolConfig[] {
  const raw = process.env.SUPABASE_POOL || '[]';
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function backendClient(serviceUrl: string, serviceKey: string): SupabaseClient {
  return createClient(serviceUrl, serviceKey, { auth: { persistSession: false } });
}

// ---- Helpers ----
export function ipHash(ip: string): string {
  return crypto.createHash('sha256').update(`${IP_SALT}:${ip}`).digest('hex').slice(0, 32);
}

export function clientIp(req: Request): string {
  const h = (name: string) => req.headers.get(name) || '';
  // x-real-ip ditulis ulang oleh edge (Vercel/CF) -> tidak bisa dipalsukan client.
  // x-forwarded-for entri pertamanya BISA spoof, jadi hanya fallback.
  const real = h('x-real-ip').trim();
  if (real) return real;
  const fwd = h('x-forwarded-for').split(',')[0].trim();
  return fwd || 'unknown';
}

export function randomSlug(len = 7): string {
  return crypto.randomBytes(12).toString('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, len) || `f${Date.now().toString(36)}`;
}

const b64url = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function signTicket(payload: Record<string, unknown>): string {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(crypto.createHmac('sha256', TICKET_SECRET).update(body).digest());
  return `${body}.${sig}`;
}

export interface TicketPayload {
  slug: string;
  ext: string;
  name?: string;
  size: number;
  mimeType: string;
  sha256: string;
  expiry: string;
  backend: string;
  path: string;
  ip_hash: string;
  exp: number;
}

export interface FileRow {
  slug: string;
  ext: string;
  original_name?: string;
  size_bytes: number;
  mime_type: string;
  sha256: string;
  expires_at: string | null;
  last_access_at: string;
  download_count: number;
  backend: string;
  path: string;
  ip_hash: string;
  created_at: string;
}

export function formatBytes(n: number): string {
  if (!n || n <= 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / 1024 ** i).toFixed(2)} ${u[i]}`;
}

export interface BackendRow {
  id: string;
  supabase_url: string;
  anon_key: string;
  quota_bytes: number;
  used_bytes: number;
  enabled: boolean;
}

export function verifyTicket(ticket: string): TicketPayload | null {
  try {
    if (!ticket || typeof ticket !== 'string' || ticket.length > 2048) return null;
    const parts = ticket.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    if (!body || !sig) return null;
    const expect = b64url(crypto.createHmac('sha256', TICKET_SECRET).update(body).digest());
    const a = Buffer.from(sig);
    const b = Buffer.from(expect);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()) as Partial<TicketPayload>;
    if (!data.exp || !data.slug || !data.backend) return null;
    if (Date.now() / 1000 > data.exp) return null;
    return data as TicketPayload;
  } catch {
    return null;
  }
}

export function expiryToDate(expiry: string): Date | null {
  if (!expiry || expiry === 'never') return null;
  const m = expiry.match(/^(\d+)(h|d)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const ms = m[2] === 'h' ? n * 3600e3 : n * 86400e3;
  return new Date(Date.now() + ms);
}

// ---- Simple in-memory rate limiter (per-instance; use Redis/Upstash in prod) ----
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true };
  }
  if (b.count >= limit) return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  b.count += 1;
  return { ok: true };
}

export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  });
}
