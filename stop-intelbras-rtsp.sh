#!/bin/bash

# Script para parar o servidor RTMP com integração RTSP para DVRs Intelbras

echo "Parando servidor RTMP+RTSP..."

# Verificar se o arquivo PID existe
if [ -f .server.pid ]; then
    PID=$(cat .server.pid)
    
    # Verificar se o processo está em execução
    if ps -p $PID > /dev/null; then
        echo "Encerrando processo com PID $PID..."
        kill $PID
        
        # Aguardar o encerramento
        sleep 2
        
        # Verificar se ainda está em execução e forçar encerramento se necessário
        if ps -p $PID > /dev/null; then
            echo "Forçando encerramento do processo..."
            kill -9 $PID
        fi
        
        echo "Servidor encerrado com sucesso!"
    else
        echo "O processo com PID $PID não está em execução."
    fi
    
    # Remover arquivo PID
    rm .server.pid
else
    echo "Arquivo PID não encontrado."
    
    # Tentar encontrar e matar processos node relacionados ao server.js
    NODE_PIDS=$(ps aux | grep "[n]ode server.js" | awk '{print $2}')
    
    if [ ! -z "$NODE_PIDS" ]; then
        echo "Encontrados processos Node.js relacionados ao server.js:"
        for pid in $NODE_PIDS; do
            echo "Encerrando processo com PID $pid..."
            kill $pid
        done
        
        # Aguardar o encerramento
        sleep 2
        
        # Verificar se ainda há processos em execução e forçar encerramento se necessário
        NODE_PIDS=$(ps aux | grep "[n]ode server.js" | awk '{print $2}')
        if [ ! -z "$NODE_PIDS" ]; then
            echo "Forçando encerramento dos processos restantes..."
            for pid in $NODE_PIDS; do
                kill -9 $pid
            done
        fi
        
        echo "Processos Node.js encerrados com sucesso!"
    else
        echo "Nenhum processo Node.js relacionado ao server.js encontrado."
    fi
fi

# Matar qualquer processo FFmpeg de conversão RTMP para RTSP
FFMPEG_PIDS=$(ps aux | grep "[f]fmpeg.*rtsp" | awk '{print $2}')

if [ ! -z "$FFMPEG_PIDS" ]; then
    echo "Encontrados processos FFmpeg de conversão RTMP para RTSP:"
    for pid in $FFMPEG_PIDS; do
        echo "Encerrando processo FFmpeg com PID $pid..."
        kill $pid
    done
    
    # Aguardar o encerramento
    sleep 2
    
    # Verificar se ainda há processos em execução e forçar encerramento se necessário
    FFMPEG_PIDS=$(ps aux | grep "[f]fmpeg.*rtsp" | awk '{print $2}')
    if [ ! -z "$FFMPEG_PIDS" ]; then
        echo "Forçando encerramento dos processos FFmpeg restantes..."
        for pid in $FFMPEG_PIDS; do
            kill -9 $pid
        done
    fi
    
    echo "Processos FFmpeg encerrados com sucesso!"
else
    echo "Nenhum processo FFmpeg de conversão RTMP para RTSP encontrado."
fi

echo "Servidor RTMP+RTSP parado." 