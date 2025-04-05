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
        dashFlags: '[f=dash:window_size=3:extra_window_size=5]',
        // Adicionar suporte para MP4 (desabilitado por padrão)
        mp4: process.env.ENABLE_MP4_RECORDING === 'true' || false,
        mp4Flags: '[movflags=frag_keyframe+empty_moov]'
      }
    ]
  },
  auth: {
    api: false,
    play: false,
    publish: false
  },
  // Configuração de armazenamento
  storage: {
    enabled: process.env.STORAGE_ENABLED === 'true' || false,
    maxAgeDays: parseInt(process.env.STORAGE_MAX_AGE_DAYS || '7'),
    maxSpaceGB: parseInt(process.env.STORAGE_MAX_SPACE_GB || '10'),
    // Configurações específicas por câmera serão carregadas de um arquivo separado
    cameraSettings: {}
  },
  logType: process.env.LOG_TYPE || 3
};

// Tentar carregar configurações de câmera personalizadas, se o arquivo existir
const cameraConfigPath = path.join(__dirname, 'camera-config.json');
if (fs.existsSync(cameraConfigPath)) {
  try {
    const cameraConfig = JSON.parse(fs.readFileSync(cameraConfigPath, 'utf8'));
    config.storage.cameraSettings = cameraConfig;
    console.log('Configurações de câmera carregadas com sucesso');
  } catch (error) {
    console.error('Erro ao carregar configurações de câmera:', error.message);
  }
}

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

// Sistema de gerenciamento de armazenamento
const checkStorage = () => {
  if (!config.storage.enabled) return;
  
  // Para cada câmera com armazenamento habilitado
  const checkCameraStorage = (streamPath) => {
    // Extrair o nome da stream (chave da câmera)
    const parts = streamPath.split('/');
    const streamKey = parts[parts.length - 1];
    
    // Configurações para esta câmera (ou usa as configurações globais)
    const cameraConfig = config.storage.cameraSettings[streamKey] || {};
    const maxAgeDays = cameraConfig.maxAgeDays || config.storage.maxAgeDays;
    const maxSpaceGB = cameraConfig.maxSpaceGB || config.storage.maxSpaceGB;
    
    // Caminho para os arquivos MP4 desta câmera
    const cameraDir = path.join(mediaDir, 'live', streamKey);
    if (!fs.existsSync(cameraDir)) return;
    
    // Obter todos os arquivos MP4
    const mp4Files = fs.readdirSync(cameraDir)
      .filter(file => file.endsWith('.mp4'))
      .map(file => {
        const filePath = path.join(cameraDir, file);
        const stats = fs.statSync(filePath);
        return {
          path: filePath,
          size: stats.size,
          mtime: stats.mtime
        };
      });
    
    // Calcular espaço total usado
    const totalSizeBytes = mp4Files.reduce((acc, file) => acc + file.size, 0);
    const totalSizeGB = totalSizeBytes / (1024 * 1024 * 1024);
    
    // Verificar se excedeu o espaço máximo
    if (totalSizeGB > maxSpaceGB) {
      console.log(`Câmera ${streamKey} excedeu espaço máximo: ${totalSizeGB.toFixed(2)}GB/${maxSpaceGB}GB`);
      
      // Ordenar por mais antigo primeiro
      mp4Files.sort((a, b) => a.mtime - b.mtime);
      
      // Remover arquivos até estar abaixo do limite
      let currentSize = totalSizeBytes;
      for (const file of mp4Files) {
        // Se já estamos abaixo do limite, parar
        if (currentSize / (1024 * 1024 * 1024) <= maxSpaceGB * 0.9) break;
        
        // Deletar o arquivo
        try {
          fs.unlinkSync(file.path);
          console.log(`Arquivo deletado por exceder limite de espaço: ${file.path}`);
          currentSize -= file.size;
        } catch (err) {
          console.error(`Erro ao deletar arquivo: ${file.path}`, err);
        }
      }
    }
    
    // Verificar arquivos por idade
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = new Date();
    
    mp4Files.forEach(file => {
      const fileAge = now - file.mtime;
      if (fileAge > maxAgeMs) {
        try {
          fs.unlinkSync(file.path);
          console.log(`Arquivo deletado por exceder idade máxima: ${file.path}`);
        } catch (err) {
          console.error(`Erro ao deletar arquivo: ${file.path}`, err);
        }
      }
    });
  };
  
  // Verificar todas as pastas de câmera
  try {
    const livePath = path.join(mediaDir, 'live');
    if (fs.existsSync(livePath)) {
      fs.readdirSync(livePath).forEach(dir => {
        const streamPath = `/live/${dir}`;
        checkCameraStorage(streamPath);
      });
    }
  } catch (err) {
    console.error('Erro ao verificar armazenamento:', err);
  }
};

// Configurar verificação periódica de armazenamento (a cada hora)
if (config.storage.enabled) {
  setInterval(checkStorage, 60 * 60 * 1000);
  // Verificar também na inicialização
  checkStorage();
  console.log('Sistema de gerenciamento de armazenamento iniciado');
}

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
  
  // Verificar se temos configurações específicas para esta câmera
  const parts = StreamPath.split('/');
  const streamKey = parts[parts.length - 1];
  
  if (config.storage.enabled && config.storage.cameraSettings[streamKey]) {
    const cameraConfig = config.storage.cameraSettings[streamKey];
    
    // Se esta câmera tem a gravação habilitada, ativamos o MP4 para ela
    if (cameraConfig.recordEnabled) {
      // Encontrar a tarefa de transcodificação para este app
      const appName = parts[1]; // Normalmente 'live'
      const transTask = config.trans.tasks.find(task => task.app === appName);
      
      if (transTask) {
        // Habilitar gravação MP4 para esta stream especificamente
        transTask.mp4 = true;
        console.log(`Gravação MP4 habilitada para câmera: ${streamKey}`);
      }
    }
  }
});

nms.on('postPublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on postPublish]', `id=${id}`, `StreamPath=${StreamPath}`, `args=${JSON.stringify(args)}`);
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePublish]', `id=${id}`, `StreamPath=${StreamPath}`, `args=${JSON.stringify(args)}`);
  
  // Após encerrar uma publicação, verificar armazenamento
  if (config.storage.enabled) {
    setTimeout(checkStorage, 5000); // Verificar após 5 segundos
  }
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
if (config.storage.enabled) {
  console.log(`Gravação MP4: ${config.storage.enabled ? 'Habilitada' : 'Desabilitada'}`);
  console.log(`Máximo de dias de armazenamento: ${config.storage.maxAgeDays}`);
  console.log(`Máximo de espaço por câmera: ${config.storage.maxSpaceGB}GB`);
}
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