#!/bin/bash

# Script para iniciar o servidor RTMP simplificado
# Autor: Tiago
# Data: Abril de 2025

# Definir diretório base
BASE_DIR=$(dirname "$0")
cd "$BASE_DIR"

# Criar diretório de logs se não existir
mkdir -p logs

echo "=== Iniciando servidor RTMP para ZoneMinder ==="
echo "$(date '+%Y-%m-%d %H:%M:%S') - Iniciando servidor RTMP" >> logs/rtmp.log

# Verificar se o servidor já está em execução
if pgrep -f "node rtmp-core.js" > /dev/null; then
    echo "O servidor RTMP já está em execução"
else
    echo "Iniciando servidor RTMP..."
    node rtmp-core.js > logs/rtmp.log 2>&1 &
    echo $! > rtmp.pid
    echo "Servidor RTMP iniciado com PID $(cat rtmp.pid)"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Servidor RTMP iniciado com PID $(cat rtmp.pid)" >> logs/rtmp.log
fi

echo "=== Servidor RTMP iniciado ==="
echo "Portas em uso:"
echo "- RTMP: 1936"
echo "- HTTP Stream: 8090"
echo
echo "URLs disponíveis:"
echo "- HTTP-FLV: http://localhost:8090/live/[stream-key].flv"
echo "- HLS: http://localhost:8090/live/[stream-key]/index.m3u8"
echo
echo "Para enviar um stream de teste:"
echo "ffmpeg -f lavfi -i testsrc=size=640x480:rate=30 -f lavfi -i sine=frequency=1000:sample_rate=44100 -c:v libx264 -c:a aac -f flv rtmp://localhost:1936/live/test"
echo
echo "Para visualizar os logs, use: tail -f logs/rtmp.log"
echo
echo "Para encerrar o servidor, execute: ./stop-rtmp.sh" 