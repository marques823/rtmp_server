const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('./config/default');

// Função para verificar conexões RTMP/HTTP
function checkConnections() {
  console.log('\n=== Verificação de Streams RTMP ===');
  console.log(`Data/Hora: ${new Date().toISOString()}`);
  
  // Ler logs para análise
  const logPath = path.join(config.logs.logPath, 'output.log');
  if (fs.existsSync(logPath)) {
    try {
      const logs = fs.readFileSync(logPath, 'utf8');
      const lines = logs.split('\n');
      
      // Analisar streams ativos
      console.log('\n=== Streams Detectados ===');
      
      // Procurar por pushes RTMP (publicações)
      const pushes = lines.filter(line => line.includes('start push'));
      const uniquePushPaths = [...new Set(pushes.map(line => {
        const match = line.match(/push (\S+)/);
        return match ? match[1] : null;
      }).filter(Boolean))];
      
      console.log('\nStreams Publicados:');
      if (uniquePushPaths.length === 0) {
        console.log('  Nenhum stream sendo publicado');
      } else {
        uniquePushPaths.forEach(path => {
          const lastPush = pushes.filter(line => line.includes(`push ${path}`)).pop();
          console.log(`  ${path} - Última publicação: ${lastPush?.match(/\[(.*?)\]/)?.[1] || 'desconhecido'}`);
        });
      }
      
      // Procurar por plays (consumos)
      const plays = lines.filter(line => line.includes('start play'));
      const uniquePlayPaths = [...new Set(plays.map(line => {
        const match = line.match(/play (\S+)/);
        return match ? match[1] : null;
      }).filter(Boolean))];
      
      console.log('\nStreams Consumidos:');
      if (uniquePlayPaths.length === 0) {
        console.log('  Nenhum stream sendo consumido');
      } else {
        uniquePlayPaths.forEach(path => {
          const activePlays = plays.filter(line => line.includes(`play ${path}`)).length;
          const closedPlays = lines.filter(line => line.includes('close') && line.includes(path)).length;
          const currentPlays = activePlays - closedPlays;
          
          console.log(`  ${path} - Total de acessos: ${activePlays}, Ativos: ${currentPlays > 0 ? currentPlays : 0}`);
        });
      }
    } catch (err) {
      console.error('Erro ao ler logs:', err);
    }
  } else {
    console.log('Arquivo de log não encontrado');
  }

  // Verificar portas
  console.log('\n=== Portas em Uso ===');
  console.log(`RTMP: ${config.rtmp.port}`);
  console.log(`HTTP: ${config.http.port}`);
}

// Executar verificação inicial
checkConnections();

// Verificar periodicamente (a cada 10 segundos)
console.log('\nMonitorando streams. Pressione Ctrl+C para sair.\n');
setInterval(checkConnections, 10000); 