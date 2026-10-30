#!/usr/bin/env bash
# Carrega as variáveis declaradas em [userenv.shared] do .replit e executa o
# comando informado. No Replit essas variáveis são injetadas em runtime; fora
# dele é preciso injetá-las manualmente (Firebase, banco e VAPID).
# Os valores nunca são copiados para outro arquivo: são lidos aqui e exportados
# apenas na árvore de processos do comando.
set -euo pipefail

cd "$(dirname "$0")/.."

eval "$(node -e '
const fs = require("fs");
const text = fs.readFileSync(".replit", "utf8");
const section = text.match(/\[userenv\.shared\]\n([\s\S]*?)(?=\n\[|$)/);
const lines = [];
for (const raw of section ? section[1].split("\n") : []) {
  const match = raw.trim().match(/^([A-Za-z0-9_]+)\s*=\s*"(.*)"$/);
  if (!match) continue;
  if (match[2].includes("${")) continue; // placeholder não resolvido
  lines.push("export " + match[1] + "=\"" + match[2].replace(/"/g, "\\\"") + "\"");
}
process.stdout.write(lines.join("\n"));
')"

exec "$@"
