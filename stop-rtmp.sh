#!/bin/bash

# Script para encerrar o servidor RTMP simplificado
# Autor: Tiago
# Data: Abril de 2025

# Definir diretório base
BASE_DIR=$(dirname "$0")
cd "$BASE_DIR"

echo "=== Encerrando servidor RTMP para ZoneMinder ==="
echo "$(date '+%Y-%m-%d %H:%M:%S') - Encerrando servidor RTMP" >> logs/rtmp.log

# Função para encerrar processo de forma segura
kill_process() {
    local pid_file=$1
    local process_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null; then
            echo "Encerrando $process_name (PID: $pid)..."
            kill "$pid"
            sleep 2
            if ps -p "$pid" > /dev/null; then
                echo "Forçando encerramento de $process_name (PID: $pid)..."
                kill -9 "$pid"
            fi
            echo "$(date '+%Y-%m-%d %H:%M:%S') - $process_name encerrado (PID: $pid)" >> logs/rtmp.log
        fi
        rm -f "$pid_file"
    else
        # Tenta encontrar por nome do processo
        local pid=$(pgrep -f "$process_name")
        if [ -n "$pid" ]; then
            echo "Encerrando $process_name (PID: $pid)..."
            kill "$pid"
            sleep 2
            if ps -p "$pid" > /dev/null; then
                echo "Forçando encerramento de $process_name (PID: $pid)..."
                kill -9 "$pid"
            fi
            echo "$(date '+%Y-%m-%d %H:%M:%S') - $process_name encerrado (PID: $pid)" >> logs/rtmp.log
        else
            echo "$process_name não está em execução"
        fi
    fi
}

# Encerrar servidor RTMP
kill_process "rtmp.pid" "node rtmp-core.js"

# Verificar se o servidor ainda está rodando
if pgrep -f "node rtmp-core.js" > /dev/null; then
    echo "O processo ainda está em execução. Forçando encerramento..."
    pkill -f "node rtmp-core.js"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Forçado encerramento do processo" >> logs/rtmp.log
fi

echo "=== Servidor RTMP encerrado ===" 