#!/bin/bash

# Script para encerrar todos os servidores RTMP, Estático e API
# Autor: Tiago
# Data: Abril de 2025

# Definir diretório base
BASE_DIR=$(dirname "$0")
cd "$BASE_DIR"

echo "=== Encerrando servidores RTMP CFTV ==="
echo "$(date '+%Y-%m-%d %H:%M:%S') - Encerrando servidores" >> logs/shutdown.log

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
            echo "$(date '+%Y-%m-%d %H:%M:%S') - $process_name encerrado (PID: $pid)" >> logs/shutdown.log
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
            echo "$(date '+%Y-%m-%d %H:%M:%S') - $process_name encerrado (PID: $pid)" >> logs/shutdown.log
        else
            echo "$process_name não está em execução"
        fi
    fi
}

# Encerrar servidores
kill_process "api.pid" "node api/standalone.js"
kill_process "static.pid" "node static_server.js"
kill_process "app.pid" "node app.js"

# Verificar se algum servidor ainda está rodando
if pgrep -f "node app.js" > /dev/null || pgrep -f "node static_server.js" > /dev/null || pgrep -f "node api/standalone.js" > /dev/null; then
    echo "Alguns processos ainda estão em execução. Forçando encerramento..."
    pkill -f "node app.js"
    pkill -f "node static_server.js"
    pkill -f "node api/standalone.js"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Forçado encerramento de todos os processos restantes" >> logs/shutdown.log
fi

echo "=== Todos os servidores foram encerrados ===" 