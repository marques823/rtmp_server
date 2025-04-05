# RTMP Server Core para ZoneMinder

Um servidor RTMP simplificado para recebimento de streams de câmeras IP e integração com ZoneMinder.

## Características

- Servidor RTMP leve para receber streams de câmeras IP ou codificadores
- Conversão automática para HLS e DASH para visualização em navegadores
- Suporte para Docker e Docker Compose
- Compatível com ZoneMinder para monitoramento e análise
- **Novo:** Armazenamento opcional em MP4 configurável por câmera
- **Novo:** Gerenciamento automático de espaço em disco por câmera
- Sem interface web ou API (versão simplificada)

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

4. Configure o armazenamento de câmeras (opcional):
   ```bash
   # Edite o arquivo de configuração de câmeras
   nano camera-config.json
   ```

5. Inicie o servidor:
   ```bash
   ./start-rtmp.sh
   ```

### Método 2: Usando Docker

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/rtmp-server.git
   cd rtmp-server
   ```

2. Configure o armazenamento de câmeras (opcional):
   ```bash
   # Edite o arquivo de configuração de câmeras
   nano camera-config.json
   ```

3. Construa e inicie o contêiner usando Docker Compose:
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
- **MP4**: Os arquivos MP4 são salvos em `media/live/[stream-key]/[timestamp].mp4`

### Configuração de Armazenamento

O sistema permite configurar o armazenamento de streams em arquivos MP4, com gerenciamento automático de espaço. A configuração pode ser feita através de variáveis de ambiente ou pelo arquivo `camera-config.json`.

#### Configuração Global (Variáveis de Ambiente)

```
STORAGE_ENABLED=true         # Habilitar armazenamento
ENABLE_MP4_RECORDING=true    # Habilitar gravação em MP4
STORAGE_MAX_AGE_DAYS=7       # Máximo de dias para manter arquivos
STORAGE_MAX_SPACE_GB=10      # Máximo de espaço em GB por câmera
```

#### Configuração por Câmera

Crie ou edite o arquivo `camera-config.json` com o seguinte formato:

```json
{
  "camera1": {
    "name": "Câmera Frontal",
    "description": "Câmera de segurança na entrada principal",
    "recordEnabled": true,
    "maxAgeDays": 5,
    "maxSpaceGB": 2
  },
  "camera2": {
    "name": "Câmera Corredor",
    "description": "Câmera de segurança no corredor principal",
    "recordEnabled": true,
    "maxAgeDays": 3,
    "maxSpaceGB": 1.5
  }
}
```

Cada câmera pode ter as seguintes configurações:
- `name`: Nome da câmera (para referência)
- `description`: Descrição da câmera (para referência)
- `recordEnabled`: Habilitar gravação para esta câmera (true/false)
- `maxAgeDays`: Máximo de dias para manter arquivos desta câmera
- `maxSpaceGB`: Máximo de espaço em GB para arquivos desta câmera

O sistema verificará automaticamente o espaço utilizado a cada hora e removerá arquivos antigos ou quando o espaço máximo for excedido.

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
  - STORAGE_ENABLED=true
  - ENABLE_MP4_RECORDING=true
  - STORAGE_MAX_AGE_DAYS=7
  - STORAGE_MAX_SPACE_GB=10
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
- API para gerenciamento avançado
- Autenticação para publicação e visualização

Essas funcionalidades estão disponíveis na versão completa do projeto.

## Licença

ISC 