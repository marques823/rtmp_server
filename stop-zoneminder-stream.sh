#!/bin/bash

# Script para encerrar o stream do ZoneMinder para RTMP
# Autor: Tiago
# Data: Abril de 2025

echo "=== Encerrando transmissão do ZoneMinder para RTMP ==="

# Verificar arquivo de PID
PID_FILE=".temp/zm-stream.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "Nenhum stream ativo encontrado."
    echo "Se o processo ainda estiver em execução, você precisará encerrá-lo manualmente."
    exit 1
fi

# Ler PID do arquivo
PID=$(cat "$PID_FILE")

# Verificar se o processo existe
if ! ps -p $PID > /dev/null; then
    echo "Processo com PID $PID não encontrado."
    echo "O stream pode já ter sido encerrado ou foi encerrado de outra forma."
    
    # Limpar arquivo de PID
    rm -f "$PID_FILE"
    exit 0
fi

# Encerrar o processo
echo "Encerrando processo de stream (PID: $PID)..."
if kill -15 $PID; then
    echo "Processo encerrado com sucesso."
else
    echo "Falha ao encerrar o processo. Tentando método alternativo..."
    if kill -9 $PID; then
        echo "Processo encerrado com sucesso (forçado)."
    else
        echo "Falha ao encerrar o processo. Você pode precisar encerrá-lo manualmente."
        exit 1
    fi
fi

# Limpar arquivo de PID
rm -f "$PID_FILE"

# Verificar se há outros processos de FFmpeg com ZoneMinder
if pgrep -f "ffmpeg.*nph-zms" > /dev/null; then
    echo "AVISO: Ainda existem outros processos de FFmpeg para ZoneMinder em execução."
    echo "Você pode querer verificar e encerrá-los manualmente se necessário."
fi

echo
echo "Stream do ZoneMinder para RTMP encerrado."
echo "Para reiniciar o stream, execute: ./zoneminder-stream.sh" 