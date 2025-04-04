#!/bin/bash

# Script para configurar relays RTMP usando ffmpeg
# Uso: ./relay.sh [stream_key] [destino_rtmp]

if [ $# -lt 2 ]; then
    echo "Uso: $0 [stream_key] [destino_rtmp]"
    echo "Exemplo: $0 camera1 rtmp://servidor-destino.com/live/camera1"
    exit 1
fi

STREAM_KEY=$1
DESTINO=$2
ORIGEM="rtmp://localhost:1935/live/$STREAM_KEY"

echo "Iniciando relay de $ORIGEM para $DESTINO"

# Verificar se ffmpeg está instalado
if ! command -v ffmpeg &> /dev/null; then
    echo "Erro: ffmpeg não está instalado. Por favor, instale com:"
    echo "sudo apt update && sudo apt install -y ffmpeg"
    exit 1
fi

# Executar ffmpeg em background
nohup ffmpeg -i "$ORIGEM" -c copy -f flv "$DESTINO" > relay_"$STREAM_KEY".log 2>&1 &

# Salvar o PID para possível encerramento posterior
PID=$!
echo "$PID" > relay_"$STREAM_KEY".pid
echo "Relay iniciado com PID: $PID"
echo "Log disponível em: relay_$STREAM_KEY.log"

# Função para encerrar o relay graciosamente
function encerrar_relay() {
    if [ -f "relay_$STREAM_KEY.pid" ]; then
        PID=$(cat relay_"$STREAM_KEY".pid)
        echo "Encerrando relay com PID: $PID"
        kill -15 $PID
        rm relay_"$STREAM_KEY".pid
    else
        echo "Nenhum PID encontrado para o relay $STREAM_KEY"
    fi
}

# Registrar o encerramento do relay quando o script for interrompido
trap encerrar_relay INT TERM

echo "Pressione Ctrl+C para encerrar o relay"
wait $PID
