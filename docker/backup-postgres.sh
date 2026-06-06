#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"

mkdir -p "$BACKUP_DIR"
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/lostark-party-$TIMESTAMP.sql"
find "$BACKUP_DIR" -type f -name 'lostark-party-*.sql' -mtime +"$RETENTION_DAYS" -delete
