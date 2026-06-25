#!/bin/bash
# Inicia API server em background e Vite na frente
PORT=8099 pnpm --filter @workspace/api-server run dev &
API_PID=$!

# Aguarda a API subir
echo "Aguardando API Server na porta 8099..."
until curl -s http://localhost:8099 > /dev/null 2>&1; do
  sleep 1
done
echo "API Server pronto."

# Inicia Vite em foreground (processo principal do workflow)
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/zenkatu run dev

# Se Vite sair, mata a API também
kill $API_PID 2>/dev/null
