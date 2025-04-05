#!/bin/bash

# Script para limpar arquivos desnecessários e preparar o projeto RTMP simplificado
# Autor: Tiago
# Data: Abril de 2025

echo "=== Limpando arquivos desnecessários para o RTMP Core ==="

# Criar diretório temporário para o backup dos arquivos originais
mkdir -p backup_original

# Lista de arquivos para manter
FILES_TO_KEEP=(
  "rtmp-core.js"
  "package.core.json"
  "docker-compose.yml"
  "Dockerfile"
  "README.core.md"
  "start-rtmp.sh"
  "stop-rtmp.sh"
  "test-zoneminder.sh"
  "stop-test-zoneminder.sh"
  ".git"
  ".gitignore"
  "node_modules"
)

# Fazer backup dos arquivos originais (apenas os que não vamos manter)
echo "Fazendo backup dos arquivos originais..."
for file in *; do
  if [[ ! " ${FILES_TO_KEEP[@]} " =~ " ${file} " ]] && [[ -f "$file" ]]; then
    cp -p "$file" backup_original/
    echo "Backup: $file"
  fi
done

# Fazer backup de diretórios que serão removidos
for dir in api config docs rtmp-server; do
  if [[ -d "$dir" ]]; then
    cp -rp "$dir" backup_original/
    echo "Backup dir: $dir"
  fi
done

# Remover arquivos desnecessários
echo "Removendo arquivos desnecessários..."
for file in *.html *.js *.log *.pid; do
  if [[ -f "$file" ]] && [[ "$file" != "rtmp-core.js" ]]; then
    rm -f "$file"
    echo "Removido: $file"
  fi
done

# Remover scripts não relacionados ao core RTMP
for script in relay.sh status.sh start-servers.sh stop-servers.sh stop-test-stream.sh test-stream.sh; do
  if [[ -f "$script" ]]; then
    rm -f "$script"
    echo "Removido: $script"
  fi
done

# Remover diretórios desnecessários
echo "Removendo diretórios desnecessários..."
for dir in api config docs rtmp-server; do
  if [[ -d "$dir" ]]; then
    rm -rf "$dir"
    echo "Removido diretório: $dir"
  fi
done

# Renomear arquivos para os nomes padrão
echo "Renomeando arquivos..."
mv package.core.json package.json
echo "Renomeado: package.core.json -> package.json"

mv README.core.md README.md
echo "Renomeado: README.core.md -> README.md"

# Criar diretórios necessários
echo "Criando diretórios necessários..."
mkdir -p media logs

# Adicionar arquivo .dockerignore
echo "Criando arquivo .dockerignore..."
cat > .dockerignore << EOF
node_modules
.git
.gitignore
backup_original
logs/*
media/*
*.log
*.pid
EOF

echo "Limpeza concluída! Os arquivos originais foram salvos no diretório 'backup_original'"
echo "O projeto agora contém apenas os arquivos necessários para o servidor RTMP simplificado."
echo ""
echo "Para iniciar o servidor RTMP:"
echo "  ./start-rtmp.sh"
echo ""
echo "Para testar com ZoneMinder:"
echo "  ./test-zoneminder.sh" 