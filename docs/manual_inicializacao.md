# Manual de Inicialização dos Servidores RTMP CFTV

Este guia descreve como iniciar os componentes do sistema de gravação CFTV, verificar seu status e solucionar problemas comuns.

## Requisitos

- Node.js 12.x ou superior
- FFmpeg instalado no sistema (para transcodificação)

## Iniciar os Servidores

### Método 1: Inicialização Individual (Recomendado para Desenvolvimento)

#### 1. Servidor RTMP (Principal)

```bash
# Inicia o servidor RTMP e redireciona logs para app.log
node app.js > app.log 2>&1 & echo $!
```

Este servidor gerencia:
- Recepção de streams RTMP na porta 1936
- Conversão para HLS/DASH/FLV na porta 8095
- Gravação de arquivos MP4

O número exibido após o comando é o PID do processo, útil para encerrar o servidor posteriormente.

#### 2. Servidor Estático (Interface Web)

```bash
# Inicia o servidor web estático e redireciona logs para static.log
node static_server.js > static.log 2>&1 & echo $!
```

Este servidor disponibiliza:
- Interface web na porta 9001
- Players de vídeo (http://localhost:9001/player.html)
- Visualização multi-câmeras (http://localhost:9001/multi-player.html)
- Gerenciador de gravações (http://localhost:9001/player-recordings.html)

#### 3. Servidor API (Gerenciamento)

```bash
# Inicia o servidor API e redireciona logs para api.log
node api/standalone.js > api.log 2>&1 & echo $!
```

Este servidor oferece:
- API REST na porta 8096
- Endpoint de status: http://localhost:8096/api/status
- Gerenciamento de gravações: http://localhost:8096/api/recordings
- Autenticação com credenciais admin/admin

### Método 2: Inicialização com Script (Recomendado para Produção)

Execute o script incluído para iniciar todos os servidores de uma vez:

```bash
./start-servers.sh
```

Para encerrar todos os servidores:

```bash
./stop-servers.sh
```

## Verificação de Status

### Verificar se os Servidores estão em Execução

```bash
# Listar processos Node.js em execução
ps aux | grep node | grep -E "app.js|static_server|standalone"
```

### Verificar Logs

```bash
# Verificar log do servidor RTMP
tail -f app.log

# Verificar log do servidor estático
tail -f static.log

# Verificar log do servidor API
tail -f api.log
```

### Verificar Portas em Uso

```bash
# Verificar se as portas estão em uso
netstat -tuln | grep -E "9001|8096|8095|1936"
```

## Testando o Sistema

### Enviar Stream de Teste

Para verificar se o servidor RTMP está funcionando corretamente, envie um stream de teste:

```bash
# Gera um padrão de teste colorido com áudio
ffmpeg -f lavfi -i testsrc=size=640x480:rate=30 -f lavfi -i sine=frequency=1000:sample_rate=44100 -c:v libx264 -c:a aac -f flv rtmp://localhost:1936/live/camera1 -nostdin -nostats -v quiet &
```

Para encerrar o stream de teste:

```bash
# Encontrar e encerrar o processo ffmpeg
pkill -f ffmpeg
```

### Acessar os Players

Após iniciar os servidores e o stream de teste, acesse:

1. **Player Básico**: http://localhost:9001/player.html
   - Digite "camera1" como Stream Key
   - Escolha um formato (HLS ou HTTP-FLV)

2. **Multi-Camera Viewer**: http://localhost:9001/multi-player.html
   - Adicione uma câmera com o nome "Câmera 1" e Stream Key "camera1"

3. **Gerenciador de Gravações**: http://localhost:9001/player-recordings.html
   - Faça login com usuário `admin` e senha `admin`

## Diagnóstico de Problemas Comuns

### Servidor RTMP não Inicia

Sintomas:
- Mensagem de erro ao iniciar o servidor
- Porta 1936 não está em escuta

Soluções:
1. Verifique se a porta 1936 já está em uso por outro processo
2. Verifique os logs em `app.log` para detalhes do erro
3. Certifique-se de que o FFmpeg está instalado corretamente

### Erro de Conexão na Transmissão

Sintomas:
- FFmpeg mostra erros como "Connection refused" ou "Connection reset by peer"
- O stream não aparece nos players

Soluções:
1. Verifique se o servidor RTMP está em execução
2. Confirme se está usando a porta correta (1936)
3. Verifique os logs em `app.log` para erros específicos

### Player não Mostra o Vídeo

Sintomas:
- Interface do player carrega, mas o vídeo não é exibido
- Mensagem de erro no console do navegador

Soluções:
1. Verifique se o servidor HTTP está configurado na porta 8095
2. Confirme se o stream está sendo recebido pelo servidor RTMP
3. Tente os diferentes formatos (HLS e HTTP-FLV)
4. Verifique se há bloqueio de conteúdo misto no navegador

## Armazenamento e Gravações

As gravações são salvas em `rtmp-server/media/[nome-da-camera]/`. O sistema gerencia automaticamente o espaço em disco de acordo com as configurações em `config/storage.js`.

Para verificar o status das gravações via API:

```bash
curl -s -u admin:admin http://localhost:8096/api/recordings
```

## Reinicialização Após Atualização

Quando atualizar o código, siga estes passos:

1. Encerre todos os servidores:
   ```bash
   pkill -f app.js
   pkill -f static_server
   pkill -f standalone.js
   ```

2. Atualize o código-fonte (git pull, etc.)

3. Reinicie os servidores seguindo as instruções deste manual 