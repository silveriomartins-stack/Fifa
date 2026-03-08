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
  
  // MESMA PÁGINA PARA OS DOIS, só muda o título
  const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${isMobile ? 'Celular' : 'PC'} - Jogo da Velha</title>
    <style>
        body { 
            font-family: Arial; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 30px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 { 
            text-align: center; 
            color: #333; 
            margin-bottom: 20px;
            font-size: 24px;
        }
        .device {
            text-align: center;
            font-size: 18px;
            color: #666;
            margin-bottom: 10px;
        }
        .status {
            background: #f0f0f0;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
        }
        .board {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin: 20px 0;
        }
        .cell {
            background: #f8f9fa;
            border: 2px solid #dee2e6;
            border-radius: 10px;
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        .cell:hover { background: #e9ecef; transform: scale(1.05); }
        .cell:active { transform: scale(0.95); }
        .cell.x { color: #e74c3c; }
        .cell.o { color: #3498db; }
        button {
            width: 100%;
            padding: 15px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.3s;
        }
        button:hover { background: #45a049; }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .log {
            margin-top: 20px;
            padding: 10px;
            background: #000;
            color: #0f0;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            height: 100px;
            overflow: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Jogo da Velha</h1>
        <div class="device">${isMobile ? '📱 Celular' : '💻 PC'}</div>
        <div class="status" id="status">Conectando...</div>
        <div class="board" id="board"></div>
        <button id="resetBtn" disabled>Reiniciar Jogo</button>
        <div class="log" id="log"></div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10
        });
        
        let minhaVez = false;
        let meuSimbolo = '';
        let gameActive = false;
        let board = ['', '', '', '', '', '', '', '', ''];
        
        const logDiv = document.getElementById('log');
        const statusDiv = document.getElementById('status');
        const resetBtn = document.getElementById('resetBtn');
        
        function addLog(msg) {
            logDiv.innerHTML += '> ' + new Date().toLocaleTimeString() + ': ' + msg + '<br>';
            logDiv.scrollTop = logDiv.scrollHeight;
            console.log(msg);
        }
        
        addLog('📱 Página carregada - ${isMobile ? 'Celular' : 'PC'}');
        addLog('🔌 Conectando a: ${fullUrl}');
        
        // Criar tabuleiro
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = 'cell-' + i;
            cell.onclick = () => {
                addLog('👆 Célula ' + i + ' clicada');
                addLog('   minhaVez=' + minhaVez + ', gameActive=' + gameActive + ', board=' + board[i]);
                
                if(gameActive && minhaVez && board[i] === '') {
                    addLog('📤 Enviando jogada pos=' + i);
                    socket.emit('jogada', i);
                } else {
                    if(!gameActive) addLog('⛔ Jogo não ativo');
                    else if(!minhaVez) addLog('⛔ Não é sua vez');
                    else if(board[i] !== '') addLog('⛔ Posição ocupada');
                }
            };
            document.getElementById('board').appendChild(cell);
        }
        addLog('✅ Tabuleiro criado');
        
        socket.on('connect', () => {
            addLog('✅ CONECTADO! Socket ID: ' + socket.id);
            statusDiv.innerHTML = 'Conectado!';
        });
        
        socket.on('connect_error', (err) => {
            addLog('❌ ERRO CONEXÃO: ' + err.message);
            statusDiv.innerHTML = 'Erro de conexão';
        });
        
        socket.on('disconnect', () => {
            addLog('🔴 Desconectado');
            statusDiv.innerHTML = 'Desconectado';
            resetBtn.disabled = true;
            gameActive = false;
        });
        
        socket.on('inicio', (data) => {
            addLog('📨 Evento INICIO: ' + JSON.stringify(data));
            meuSimbolo = data.simbolo;
            minhaVez = meuSimbolo === 'X';
            gameActive = true;
            resetBtn.disabled = false;
            statusDiv.innerHTML = minhaVez ? 'Sua vez (X)' : 'Vez do oponente (X)';
            addLog('🎮 Você é ' + meuSimbolo + ' - ' + (minhaVez ? 'sua vez' : 'aguarde'));
        });
        
        socket.on('jogada', (data) => {
            addLog('📨 Evento JOGADA: ' + JSON.stringify(data));
            
            board[data.pos] = data.simbolo;
            let cell = document.getElementById('cell-' + data.pos);
            if(cell) {
                cell.innerHTML = data.simbolo;
                cell.classList.add(data.simbolo.toLowerCase());
                addLog('✅ Célula ' + data.pos + ' = ' + data.simbolo);
            }
            
            minhaVez = data.proximaVez === meuSimbolo;
            statusDiv.innerHTML = minhaVez ? 'Sua vez' : 'Vez do oponente';
            addLog('🔄 ' + (minhaVez ? 'Sua vez' : 'Vez do oponente'));
        });
        
        socket.on('fim', (data) => {
            addLog('📨 Evento FIM: ' + data.msg);
            statusDiv.innerHTML = data.msg;
            gameActive = false;
        });
        
        socket.on('reiniciar', () => {
            addLog('📨 Evento REINICIAR');
            board = ['', '', '', '', '', '', '', '', ''];
            document.querySelectorAll('.cell').forEach(c => {
                c.innerHTML = '';
                c.classList.remove('x', 'o');
            });
            gameActive = true;
            minhaVez = meuSimbolo === 'X';
            statusDiv.innerHTML = minhaVez ? 'Sua vez' : 'Vez do oponente';
            addLog('🔄 Jogo reiniciado');
        });
        
        resetBtn.onclick = () => {
            addLog('👆 Botão REINICIAR clicado');
            socket.emit('reiniciar');
        };
    </script>
</body>
</html>`;
  
  res.send(html);
});

// Lógica do jogo
let board = ['', '', '', '', '', '', '', '', ''];
let vez = 'X';
let jogadores = {
  x: null,  // jogador X (PC)
  o: null   // jogador O (celular)
};

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
  console.log('\n🔵 Cliente conectado:', socket.id);
  console.log('   X:', jogadores.x);
  console.log('   O:', jogadores.o);
  
  // Atribuir jogadores - X sempre é o PC, O sempre é o celular
  if (!jogadores.x) {
    jogadores.x = socket.id;
    socket.emit('inicio', { simbolo: 'X' });
    console.log('   ✅ Jogador X atribuído (PC)');
  } else if (!jogadores.o) {
    jogadores.o = socket.id;
    socket.emit('inicio', { simbolo: 'O' });
    console.log('   ✅ Jogador O atribuído (Celular)');
  } else {
    console.log('   ⚠️ Jogo cheio');
    socket.emit('fim', { msg: 'Jogo cheio!' });
    socket.disconnect();
  }
  
  socket.on('jogada', (pos) => {
    console.log('\n🎮 Jogada recebida');
    console.log('   Socket:', socket.id);
    console.log('   Posição:', pos);
    
    let jogador = socket.id === jogadores.x ? 'X' : 'O';
    console.log('   Jogador:', jogador);
    console.log('   Vez atual:', vez);
    
    if (jogador !== vez) {
      console.log('   ⚠️ Não é a vez do jogador');
      return;
    }
    
    if (board[pos] !== '') {
      console.log('   ⚠️ Posição ocupada');
      return;
    }
    
    board[pos] = jogador;
    console.log('   Board:', JSON.stringify(board));
    
    let winner = checkWinner();
    let proximaVez = vez === 'X' ? 'O' : 'X';
    
    if (winner) {
      console.log('   🏆 Vencedor:', winner);
      io.emit('fim', { msg: winner + ' venceu! 🎉' });
    } else if (!board.includes('')) {
      console.log('   🤝 Empate');
      io.emit('fim', { msg: 'Empate! 🤝' });
    } else {
      vez = proximaVez;
      console.log('   ➡️ Próxima vez:', vez);
    }
    
    console.log('   📤 Emitindo jogada');
    io.emit('jogada', { pos, simbolo: jogador, proximaVez });
  });
  
  socket.on('reiniciar', () => {
    console.log('\n🔄 Reiniciar');
    board = ['', '', '', '', '', '', '', '', ''];
    vez = 'X';
    io.emit('reiniciar');
  });
  
  socket.on('disconnect', () => {
    console.log('\n🔴 Desconectado:', socket.id);
    if (socket.id === jogadores.x) {
      jogadores.x = null;
      console.log('   Jogador X removido');
    }
    if (socket.id === jogadores.o) {
      jogadores.o = null;
      console.log('   Jogador O removido');
    }
    board = ['', '', '', '', '', '', '', '', ''];
    vez = 'X';
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Servidor rodando!`);
  console.log(`   Porta: ${PORT}`);
  console.log(`   URL: http://localhost:${PORT}\n`);
});
