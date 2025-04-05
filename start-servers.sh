#!/bin/bash

# Script para iniciar todos os servidores RTMP, Estático e API
# Autor: Tiago
# Data: Abril de 2025

# Definir diretório base
BASE_DIR=$(dirname "$0")
cd "$BASE_DIR"

# Criar diretório de logs se não existir
mkdir -p logs

echo "=== Iniciando servidores RTMP CFTV ==="
echo "$(date '+%Y-%m-%d %H:%M:%S') - Iniciando servidores" >> logs/startup.log

# Verificar se os servidores já estão em execução
if pgrep -f "node app.js" > /dev/null; then
    echo "O servidor RTMP já está em execução"
else
    echo "Iniciando servidor RTMP..."
    node app.js > app.log 2>&1 &
    echo $! > app.pid
    echo "Servidor RTMP iniciado com PID $(cat app.pid)"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Servidor RTMP iniciado com PID $(cat app.pid)" >> logs/startup.log
fi

if pgrep -f "node static_server.js" > /dev/null; then
    echo "O servidor Estático já está em execução"
else
    echo "Iniciando servidor Estático..."
    node static_server.js > static.log 2>&1 &
    echo $! > static.pid
    echo "Servidor Estático iniciado com PID $(cat static.pid)"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Servidor Estático iniciado com PID $(cat static.pid)" >> logs/startup.log
fi

if pgrep -f "node api/standalone.js" > /dev/null; then
    echo "O servidor API já está em execução"
else
    echo "Iniciando servidor API..."
    node api/standalone.js > api.log 2>&1 &
    echo $! > api.pid
    echo "Servidor API iniciado com PID $(cat api.pid)"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Servidor API iniciado com PID $(cat api.pid)" >> logs/startup.log
fi

echo "=== Todos os servidores iniciados ==="
echo "Portas em uso:"
echo "- RTMP: 1936"
echo "- HTTP Stream: 8095"
echo "- Web Interface: 9001"
echo "- API: 8096"
echo
echo "URLs disponíveis:"
echo "- Interface web: http://localhost:9001"
echo "- Player: http://localhost:9001/player.html"
echo "- Multi-câmeras: http://localhost:9001/multi-player.html"
echo "- Gerenciador de gravações: http://localhost:9001/player-recordings.html"
echo "- API Status: http://localhost:8096/api/status"
echo
echo "Para verificar os logs, use:"
echo "- RTMP: tail -f app.log"
echo "- Estático: tail -f static.log"
echo "- API: tail -f api.log"
echo
echo "Para encerrar os servidores, execute: ./stop-servers.sh" 