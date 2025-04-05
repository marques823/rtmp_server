const NodeMediaServer = require('node-media-server');
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('./config/default');
const storageConfig = require('./config/storage');
const storageManager = require('./storage-manager');

// Ensure logs directory exists
const logsDir = config.logs.logPath;
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Ensure media directory exists
const mediaDir = config.storage.mediaPath;
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

// Extract RTMP server configuration
const rtmpConfig = {
  rtmp: config.rtmp,
  http: {
    ...config.http,
    api: true,
    api_user: config.auth.api_user,
    api_pass: config.auth.api_pass
  },
  relay: config.relay,
  trans: config.trans,
  auth: config.auth,
  logType: config.logs.logType,
  logPath: config.logs.logPath
};

// Print config for debugging
console.log('RTMP Server Configuration:');
console.log(JSON.stringify(rtmpConfig, null, 2));

// Create and start the server
const nms = new NodeMediaServer(rtmpConfig);

// Register event handlers
nms.on('prePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  
  // Extract stream name from the path (/live/stream-name)
  const streamName = StreamPath.split('/')[2];
  
  // Verificar se a gravação automática está habilitada para esta câmera
  const cameraConfig = storageConfig.cameras[streamName] || {};
  const globalConfig = storageConfig.global;
  const autoRecord = cameraConfig.autoRecord !== undefined ? cameraConfig.autoRecord : globalConfig.autoRecord;
  
  if (autoRecord) {
    // A URL do stream será rtmp://localhost:porta/live/stream-name
    const streamUrl = `rtmp://localhost:${config.rtmp.port}${StreamPath}`;
    console.log(`[AutoRecord] Iniciando gravação automática para ${streamName} em ${streamUrl}`);
    
    // Aguardar um momento para garantir que o stream esteja estabelecido
    setTimeout(() => {
      storageManager.startRecording(streamName, streamUrl);
    }, 2000);
  }
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  
  // Extract stream name from the path
  const streamName = StreamPath.split('/')[2];
  
  // Parar gravação se estiver ativa
  storageManager.stopRecording(streamName);
});

// Execute a limpeza programada
const runScheduledCleanup = () => {
  console.log('[Scheduled Cleanup] Iniciando limpeza programada...');
  storageManager.runCleanup();
};

// Agendar limpeza diária
const DAILY_CLEANUP_TIME = 24 * 60 * 60 * 1000; // 24 horas em milissegundos
setInterval(runScheduledCleanup, DAILY_CLEANUP_TIME);

// Executar limpeza inicial ao iniciar
setTimeout(runScheduledCleanup, 10000);

// Interceptar o servidor HTTP do Node Media Server para adicionar nossas rotas
nms.on('postHttp', (httpServer) => {
  console.log('HTTP Server initialized, setting up API routes...');
  
  // Obter a instância do app Express que o NodeMediaServer usa
  const app = httpServer._events.request;
  
  // Configurar nossa API
  const setupApi = require('./api');
  setupApi(app, httpServer);
});

nms.run();

// Log server start
console.log('RTMP Server started');
console.log(`RTMP: rtmp://localhost:${config.rtmp.port}/live/[stream-key]`);
console.log(`HTTP-FLV: http://localhost:${config.http.port}/live/[stream-key].flv`);
console.log(`HLS: http://localhost:${config.http.port}/live/[stream-key]/index.m3u8`);
console.log(`DASH: http://localhost:${config.http.port}/live/[stream-key]/index.mpd`);
console.log(`MP4 Recording Storage: ${storageConfig.global.enabled ? 'Enabled' : 'Disabled'}`);
console.log(`API: http://localhost:${config.http.port}/api`);
console.log(`Recordings: http://localhost:${config.http.port}/recordings/[camera]`);
