# Integração RTMP → RTSP para DVRs Intelbras

Este módulo adiciona suporte para integração do servidor RTMP com DVRs Intelbras através da conversão automática de streams RTMP para RTSP.

## Características

* Servidor RTSP integrado na porta 8554
* Conversão automática de streams RTMP para RTSP
* Compatibilidade com DVRs Intelbras (testado com modelos NVD)
* Configuração flexível por câmera
* Scripts de teste para validação da integração

## Como Funciona

O sistema opera da seguinte forma:

1. Câmeras IP ou codificadores enviam streams via protocolo RTMP para o servidor
2. O servidor RTMP recebe os streams e os processa (gravação MP4, HLS, etc.)
3. O módulo RTSP detecta automaticamente novos streams RTMP
4. Para cada stream RTMP, um processo FFmpeg é iniciado para fazer a conversão para RTSP
5. Os streams RTSP ficam disponíveis na porta 8554
6. O DVR Intelbras pode acessar os streams via protocolo RTSP

## Requisitos

* FFmpeg instalado no sistema
* Node.js 14.x ou superior
* DVR Intelbras com suporte a RTSP (linha NVD, MHDX, etc.)
* Câmeras ou codificadores com suporte a RTMP

## Instalação

### Opção 1: Executar localmente

1. Clone este repositório
2. Instale as dependências: `npm install`
3. Inicie o servidor: `./start-intelbras-rtsp.sh`

### Opção 2: Usar Docker

1. Clone este repositório
2. Configure o arquivo `intelbras-config.json` conforme necessário
3. Execute com Docker Compose: `docker-compose up -d`

## Configuração

A configuração é feita através do arquivo `intelbras-config.json`. Exemplo:

```json
{
  "rtspServer": {
    "port": 8554,
    "rtcpPort": 8555
  },
  "rtmpToRtsp": {
    "enabled": true,
    "autoConvert": true,
    "keepOriginal": true
  },
  "dvrSettings": {
    "intelbras": {
      "model": "NVD",
      "streamFormat": "h264",
      "streamProperties": {
        "videoWidth": 1280,
        "videoHeight": 720,
        "videoFrameRate": 30,
        "videoBitrate": "2M",
        "audioChannels": 1,
        "audioSampleRate": 44100
      }
    }
  },
  "streamSettings": {
    "camera1": {
      "name": "Câmera Frontal",
      "enableRtsp": true,
      "rtspPath": "/camera1",
      "dvrIntegration": true,
      "dvrIp": "192.168.1.100",
      "dvrUsername": "admin",
      "dvrPassword": "admin",
      "dvrChannel": 1
    }
  }
}
```

## Uso

### 1. Enviar streams RTMP para o servidor

Configure suas câmeras ou codificadores para enviar streams RTMP:

```
rtmp://seu-servidor:1936/live/camera1
```

### 2. Acessar streams RTSP

Os streams estarão disponíveis via RTSP:

```
rtsp://seu-servidor:8554/camera1
```

### 3. Configurar DVR Intelbras

1. Acesse o menu do DVR
2. Vá para Câmera > Adicionar Câmera
3. Selecione adição manual
4. Configure o endereço RTSP: `rtsp://seu-servidor:8554/camera1`
5. Use o método de conexão TCP

## Teste da Integração

1. Inicie o servidor: `./start-intelbras-rtsp.sh`
2. Execute o script de teste: `./teste-dvr-intelbras.sh`
3. O script enviará um stream de teste e verificará se a conversão para RTSP está funcionando
4. Siga as instruções no terminal para configurar seu DVR Intelbras

### Parâmetros do Teste

```
./teste-dvr-intelbras.sh [ip-rtmp] [ip-rtsp] [stream-key]
```

Exemplo:
```
./teste-dvr-intelbras.sh 192.168.1.10 192.168.1.10 camera-teste
```

## Solução de Problemas

### 1. Verificar status do servidor

```
tail -f logs/server.log
```

### 2. Verificar conversão RTMP para RTSP

```
ps aux | grep "ffmpeg.*rtsp"
```

### 3. Testar conexão RTSP

```
ffplay -rtsp_transport tcp rtsp://seu-servidor:8554/camera1
```

### 4. Problemas comuns

* **O DVR não detecta o stream RTSP**: Verifique se está usando TCP como método de transporte RTSP
* **Erro de conexão recusada**: Verifique se a porta 8554 está aberta no firewall
* **Stream RTMP funciona mas RTSP não**: Verifique se o FFmpeg está instalado corretamente

## Integrando com modelos específicos de DVR Intelbras

### NVD 1304

- Suporta até 720p via RTSP (recomendado)
- Conexão: TCP
- Codec: H.264

### MHDX 1104

- Suporta até 1080p via RTSP
- Conexão: TCP
- Codec: H.264

## Limitações

- A conversão RTMP→RTSP adiciona uma pequena latência (tipicamente 1-2 segundos)
- Alguns recursos avançados dos DVRs (como análise de vídeo) podem não funcionar com streams RTSP externos
- O número de streams simultâneos é limitado pelo desempenho do servidor

## Contribuição

Contribuições são bem-vindas! Por favor, envie pull requests ou abra issues para melhorias. 