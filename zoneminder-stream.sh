#!/bin/bash

# Script para capturar stream do ZoneMinder e reenviar para o servidor RTMP
# Autor: Tiago
# Data: Abril de 2025

echo "=== Configurando integração ZoneMinder com servidor RTMP ==="

# Configurações padrão
DEFAULT_ZM_HOST="localhost"
DEFAULT_ZM_PORT="80"
DEFAULT_ZM_PATH="/zm"
DEFAULT_MONITOR_ID="1"
DEFAULT_RTMP_SERVER="localhost"
DEFAULT_RTMP_PORT="1936"
DEFAULT_RTMP_KEY="zoneminder"

# Perguntar ao usuário se deseja usar as configurações padrão ou personalizar
echo "Configuração do ZoneMinder:"
read -p "Usar configurações padrão (localhost:80/zm)? (s/n): " USE_DEFAULT

if [[ $USE_DEFAULT != "s" && $USE_DEFAULT != "S" ]]; then
    # Personalizar configurações
    read -p "Host do ZoneMinder (ex: 192.168.1.100): " ZM_HOST
    
    # Verificar se o host já inclui porta
    if [[ "$ZM_HOST" == *":"* ]]; then
        # Extrair host e porta
        ZM_PORT=$(echo "$ZM_HOST" | cut -d':' -f2)
        ZM_HOST=$(echo "$ZM_HOST" | cut -d':' -f1)
        echo "Detectado host com porta: $ZM_HOST:$ZM_PORT"
    else
        read -p "Porta do ZoneMinder (ex: 80): " ZM_PORT
    fi
    
    read -p "Caminho do ZoneMinder (ex: /zm): " ZM_PATH
    read -p "ID do monitor/câmera no ZoneMinder: " MONITOR_ID
    read -p "Requer autenticação? (s/n): " NEEDS_AUTH
    
    if [[ $NEEDS_AUTH == "s" || $NEEDS_AUTH == "S" ]]; then
        read -p "Usuário do ZoneMinder: " ZM_USER
        read -s -p "Senha do ZoneMinder: " ZM_PASS
        echo ""
        AUTH_PARAMS="&user=$ZM_USER&pass=$ZM_PASS"
    else
        AUTH_PARAMS=""
    fi
    
    # Configuração do servidor RTMP (raramente precisa ser alterada)
    read -p "Alterar configuração padrão do servidor RTMP (localhost:1936)? (s/n): " CHANGE_RTMP
    if [[ $CHANGE_RTMP == "s" || $CHANGE_RTMP == "S" ]]; then
        read -p "Servidor RTMP: " RTMP_SERVER
        read -p "Porta RTMP: " RTMP_PORT
        read -p "Chave do stream (deixe em branco para usar 'zm_camera{ID}'): " RTMP_KEY
        
        # Se a chave estiver vazia, usar padrão com ID do monitor
        if [[ -z "$RTMP_KEY" ]]; then
            RTMP_KEY="zm_camera${MONITOR_ID}"
        fi
    else
        RTMP_SERVER="$DEFAULT_RTMP_SERVER"
        RTMP_PORT="$DEFAULT_RTMP_PORT"
        RTMP_KEY="zm_camera${MONITOR_ID}"
    fi
else
    # Usar configurações padrão
    ZM_HOST="$DEFAULT_ZM_HOST"
    ZM_PORT="$DEFAULT_ZM_PORT"
    ZM_PATH="$DEFAULT_ZM_PATH"
    MONITOR_ID="$DEFAULT_MONITOR_ID"
    AUTH_PARAMS=""
    RTMP_SERVER="$DEFAULT_RTMP_SERVER"
    RTMP_PORT="$DEFAULT_RTMP_PORT"
    RTMP_KEY="zm_camera${MONITOR_ID}"
    
    # Perguntar apenas o ID do monitor
    read -p "ID do monitor/câmera no ZoneMinder [padrão: $DEFAULT_MONITOR_ID]: " INPUT_MONITOR_ID
    if [[ -n "$INPUT_MONITOR_ID" ]]; then
        MONITOR_ID="$INPUT_MONITOR_ID"
        RTMP_KEY="zm_camera${MONITOR_ID}"
    fi
fi

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

# Criar diretório para armazenar PID
mkdir -p .temp

# Construir URLs
ZM_URL="http://$ZM_HOST:$ZM_PORT$ZM_PATH/cgi-bin/nph-zms?mode=jpeg&monitor=$MONITOR_ID&scale=100&maxfps=30$AUTH_PARAMS"
RTMP_URL="rtmp://$RTMP_SERVER:$RTMP_PORT/live/$RTMP_KEY"

echo "Iniciando transmissão de câmera do ZoneMinder para servidor RTMP..."
echo "  Origem: $ZM_URL"
echo "  Destino: $RTMP_URL"

# Testar a URL do ZoneMinder sem exibir credenciais
TEST_URL="${ZM_URL%$AUTH_PARAMS}"
echo "Testando conexão com: $TEST_URL"

if ! curl -s --head "$ZM_URL" | head -n 1 | grep "HTTP/1." > /dev/null; then
    echo "AVISO: Não foi possível conectar ao ZoneMinder!"
    echo "Verifique se as configurações estão corretas e se o ZoneMinder está em execução."
    read -p "Deseja continuar mesmo assim? (s/n): " CONTINUE
    if [[ $CONTINUE != "s" && $CONTINUE != "S" ]]; then
        echo "Operação cancelada pelo usuário."
        exit 1
    fi
fi

# Iniciar FFmpeg para capturar do ZoneMinder e reenviar para RTMP
ffmpeg -f mjpeg -i "$ZM_URL" \
    -c:v libx264 -preset ultrafast -tune zerolatency -b:v 1000k \
    -f flv "$RTMP_URL" \
    -nostdin -loglevel warning &

FFMPEG_PID=$!
echo $FFMPEG_PID > .temp/zm-stream.pid
echo "Stream iniciado com PID $FFMPEG_PID"

# Atualizar o arquivo de configuração de câmeras
CONFIG_FILE="camera-config.json"
if [ -f "$CONFIG_FILE" ]; then
    # Fazer backup do arquivo existente
    cp "$CONFIG_FILE" "$CONFIG_FILE.bak"
    
    # Verificar se o arquivo é um JSON válido e contém uma abertura de chave
    if grep -q "^{" "$CONFIG_FILE"; then
        # Arquivo válido, vamos adicionar ou atualizar a câmera
        if grep -q "\"$RTMP_KEY\"" "$CONFIG_FILE"; then
            # A câmera já existe, atualizar
            echo "Atualizando configuração da câmera no arquivo $CONFIG_FILE"
            # Isso é complexo de fazer com bash, então vamos simplesmente recriar o arquivo
            TMP_FILE="$CONFIG_FILE.tmp"
            echo "{" > "$TMP_FILE"
            
            # Processar cada linha do arquivo original
            FOUND_CAMERA=false
            while IFS= read -r line; do
                if [[ "$line" == *"\"$RTMP_KEY\""* ]]; then
                    # Encontramos a definição da câmera
                    echo "  \"$RTMP_KEY\": {" >> "$TMP_FILE"
                    echo "    \"name\": \"Câmera ZoneMinder $MONITOR_ID\"," >> "$TMP_FILE"
                    echo "    \"description\": \"Monitor ID: $MONITOR_ID de $ZM_HOST:$ZM_PORT\"," >> "$TMP_FILE"
                    echo "    \"recordEnabled\": true," >> "$TMP_FILE"
                    echo "    \"maxAgeDays\": 5," >> "$TMP_FILE"
                    
                    # Pular linhas até encontrar a próxima definição de câmera ou final
                    SKIP=true
                    FOUND_CAMERA=true
                else
                    if [[ "$SKIP" == true && "$line" == *"}"* ]]; then
                        if [[ "$line" == *"},"* ]]; then
                            echo "  }," >> "$TMP_FILE"
                        else
                            echo "  }" >> "$TMP_FILE"
                        fi
                        SKIP=false
                    elif [[ "$SKIP" != true ]]; then
                        echo "$line" >> "$TMP_FILE"
                    fi
                fi
            done < "$CONFIG_FILE"
            
            # Se não encontrou a câmera, erro nos pressupostos
            if [[ "$FOUND_CAMERA" != true ]]; then
                echo "Erro ao atualizar a configuração da câmera. Usando backup."
                cp "$CONFIG_FILE.bak" "$CONFIG_FILE"
            else
                mv "$TMP_FILE" "$CONFIG_FILE"
            fi
        else
            # A câmera não existe, adicionar ao final
            # Remover chave de fechamento
            sed -i '$ d' "$CONFIG_FILE"
            
            # Verificar se devemos adicionar vírgula
            LAST_CHAR=$(tail -c 2 "$CONFIG_FILE")
            if [[ "$LAST_CHAR" != "," && "$LAST_CHAR" != "{" ]]; then
                echo "," >> "$CONFIG_FILE"
            fi
            
            # Adicionar nova câmera
            echo "  \"$RTMP_KEY\": {" >> "$CONFIG_FILE"
            echo "    \"name\": \"Câmera ZoneMinder $MONITOR_ID\"," >> "$CONFIG_FILE"
            echo "    \"description\": \"Monitor ID: $MONITOR_ID de $ZM_HOST:$ZM_PORT\"," >> "$CONFIG_FILE"
            echo "    \"recordEnabled\": true," >> "$CONFIG_FILE"
            echo "    \"maxAgeDays\": 5," >> "$CONFIG_FILE"
            echo "    \"maxSpaceGB\": 2" >> "$CONFIG_FILE"
            echo "  }" >> "$CONFIG_FILE"
            
            # Fechar o objeto JSON
            echo "}" >> "$CONFIG_FILE"
        fi
    else
        # Arquivo inválido, criar novo
        echo "Criando novo arquivo de configuração $CONFIG_FILE"
        echo "{" > "$CONFIG_FILE"
        echo "  \"$RTMP_KEY\": {" >> "$CONFIG_FILE"
        echo "    \"name\": \"Câmera ZoneMinder $MONITOR_ID\"," >> "$CONFIG_FILE"
        echo "    \"description\": \"Monitor ID: $MONITOR_ID de $ZM_HOST:$ZM_PORT\"," >> "$CONFIG_FILE"
        echo "    \"recordEnabled\": true," >> "$CONFIG_FILE"
        echo "    \"maxAgeDays\": 5," >> "$CONFIG_FILE"
        echo "    \"maxSpaceGB\": 2" >> "$CONFIG_FILE"
        echo "  }" >> "$CONFIG_FILE"
        echo "}" >> "$CONFIG_FILE"
    fi
else
    # Arquivo não existe, criar
    echo "Criando arquivo de configuração $CONFIG_FILE"
    echo "{" > "$CONFIG_FILE"
    echo "  \"$RTMP_KEY\": {" >> "$CONFIG_FILE"
    echo "    \"name\": \"Câmera ZoneMinder $MONITOR_ID\"," >> "$CONFIG_FILE"
    echo "    \"description\": \"Monitor ID: $MONITOR_ID de $ZM_HOST:$ZM_PORT\"," >> "$CONFIG_FILE"
    echo "    \"recordEnabled\": true," >> "$CONFIG_FILE"
    echo "    \"maxAgeDays\": 5," >> "$CONFIG_FILE"
    echo "    \"maxSpaceGB\": 2" >> "$CONFIG_FILE"
    echo "  }" >> "$CONFIG_FILE"
    echo "}" >> "$CONFIG_FILE"
fi

echo
echo "Stream do ZoneMinder está sendo enviado para o servidor RTMP."
echo "Para visualizar, abra o arquivo multi-player.html em seu navegador"
echo "e selecione a câmera chamada 'Câmera ZoneMinder $MONITOR_ID'."
echo
echo "Para encerrar este stream, execute: ./stop-zoneminder-stream.sh" 