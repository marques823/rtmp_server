#!/bin/bash

# Script para encerrar o stream de teste
# Autor: Tiago
# Data: Abril de 2025

echo "=== Encerrando stream de teste ==="

if [ -f "test-stream.pid" ]; then
    PID=$(cat test-stream.pid)
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
    rm test-stream.pid
else
    echo "Buscando processos ffmpeg em execução..."
    PIDS=$(pgrep -f ffmpeg)
    if [ -n "$PIDS" ]; then
        echo "Encerrando processos ffmpeg: $PIDS"
        pkill -f ffmpeg
    else
        echo "Nenhum processo ffmpeg encontrado"
    fi
fi

echo "=== Stream de teste encerrado ===" 