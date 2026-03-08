const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  const ua = req.headers['user-agent'].toLowerCase();
  const isMobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const fullUrl = `${protocol}://${host}`;
  
  if (isMobile) {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Jogo - Celular</title>
    <style>
        body { font-family: Arial; background: #1a1a1a; color: white; text-align: center; padding: 20px; }
        .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 300px; margin: 20px auto; }
        .cell { background: #333; border: 2px solid #4CAF50; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 48px; cursor: pointer; }
        .log { background: #000; color: #0f0; text-align: left; padding: 10px; margin-top: 20px; height: 200px; overflow: auto; font-size: 12px; font-family: monospace; border-radius: 5px; }
        button { padding: 15px 30px; background: #4CAF50; color: white; border: none; border-radius: 5px; font-size: 18px; width: 100%; margin-top: 10px; cursor: pointer; }
        .status { background: #333; padding: 10px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>📱 CELULAR</h1>
    <div class="status" id="status">Iniciando...</div>
    <div class="board" id="board"></div>
    <button onclick="reiniciar()">Reiniciar</button>
    <div class="log" id="log"></div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10
        });
        
        let minhaVez = false;
        let meuSimbolo = '';
        let logDiv = document.getElementById('log');
        let statusDiv = document.getElementById('status');
        
        function addLog(msg) {
            logDiv.innerHTML += '> ' + new Date().toLocaleTimeString() + ': ' + msg + '<br>';
            logDiv.scrollTop = logDiv.scrollHeight;
            console.log(msg);
        }
        
        addLog('Página carregada');
        addLog('Tentando conectar a: ${fullUrl}');
        
        // Criar tabuleiro
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = 'cell-' + i;
            cell.onclick = () => {
                addLog('Célula ' + i + ' clicada, minhaVez=' + minhaVez);
                if(minhaVez && cell.innerHTML === '') {
                    addLog('Enviando jogada pos=' + i);
                    socket.emit('jogada', i);
                }
            };
            document.getElementById('board').appendChild(cell);
        }
        addLog('Tabuleiro criado');
        
        socket.on('connect', () => {
            addLog('✅ CONECTADO! Socket ID: ' + socket.id);
            statusDiv.innerHTML = 'Conectado ao servidor!';
        });
        
        socket.on('connect_error', (err) => {
            addLog('❌ ERRO CONEXÃO: ' + err.message);
            statusDiv.innerHTML = 'Erro de conexão';
        });
        
        socket.on('disconnect', () => {
            addLog('🔴 Desconectado');
            statusDiv.innerHTML = 'Desconectado';
        });
        
        socket.on('inicio', (data) => {
            addLog('📨 Evento INICIO: ' + JSON.stringify(data));
            meuSimbolo = data.simbolo;
            minhaVez = meuSimbolo === 'X';
            statusDiv.innerHTML = minhaVez ? 'Sua vez (X)' : 'Vez do PC (X)';
        });
        
        socket.on('jogada', (data) => {
            addLog('📨 Evento JOGADA: ' + JSON.stringify(data));
            let cell = document.getElementById('cell-' + data.pos);
            if(cell) {
                cell.innerHTML = data.simbolo;
                addLog('Célula ' + data.pos + ' atualizada');
            }
            minhaVez = data.proximaVez === meuSimbolo;
            statusDiv.innerHTML = minhaVez ? 'Sua vez' : 'Vez do PC';
        });
        
        socket.on('fim', (data) => {
            addLog('📨 Evento FIM: ' + data.msg);
            statusDiv.innerHTML = data.msg;
        });
        
        socket.on('reiniciar', () => {
            addLog('📨 Evento REINICIAR');
            document.querySelectorAll('.cell').forEach(c => {
                c.innerHTML = '';
                c.classList.remove('x', 'o');
            });
            minhaVez = meuSimbolo === 'X';
            statusDiv.innerHTML = minhaVez ? 'Sua vez' : 'Vez do PC';
        });
        
        function reiniciar() {
            addLog('Botão REINICIAR clicado');
            socket.emit('reiniciar');
        }
    </script>
</body>
</html>`);
  } else {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Jogo - PC</title>
    <style>
        body { font-family: Arial; background: #1a1a1a; color: white; text-align: center; padding: 20px; }
        .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 300px; margin: 20px auto; }
        .cell { background: #333; border: 2px solid #4CAF50; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 48px; cursor: pointer; }
        .log { background: #000; color: #0f0; text-align: left; padding: 10px; margin-top: 20px; height: 200px; overflow: auto; font-size: 12px; font-family: monospace; border-radius: 5px; }
        button { padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px; }
        .status { background: #333; padding: 10px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>💻 PC</h1>
    <div class="status" id="status">Iniciando...</div>
    <div class="board" id="board"></div>
    <button onclick="reiniciar()">Reiniciar</button>
    <div class="log" id="log"></div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}', {
            transports: ['websocket', 'polling']
        });
        
        let minhaVez = true;
        let meuSimbolo = 'X';
        let logDiv = document.getElementById('log');
        let statusDiv = document.getElementById('status');
        
        function addLog(msg) {
            logDiv.innerHTML += '> ' + new Date().toLocaleTimeString() + ': ' + msg + '<br>';
            logDiv.scrollTop = logDiv.scrollHeight;
            console.log(msg);
        }
        
        addLog('Página carregada');
        addLog('Tentando conectar a: ${fullUrl}');
        
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = 'cell-' + i;
            cell.onclick = () => {
                addLog('Célula ' + i + ' clicada, minhaVez=' + minhaVez);
                if(minhaVez && cell.innerHTML === '') {
                    addLog('Enviando jogada pos=' + i);
                    socket.emit('jogada', i);
                }
            };
            document.getElementById('board').appendChild(cell);
        }
        addLog('Tabuleiro criado');
        
        socket.on('connect', () => {
            addLog('✅ CONECTADO! Socket ID: ' + socket.id);
            statusDiv.innerHTML = 'Conectado ao servidor!';
        });
        
        socket.on('connect_error', (err) => {
            addLog('❌ ERRO CONEXÃO: ' + err.message);
            statusDiv.innerHTML = 'Erro de conexão';
        });
        
        socket.on('inicio', () => {
            addLog('📨 Evento INICIO');
            statusDiv.innerHTML = 'Sua vez (X)';
        });
        
        socket.on('jogada', (data) => {
            addLog('📨 Evento JOGADA: ' + JSON.stringify(data));
            let cell = document.getElementById('cell-' + data.pos);
            if(cell) {
                cell.innerHTML = data.simbolo;
                addLog('Célula ' + data.pos + ' atualizada');
            }
            minhaVez = data.proximaVez === 'X';
            statusDiv.innerHTML = minhaVez ? 'Sua vez' : 'Vez do celular';
        });
        
        socket.on('fim', (data) => {
            addLog('📨 Evento FIM: ' + data.msg);
            statusDiv.innerHTML = data.msg;
        });
        
        socket.on('reiniciar', () => {
            addLog('📨 Evento REINICIAR');
            document.querySelectorAll('.cell').forEach(c => {
                c.innerHTML = '';
                c.classList.remove('x', 'o');
            });
            minhaVez = true;
            statusDiv.innerHTML = 'Sua vez';
        });
        
        function reiniciar() {
            addLog('Botão REINICIAR clicado');
            socket.emit('reiniciar');
        }
    </script>
</body>
</html>`);
  }
});

// Lógica do jogo
let board = ['', '', '', '', '', '', '', '', ''];
let vez = 'X';
let pc = null;
let mobile = null;

function checkWinner() {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for(let l of lines) {
    if(board[l[0]] && board[l[0]] === board[l[1]] && board[l[0]] === board[l[2]]) {
      return board[l[0]];
    }
  }
  return null;
}

io.on('connection', (socket) => {
  console.log('🔵 Cliente conectado:', socket.id);
  
  if (!pc) {
    pc = socket.id;
    socket.emit('inicio', { simbolo: 'X' });
    console.log('   ➡️ Definido como PC');
  } else if (!mobile) {
    mobile = socket.id;
    socket.emit('inicio', { simbolo: 'O' });
    console.log('   ➡️ Definido como CELULAR');
  }
  
  socket.on('jogada', (pos) => {
    console.log('\n🎮 Jogada de', socket.id, 'pos', pos);
    let jogador = socket.id === pc ? 'X' : 'O';
    console.log('   Jogador:', jogador, 'Vez:', vez);
    
    if (jogador !== vez) {
      console.log('   ⚠️ Não é a vez');
      return;
    }
    if (board[pos] !== '') {
      console.log('   ⚠️ Posição ocupada');
      return;
    }
    
    board[pos] = jogador;
    console.log('   Board:', board);
    
    let winner = checkWinner();
    let proximaVez = vez === 'X' ? 'O' : 'X';
    
    if (winner) {
      console.log('   🏆 Vencedor:', winner);
      io.emit('fim', { msg: winner + ' venceu!' });
    } else if (!board.includes('')) {
      console.log('   🤝 Empate');
      io.emit('fim', { msg: 'Empate!' });
    } else {
      vez = proximaVez;
      console.log('   ➡️ Próxima vez:', vez);
    }
    
    io.emit('jogada', { pos, simbolo: jogador, proximaVez });
  });
  
  socket.on('reiniciar', () => {
    console.log('\n🔄 Reiniciar');
    board = ['', '', '', '', '', '', '', '', ''];
    vez = 'X';
    io.emit('reiniciar');
  });
  
  socket.on('disconnect', () => {
    console.log('🔴 Desconectado:', socket.id);
    if (socket.id === pc) pc = null;
    if (socket.id === mobile) mobile = null;
    board = ['', '', '', '', '', '', '', '', ''];
    vez = 'X';
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Servidor rodando!`);
  console.log(`   Porta: ${PORT}`);
  console.log(`   URL: http://localhost:${PORT}\n`);
});
