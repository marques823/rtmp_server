/**
 * Servidor RTMP e RTSP combinado
 * 
 * Este arquivo inicia ambos os servidores:
 * - Servidor RTMP para receber streams de câmeras
 * - Servidor RTSP para integração com DVRs Intelbras
 */

const rtmpCore = require('./rtmp-core');
const rtspServer = require('./rtsp-server');

// Informações de inicialização
console.log('===========================================');
console.log('Iniciando servidor RTMP e RTSP integrado');
console.log('===========================================');
console.log('Versão: 1.0.0');
console.log('Suporte para:');
console.log('- Recebimento de streams RTMP');
console.log('- Conversão para HLS e DASH');
console.log('- Conversão para RTSP (Intelbras DVR)');
console.log('- Integração com ZoneMinder');
console.log('===========================================');

// Função para iniciar todos os servidores
const startServers = async () => {
  try {
    // Iniciar servidor RTMP primeiro
    const rtmpServer = new rtmpCore.NodeMediaServer(rtmpCore.config);
    rtmpServer.run();
    console.log('Servidor RTMP iniciado');
    
    // Aguardar alguns segundos para o servidor RTMP inicializar completamente
    console.log('Aguardando inicialização do servidor RTMP...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Iniciar servidor RTSP
    await rtspServer.startServer();
    console.log('Servidor RTSP iniciado');
    
    console.log('Todos os servidores iniciados com sucesso!');
    console.log(`Aguardando conexões...`);
    console.log('===========================================');
    console.log('Conexões RTMP: rtmp://servidor:1936/live/stream-key');
    console.log('Streams RTSP: rtsp://servidor:8554/camera-name');
    console.log('===========================================');
  } catch (err) {
    console.error('Erro ao iniciar servidores:', err);
    process.exit(1);
  }
};

// Gerenciar encerramento gracioso
process.on('SIGINT', () => {
  console.log('Encerrando servidores...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Encerrando servidores...');
  process.exit(0);
});

// Iniciar servidores
startServers(); 