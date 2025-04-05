FROM node:18-slim

# Instalar dependências
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Criar diretório da aplicação
WORKDIR /app

# Copiar apenas arquivos necessários
COPY package*.json ./
COPY rtmp-core.js ./

# Criar diretórios necessários
RUN mkdir -p media logs

# Instalar dependências
RUN npm install

# Expor portas
EXPOSE 1936 8090

# Comando para iniciar o servidor
CMD ["node", "rtmp-core.js"] 