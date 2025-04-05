# RTMP Server para Gravação de CFTV

Este é um servidor RTMP baseado em Node.js para gravação e exibição de streams de vídeo de câmeras de CFTV.

## Características

- Recebe streams RTMP de câmeras IP ou encoders
- Converte streams para HLS e DASH para visualização em navegadores
- Armazena os streams em arquivos MP4
- Limpeza automática de arquivos antigos
- Interface web para visualização dos streams
- Suporte para relay de streams para outros servidores

## Requisitos

- Node.js 12.x ou superior
- FFmpeg instalado no sistema (para transcodificação)

## Instalação

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

## Configuração

O servidor é configurado através do arquivo `config/default.js`. Você pode ajustar:

- Portas RTMP e HTTP
- Configurações de autenticação
- Diretórios de armazenamento
- Parâmetros de transcodificação

## Uso

### Iniciar o servidor:

```bash
npm start
```

Ou para desenvolvimento com reinício automático:

```bash
npm run dev
```

### Configurar uma câmera para transmitir para o servidor:

Configure sua câmera IP ou encoder para transmitir para:

```
rtmp://seu-servidor:1935/live/[stream-key]
```

Substitua `[stream-key]` por um identificador único para cada câmera (ex: camera1, camera2, etc.)

### Visualizar streams:

Acesse a interface web para visualizar os players disponíveis:

```
http://seu-servidor:9000/
```

Opções de visualização:
- **Player Básico**: Para visualizar uma única câmera por vez
- **Multi-Camera Viewer**: Interface avançada para visualização de múltiplas câmeras em grade

Você também pode acessar os players diretamente:
```
http://seu-servidor:9000/player.html      # Player básico
http://seu-servidor:9000/multi-player.html # Player multi-câmera
```

### Relay de streams para outro servidor:

Para reenviar um stream para outro servidor RTMP:

```bash
./relay.sh [stream-key] [destino-rtmp]
```

Exemplo:
```bash
./relay.sh camera1 rtmp://outro-servidor.com/live/camera1
```

### Limpeza automática de arquivos antigos:

Execute manualmente:
```bash
npm run cleanup
```

Ou configure como uma tarefa cron para execução periódica:
```
0 2 * * * cd /caminho/para/rtmp-server && npm run cleanup
```

## Estrutura do projeto

```
rtmp-server/
├── app.js            # Arquivo principal do servidor
├── cleanup.js        # Script para limpeza de arquivos antigos
├── config/           # Configurações do servidor
│   └── default.js    # Configuração padrão
├── logs/             # Logs do servidor
├── player.html       # Player web para visualização
├── relay.sh          # Script para relay de streams
└── rtmp-server/      # Diretório de armazenamento dos streams
    └── media/        # Arquivos de mídia armazenados
```

## Licença

ISC
