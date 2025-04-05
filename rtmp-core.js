/**
 * RTMP Core Server
 * 
 * Versão simplificada do servidor RTMP para integração com ZoneMinder
 * Sem interface web, sem API, apenas o servidor RTMP para streaming
 */

const NodeMediaServer = require('node-media-server');
const fs = require('fs');
const path = require('path');

// Carregar configuração
const config = {
  rtmp: {
    port: process.env.RTMP_PORT || 1936,
    chunk_size: process.env.RTMP_CHUNK_SIZE || 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: process.env.HTTP_PORT || 8090,
    allow_origin: '*',
    mediaroot: path.join(__dirname, 'media'),
  },
  trans: {
    ffmpeg: process.env.FFMPEG_PATH || '/usr/bin/ffmpeg',
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        dash: true,
        dashFlags: '[f=dash:window_size=3:extra_window_size=5]'
      }
    ]
  },
  auth: {
    api: false,
    play: false,
    publish: false
  },
  logType: process.env.LOG_TYPE || 3
};

// Garantir que diretórios necessários existam
const mediaDir = path.join(__dirname, 'media');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
  console.log(`Diretório de mídia criado: ${mediaDir}`);
}

// Verificar se o FFmpeg está disponível
const { exec } = require('child_process');
exec(`${config.trans.ffmpeg} -version`, (error) => {
  if (error) {
    console.error('ERRO: FFmpeg não encontrado ou não é executável!');
    console.error(`Verifique se o caminho está correto: ${config.trans.ffmpeg}`);
    console.error('A transcodificação não funcionará sem o FFmpeg instalado.');
  } else {
    console.log('FFmpeg encontrado e pronto para uso.');
  }
});

// Mostrar configuração para debug
console.log('Configuração do servidor RTMP:');
console.log(JSON.stringify(config, null, 2));

// Criar e iniciar o servidor
const nms = new NodeMediaServer(config);

// Manipuladores de eventos
nms.on('preConnect', (id, args) => {
  console.log('[NodeEvent on preConnect]', `id=${id}`, `args=${JSON.stringify(args)}`);
});

nms.on('postConnect', (id, args) => {
  console.log('[NodeEvent on postConnect]', `id=${id}`, `args=${JSON.stringify(args)}`);
});

nms.on('doneConnect', (id, args) => {
  console.log('[NodeEvent on doneConnect]', `id=${id}`, `args=${JSON.stringify(args)}`);
});

nms.on('prePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on prePublish]', `id=${id}`, `StreamPath=${StreamPath}`, `args=${JSON.stringify(args)}`);
});

nms.on('postPublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on postPublish]', `id=${id}`, `StreamPath=${StreamPath}`, `args=${JSON.stringify(args)}`);
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePublish]', `id=${id}`, `StreamPath=${StreamPath}`, `args=${JSON.stringify(args)}`);
});

nms.on('prePlay', (id, StreamPath, args) => {
  console.log('[NodeEvent on prePlay]', `id=${id}`, `StreamPath=${StreamPath}`, `args=${JSON.stringify(args)}`);
});

nms.on('postPlay', (id, StreamPath, args) => {
  console.log('[NodeEvent on postPlay]', `id=${id}`, `StreamPath=${StreamPath}`, `args=${JSON.stringify(args)}`);
});

nms.on('donePlay', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePlay]', `id=${id}`, `StreamPath=${StreamPath}`, `args=${JSON.stringify(args)}`);
});

// Iniciar o servidor
nms.run();

// Exibir informações úteis
console.log('===================================================');
console.log('Servidor RTMP para ZoneMinder iniciado com sucesso!');
console.log('===================================================');
console.log(`RTMP: rtmp://localhost:${config.rtmp.port}/live/[stream-key]`);
console.log(`HTTP-FLV: http://localhost:${config.http.port}/live/[stream-key].flv`);
console.log(`HLS: http://localhost:${config.http.port}/live/[stream-key]/index.m3u8`);
console.log(`DASH: http://localhost:${config.http.port}/live/[stream-key]/index.mpd`);
console.log('===================================================');
console.log('Para enviar um stream de teste:');
console.log(`ffmpeg -f lavfi -i testsrc=size=640x480:rate=30 -f lavfi -i sine=frequency=1000:sample_rate=44100 -c:v libx264 -c:a aac -f flv rtmp://localhost:${config.rtmp.port}/live/test`);
console.log('===================================================');

// Capturar sinais para encerramento limpo
process.on('SIGINT', () => {
  console.log('Encerrando servidor RTMP...');
  nms.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Encerrando servidor RTMP...');
  nms.stop();
  process.exit(0);
}); 