#!/bin/bash

# Script para parar o teste de integração com DVR Intelbras

echo "Parando teste de integração com DVR Intelbras..."

# Encontrar e matar processos FFmpeg usados nos testes
FFMPEG_PIDS=$(ps aux | grep "ffmpeg.*testsrc.*flv" | grep -v grep | awk '{print $2}')

if [ -z "$FFMPEG_PIDS" ]; then
    echo "Nenhum processo de teste encontrado."
else
    echo "Encontrados os seguintes processos de teste:"
    for pid in $FFMPEG_PIDS; do
        echo "Encerrando processo FFmpeg com PID $pid..."
        kill $pid
    done
    
    # Aguardar o encerramento
    sleep 2
    
    # Verificar se ainda há processos em execução e forçar encerramento se necessário
    FFMPEG_PIDS=$(ps aux | grep "ffmpeg.*testsrc.*flv" | grep -v grep | awk '{print $2}')
    if [ ! -z "$FFMPEG_PIDS" ]; then
        echo "Forçando encerramento dos processos FFmpeg restantes..."
        for pid in $FFMPEG_PIDS; do
            kill -9 $pid
        done
    fi
    
    echo "Todos os processos de teste finalizados."
fi

echo "Teste parado." 