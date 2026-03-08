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
  
  if (isMobile) {
    // CELULAR: envia frames
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Celular</title>
    <style>
        body { font-family: Arial; background: #1a1a1a; color: white; text-align: center; padding: 20px; }
        video { width: 100%; max-width: 300px; border: 2px solid #4CAF50; border-radius: 10px; display: none; }
        .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 300px; margin: 20px auto; }
        .cell { background: #333; border: 2px solid #4CAF50; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 48px; cursor: pointer; }
        button { padding: 15px 30px; background: #4CAF50; color: white; border: none; border-radius: 5px; font-size: 18px; width: 100%; }
        .status { margin: 10px 0; padding: 10px; background: #333; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>📱 Celular</h1>
    <div class="status" id="status">Iniciando...</div>
    <video id="video" autoplay playsinline muted></video>
    <div class="board" id="board"></div>
    <button onclick="reiniciar()">Reiniciar</button>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let minhaVez = false;
        let intervalo = null;
        
        // Criar tabuleiro
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => {
                if(minhaVez) socket.emit('jogada', i);
            };
            document.getElementById('board').appendChild(cell);
        }
        
        // Iniciar câmera e enviar frames
        async function iniciarCamera() {
            try {
                document.getElementById('status').innerHTML = '📷 Solicitando câmera...';
                
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 320, height: 240 },
                    audio: false
                });
                
                const video = document.getElementById('video');
                video.srcObject = stream;
                
                document.getElementById('status').innerHTML = '✅ Câmera OK - Transmitindo';
                
                // Criar canvas para capturar frames
                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 240;
                const ctx = canvas.getContext('2d');
                
                // Enviar frames a cada 100ms
                intervalo = setInterval(() => {
                    if (stream.active) {
                        ctx.drawImage(video, 0, 0, 320, 240);
                        const frame = canvas.toDataURL('image/jpeg', 0.3);
                        socket.emit('frame', frame);
                    }
                }, 100);
                
            } catch (err) {
                document.getElementById('status').innerHTML = '❌ Erro: ' + err.message;
            }
        }
        
        iniciarCamera();
        
        socket.on('inicio', (data) => {
            minhaVez = data.vez === 'O';
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez (O)' : 'Vez do PC (X)';
        });
        
        socket.on('jogada', (data) => {
            document.getElementsByClassName('cell')[data.pos].innerHTML = data.simbolo;
            minhaVez = !minhaVez;
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez' : 'Vez do PC';
        });
        
        socket.on('fim', (data) => {
            document.getElementById('status').innerHTML = data.msg;
        });
        
        socket.on('reiniciar', () => {
            document.querySelectorAll('.cell').forEach(c => c.innerHTML = '');
            minhaVez = false;
        });
        
        function reiniciar() {
            socket.emit('reiniciar');
        }
    </script>
</body>
</html>`);
  } else {
    // PC: recebe frames
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PC</title>
    <style>
        body { font-family: Arial; background: #1a1a1a; color: white; padding: 20px; }
        .container { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; max-width: 1000px; margin: 0 auto; }
        .video-box { background: black; border-radius: 10px; overflow: hidden; aspect-ratio: 4/3; display: flex; align-items: center; justify-content: center; }
        img { width: 100%; height: 100%; object-fit: cover; }
        .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
        .cell { background: #333; border: 2px solid #4CAF50; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 48px; cursor: pointer; }
        button { padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; }
        .status { margin: 10px 0; padding: 10px; background: #333; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div>
            <div class="video-box">
                <img id="video">
            </div>
            <div class="status" id="videoStatus">Aguardando celular...</div>
        </div>
        <div>
            <h1>💻 PC</h1>
            <div class="status" id="gameStatus">Aguardando...</div>
            <div class="board" id="board"></div>
            <button onclick="reiniciar()">Reiniciar</button>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let minhaVez = true;
        
        // Criar tabuleiro
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => {
                if(minhaVez) socket.emit('jogada', i);
            };
            document.getElementById('board').appendChild(cell);
        }
        
        // Receber frames da câmera
        socket.on('frame', (frameData) => {
            document.getElementById('video').src = frameData;
            document.getElementById('videoStatus').innerHTML = '📱 Recebendo vídeo do celular';
        });
        
        socket.on('inicio', () => {
            document.getElementById('gameStatus').innerHTML = 'Sua vez (X)';
        });
        
        socket.on('jogada', (data) => {
            document.getElementsByClassName('cell')[data.pos].innerHTML = data.simbolo;
            minhaVez = !minhaVez;
            document.getElementById('gameStatus').innerHTML = minhaVez ? 'Sua vez' : 'Vez do celular';
        });
        
        socket.on('fim', (data) => {
            document.getElementById('gameStatus').innerHTML = data.msg;
        });
        
        socket.on('reiniciar', () => {
            document.querySelectorAll('.cell').forEach(c => c.innerHTML = '');
            minhaVez = true;
            document.getElementById('gameStatus').innerHTML = 'Sua vez';
        });
        
        function reiniciar() {
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
  console.log('Cliente conectado:', socket.id);
  
  // Atribuir jogadores
  if (!pc) {
    pc = socket.id;
    socket.emit('inicio', { vez: 'X' });
  } else if (!mobile) {
    mobile = socket.id;
    socket.emit('inicio', { vez: 'O' });
  }
  
  // Receber frames do celular e enviar para o PC
  socket.on('frame', (frameData) => {
    // Envia para todos menos quem enviou
    socket.broadcast.emit('frame', frameData);
  });
  
  // Jogadas
  socket.on('jogada', (pos) => {
    let jogador = socket.id === pc ? 'X' : 'O';
    if (jogador !== vez || board[pos] !== '') return;
    
    board[pos] = jogador;
    let winner = checkWinner();
    
    if (winner) {
      io.emit('fim', { msg: winner + ' venceu!' });
    } else if (!board.includes('')) {
      io.emit('fim', { msg: 'Empate!' });
    } else {
      vez = vez === 'X' ? 'O' : 'X';
    }
    
    io.emit('jogada', { pos, simbolo: jogador });
  });
  
  socket.on('reiniciar', () => {
    board = ['', '', '', '', '', '', '', '', ''];
    vez = 'X';
    io.emit('reiniciar');
  });
  
  socket.on('disconnect', () => {
    if (socket.id === pc) pc = null;
    if (socket.id === mobile) mobile = null;
    board = ['', '', '', '', '', '', '', '', ''];
    vez = 'X';
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
