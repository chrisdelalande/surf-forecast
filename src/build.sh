#!/bin/sh
# Génère ../index.html à partir des sources (CSS/HTML : head3.html, JS : script3.js + live_loader.js).
set -e
cd "$(dirname "$0")"
python3 build_live.py      # assemble head3.html + script3.js + live_loader.js -> app_live.html
python3 gen_live.py        # injecte les données du rejeu -> surf-live.html
cp surf-live.html ../index.html
rm -f app_live.html surf-live.html
echo "index.html généré"
