#!/bin/bash
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "This Mac needs Node.js 22 before the site can open."
  echo "Install it from https://nodejs.org, then double-click Start Brightpaths again."
  echo ""
  read -r -p "Press Enter to close."
  exit 1
fi
exec node scripts/start-portal.mjs
