# RTMP Server para Gravação de CFTV

Este é um servidor RTMP baseado em Node.js para gravação e exibição de streams de vídeo de câmeras de CFTV.

## Características

- Recebe streams RTMP de câmeras IP ou encoders
- Converte streams para HLS e DASH para visualização em navegadores
- Armazena os streams em arquivos MP4
- Limpeza automática de arquivos antigos
- Interface web para visualização dos streams
- Suporte para relay de streams para outros servidores
- Gravação automática de streams em MP4 (opcional)
- Gerenciamento de espaço em disco por câmera

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

O servidor é configurado através dos arquivos na pasta `config/`:

### Config Principal (default.js)

Configuração de portas, RTMP, HTTP, autenticação e logs.

### Configuração de Armazenamento (storage.js)

Configuração para gravação de streams em MP4:

```javascript
{
  global: {
    enabled: true,                      // Habilitar/desabilitar gravação globalmente
    mediaPath: '/caminho/para/media',   // Diretório onde as gravações serão salvas
    maxAgeDays: 7,                      // Tempo máximo em dias para manter as gravações
    maxSpace: 10000,                    // Espaço máximo em MB (0 = sem limite)
    rotationStrategy: 'oldest',         // Estratégia quando atingir limite ('oldest' ou 'largest')
    checkInterval: 60,                  // Intervalo em minutos para verificar espaço em disco
    filenameFormat: '{streamName}_{timestamp}.mp4', // Formato do nome do arquivo
    autoRecord: true                    // Iniciar gravação automaticamente quando stream iniciar
  },
  
  // Configurações específicas por câmera (sobrescrevem as globais)
  cameras: {
    'camera1': {
      maxAgeDays: 3,                    // Manter gravações por 3 dias
      maxSpace: 5000,                   // Limite de 5GB para esta câmera
      enabled: true,                    // Habilitar gravação para esta câmera
      autoRecord: true                  // Gravação automática para esta câmera
    },
    'camera2': {
      maxAgeDays: 10,                   // Manter gravações por 10 dias
      maxSpace: 8000,                   // Limite de 8GB para esta câmera
      enabled: false                    // Desabilitar gravação para esta câmera
    }
  }
}
```

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
rtmp://seu-servidor:1936/live/[stream-key]
```

Substitua `[stream-key]` por um identificador único para cada câmera (ex: camera1, camera2, etc.)

### Visualizar streams:

Acesse a interface web para visualizar os players disponíveis:

```
http://seu-servidor:9001/
```

Opções de visualização:
- **Player Básico**: Para visualizar uma única câmera por vez
- **Multi-Camera Viewer**: Interface avançada para visualização de múltiplas câmeras em grade
- **Gerenciador de Gravações**: Interface para gerenciar e reproduzir as gravações MP4

Você também pode acessar os players diretamente:
```
http://seu-servidor:9001/player.html              # Player básico
http://seu-servidor:9001/multi-player.html        # Player multi-câmera
http://seu-servidor:9001/player-recordings.html   # Gerenciador de gravações
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

### Gerenciamento de Gravações

O servidor inclui uma API RESTful para gerenciar gravações:

#### Endpoints da API

- `GET /api/recordings` - Listar todas as gravações e estatísticas
- `GET /api/recordings/:streamName` - Listar gravações de uma câmera específica
- `POST /api/recordings/:streamName/start` - Iniciar gravação para uma câmera
- `POST /api/recordings/:streamName/stop` - Parar gravação para uma câmera
- `DELETE /api/recordings/:streamName/:filename` - Excluir uma gravação específica
- `POST /api/recordings/cleanup` - Executar limpeza de arquivos antigos

Todas as requisições à API requerem autenticação Basic utilizando as credenciais configuradas em `config/default.js`.

#### Interface Gráfica

O servidor inclui uma interface web para gerenciar as gravações. Acesse em `http://seu-ip:9001/player-recordings.html`.

Características da interface:
- Visualização do uso de armazenamento por câmera
- Listagem de gravações com opções para reproduzir, baixar e excluir
- Iniciar/parar gravações manualmente
- Autenticação usando as mesmas credenciais da API

### Limpeza automática de arquivos antigos:

O sistema realiza limpeza automática diária de arquivos antigos baseando-se nas configurações:
- Arquivos mais antigos que `maxAgeDays` são removidos
- Quando o espaço utilizado excede `maxSpace`, a estratégia de rotação é aplicada

Execute a limpeza manualmente:
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
├── app.js                # Arquivo principal do servidor
├── cleanup.js            # Script para limpeza de arquivos antigos
├── config/               # Configurações do servidor
│   ├── default.js        # Configuração padrão
│   └── storage.js        # Configuração de armazenamento de gravações
├── api/                  # API REST para gerenciamento
│   ├── index.js          # Arquivo principal da API
│   ├── middlewares/      # Middlewares (autenticação, etc.)
│   └── routes/           # Rotas da API
├── storage-manager.js    # Gerenciador de armazenamento
├── logs/                 # Logs do servidor
├── player.html           # Player web para visualização
├── multi-player.html     # Player multi-câmeras
├── player-recordings.html# Interface de gerenciamento de gravações
├── relay.sh              # Script para relay de streams
└── rtmp-server/          # Diretório de armazenamento dos streams
    └── media/            # Arquivos de mídia armazenados
```

## Licença

ISC
