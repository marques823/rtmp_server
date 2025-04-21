#!/bin/bash

# Script para encerrar múltiplos streams do ZoneMinder para RTMP
# Autor: Tiago
# Data: Abril de 2025

echo "=== Encerrando streams do ZoneMinder para RTMP ==="

# Verificar diretório de PIDs
if [ ! -d ".temp" ]; then
    echo "Diretório .temp não encontrado!"
    echo "Os streams provavelmente não foram iniciados."
    exit 1
fi

# Procurar arquivos de PID para streams do ZoneMinder
PID_FILES=(.temp/zm-stream-*.pid)
if [ ${#PID_FILES[@]} -eq 0 ] || [ ! -f "${PID_FILES[0]}" ]; then
    echo "Nenhum stream ativo encontrado."
    echo "Os streams podem já ter sido encerrados ou foram iniciados com outro script."
    
    # Verificar se existe o arquivo de PID para o stream único
    if [ -f ".temp/zm-stream.pid" ]; then
        echo "Encontrado arquivo de PID para stream único. Use ./stop-zoneminder-stream.sh para encerrá-lo."
    fi
    
    exit 1
fi

# Encerrar cada stream
echo "Encontrados ${#PID_FILES[@]} streams para encerrar..."
SUCCESS_COUNT=0
FAIL_COUNT=0

for pid_file in "${PID_FILES[@]}"; do
    if [ -f "$pid_file" ]; then
        # Extrair ID do monitor do nome do arquivo
        MONITOR_ID=$(basename "$pid_file" | sed 's/zm-stream-//;s/\.pid//')
        
        # Ler PID do arquivo
        PID=$(cat "$pid_file")
        
        echo "Encerrando stream para monitor $MONITOR_ID (PID: $PID)..."
        
        # Verificar se o processo existe
        if ! ps -p $PID > /dev/null; then
            echo "  Processo não encontrado. Provavelmente já foi encerrado."
            rm -f "$pid_file"
            continue
        fi
        
        # Encerrar o processo
        if kill -15 $PID 2>/dev/null; then
            echo "  Stream encerrado com sucesso."
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            echo "  Falha ao encerrar normalmente. Tentando método alternativo..."
            if kill -9 $PID 2>/dev/null; then
                echo "  Stream encerrado com sucesso (forçado)."
                SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
            else
                echo "  Falha ao encerrar o stream. Você pode precisar encerrá-lo manualmente."
                FAIL_COUNT=$((FAIL_COUNT + 1))
            fi
        fi
        
        # Remover arquivo PID
        rm -f "$pid_file"
    fi
done

# Verificar se há outros processos de FFmpeg para ZoneMinder
REMAINING=$(pgrep -f "ffmpeg.*nph-zms" | wc -l)
if [ $REMAINING -gt 0 ]; then
    echo
    echo "AVISO: Ainda existem $REMAINING processos de FFmpeg para ZoneMinder em execução."
    read -p "Deseja tentar encerrar todos os processos restantes? (s/n): " KILL_ALL
    
    if [[ $KILL_ALL == "s" || $KILL_ALL == "S" ]]; then
        echo "Encerrando todos os processos FFmpeg relacionados ao ZoneMinder..."
        pkill -f "ffmpeg.*nph-zms"
        sleep 2
        
        # Verificar se ainda existem processos
        if pgrep -f "ffmpeg.*nph-zms" > /dev/null; then
            echo "Alguns processos persistem. Forçando encerramento..."
            pkill -9 -f "ffmpeg.*nph-zms"
        fi
        
        echo "Operação concluída."
    else
        echo "Processos restantes não foram encerrados."
    fi
fi

echo
echo "Resumo da operação:"
echo "  Streams encerrados com sucesso: $SUCCESS_COUNT"
echo "  Falhas ao encerrar: $FAIL_COUNT"
echo
echo "Todos os streams configurados foram encerrados."
echo "Para reiniciar os streams, execute: ./zoneminder-multi-stream.sh" 