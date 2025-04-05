const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const storageManager = require('../../storage-manager');

// Middleware de autenticação
const auth = (req, res, next) => {
  const config = require('../../config/default');
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }
  
  // Extrair credenciais
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [username, password] = credentials.split(':');
  
  // Verificar credenciais
  if (username !== config.auth.api_user || password !== config.auth.api_pass) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized',
      message: 'Invalid credentials'
    });
  }
  
  next();
};

/**
 * @api {get} /api/recordings Listar todas as gravações
 * @apiName GetAllRecordings
 * @apiGroup Recordings
 * @apiDescription Obtém estatísticas de armazenamento e lista de todas as câmeras com gravações
 * @apiSuccess {Object} storage Estatísticas de armazenamento
 * @apiSuccess {Number} storage.total Uso total em MB
 * @apiSuccess {Object} storage.cameras Uso por câmera em MB
 */
router.get('/', auth, (req, res) => {
  try {
    // Obter estatísticas de armazenamento
    const usage = storageManager.getStorageUsage();
    
    // Retornar estatísticas
    res.json({
      success: true,
      storage: usage
    });
  } catch (error) {
    console.error('Error getting recordings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recording statistics'
    });
  }
});

/**
 * @api {get} /api/recordings/:streamName Listar gravações de uma câmera
 * @apiName GetStreamRecordings
 * @apiGroup Recordings
 * @apiDescription Obtém lista de gravações para uma câmera específica
 * @apiParam {String} streamName Nome do stream/câmera
 * @apiSuccess {Array} recordings Lista de arquivos gravados
 */
router.get('/:streamName', auth, (req, res) => {
  try {
    const { streamName } = req.params;
    
    // Listar gravações para o stream especificado
    const recordings = storageManager.listRecordings(streamName);
    
    res.json({
      success: true,
      camera: streamName,
      recordings
    });
  } catch (error) {
    console.error(`Error getting recordings for ${req.params.streamName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recordings'
    });
  }
});

/**
 * @api {post} /api/recordings/:streamName/start Iniciar gravação
 * @apiName StartRecording
 * @apiGroup Recordings
 * @apiDescription Inicia a gravação para uma câmera específica
 * @apiParam {String} streamName Nome do stream/câmera
 */
router.post('/:streamName/start', auth, (req, res) => {
  try {
    const { streamName } = req.params;
    
    // Construir URL do stream
    const rtmpPort = req.app.get('rtmpPort') || 1936; // Obter do app ou usar padrão
    const streamUrl = `rtmp://localhost:${rtmpPort}/live/${streamName}`;
    
    // Iniciar gravação
    const success = storageManager.startRecording(streamName, streamUrl);
    
    if (success) {
      res.json({
        success: true,
        message: `Recording started for ${streamName}`,
        streamName,
        streamUrl
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to start recording',
        message: 'Stream may not be active or is already being recorded'
      });
    }
  } catch (error) {
    console.error(`Error starting recording for ${req.params.streamName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to start recording'
    });
  }
});

/**
 * @api {post} /api/recordings/:streamName/stop Parar gravação
 * @apiName StopRecording
 * @apiGroup Recordings
 * @apiDescription Para a gravação para uma câmera específica
 * @apiParam {String} streamName Nome do stream/câmera
 */
router.post('/:streamName/stop', auth, (req, res) => {
  try {
    const { streamName } = req.params;
    
    // Parar gravação
    const success = storageManager.stopRecording(streamName);
    
    if (success) {
      res.json({
        success: true,
        message: `Recording stopped for ${streamName}`,
        streamName
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to stop recording',
        message: 'Stream may not be being recorded'
      });
    }
  } catch (error) {
    console.error(`Error stopping recording for ${req.params.streamName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop recording'
    });
  }
});

/**
 * @api {delete} /api/recordings/:streamName/:filename Excluir gravação
 * @apiName DeleteRecording
 * @apiGroup Recordings
 * @apiDescription Exclui um arquivo de gravação específico
 * @apiParam {String} streamName Nome do stream/câmera
 * @apiParam {String} filename Nome do arquivo
 */
router.delete('/:streamName/:filename', auth, (req, res) => {
  try {
    const { streamName, filename } = req.params;
    
    // Construir caminho para o arquivo
    const recordingsPath = storageManager.mediaPath;
    const filePath = path.join(recordingsPath, streamName, filename);
    
    // Verificar se arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Recording file not found',
        streamName,
        filename
      });
    }
    
    // Excluir arquivo
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: `Recording ${filename} deleted for ${streamName}`,
      streamName,
      filename
    });
  } catch (error) {
    console.error(`Error deleting recording ${req.params.filename}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete recording'
    });
  }
});

/**
 * @api {post} /api/recordings/cleanup Executar limpeza
 * @apiName RunCleanup
 * @apiGroup Recordings
 * @apiDescription Executa a limpeza de gravações antigas manualmente
 */
router.post('/cleanup', auth, (req, res) => {
  try {
    // Executar limpeza
    storageManager.runCleanup();
    
    // Obter estatísticas atualizadas
    const usage = storageManager.getStorageUsage();
    
    res.json({
      success: true,
      message: 'Cleanup executed successfully',
      storage: usage
    });
  } catch (error) {
    console.error('Error running cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run cleanup'
    });
  }
});

module.exports = router; 