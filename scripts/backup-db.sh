#!/usr/bin/env bash
# Backup Nexo SQLite DB (DATABASE_URL=file:…). Requires sqlite3 on PATH.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set (env or .env)" >&2
  exit 1
fi

if [[ "${DATABASE_URL}" != file:* ]]; then
  echo "Only file: SQLite URLs are supported (got: ${DATABASE_URL})" >&2
  exit 1
fi

DB_REL="${DATABASE_URL#file:}"
if [[ "$DB_REL" = /* ]]; then
  DB_PATH="$DB_REL"
else
  DB_PATH="$ROOT/prisma/$DB_REL"
fi

if [[ ! -f "$DB_PATH" ]]; then
  echo "Database file not found: $DB_PATH" >&2
  exit 1
fi

BACKUP_DIR="${1:-$ROOT/backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/nexo-$STAMP.db"

sqlite3 "$DB_PATH" ".backup '$OUT'"
echo "Backup written to $OUT"
