const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('../config/default');
const storageConfig = require('../config/storage');

// Rotas
const recordingsRoutes = require('./routes/recordings');

// Criar middleware de autenticação
const auth = (req, res, next) => {
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

// Exportar middleware de autenticação para outras rotas
const authMiddleware = { isAuthenticated: auth };

// Exportar função para configurar a API no servidor HTTP
module.exports = function(app) {
  // Configurar middleware
  app.use('/api', bodyParser.json());
  app.use('/api', cors());
  
  // Diretório para servir arquivos estáticos (gravações)
  const recordingsPath = storageConfig.mediaPath;
  if (fs.existsSync(recordingsPath)) {
    app.use('/recordings', auth, express.static(recordingsPath));
  }
  
  // Salvar porta RTMP no app para as rotas
  app.set('rtmpPort', config.rtmp.port);
  
  // Registrar rotas
  app.use('/api/recordings', recordingsRoutes);
  
  // Rota para status do servidor
  app.get('/api/status', auth, (req, res) => {
    res.json({
      success: true,
      version: '1.0.0',
      serverTime: new Date().toISOString(),
      recordingEnabled: storageConfig.global.enabled,
      config: {
        rtmpPort: config.rtmp.port,
        httpPort: config.http.port,
        recordingsPath: storageConfig.mediaPath,
        maxAgeDays: storageConfig.global.maxAgeDays,
        maxSpace: storageConfig.global.maxSpace,
        autoRecord: storageConfig.global.autoRecord
      }
    });
  });
  
  // Exportar middleware de autenticação
  app.set('authMiddleware', authMiddleware);
  
  console.log('API initialized on /api');
  return app;
}; 