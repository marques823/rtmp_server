/**
 * Configuração de armazenamento avançado para RTMP Server
 * Este arquivo contém configurações para gerenciamento de armazenamento de streams por câmera
 */

const path = require('path');
const baseConfig = require('./default');

// Configuração global de armazenamento
const storageConfig = {
  // Diretório base para armazenamento de mídia
  mediaPath: baseConfig.storage.mediaPath,
  
  // Configurações globais
  global: {
    // Tempo máximo de retenção para arquivos em dias (padrão)
    maxAgeDays: 7,
    
    // Espaço máximo a ser usado (em MB, 0 = ilimitado)
    maxSpace: 0,
    
    // Estratégia de rotação quando o espaço estiver cheio
    // 'oldest' = remover os arquivos mais antigos primeiro
    // 'largest' = remover os arquivos maiores primeiro
    rotationStrategy: 'oldest',
    
    // Intervalo para verificação de espaço em disco (minutos)
    checkInterval: 60,
    
    // Formato do nome do arquivo
    filenameFormat: '{streamName}_{timestamp}.mp4',
    
    // Se deve gravar automaticamente streams novos
    autoRecord: true
  },
  
  // Configurações específicas por câmera
  cameras: {
    // Exemplo: camera1
    // camera1: {
    //   maxAgeDays: 30,          // Retenção específica para esta câmera
    //   maxSpace: 5000,          // Espaço máximo em MB (5GB)
    //   enabled: true,           // Se a gravação está habilitada
    //   rotationStrategy: 'oldest',
    //   filenameFormat: 'cam1_{timestamp}.mp4'
    // }
  }
};

module.exports = storageConfig; 