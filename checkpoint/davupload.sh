#!/bin/sh

usage () { echo "$0 <src> <cadaver-args>*" >/dev/stderr; }
error () { echo "$1" >/dev/stderr; usage; exit 1; }

test $# '<' 3 || \
    error "Source and cadaver arguments expected!";

src="$1"; shift;
test -r "$src" || \
    error "Source argument should be a readable file or directory!";

cd "$(dirname "$src")";
src="$(basename "$src")";
root="$(pwd)";
rc="$(mktemp -t davcopy)";

{
    find "$src" -type d | xargs -I{} echo 'mkcol '{}
    find "$src" -type f \
    -exec echo 'cd '$(basename {}) \; \
    -exec echo 'lcd '$(basename {}) \; \
    -exec echo 'mput '{} \; \
    -exec echo 'cd -' \; \
    -exec echo 'lcd '"$root" \;
    echo "quit";
} > "$rc";

cadaver -r "$rc" "$@";
rm -f "$rc";