#!/bin/bash

# Script para configurar credenciais RTSP para integração com DVRs Intelbras

echo "======================================"
echo "Configuração de Autenticação RTSP"
echo "======================================"
echo "Este script configura as credenciais de acesso para os streams RTSP."
echo "Os DVRs Intelbras exigem autenticação para acessar fontes RTSP."
echo "--------------------------------------"

# Obter credenciais do usuário
read -p "Habilitar autenticação RTSP? (S/n): " ENABLE_AUTH
ENABLE_AUTH=${ENABLE_AUTH:-S}

if [[ $ENABLE_AUTH == "S" || $ENABLE_AUTH == "s" ]]; then
    REQUIRE_AUTH=true
    
    echo "Configurando credenciais de acesso..."
    read -p "Usuário RTSP [admin]: " USERNAME
    USERNAME=${USERNAME:-admin}
    
    read -sp "Senha RTSP [admin]: " PASSWORD
    PASSWORD=${PASSWORD:-admin}
    echo
    
    echo "Usuário configurado: $USERNAME"
    echo "Senha configurada: ********"
else
    REQUIRE_AUTH=false
    USERNAME="admin"
    PASSWORD="admin"
    echo "Autenticação RTSP desabilitada. Acesso anônimo permitido."
fi

# Salvar configurações
echo "# Configurações de autenticação RTSP" > .rtsp_auth
echo "RTSP_REQUIRE_AUTH=$REQUIRE_AUTH" >> .rtsp_auth
echo "RTSP_DEFAULT_USERNAME=\"$USERNAME\"" >> .rtsp_auth
echo "RTSP_DEFAULT_PASSWORD=\"$PASSWORD\"" >> .rtsp_auth

echo "--------------------------------------"
echo "Configuração salva em .rtsp_auth"
echo "Estas credenciais serão usadas na próxima vez que o servidor for iniciado."
echo "Para aplicar imediatamente, reinicie o servidor:"
echo "1. ./stop-intelbras-rtsp.sh"
echo "2. ./start-intelbras-rtsp.sh"
echo "======================================"

# Configurar permissões
chmod 600 .rtsp_auth  # Somente o proprietário pode ler/escrever 