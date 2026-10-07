#!/usr/bin/env bash
# kyofile keep-alive: sentuh semua project Supabase tiap 2-3 hari agar tidak auto-pause (free tier 7 hari).
# - Management API: cek status tiap project (paused -> laporkan UNPAUSE_NEEDED)
# - PostgREST: SELECT ringan ke tabel backends (meta)
# - Storage: list bucket uploads per pool (bukti aktivitas)
# Env yang dibaca: ~/.config/kyofile/pools.env (dibuat otomatis dari .env.local saat deploy)
#   KYO_META_URL, KYO_META_SR, KYO_POOLS (json array), KYO_TOK_acc1..5 (management tokens, chmod 600)
set -u
ENV_FILE="${KYOFILE_ENV:-$HOME/.config/kyofile/pools.env}"
[ -f "$ENV_FILE" ] && . "$ENV_FILE"
need() { [ -n "${1:-}" ] || { echo "SKIP keepalive: $2 belum diset"; exit 0; }; }
need "${KYO_META_URL:-}" KYO_META_URL
need "${KYO_META_SR:-}" KYO_META_SR
[ -f "$HOME/.config/kyofile/tok_acc1" ] || { echo "SKIP keepalive: tok_acc1 belum ada"; exit 0; }
META="$KYO_META_URL"; SR="$KYO_META_SR"
echo "== $(date -u +%FT%TZ) kyofile keepalive =="
echo "-- meta postgrest:"
curl -s -m 20 -H "apikey: $SR" -H "Authorization: Bearer $SR" "$META/rest/v1/backends?select=id,used_bytes" | head -c 400; echo
echo "-- per-pool storage ping:"
python3 - "$KYO_POOLS" <<'PY'
import json, sys, urllib.request
try:
    pools = json.loads(sys.argv[1] if len(sys.argv) > 1 else "[]")
except Exception as e:
    print("pools parse fail", e); sys.exit(0)
for p in pools:
    try:
        r = urllib.request.Request(p["supabase_url"] + "/storage/v1/bucket/uploads",
            headers={"apikey": p["service_key"], "Authorization": "Bearer " + p["service_key"]})
        x = urllib.request.urlopen(r, timeout=20)
        print(p["id"], "storage:OK")
    except Exception as e:
        print(p["id"], "storage:FAIL", str(e)[:120])
PY
echo "-- management status:"
i=1
for n in 1 2 3 4 5 6 7 8 9 10; do
  f="$HOME/.config/kyofile/tok_acc$n"
  [ -f "$f" ] || continue
  T=$(cat "$f")
  echo "acc$i: $(curl -s -m 20 -H "Authorization: Bearer $T" https://api.supabase.com/v1/projects | python3 -c "import sys,json; d=json.load(sys.stdin); print('; '.join(p.get('name','?')+':'+p.get('status','?') for p in d))")"
  i=$((i+1))
done
echo "keepalive DONE"
