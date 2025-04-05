const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 9001;

const rootDir = path.join(__dirname);
console.log(`Diretório raiz: ${rootDir}`);

// Listar os arquivos no diretório para diagnóstico
fs.readdir(rootDir, (err, files) => {
  if (err) {
    console.error('Erro ao ler diretório:', err);
  } else {
    console.log('Arquivos disponíveis:');
    files.forEach(file => {
      console.log(`- ${file}`);
    });
  }
});

// Middleware para logging de requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Servir arquivos estáticos do diretório atual
app.use(express.static(rootDir));

// Rota específica para player.html
app.get('/player.html', (req, res) => {
  const playerPath = path.join(rootDir, 'player.html');
  console.log(`Tentando servir: ${playerPath}`);
  
  if (fs.existsSync(playerPath)) {
    res.sendFile(playerPath);
  } else {
    res.status(404).send('Player não encontrado');
  }
});

// Rota específica para multi-player.html
app.get('/multi-player.html', (req, res) => {
  const multiPlayerPath = path.join(rootDir, 'multi-player.html');
  console.log(`Tentando servir: ${multiPlayerPath}`);
  
  if (fs.existsSync(multiPlayerPath)) {
    res.sendFile(multiPlayerPath);
  } else {
    res.status(404).send('Multi-Camera Player não encontrado');
  }
});

// Rota específica para test-player.html
app.get('/test-player.html', (req, res) => {
  const testPlayerPath = path.join(rootDir, 'test-player.html');
  console.log(`Tentando servir: ${testPlayerPath}`);
  
  if (fs.existsSync(testPlayerPath)) {
    res.sendFile(testPlayerPath);
  } else {
    res.status(404).send('Test Player não encontrado');
  }
});

// Rota específica para simple-player.html
app.get('/simple-player.html', (req, res) => {
  const simplePlayerPath = path.join(rootDir, 'simple-player.html');
  console.log(`Tentando servir: ${simplePlayerPath}`);
  
  if (fs.existsSync(simplePlayerPath)) {
    res.sendFile(simplePlayerPath);
  } else {
    res.status(404).send('Simple Player não encontrado');
  }
});

// Rota específica para player-recordings.html
app.get('/player-recordings.html', (req, res) => {
  const recordingsPlayerPath = path.join(rootDir, 'player-recordings.html');
  console.log(`Tentando servir: ${recordingsPlayerPath}`);
  
  if (fs.existsSync(recordingsPlayerPath)) {
    res.sendFile(recordingsPlayerPath);
  } else {
    res.status(404).send('Gerenciador de Gravações não encontrado');
  }
});

// Rota de fallback
app.use((req, res) => {
  res.status(404).send('Arquivo não encontrado');
});

// Iniciar o servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor estático rodando em http://0.0.0.0:${port}`);
  console.log(`Acesse o player em http://seu-ip:${port}/player.html`);
  console.log(`Acesse o multi-player em http://seu-ip:${port}/multi-player.html`);
  console.log(`Acesse o gerenciador de gravações em http://seu-ip:${port}/player-recordings.html`);
}); 