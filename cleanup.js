const fs = require('fs');
const path = require('path');
const config = require('./config/default');

// Função para limpar arquivos antigos
function cleanupOldFiles() {
  console.log('Iniciando limpeza de arquivos antigos...');

  const now = new Date().getTime();
  const maxAgeMs = config.storage.maxAgeDays * 24 * 60 * 60 * 1000;
  const mediaDir = config.storage.mediaPath;

  if (!fs.existsSync(mediaDir)) {
    console.log(`Diretório ${mediaDir} não existe. Nada para limpar.`);
    return;
  }

  // Função recursiva para verificar arquivos em todos os subdiretórios
  function checkDirectory(directory) {
    const items = fs.readdirSync(directory);
    
    items.forEach(item => {
      const itemPath = path.join(directory, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        checkDirectory(itemPath);
        
        // Verifica se o diretório está vazio após processar seus arquivos
        const remainingItems = fs.readdirSync(itemPath);
        if (remainingItems.length === 0) {
          fs.rmdirSync(itemPath);
          console.log(`Diretório vazio removido: ${itemPath}`);
        }
      } else {
        // Verifica a idade do arquivo
        const fileAge = now - stats.mtimeMs;
        if (fileAge > maxAgeMs) {
          fs.unlinkSync(itemPath);
          console.log(`Arquivo antigo removido: ${itemPath}`);
        }
      }
    });
  }

  try {
    checkDirectory(mediaDir);
    console.log('Limpeza concluída.');
  } catch (error) {
    console.error(`Erro durante a limpeza: ${error.message}`);
  }
}

// Executa a limpeza
cleanupOldFiles();

// Para uso como um módulo
module.exports = { cleanupOldFiles };
