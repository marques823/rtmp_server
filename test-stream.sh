#!/bin/bash

# Script para enviar um stream de teste para o servidor RTMP
# Autor: Tiago
# Data: Abril de 2025

if [ -z "$1" ]; then
    CAMERA_NAME="test"
else
    CAMERA_NAME="$1"
fi

echo "=== Enviando stream de teste para o servidor RTMP ==="
echo "Stream Key: $CAMERA_NAME"
echo "URL RTMP: rtmp://localhost:1936/live/$CAMERA_NAME"
echo
echo "O stream será enviado em background. Para encerrá-lo, execute:"
echo "pkill -f ffmpeg"
echo
echo "Para visualizar o stream, acesse:"
echo "http://localhost:9001/player.html e use a Stream Key '$CAMERA_NAME'"
echo
echo "Iniciando transmissão..."

# Executa o FFmpeg em background
ffmpeg -f lavfi -i testsrc=size=640x480:rate=30 -f lavfi -i sine=frequency=1000:sample_rate=44100 -c:v libx264 -c:a aac -f flv rtmp://localhost:1936/live/$CAMERA_NAME -nostdin -nostats -v quiet &

# Salva o PID para poder encerrar depois
echo $! > test-stream.pid
echo "Stream de teste iniciado com PID $(cat test-stream.pid)"
echo "Para encerrar, execute: ./stop-test-stream.sh" 