const fs = require('fs');
const path = require('path');
const storageManager = require('./storage-manager');

// Script de limpeza utilizando o StorageManager
console.log('Iniciando limpeza de arquivos antigos usando StorageManager...');

try {
  // Usar o StorageManager para executar a limpeza
  storageManager.runCleanup();
  
  // Exibir estatísticas de uso após a limpeza
  const usage = storageManager.getStorageUsage();
  
  console.log('\nEstatísticas de armazenamento após limpeza:');
  console.log(`Uso total: ${usage.total} MB`);
  
  if (Object.keys(usage.cameras).length > 0) {
    console.log('\nUso por câmera:');
    Object.keys(usage.cameras).forEach(camera => {
      const cameraUsage = usage.cameras[camera];
      console.log(`- ${camera}: ${cameraUsage.size} MB (${cameraUsage.files} arquivos)`);
    });
  } else {
    console.log('Nenhuma câmera com gravações encontrada.');
  }
  
  console.log('\nLimpeza concluída com sucesso.');
} catch (error) {
  console.error(`Erro durante a limpeza: ${error.message}`);
}

// Para uso como um módulo
module.exports = {
  runCleanup: () => storageManager.runCleanup(),
  getStorageUsage: () => storageManager.getStorageUsage()
};
