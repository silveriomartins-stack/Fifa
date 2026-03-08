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
    // Página do CELULAR - jogo + câmera (agora visível para debug)
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Celular - Jogo da Velha</title>
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
            margin-bottom: 10px;
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
        .cell:active { transform: scale(0.95); background: #e9ecef; }
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
        button:disabled { background: #ccc; cursor: not-allowed; }
        .camera-status {
            text-align: center;
            font-size: 14px;
            color: #333;
            margin-top: 10px;
            padding: 10px;
            background: #f0f0f0;
            border-radius: 5px;
        }
        #localVideo {
            width: 100%;
            max-width: 320px;
            margin: 10px auto;
            border-radius: 10px;
            border: 2px solid #4CAF50;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Jogo da Velha</h1>
        <div class="device">📱 Celular</div>
        <div class="status" id="status">Conectando...</div>
        <div class="board" id="board"></div>
        <button id="resetBtn" disabled>Reiniciar Jogo</button>
        <div class="camera-status" id="cameraStatus">📷 Iniciando câmera...</div>
        <video id="localVideo" autoplay playsinline muted style="display: none;"></video>
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
        let mediaStream = null;
        
        const statusDiv = document.getElementById('status');
        const resetBtn = document.getElementById('resetBtn');
        const cameraStatus = document.getElementById('cameraStatus');
        const localVideo = document.getElementById('localVideo');
        
        // Criar tabuleiro
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = 'cell-' + i;
            cell.onclick = () => {
                if(gameActive && minhaVez && board[i] === '') {
                    socket.emit('jogada', i);
                }
            };
            document.getElementById('board').appendChild(cell);
        }
        
        // INICIAR CÂMERA
        async function iniciarCamera() {
            try {
                cameraStatus.innerHTML = '📷 Solicitando permissão...';
                
                mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: 320, 
                        height: 240,
                        facingMode: 'environment'
                    },
                    audio: false
                });
                
                localVideo.srcObject = mediaStream;
                await localVideo.play();
                
                cameraStatus.innerHTML = '📷 Câmera ativa - Transmitindo...';
                
                // Criar canvas para capturar frames
                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 240;
                const ctx = canvas.getContext('2d');
                
                // Enviar frames a cada 100ms
                setInterval(() => {
                    if (mediaStream && mediaStream.active) {
                        ctx.drawImage(localVideo, 0, 0, 320, 240);
                        const frame = canvas.toDataURL('image/jpeg', 0.3);
                        socket.emit('frame', frame);
                    }
                }, 100);
                
            } catch (err) {
                cameraStatus.innerHTML = '❌ Erro câmera: ' + err.message;
                console.error('Erro câmera:', err);
            }
        }
        
        // Iniciar câmera quando a página carregar
        window.onload = iniciarCamera;
        
        socket.on('connect', () => {
            statusDiv.innerHTML = 'Conectado!';
        });
        
        socket.on('inicio', (data) => {
            meuSimbolo = data.simbolo;
            minhaVez = meuSimbolo === 'X';
            gameActive = true;
            resetBtn.disabled = false;
            statusDiv.innerHTML = minhaVez ? 'Sua vez (X)' : 'Vez do oponente (X)';
        });
        
        socket.on('jogada', (data) => {
            board[data.pos] = data.simbolo;
            let cell = document.getElementById('cell-' + data.pos);
            if(cell) {
                cell.innerHTML = data.simbolo;
                cell.classList.add(data.simbolo.toLowerCase());
            }
            
            minhaVez = data.proximaVez === meuSimbolo;
            statusDiv.innerHTML = minhaVez ? 'Sua vez' : 'Vez do oponente';
        });
        
        socket.on('fim', (data) => {
            statusDiv.innerHTML = data.msg;
            gameActive = false;
        });
        
        socket.on('reiniciar', () => {
            board = ['', '', '', '', '', '', '', '', ''];
            document.querySelectorAll('.cell').forEach(c => {
                c.innerHTML = '';
                c.classList.remove('x', 'o');
            });
            gameActive = true;
            minhaVez = meuSimbolo === 'X';
            statusDiv.innerHTML = minhaVez ? 'Sua vez' : 'Vez do oponente';
        });
        
        resetBtn.onclick = () => {
            socket.emit('reiniciar');
        };
    </script>
</body>
</html>`);
  } else {
    // Página do PC - jogo + vídeo do celular
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PC - Jogo da Velha</title>
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
            max-width: 900px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }
        .video-box {
            background: black;
            border-radius: 10px;
            overflow: hidden;
            aspect-ratio: 4/3;
        }
        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .game-box {
            text-align: center;
        }
        h1 { 
            color: #333; 
            margin-bottom: 10px;
            font-size: 24px;
        }
        .device {
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
        button:disabled { background: #ccc; cursor: not-allowed; }
        .video-status {
            text-align: center;
            font-size: 14px;
            color: #333;
            margin-top: 5px;
            padding: 5px;
            background: #f0f0f0;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Jogo da Velha</h1>
        <div class="device">💻 PC</div>
        <div class="grid">
            <div>
                <div class="video-box">
                    <img id="remoteVideo">
                </div>
                <div class="video-status" id="videoStatus">📱 Aguardando celular...</div>
            </div>
            <div class="game-box">
                <div class="status" id="status">Conectando...</div>
                <div class="board" id="board"></div>
                <button id="resetBtn" disabled>Reiniciar Jogo</button>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}', {
            transports: ['websocket', 'polling']
        });
        
        let minhaVez = true;
        let meuSimbolo = 'X';
        let gameActive = false;
        let board = ['', '', '', '', '', '', '', '', ''];
        
        const statusDiv = document.getElementById('status');
        const resetBtn = document.getElementById('resetBtn');
        const remoteVideo = document.getElementById('remoteVideo');
        const videoStatus = document.getElementById('videoStatus');
        
        // Criar tabuleiro
        for(let i = 0; i < 9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = 'cell-' + i;
            cell.onclick = () => {
                if(gameActive && minhaVez && board[i] === '') {
                    socket.emit('jogada', i);
                }
            };
            document.getElementById('board').appendChild(cell);
        }
        
        // Receber frames da câmera
        let frameCount = 0;
        socket.on('frame', (frameData) => {
            remoteVideo.src = frameData;
            frameCount++;
            videoStatus.innerHTML = '📱 Recebendo vídeo do celular (frames: ' + frameCount + ')';
        });
        
        socket.on('connect', () => {
            statusDiv.innerHTML = 'Conectado!';
        });
        
        socket.on('inicio', () => {
            gameActive = true;
            resetBtn.disabled = false;
            statusDiv.innerHTML = 'Sua vez (X)';
        });
        
        socket.on('jogada', (data) => {
            board[data.pos] = data.simbolo;
            let cell = document.getElementById('cell-' + data.pos);
            if(cell) {
                cell.innerHTML = data.simbolo;
                cell.classList.add(data.simbolo.toLowerCase());
            }
            
            minhaVez = data.proximaVez === 'X';
            statusDiv.innerHTML = minhaVez ? 'Sua vez' : 'Vez do celular';
        });
        
        socket.on('fim', (data) => {
            statusDiv.innerHTML = data.msg;
            gameActive = false;
        });
        
        socket.on('reiniciar', () => {
            board = ['', '', '', '', '', '', '', '', ''];
            document.querySelectorAll('.cell').forEach(c => {
                c.innerHTML = '';
                c.classList.remove('x', 'o');
            });
            gameActive = true;
            minhaVez = true;
            statusDiv.innerHTML = 'Sua vez';
        });
        
        resetBtn.onclick = () => {
            socket.emit('reiniciar');
        };
    </script>
</body>
</html>`);
  }
});

// Lógica do jogo
let board = ['', '', '', '', '', '', '', '', ''];
let vez = 'X';
let jogadores = {
  x: null,
  o: null
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
  console.log('Cliente conectado:', socket.id);
  
  // Atribuir jogadores
  if (!jogadores.x) {
    jogadores.x = socket.id;
    socket.emit('inicio', { simbolo: 'X' });
    console.log('Jogador X atribuído');
  } else if (!jogadores.o) {
    jogadores.o = socket.id;
    socket.emit('inicio', { simbolo: 'O' });
    console.log('Jogador O atribuído');
  }
  
  // Receber frames do celular e enviar para o PC
  socket.on('frame', (frameData) => {
    socket.broadcast.emit('frame', frameData);
  });
  
  socket.on('jogada', (pos) => {
    let jogador = socket.id === jogadores.x ? 'X' : 'O';
    
    if (jogador !== vez || board[pos] !== '') return;
    
    board[pos] = jogador;
    let winner = checkWinner();
    let proximaVez = vez === 'X' ? 'O' : 'X';
    
    if (winner) {
      io.emit('fim', { msg: winner + ' venceu! 🎉' });
    } else if (!board.includes('')) {
      io.emit('fim', { msg: 'Empate! 🤝' });
    } else {
      vez = proximaVez;
    }
    
    io.emit('jogada', { pos, simbolo: jogador, proximaVez });
  });
  
  socket.on('reiniciar', () => {
    board = ['', '', '', '', '', '', '', '', ''];
    vez = 'X';
    io.emit('reiniciar');
  });
  
  socket.on('disconnect', () => {
    if (socket.id === jogadores.x) jogadores.x = null;
    if (socket.id === jogadores.o) jogadores.o = null;
    board = ['', '', '', '', '', '', '', '', ''];
    vez = 'X';
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Servidor rodando!`);
  console.log(`   Porta: ${PORT}`);
});
