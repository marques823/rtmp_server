#!/bin/bash

# Script para encerrar o teste de integração com o ZoneMinder
# Autor: Tiago
# Data: Abril de 2025

echo "=== Encerrando teste de integração com ZoneMinder ==="

if [ -f "test-zm-stream.pid" ]; then
    PID=$(cat test-zm-stream.pid)
    if ps -p "$PID" > /dev/null; then
        echo "Encerrando stream de teste (PID: $PID)..."
        kill "$PID"
        sleep 1
        if ps -p "$PID" > /dev/null; then
            echo "Forçando encerramento do stream (PID: $PID)..."
            kill -9 "$PID"
        fi
    else
        echo "O processo com PID $PID não está mais em execução"
    fi
    rm test-zm-stream.pid
else
    echo "Buscando processos ffmpeg em execução..."
    PIDS=$(pgrep -f "ffmpeg.*zoneminder")
    if [ -n "$PIDS" ]; then
        echo "Encerrando processos ffmpeg: $PIDS"
        kill $PIDS
    else
        echo "Nenhum processo ffmpeg para ZoneMinder encontrado"
    fi
fi

echo "=== Teste encerrado ==="
echo "Você pode continuar rodando o servidor RTMP ou encerrá-lo com ./stop-rtmp.sh" 