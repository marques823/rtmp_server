#!/bin/bash

# Script para testar a integração com DVRs Intelbras
# Este script envia um stream de teste RTMP e verifica a conversão para RTSP

# Verificar se o FFmpeg está instalado
if ! command -v ffmpeg &> /dev/null; then
    echo "ERRO: FFmpeg não encontrado. Por favor, instale o FFmpeg."
    echo "Em sistemas Debian/Ubuntu: sudo apt-get update && sudo apt-get install -y ffmpeg"
    exit 1
fi

# Criar diretório de logs, se não existir
mkdir -p logs

echo "=====================================================
      Teste de Integração com DVR Intelbras
====================================================="
echo "Este script envia um stream de teste para o servidor RTMP"
echo "e verifica a conversão para RTSP para uso com DVRs Intelbras."
echo "-----------------------------------------------------"

# Configurações
RTMP_IP=${1:-"localhost"}
RTSP_IP=${2:-"localhost"}
STREAM_KEY=${3:-"camera-teste"}
RTMP_PORT=1936
RTSP_PORT=8554

RTMP_URL="rtmp://${RTMP_IP}:${RTMP_PORT}/live/${STREAM_KEY}"
RTSP_URL="rtsp://${RTSP_IP}:${RTSP_PORT}/${STREAM_KEY}"

# Iniciar transmissão RTMP em segundo plano
echo "Iniciando transmissão de teste para ${RTMP_URL}..."
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -f lavfi -i sine=frequency=1000:sample_rate=44100 \
    -c:v libx264 -preset ultrafast -tune zerolatency -profile:v baseline -g 30 \
    -c:a aac -b:a 128k -f flv "${RTMP_URL}" > logs/rtmp-test.log 2>&1 &

FFMPEG_PID=$!
echo "Transmissão RTMP iniciada (PID: ${FFMPEG_PID})"

# Aguardar alguns segundos para a conversão iniciar
echo "Aguardando 10 segundos para a conversão RTMP→RTSP iniciar..."
sleep 10

# Verificar se o servidor RTSP está respondendo
echo "Testando conexão RTSP em ${RTSP_URL}..."
ffprobe -v error -rtsp_transport tcp -i "${RTSP_URL}" > logs/rtsp-test.log 2>&1
RTSP_STATUS=$?

if [ $RTSP_STATUS -eq 0 ]; then
    echo "SUCESSO! Stream RTSP detectado em ${RTSP_URL}"
    echo "O DVR Intelbras deve poder conectar neste endereço RTSP."
    echo "-----------------------------------------------------"
    echo "Instruções para configurar no DVR Intelbras:"
    echo "1. Acesse o menu do DVR"
    echo "2. Vá para Câmera > Adicionar Câmera"
    echo "3. Selecione adição manual"
    echo "4. Configure o endereço RTSP: ${RTSP_URL}"
    echo "5. Use o método de conexão TCP"
    echo "-----------------------------------------------------"
else
    echo "FALHA! Não foi possível detectar o stream RTSP em ${RTSP_URL}"
    echo "Verifique se:"
    echo "- O servidor RTMP+RTSP está em execução"
    echo "- As portas estão abertas no firewall"
    echo "- As configurações de rede estão corretas"
    echo "- Consulte os logs em logs/rtsp-test.log para mais detalhes"
fi

# Perguntar se deseja parar o teste
read -p "Pressione Enter para parar o teste ou Ctrl+C para manter executando..."

# Parar a transmissão RTMP
echo "Encerrando transmissão RTMP de teste..."
kill $FFMPEG_PID

echo "Teste concluído." 