#!/bin/bash

# Script para capturar múltiplas câmeras do ZoneMinder e enviar para o servidor RTMP
# Autor: Tiago
# Data: Abril de 2025

echo "=== Configurando integração de múltiplas câmeras ZoneMinder com servidor RTMP ==="

# Configurações globais - AJUSTE CONFORME SUA INSTALAÇÃO
ZM_HOST="localhost"             # Host do ZoneMinder
ZM_PORT="80"                    # Porta do ZoneMinder
ZM_PATH="/zm"                   # Caminho do ZoneMinder
RTMP_SERVER="localhost"         # Servidor RTMP
RTMP_PORT="1936"                # Porta RTMP

# Verificar se o servidor RTMP está em execução
if ! pgrep -f "node rtmp-core.js" > /dev/null; then
    echo "AVISO: O servidor RTMP não parece estar em execução!"
    echo "Considere iniciar o servidor RTMP com: ./start-rtmp.sh"
    read -p "Deseja continuar mesmo assim? (s/n): " CONTINUE
    if [[ $CONTINUE != "s" && $CONTINUE != "S" ]]; then
        echo "Operação cancelada pelo usuário."
        exit 1
    fi
fi

# Verificar se o FFmpeg está instalado
if ! command -v ffmpeg &> /dev/null; then
    echo "ERRO: FFmpeg não encontrado!"
    echo "Por favor, instale o FFmpeg: sudo apt update && sudo apt install -y ffmpeg"
    exit 1
fi

# Verificar se o jq está instalado (para processar JSON)
if ! command -v jq &> /dev/null; then
    echo "AVISO: jq não está instalado. Não será possível obter automaticamente a lista de câmeras."
    echo "Por favor, instale jq: sudo apt update && sudo apt install -y jq"
    JQ_AVAILABLE=false
else
    JQ_AVAILABLE=true
fi

# Verificar se conseguimos conectar ao ZoneMinder
echo "Verificando conexão com o ZoneMinder em http://$ZM_HOST:$ZM_PORT$ZM_PATH..."
if ! curl -s --head "http://$ZM_HOST:$ZM_PORT$ZM_PATH" | head -n 1 | grep "200 OK" > /dev/null; then
    echo "AVISO: Não foi possível conectar ao ZoneMinder!"
    echo "Verifique se as configurações estão corretas e se o ZoneMinder está em execução."
    read -p "Deseja continuar mesmo assim? (s/n): " CONTINUE
    if [[ $CONTINUE != "s" && $CONTINUE != "S" ]]; then
        echo "Operação cancelada pelo usuário."
        exit 1
    fi
fi

# Criar diretório para armazenar PIDs
mkdir -p .temp

# Gerar arquivo de configuração para o player multi-tela
CONFIG_FILE="camera-config.json"

# Detectar câmeras disponíveis no ZoneMinder
if [[ "$JQ_AVAILABLE" == true ]]; then
    echo "Tentando obter lista de câmeras do ZoneMinder via API..."
    
    # Tentando obter dados da API do ZoneMinder
    API_URL="http://$ZM_HOST:$ZM_PORT$ZM_PATH/api/monitors.json"
    MONITORS_JSON=$(curl -s "$API_URL")
    
    if [[ -n "$MONITORS_JSON" && "$MONITORS_JSON" != *"error"* ]]; then
        echo "Dados obtidos com sucesso da API do ZoneMinder."
        MONITOR_COUNT=$(echo "$MONITORS_JSON" | jq '.monitors | length')
        
        if [[ "$MONITOR_COUNT" -gt 0 ]]; then
            echo "Encontradas $MONITOR_COUNT câmeras no ZoneMinder."
            
            # Iniciar construção do arquivo de configuração JSON
            echo "{" > "$CONFIG_FILE"
            
            # Processar cada monitor encontrado
            for ((i=0; i<$MONITOR_COUNT; i++)); do
                MONITOR_ID=$(echo "$MONITORS_JSON" | jq -r ".monitors[$i].Monitor.Id")
                MONITOR_NAME=$(echo "$MONITORS_JSON" | jq -r ".monitors[$i].Monitor.Name")
                FUNCTION=$(echo "$MONITORS_JSON" | jq -r ".monitors[$i].Monitor.Function")
                
                # Criar chave única para o RTMP baseada no ID do monitor
                RTMP_KEY="zm_camera$MONITOR_ID"
                
                # Adicionar ao arquivo de configuração
                echo "  \"$RTMP_KEY\": {" >> "$CONFIG_FILE"
                echo "    \"name\": \"$MONITOR_NAME\"," >> "$CONFIG_FILE"
                echo "    \"description\": \"Monitor ID: $MONITOR_ID, Função: $FUNCTION\"," >> "$CONFIG_FILE"
                echo "    \"recordEnabled\": true," >> "$CONFIG_FILE"
                echo "    \"maxAgeDays\": 5," >> "$CONFIG_FILE"
                echo "    \"maxSpaceGB\": 2" >> "$CONFIG_FILE"
                
                # Adicionar vírgula se não for o último item
                if [[ $i -lt $(($MONITOR_COUNT-1)) ]]; then
                    echo "  }," >> "$CONFIG_FILE"
                else
                    echo "  }" >> "$CONFIG_FILE"
                fi
                
                # Construir URLs para este monitor
                ZM_URL="http://$ZM_HOST:$ZM_PORT$ZM_PATH/cgi-bin/nph-zms?mode=jpeg&monitor=$MONITOR_ID&scale=100&maxfps=30"
                RTMP_URL="rtmp://$RTMP_SERVER:$RTMP_PORT/live/$RTMP_KEY"
                
                echo "Iniciando transmissão da câmera '$MONITOR_NAME' (ID: $MONITOR_ID)..."
                echo "  Origem: $ZM_URL"
                echo "  Destino: $RTMP_URL"
                
                # Iniciar FFmpeg para este monitor
                ffmpeg -f mjpeg -i "$ZM_URL" \
                    -c:v libx264 -preset ultrafast -tune zerolatency -b:v 1000k \
                    -f flv "$RTMP_URL" \
                    -nostdin -nostats -loglevel error &
                
                FFMPEG_PID=$!
                echo $FFMPEG_PID > .temp/zm-stream-$MONITOR_ID.pid
                echo "Stream iniciado com PID $FFMPEG_PID"
                echo
            done
            
            # Fechar o arquivo de configuração JSON
            echo "}" >> "$CONFIG_FILE"
            
        else
            echo "Nenhuma câmera encontrada no ZoneMinder."
        fi
    else
        echo "Falha ao obter dados da API do ZoneMinder. Usando configuração manual."
        CONFIG_MANUAL=true
    fi
else
    echo "jq não está disponível. Usando configuração manual."
    CONFIG_MANUAL=true
fi

# Se não conseguimos obter câmeras automaticamente, usar configuração manual
if [[ "$CONFIG_MANUAL" == true ]]; then
    echo "Configuração manual necessária."
    echo
    
    # Iniciando arquivo de configuração
    echo "{" > "$CONFIG_FILE"
    
    # Contador para câmeras
    CAMERA_COUNT=0
    
    # Perguntar quantas câmeras deseja configurar
    read -p "Quantas câmeras você deseja configurar? " NUM_CAMERAS
    
    for ((i=1; i<=$NUM_CAMERAS; i++)); do
        echo
        echo "Configurando câmera $i:"
        read -p "  ID do Monitor no ZoneMinder: " MONITOR_ID
        read -p "  Nome da câmera: " MONITOR_NAME
        read -p "  Descrição (opcional): " MONITOR_DESC
        
        # Criar chave única para o RTMP
        RTMP_KEY="zm_camera$MONITOR_ID"
        
        # Adicionar ao arquivo de configuração
        echo "  \"$RTMP_KEY\": {" >> "$CONFIG_FILE"
        echo "    \"name\": \"$MONITOR_NAME\"," >> "$CONFIG_FILE"
        echo "    \"description\": \"$MONITOR_DESC\"," >> "$CONFIG_FILE"
        echo "    \"recordEnabled\": true," >> "$CONFIG_FILE"
        echo "    \"maxAgeDays\": 5," >> "$CONFIG_FILE"
        echo "    \"maxSpaceGB\": 2" >> "$CONFIG_FILE"
        
        # Adicionar vírgula se não for o último item
        if [[ $i -lt $NUM_CAMERAS ]]; then
            echo "  }," >> "$CONFIG_FILE"
        else
            echo "  }" >> "$CONFIG_FILE"
        fi
        
        # Construir URLs para este monitor
        ZM_URL="http://$ZM_HOST:$ZM_PORT$ZM_PATH/cgi-bin/nph-zms?mode=jpeg&monitor=$MONITOR_ID&scale=100&maxfps=30"
        RTMP_URL="rtmp://$RTMP_SERVER:$RTMP_PORT/live/$RTMP_KEY"
        
        echo "Iniciando transmissão da câmera '$MONITOR_NAME' (ID: $MONITOR_ID)..."
        echo "  Origem: $ZM_URL"
        echo "  Destino: $RTMP_URL"
        
        # Iniciar FFmpeg para este monitor
        ffmpeg -f mjpeg -i "$ZM_URL" \
            -c:v libx264 -preset ultrafast -tune zerolatency -b:v 1000k \
            -f flv "$RTMP_URL" \
            -nostdin -nostats -loglevel error &
        
        FFMPEG_PID=$!
        echo $FFMPEG_PID > .temp/zm-stream-$MONITOR_ID.pid
        echo "Stream iniciado com PID $FFMPEG_PID"
        echo
        
        CAMERA_COUNT=$i
    done
    
    # Fechar o arquivo de configuração JSON
    echo "}" >> "$CONFIG_FILE"
    
    echo "Configuradas $CAMERA_COUNT câmeras com sucesso."
fi

echo
echo "Todos os streams ZoneMinder estão sendo enviados para o servidor RTMP."
echo "A configuração das câmeras foi salva em: $CONFIG_FILE"
echo "Para visualizar, use o player multi-tela em: multi-player.html"
echo
echo "Para encerrar os streams, execute: ./stop-zoneminder-multi-stream.sh" 