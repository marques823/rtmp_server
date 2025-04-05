# RTMP Server Core para ZoneMinder

Um servidor RTMP simplificado para recebimento de streams de câmeras IP e integração com ZoneMinder.

## Características

- Servidor RTMP leve para receber streams de câmeras IP ou codificadores
- Conversão automática para HLS e DASH para visualização em navegadores
- Suporte para Docker e Docker Compose
- Compatível com ZoneMinder para monitoramento e análise
- Sem interface web, gravação ou API (versão simplificada)

## Requisitos

Para execução local:
- Node.js 14.x ou superior
- FFmpeg instalado no sistema

Para execução com Docker:
- Docker
- Docker Compose (opcional, para uso com docker-compose.yml)

## Instalação

### Método 1: Instalação Local

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/rtmp-server.git
   cd rtmp-server
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Certifique-se de que o FFmpeg está instalado:
   ```bash
   ffmpeg -version
   ```
   Se não estiver instalado, instale com:
   ```bash
   sudo apt update && sudo apt install -y ffmpeg
   ```

4. Inicie o servidor:
   ```bash
   ./start-rtmp.sh
   ```

### Método 2: Usando Docker

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/rtmp-server.git
   cd rtmp-server
   ```

2. Construa e inicie o contêiner usando Docker Compose:
   ```bash
   docker-compose up -d
   ```

Ou use os comandos Docker diretamente:
   ```bash
   docker build -t rtmp-server .
   docker run -d --name rtmp-server -p 1936:1936 -p 8090:8090 rtmp-server
   ```

## Utilização

### Enviar streams para o servidor

Configure sua câmera IP ou codificador para transmitir para:

```
rtmp://seu-servidor:1936/live/[stream-key]
```

Substitua `[stream-key]` por um identificador único para cada câmera (ex: camera1, camera2, etc.)

### Acessar streams

Os streams podem ser acessados nos seguintes formatos:

- **RTMP**: `rtmp://seu-servidor:1936/live/[stream-key]`
- **HTTP-FLV**: `http://seu-servidor:8090/live/[stream-key].flv`
- **HLS**: `http://seu-servidor:8090/live/[stream-key]/index.m3u8`
- **DASH**: `http://seu-servidor:8090/live/[stream-key]/index.mpd`

### Integração com ZoneMinder

1. Adicione uma fonte de câmera no ZoneMinder do tipo "FFMPEG"
2. Use a URL HLS ou RTMP como fonte
3. Configure o caminho completo conforme mostrado abaixo:

Para HLS:
```
http://seu-servidor:8090/live/camera1/index.m3u8
```

Ou para RTMP:
```
rtmp://seu-servidor:1936/live/camera1
```

## Teste com FFmpeg

Para enviar um stream de teste:

```bash
ffmpeg -f lavfi -i testsrc=size=640x480:rate=30 -f lavfi -i sine=frequency=1000:sample_rate=44100 -c:v libx264 -c:a aac -f flv rtmp://localhost:1936/live/test
```

## Configuração

### Arquivo de Configuração

O servidor utiliza variáveis de ambiente para configuração. Se estiver usando Docker, você pode modificá-las no arquivo `docker-compose.yml`:

```yaml
environment:
  - RTMP_PORT=1936
  - HTTP_PORT=8090
  - FFMPEG_PATH=/usr/bin/ffmpeg
  - LOG_TYPE=3
```

### Log Levels

- 0: Sem logs
- 1: Apenas erros
- 2: Erros e avisos
- 3: Informações (padrão)
- 4: Debug (detalhado)

## Gerenciamento

### Iniciar o servidor (local)

```bash
./start-rtmp.sh
```

### Parar o servidor (local)

```bash
./stop-rtmp.sh
```

### Verificar logs

```bash
tail -f logs/rtmp.log
```

### Comandos Docker

```bash
# Iniciar com Docker Compose
docker-compose up -d

# Verificar logs
docker-compose logs -f

# Parar
docker-compose down
```

## Limitações

Esta versão simplificada não inclui:
- Interface web para visualização de streams
- Gerenciador de gravações
- API para gerenciamento
- Autenticação para publicação e visualização

Essas funcionalidades estão disponíveis na versão completa do projeto.

## Licença

ISC 