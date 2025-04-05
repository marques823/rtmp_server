const express = require('express');
const setupAPI = require('./index');
const port = 8096;

const app = express();

// Configurar a API
setupAPI(app);

// Iniciar o servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor de API rodando em http://0.0.0.0:${port}`);
  console.log(`API disponível em http://seu-ip:${port}/api/status`);
}); 