#!/bin/bash

# Script para listar arquivos que seriam mantidos e removidos
# Autor: Tiago
# Data: Abril de 2025

echo "=== Análise dos arquivos para o RTMP Core ==="

# Lista de arquivos para manter
FILES_TO_KEEP=(
  "rtmp-core.js"
  "package.json"
  "docker-compose.yml"
  "Dockerfile"
  "README.md"
  "start-rtmp.sh"
  "stop-rtmp.sh"
  "test-zoneminder.sh"
  "stop-test-zoneminder.sh"
  ".dockerignore"
)

# Lista de diretórios para manter
DIRS_TO_KEEP=(
  "media"
  "logs"
  "node_modules"
  ".git"
)

echo "Arquivos que seriam mantidos:"
for file in "${FILES_TO_KEEP[@]}"; do
  if [[ -f "$file" ]]; then
    echo "  - $file"
  else
    echo "  - $file (não encontrado)"
  fi
done

echo -e "\nDiretórios que seriam mantidos:"
for dir in "${DIRS_TO_KEEP[@]}"; do
  if [[ -d "$dir" ]]; then
    echo "  - $dir"
  else
    echo "  - $dir (não encontrado)"
  fi
done

echo -e "\nArquivos que seriam removidos:"
for file in *; do
  if [[ -f "$file" ]] && [[ ! " ${FILES_TO_KEEP[@]} " =~ " ${file} " ]] && [[ "$file" != "list-files.sh" ]]; then
    echo "  - $file"
  fi
done

echo -e "\nDiretórios que seriam removidos:"
for dir in */; do
  dir=${dir%/}
  if [[ -d "$dir" ]] && [[ ! " ${DIRS_TO_KEEP[@]} " =~ " ${dir} " ]] && [[ "$dir" != "backup_original" ]]; then
    echo "  - $dir"
  fi
done

echo -e "\nPara limpar os arquivos, execute o script de limpeza:"
echo "  ./cleanup-files.sh" 