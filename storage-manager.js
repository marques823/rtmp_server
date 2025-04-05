/**
 * Storage Manager para RTMP Server
 * Gerencia gravação e rotação de arquivos de gravação baseado nas configurações
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const config = require('./config/default');
const storageConfig = require('./config/storage');

class StorageManager {
  constructor() {
    this.mediaPath = storageConfig.mediaPath;
    this.config = storageConfig;
    this.activeRecordings = new Map(); // streamName -> {process, startTime, filePath}
    this.timers = new Map();
    
    // Criar diretório de mídia se não existir
    if (!fs.existsSync(this.mediaPath)) {
      fs.mkdirSync(this.mediaPath, { recursive: true });
    }
    
    // Iniciar verificação de espaço periódica
    this._startDiskSpaceCheck();
  }
  
  /**
   * Inicia gravação de um stream
   * @param {string} streamName - Nome do stream (ex: camera1)
   * @param {string} streamUrl - URL do stream (ex: rtmp://localhost:1936/live/camera1)
   * @returns {boolean} - Sucesso da operação
   */
  startRecording(streamName, streamUrl) {
    // Verificar se já está gravando
    if (this.activeRecordings.has(streamName)) {
      console.log(`[StorageManager] Stream ${streamName} já está sendo gravado`);
      return false;
    }
    
    // Verificar se existe configuração específica para esta câmera
    const cameraConfig = this._getCameraConfig(streamName);
    
    // Verificar se gravação está desabilitada para esta câmera
    if (cameraConfig.enabled === false) {
      console.log(`[StorageManager] Gravação desabilitada para ${streamName}`);
      return false;
    }
    
    // Criar diretório para esta câmera se não existir
    const cameraDir = path.join(this.mediaPath, streamName);
    if (!fs.existsSync(cameraDir)) {
      fs.mkdirSync(cameraDir, { recursive: true });
    }
    
    // Verificar espaço disponível
    if (!this._hasEnoughSpace(streamName)) {
      console.log(`[StorageManager] Espaço insuficiente para ${streamName}. Aplicando estratégia de rotação.`);
      this._applyRotationStrategy(streamName);
    }
    
    // Gerar nome do arquivo baseado no formato configurado
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = cameraConfig.filenameFormat
      .replace('{streamName}', streamName)
      .replace('{timestamp}', timestamp);
    
    const filePath = path.join(cameraDir, fileName);
    
    // Iniciar gravação com ffmpeg
    try {
      const ffmpegCmd = `ffmpeg -i ${streamUrl} -c copy -f mp4 ${filePath}`;
      console.log(`[StorageManager] Iniciando gravação de ${streamName}: ${ffmpegCmd}`);
      
      const process = exec(ffmpegCmd);
      const startTime = Date.now();
      
      // Armazenar informações sobre a gravação ativa
      this.activeRecordings.set(streamName, {
        process,
        startTime,
        filePath
      });
      
      // Configurar listeners para o processo
      process.stdout.on('data', (data) => {
        console.log(`[ffmpeg:${streamName}] ${data}`);
      });
      
      process.stderr.on('data', (data) => {
        console.error(`[ffmpeg:${streamName}] ${data}`);
      });
      
      process.on('close', (code) => {
        console.log(`[StorageManager] Gravação de ${streamName} finalizada com código ${code}`);
        this.activeRecordings.delete(streamName);
      });
      
      return true;
    } catch (err) {
      console.error(`[StorageManager] Erro ao iniciar gravação de ${streamName}:`, err);
      return false;
    }
  }
  
  /**
   * Para a gravação de um stream
   * @param {string} streamName - Nome do stream
   * @returns {boolean} - Sucesso da operação
   */
  stopRecording(streamName) {
    if (!this.activeRecordings.has(streamName)) {
      console.log(`[StorageManager] Stream ${streamName} não está sendo gravado`);
      return false;
    }
    
    const recording = this.activeRecordings.get(streamName);
    recording.process.kill('SIGTERM');
    this.activeRecordings.delete(streamName);
    console.log(`[StorageManager] Gravação de ${streamName} interrompida`);
    return true;
  }
  
  /**
   * Lista as gravações disponíveis para um stream
   * @param {string} streamName - Nome do stream
   * @returns {Array} - Lista de gravações
   */
  listRecordings(streamName) {
    const cameraDir = path.join(this.mediaPath, streamName);
    if (!fs.existsSync(cameraDir)) {
      return [];
    }
    
    try {
      const files = fs.readdirSync(cameraDir)
        .filter(file => file.endsWith('.mp4'))
        .map(file => {
          const filePath = path.join(cameraDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.ctime,
            url: `/recordings/${streamName}/${file}`
          };
        })
        .sort((a, b) => b.created - a.created); // Mais recente primeiro
      
      return files;
    } catch (err) {
      console.error(`[StorageManager] Erro ao listar gravações de ${streamName}:`, err);
      return [];
    }
  }
  
  /**
   * Retorna o uso de espaço por câmera
   * @returns {Object} - Uso de espaço por câmera
   */
  getStorageUsage() {
    const usage = {
      total: 0,
      cameras: {}
    };
    
    try {
      // Verificar se o diretório de mídia existe
      if (!fs.existsSync(this.mediaPath)) {
        return usage;
      }
      
      // Listar subdiretórios (câmeras)
      const cameras = fs.readdirSync(this.mediaPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      // Calcular uso para cada câmera
      cameras.forEach(camera => {
        const cameraDir = path.join(this.mediaPath, camera);
        let cameraSize = 0;
        
        const files = fs.readdirSync(cameraDir)
          .filter(file => file.endsWith('.mp4'));
        
        files.forEach(file => {
          const filePath = path.join(cameraDir, file);
          const stats = fs.statSync(filePath);
          cameraSize += stats.size;
        });
        
        // Converter para MB
        const cameraSizeMB = Math.round(cameraSize / (1024 * 1024));
        usage.cameras[camera] = {
          size: cameraSizeMB,
          files: files.length,
          maxSpace: this._getCameraConfig(camera).maxSpace
        };
        
        usage.total += cameraSizeMB;
      });
      
      return usage;
    } catch (err) {
      console.error('[StorageManager] Erro ao calcular uso de armazenamento:', err);
      return usage;
    }
  }
  
  /**
   * Executa limpeza de arquivos antigos
   * Pode ser executado manualmente ou automaticamente
   */
  runCleanup() {
    console.log('[StorageManager] Iniciando limpeza de arquivos antigos...');
    
    try {
      // Verificar se o diretório de mídia existe
      if (!fs.existsSync(this.mediaPath)) {
        console.log(`[StorageManager] Diretório ${this.mediaPath} não existe. Nada para limpar.`);
        return;
      }
      
      // Listar subdiretórios (câmeras)
      const cameras = fs.readdirSync(this.mediaPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      // Limpar cada diretório de câmera
      cameras.forEach(camera => {
        this._cleanupCamera(camera);
      });
      
      console.log('[StorageManager] Limpeza concluída');
    } catch (err) {
      console.error('[StorageManager] Erro durante limpeza:', err);
    }
  }
  
  /**
   * Obtém a configuração específica para uma câmera
   * Combina configuração global com específica
   * @param {string} streamName - Nome do stream/câmera
   * @returns {Object} - Configuração completa
   */
  _getCameraConfig(streamName) {
    // Configuração padrão
    const defaultConfig = {
      maxAgeDays: this.config.global.maxAgeDays,
      maxSpace: this.config.global.maxSpace,
      enabled: true,
      rotationStrategy: this.config.global.rotationStrategy,
      filenameFormat: this.config.global.filenameFormat
    };
    
    // Se não há configuração específica, retorna a padrão
    if (!this.config.cameras[streamName]) {
      return defaultConfig;
    }
    
    // Combina configuração global com específica
    return {
      ...defaultConfig,
      ...this.config.cameras[streamName]
    };
  }
  
  /**
   * Verifica se há espaço suficiente para gravação
   * @param {string} streamName - Nome do stream
   * @returns {boolean} - Se há espaço suficiente
   */
  _hasEnoughSpace(streamName) {
    const cameraConfig = this._getCameraConfig(streamName);
    
    // Se não há limite configurado, sempre retorna true
    if (cameraConfig.maxSpace === 0) {
      return true;
    }
    
    const usage = this.getStorageUsage();
    if (!usage.cameras[streamName]) {
      return true; // Ainda não há gravações
    }
    
    // Verificar se já ultrapassa o limite
    return usage.cameras[streamName].size < cameraConfig.maxSpace;
  }
  
  /**
   * Aplica estratégia de rotação quando o espaço está cheio
   * @param {string} streamName - Nome do stream
   */
  _applyRotationStrategy(streamName) {
    const cameraConfig = this._getCameraConfig(streamName);
    const cameraDir = path.join(this.mediaPath, streamName);
    
    if (!fs.existsSync(cameraDir)) {
      return;
    }
    
    try {
      let files = fs.readdirSync(cameraDir)
        .filter(file => file.endsWith('.mp4'))
        .map(file => {
          const filePath = path.join(cameraDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.ctime
          };
        });
      
      if (files.length === 0) {
        return;
      }
      
      // Ordenar conforme a estratégia
      if (cameraConfig.rotationStrategy === 'oldest') {
        files.sort((a, b) => a.created - b.created); // Mais antigo primeiro
      } else if (cameraConfig.rotationStrategy === 'largest') {
        files.sort((a, b) => b.size - a.size); // Maior primeiro
      }
      
      // Remover o primeiro arquivo (mais antigo ou maior)
      const fileToRemove = files[0];
      fs.unlinkSync(fileToRemove.path);
      console.log(`[StorageManager] Arquivo removido conforme estratégia de rotação: ${fileToRemove.path}`);
      
      // Verificar se ainda estamos acima do limite e continuar removendo se necessário
      if (!this._hasEnoughSpace(streamName)) {
        this._applyRotationStrategy(streamName);
      }
    } catch (err) {
      console.error(`[StorageManager] Erro ao aplicar estratégia de rotação para ${streamName}:`, err);
    }
  }
  
  /**
   * Limpa arquivos antigos para uma câmera específica
   * @param {string} camera - Nome da câmera
   */
  _cleanupCamera(camera) {
    const cameraConfig = this._getCameraConfig(camera);
    const cameraDir = path.join(this.mediaPath, camera);
    const now = new Date().getTime();
    const maxAgeMs = cameraConfig.maxAgeDays * 24 * 60 * 60 * 1000;
    
    console.log(`[StorageManager] Limpando diretório da câmera ${camera}`);
    
    try {
      const files = fs.readdirSync(cameraDir)
        .filter(file => file.endsWith('.mp4'));
      
      let removedCount = 0;
      
      files.forEach(file => {
        const filePath = path.join(cameraDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;
        
        if (fileAge > maxAgeMs) {
          fs.unlinkSync(filePath);
          removedCount++;
        }
      });
      
      console.log(`[StorageManager] ${removedCount} arquivos antigos removidos da câmera ${camera}`);
    } catch (err) {
      console.error(`[StorageManager] Erro ao limpar arquivos da câmera ${camera}:`, err);
    }
  }
  
  /**
   * Inicia verificação periódica de espaço em disco
   */
  _startDiskSpaceCheck() {
    const interval = this.config.global.checkInterval * 60 * 1000; // Converter para ms
    
    const check = () => {
      console.log('[StorageManager] Verificando espaço em disco...');
      const usage = this.getStorageUsage();
      
      // Verificar cada câmera
      Object.keys(usage.cameras).forEach(camera => {
        const cameraUsage = usage.cameras[camera];
        const maxSpace = cameraUsage.maxSpace;
        
        // Se maxSpace é 0, é ilimitado
        if (maxSpace === 0) return;
        
        // Se está acima do limite, aplicar estratégia de rotação
        if (cameraUsage.size > maxSpace) {
          console.log(`[StorageManager] Câmera ${camera} está usando ${cameraUsage.size}MB, acima do limite de ${maxSpace}MB`);
          this._applyRotationStrategy(camera);
        }
      });
    };
    
    // Executar imediatamente e depois periodicamente
    check();
    setInterval(check, interval);
  }
}

module.exports = new StorageManager(); 