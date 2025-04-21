#!/bin/bash

# Script de inicialização do servidor RTMP com integração RTSP para DVRs Intelbras

echo "Iniciando servidor RTMP com integração RTSP para DVRs Intelbras..."

# Verificar se o FFmpeg está instalado
if ! command -v ffmpeg &> /dev/null; then
    echo "ERRO: FFmpeg não encontrado. Por favor, instale o FFmpeg."
    echo "Em sistemas Debian/Ubuntu: sudo apt-get update && sudo apt-get install -y ffmpeg"
    exit 1
fi

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "ERRO: Node.js não encontrado. Por favor, instale o Node.js."
    echo "Em sistemas Debian/Ubuntu: sudo apt-get update && sudo apt-get install -y nodejs npm"
    exit 1
fi

# Verificar dependências do Node
if [ ! -d "node_modules" ]; then
    echo "Instalando dependências Node.js..."
    npm install
fi

# Criar diretórios necessários
mkdir -p media/live
mkdir -p media/rtsp
mkdir -p logs

# Definir variáveis de ambiente
export RTMP_PORT=1936
export HTTP_PORT=8090
export RTSP_PORT=8554
export RTSP_RTCP_PORT=8555
export FFMPEG_PATH=$(which ffmpeg)
export LOG_TYPE=3
export STORAGE_ENABLED=true
export ENABLE_MP4_RECORDING=true
export STORAGE_MAX_AGE_DAYS=7
export STORAGE_MAX_SPACE_GB=10
export RTMP_TO_RTSP_ENABLED=true

# Iniciar o servidor em segundo plano
node server.js > logs/server.log 2>&1 &

# Salvar PID para interromper depois
echo $! > .server.pid

echo "Servidor RTMP+RTSP iniciado na porta 1936 (RTMP) e 8554 (RTSP)"
echo "Para parar o servidor, execute: ./stop-intelbras-rtsp.sh"
echo "Para ver os logs: tail -f logs/server.log" 