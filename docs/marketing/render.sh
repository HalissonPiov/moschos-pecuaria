#!/usr/bin/env bash
# Exporta os painéis de capa.html para img/*.png (1600x900) com Chrome/Chromium headless.
# Uso: CHROME=/caminho/do/chrome ./render.sh
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME:-$(command -v google-chrome || command -v chromium || command -v chromium-browser)}"
# id do painel:nome do arquivo, na ordem em que aparecem no README
paineis=(p1:capa p2:problema p7:investimento p3:painel p4:custos p5:mercado p6:passos)
rm -f img/*.png
for i in "${!paineis[@]}"; do
  id="${paineis[$i]%%:*}"; nome="${paineis[$i]#*:}"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1600,900 \
    --virtual-time-budget=6000 --allow-file-access-from-files \
    --screenshot="$PWD/img/0$((i + 1))-${nome}.png" "file://$PWD/capa.html#${id}" 2>/dev/null
done
ls -la img
