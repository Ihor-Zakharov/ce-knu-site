#!/bin/sh
# Оновлення сайту кафедри на сервері КНУ з GitHub Releases.
# Сервер сам забирає готову збірку (pull): нам не потрібен доступ до сервера, серверу — жодних ключів.
#
# Встановлення (один раз, від імені власника каталогу сайту):
#   install -m 755 update-site.sh /usr/local/bin/ce-site-update
#   crontab -e  →  */15 * * * * REPO=owner/repo ROOT=/var/www/ce.knu.ua /usr/local/bin/ce-site-update
#
# Режими:
#   MODE=symlink (типово) — ROOT/releases/<версія>/ + ROOT/current → остання версія; DocumentRoot = ROOT/current.
#                           Перемикання атомарне. Відкат — ce-site-update rollback: попередня версія
#                           закріплюється (файл ROOT/.pinned), доки не виконати ce-site-update unpin.
#   MODE=rsync            — якщо DocumentRoot змінити не можна: вміст копіюється в DOCROOT з видаленням зайвого.
set -eu

REPO="${REPO:?вкажіть REPO=власник/репозиторій}"
ROOT="${ROOT:?вкажіть ROOT — каталог сайту}"
MODE="${MODE:-symlink}"
DOCROOT="${DOCROOT:-$ROOT/public_html}"
KEEP="${KEEP:-5}"
URL="${URL:-https://github.com/$REPO/releases/latest/download}"   # URL= — для перевірки з дзеркала
log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }

mkdir -p "$ROOT/releases"

if [ "${1:-}" = unpin ]; then rm -f "$ROOT/.pinned"; log "автооновлення знову ввімкнено"; exit 0; fi
if [ "${1:-}" = rollback ]; then
  prev=$(ls -1dt "$ROOT"/releases/*/ 2>/dev/null | sed -n 2p)
  [ -n "$prev" ] || { log "немає попередньої версії"; exit 1; }
  ln -sfn "$prev" "$ROOT/current.new" && mv -Tf "$ROOT/current.new" "$ROOT/current"
  touch "$ROOT/.pinned"
  log "відкат до $(basename "$prev"); автооновлення призупинено (ce-site-update unpin)"; exit 0
fi
[ -f "$ROOT/.pinned" ] && exit 0

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
curl -fsSL --retry 3 "$URL/ce-knu-site.sha256" -o "$tmp/sum"
id=$(cut -c1-16 "$tmp/sum")
if [ -d "$ROOT/releases/$id" ] && [ "$MODE" = symlink ] && [ "$(readlink "$ROOT/current" 2>/dev/null)" = "$ROOT/releases/$id" ]; then exit 0; fi
[ "$MODE" = rsync ] && [ -f "$ROOT/.installed" ] && [ "$(cat "$ROOT/.installed")" = "$id" ] && exit 0

curl -fsSL --retry 3 "$URL/ce-knu-site.tar.gz" -o "$tmp/ce-knu-site.tar.gz"
(cd "$tmp" && sha256sum -c sum >/dev/null) || { log "контрольна сума не збігається — оновлення скасовано"; exit 1; }

rm -rf "$ROOT/releases/$id.part" && mkdir -p "$ROOT/releases/$id.part"
tar -xzf "$tmp/ce-knu-site.tar.gz" -C "$ROOT/releases/$id.part"
[ -f "$ROOT/releases/$id.part/index.html" ] || { log "в архіві немає index.html"; exit 1; }
rm -rf "$ROOT/releases/$id" && mv "$ROOT/releases/$id.part" "$ROOT/releases/$id"

if [ "$MODE" = rsync ]; then
  mkdir -p "$DOCROOT"
  rsync -a --delete --delay-updates "$ROOT/releases/$id/" "$DOCROOT/"
  echo "$id" > "$ROOT/.installed"
else
  ln -sfn "$ROOT/releases/$id" "$ROOT/current.new" && mv -Tf "$ROOT/current.new" "$ROOT/current"
fi
log "встановлено версію $id"

# лишаємо KEEP останніх версій для відкату
ls -1dt "$ROOT"/releases/*/ | tail -n +"$((KEEP + 1))" | while read -r d; do rm -rf "$d"; done
