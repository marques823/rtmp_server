/**
 * Servidor RTSP para integração com DVRs Intelbras
 * 
 * Este módulo implementa a conversão de streams RTMP para RTSP 
 * compatível com DVRs Intelbras
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const NodeRtspServer = require('node-rtsp-server');

// Carregar configurações
let config = {
  rtspServer: {
    port: process.env.RTSP_PORT || 8554,
    rtcpPort: process.env.RTSP_RTCP_PORT || 8555,
    requireAuth: process.env.RTSP_REQUIRE_AUTH === 'true' || false,
    defaultUsername: process.env.RTSP_DEFAULT_USERNAME || 'admin',
    defaultPassword: process.env.RTSP_DEFAULT_PASSWORD || 'admin'
  },
  rtmpToRtsp: {
    enabled: process.env.RTMP_TO_RTSP_ENABLED === 'true' || true,
    autoConvert: true,
    keepOriginal: true
  },
  ffmpegPath: process.env.FFMPEG_PATH || '/usr/bin/ffmpeg',
  rtmpServerUrl: `rtmp://localhost:${process.env.RTMP_PORT || 1936}`,
  streamSettings: {}
};

// Carregar configurações específicas do arquivo intelbras-config.json se existir
const configPath = path.join(__dirname, 'intelbras-config.json');
if (fs.existsSync(configPath)) {
  try {
    const loadedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config = { ...config, ...loadedConfig };
    console.log('Configurações de integração Intelbras carregadas com sucesso');
  } catch (error) {
    console.error('Erro ao carregar configurações de integração Intelbras:', error.message);
  }
}

// Garantir diretórios necessários
const mediaDir = path.join(__dirname, 'media', 'rtsp');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
  console.log(`Diretório RTSP criado: ${mediaDir}`);
}

// Verificar se FFmpeg está disponível
const checkFfmpeg = () => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(config.ffmpegPath, ['-version']);
    
    ffmpeg.on('error', (err) => {
      console.error('ERRO: FFmpeg não encontrado ou não é executável!');
      console.error(`Verifique se o caminho está correto: ${config.ffmpegPath}`);
      reject(err);
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('FFmpeg encontrado e pronto para conversão RTMP para RTSP');
        resolve();
      } else {
        console.error(`FFmpeg falhou com código: ${code}`);
        reject(new Error(`FFmpeg exit code ${code}`));
      }
    });
  });
};

// Classe para gerenciar fluxos RTSP
class RtspStreamManager {
  constructor() {
    this.streams = new Map();
    this.rtspServer = null;
    this.converters = new Map();
    this.authUsers = new Map();
  }
  
  // Função para verificar credenciais para autenticação RTSP
  verifyCredentials(username, password, streamPath) {
    console.log(`Tentativa de autenticação RTSP: usuário=${username}, caminho=${streamPath}`);
    
    // Se não exigir autenticação, permitir acesso
    if (!config.rtspServer.requireAuth) {
      return true;
    }
    
    // Extrair o nome do stream do caminho
    const streamKey = streamPath.split('/').filter(Boolean).pop();
    
    // Verificar se há configurações específicas para esta câmera
    if (streamKey && config.streamSettings && config.streamSettings[streamKey]) {
      const streamConfig = config.streamSettings[streamKey];
      
      // Verificar se câmera tem credenciais específicas
      if (streamConfig.rtspUsername && streamConfig.rtspPassword) {
        return (username === streamConfig.rtspUsername && 
                password === streamConfig.rtspPassword);
      }
    }
    
    // Caso não encontre configurações específicas, usar padrão
    return (username === config.rtspServer.defaultUsername && 
            password === config.rtspServer.defaultPassword);
  }
  
  // Inicializar servidor RTSP
  async start() {
    await checkFfmpeg();
    
    // Inicializar servidor RTSP com suporte a autenticação
    const serverConfig = {
      serverPort: config.rtspServer.port,
      rtcpServerPort: config.rtspServer.rtcpPort,
      clientPort: 0,
      rtcpClientPort: 0
    };
    
    // Adicionar autenticação se configurado
    if (config.rtspServer.requireAuth) {
      serverConfig.authenticate = this.verifyCredentials.bind(this);
      console.log('Autenticação RTSP habilitada');
    }
    
    this.rtspServer = new NodeRtspServer(serverConfig);
    
    this.rtspServer.start();
    console.log(`Servidor RTSP iniciado na porta ${config.rtspServer.port} (RTCP: ${config.rtspServer.rtcpPort})`);
    if (config.rtspServer.requireAuth) {
      console.log(`Autenticação obrigatória: Usuário padrão '${config.rtspServer.defaultUsername}'`);
    } else {
      console.log('Autenticação RTSP desabilitada - acesso anônimo permitido');
    }
    
    // Inicializar conversores para streams configurados
    if (config.rtmpToRtsp.enabled && config.rtmpToRtsp.autoConvert) {
      this.initAutoConverters();
    }
    
    // Monitorar novos streams RTMP
    this.monitorRtmpStreams();
  }
  
  // Inicializar conversores para todos os streams configurados
  initAutoConverters() {
    if (!config.streamSettings) return;
    
    Object.entries(config.streamSettings).forEach(([streamKey, settings]) => {
      if (settings.enableRtsp) {
        const rtmpUrl = `${config.rtmpServerUrl}/live/${streamKey}`;
        const rtspPath = settings.rtspPath || `/${streamKey}`;
        
        console.log(`Configurando conversor automático RTMP→RTSP para: ${streamKey}`);
        this.createStreamConverter(streamKey, rtmpUrl, rtspPath);
      }
    });
  }
  
  // Converter fluxo RTMP para RTSP
  createStreamConverter(streamKey, rtmpUrl, rtspPath) {
    if (this.converters.has(streamKey)) {
      console.log(`Conversor para ${streamKey} já existe, reiniciando...`);
      this.stopStreamConverter(streamKey);
    }
    
    console.log(`Iniciando conversor RTMP→RTSP para ${streamKey}`);
    console.log(`RTMP: ${rtmpUrl}`);
    console.log(`RTSP: rtsp://localhost:${config.rtspServer.port}${rtspPath}`);
    
    // Configurações do stream baseadas no DVR
    const dvrSettings = config.dvrSettings?.intelbras?.streamProperties || {
      videoWidth: 1280,
      videoHeight: 720,
      videoFrameRate: 30,
      videoBitrate: '2M'
    };
    
    // Construir comando FFmpeg para conversão RTMP para RTSP
    const ffmpegArgs = [
      '-i', rtmpUrl,                               // Input RTMP
      '-c:v', 'copy',                              // Copy video codec (sem recodificação)
      '-c:a', 'copy',                              // Copy audio codec (sem recodificação)
      '-f', 'rtsp',                                // Formato de saída RTSP
      '-rtsp_transport', 'tcp',                    // Transporte RTSP via TCP (mais confiável)
      `rtsp://localhost:${config.rtspServer.port}${rtspPath}` // URL RTSP de saída
    ];
    
    // Iniciar processo FFmpeg
    const converter = spawn(config.ffmpegPath, ffmpegArgs);
    
    // Gerenciar saída do processo
    converter.stdout.on('data', (data) => {
      console.log(`[${streamKey} FFmpeg stdout]: ${data.toString().trim()}`);
    });
    
    converter.stderr.on('data', (data) => {
      // FFmpeg escreve logs em stderr mesmo quando não há erro
      const log = data.toString().trim();
      if (log.includes('Error') || log.includes('error')) {
        console.error(`[${streamKey} FFmpeg stderr]: ${log}`);
      } else if (log.includes('stream') || log.includes('Stream mapping')) {
        console.log(`[${streamKey} FFmpeg info]: ${log}`);
      }
    });
    
    converter.on('close', (code) => {
      console.log(`Conversor de ${streamKey} fechado com código ${code}`);
      this.converters.delete(streamKey);
      
      // Tentar reiniciar após 5 segundos se a configuração automática estiver ativa
      if (config.rtmpToRtsp.autoConvert) {
        setTimeout(() => {
          if (!this.converters.has(streamKey)) {
            console.log(`Tentando reiniciar conversor para ${streamKey}...`);
            this.createStreamConverter(streamKey, rtmpUrl, rtspPath);
          }
        }, 5000);
      }
    });
    
    converter.on('error', (err) => {
      console.error(`Erro no conversor de ${streamKey}:`, err);
      this.converters.delete(streamKey);
    });
    
    this.converters.set(streamKey, converter);
    console.log(`Conversor para ${streamKey} iniciado`);
    
    return converter;
  }
  
  // Parar conversor de stream específico
  stopStreamConverter(streamKey) {
    if (!this.converters.has(streamKey)) {
      console.log(`Nenhum conversor encontrado para ${streamKey}`);
      return false;
    }
    
    const converter = this.converters.get(streamKey);
    converter.kill('SIGTERM');
    this.converters.delete(streamKey);
    console.log(`Conversor para ${streamKey} interrompido`);
    return true;
  }
  
  // Monitorar pasta media/live para iniciar novos conversores automaticamente
  monitorRtmpStreams() {
    const liveDir = path.join(__dirname, 'media', 'live');
    if (!fs.existsSync(liveDir)) {
      fs.mkdirSync(liveDir, { recursive: true });
    }
    
    // Verificar streams atuais
    const checkStreams = () => {
      if (!fs.existsSync(liveDir)) return;
      
      fs.readdir(liveDir, (err, dirs) => {
        if (err) {
          console.error('Erro ao ler diretório de streams RTMP:', err);
          return;
        }
        
        dirs.forEach(streamKey => {
          // Verificar se é um diretório e se contém segmentos HLS (sinal de stream ativo)
          const streamDir = path.join(liveDir, streamKey);
          if (!fs.existsSync(path.join(streamDir, 'index.m3u8'))) return;
          
          // Se o stream está ativo mas não tem conversor, criar um novo
          if (config.rtmpToRtsp.autoConvert && !this.converters.has(streamKey)) {
            console.log(`Detectado novo stream RTMP ativo: ${streamKey}`);
            const rtmpUrl = `${config.rtmpServerUrl}/live/${streamKey}`;
            const rtspPath = config.streamSettings[streamKey]?.rtspPath || `/${streamKey}`;
            
            this.createStreamConverter(streamKey, rtmpUrl, rtspPath);
          }
        });
        
        // Verificar conversores sem streams ativos
        this.converters.forEach((converter, streamKey) => {
          const streamDir = path.join(liveDir, streamKey);
          if (!fs.existsSync(path.join(streamDir, 'index.m3u8'))) {
            console.log(`Stream RTMP não mais ativo: ${streamKey}, parando conversor`);
            this.stopStreamConverter(streamKey);
          }
        });
      });
    };
    
    // Verificar a cada 30 segundos
    this.monitorInterval = setInterval(checkStreams, 30000);
    checkStreams(); // Verificar imediatamente
  }
  
  // Parar todos os conversores e servidor
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    
    // Parar todos os conversores
    this.converters.forEach((converter, streamKey) => {
      console.log(`Parando conversor para ${streamKey}`);
      converter.kill('SIGTERM');
    });
    this.converters.clear();
    
    // Parar servidor RTSP
    if (this.rtspServer) {
      this.rtspServer.stop();
      console.log('Servidor RTSP parado');
    }
  }
}

// Criar e iniciar o gerenciador de streams RTSP
const streamManager = new RtspStreamManager();

// Iniciar servidor
const startServer = async () => {
  try {
    await streamManager.start();
    console.log('Sistema de conversão RTMP→RTSP inicializado e pronto para DVRs Intelbras');
  } catch (err) {
    console.error('Falha ao iniciar servidor RTSP:', err);
    process.exit(1);
  }
};

// Gerenciar encerramento gracioso
process.on('SIGINT', () => {
  console.log('Encerrando servidor RTSP...');
  streamManager.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Encerrando servidor RTSP...');
  streamManager.stop();
  process.exit(0);
});

// Iniciar servidor se este arquivo for executado diretamente
if (require.main === module) {
  startServer();
}

// Exportar para uso em outros módulos
module.exports = {
  streamManager,
  startServer
}; 