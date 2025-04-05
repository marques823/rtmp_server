const config = require('../../config/default');

/**
 * Middleware de autenticação para rotas da API
 * Verifica se as credenciais fornecidas são válidas
 */
function isAuthenticated(req, res, next) {
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
}

module.exports = {
  isAuthenticated
}; 