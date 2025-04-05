#!/bin/bash

# Script para testar a integração com o ZoneMinder
# Autor: Tiago
# Data: Abril de 2025

echo "=== Teste de integração RTMP Server com ZoneMinder ==="

# Verificar se o servidor RTMP está em execução
if ! pgrep -f "node rtmp-core.js" > /dev/null; then
    echo "ERRO: O servidor RTMP não está em execução!"
    echo "Por favor, inicie-o primeiro com: ./start-rtmp.sh"
    exit 1
fi

echo "O servidor RTMP está em execução."

# Verificar se o FFmpeg está instalado
if ! command -v ffmpeg &> /dev/null; then
    echo "ERRO: FFmpeg não encontrado!"
    echo "Por favor, instale o FFmpeg: sudo apt update && sudo apt install -y ffmpeg"
    exit 1
fi

echo "FFmpeg encontrado, vamos iniciar o stream de teste."

# Iniciar stream de teste em background
echo "Iniciando stream de teste para a câmera 'zoneminder'..."
ffmpeg -f lavfi -i testsrc=size=640x480:rate=30 -f lavfi -i sine=frequency=1000:sample_rate=44100 -c:v libx264 -c:a aac -f flv rtmp://localhost:1936/live/zoneminder -nostdin -nostats -v quiet &
FFMPEG_PID=$!
echo "Stream iniciado com PID $FFMPEG_PID"

# Salvar PID para terminar depois
echo $FFMPEG_PID > test-zm-stream.pid

echo
echo "URLs para configurar no ZoneMinder:"
echo
echo "1. Para usar HLS (recomendado):"
echo "   http://localhost:8090/live/zoneminder/index.m3u8"
echo
echo "2. Para usar RTMP:"
echo "   rtmp://localhost:1936/live/zoneminder"
echo
echo "3. Para usar HTTP-FLV:"
echo "   http://localhost:8090/live/zoneminder.flv"
echo
echo "Instruções para configurar no ZoneMinder:"
echo "1. Adicione uma nova fonte (Source)"
echo "2. Defina Type como 'Ffmpeg'"
echo "3. Cole a URL desejada no campo 'Source Path'"
echo "4. Configure 'Remote Method' como 'TCP'"
echo "5. Salve e ative o monitor"
echo
echo "O stream vai ficar ativo até você executar: ./stop-test-zoneminder.sh"
echo "Para verificar os logs do RTMP Server: tail -f logs/rtmp.log" 