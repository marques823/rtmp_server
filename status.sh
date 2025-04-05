#!/bin/bash

echo "=== Status do Servidor RTMP ==="
echo ""

# Verificar se o processo está rodando
PID=$(pgrep -f "node app.js")
if [ -z "$PID" ]; then
  echo "Servidor RTMP: NÃO ESTÁ RODANDO"
else
  echo "Servidor RTMP: RODANDO (PID: $PID)"
fi

# Verificar portas em uso
echo ""
echo "=== Portas em Uso ==="
echo "RTMP (1936):"
ss -tuln | grep 1936 || echo "  Porta não está em uso"

echo ""
echo "HTTP (8090):"
ss -tuln | grep 8090 || echo "  Porta não está em uso"

# Verificar streams ativos
echo ""
echo "=== Streams Ativos ==="
echo "Últimas conexões de câmeras (publishers):"
grep "start push" logs/output.log | tail -n 5

echo ""
echo "Últimos acessos aos streams (consumers):"
grep "start play" logs/output.log | tail -n 5

# Verificar espaço em disco
echo ""
echo "=== Espaço em Disco ==="
df -h . | grep -v "Filesystem"

# Verificar logs recentes
echo ""
echo "=== Últimas Entradas de Log ==="
tail -n 10 logs/output.log 