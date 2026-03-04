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

// Servir arquivos estáticos (para o worker)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>📷 Câmera com Background</title>
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
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .status-bar {
            display: flex;
            justify-content: space-between;
            background: #f5f5f5;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .status-item {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .status-label { font-weight: bold; color: #555; }
        .status-value {
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: 500;
        }
        .status-value.on { background: #4CAF50; color: white; }
        .status-value.off { background: #f44336; color: white; }
        
        /* Container da câmera */
        .video-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            position: relative;
        }
        
        /* Área da imagem remota (com senha) */
        .image-container {
            position: relative;
            width: 100%;
            background: #f9f9f9;
            padding: 20px;
            border-radius: 10px;
        }
        
        .image-container h3 { margin-bottom: 15px; color: #333; }
        
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
        
        /* 🔒 SOBREPOSIÇÃO DA SENHA */
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
            backdrop-filter: blur(5px);
        }
        
        .password-box {
            background: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            width: 90%;
            max-width: 300px;
        }
        
        .password-box h3 {
            color: #333;
            margin-bottom: 20px;
            font-size: 20px;
        }
        
        .password-box input {
            width: 100%;
            padding: 12px;
            font-size: 18px;
            border: 2px solid #ddd;
            border-radius: 8px;
            margin-bottom: 15px;
            text-align: center;
            letter-spacing: 8px;
            font-weight: bold;
        }
        
        .password-box button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 25px;
            font-size: 16px;
            border-radius: 8px;
            cursor: pointer;
            width: 100%;
        }
        
        .password-box button:hover { background: #5a67d8; }
        
        .password-error {
            color: #f44336;
            margin-top: 10px;
            font-size: 14px;
            display: none;
        }
        
        /* Câmera local (não precisa de senha) */
        .local-container {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 10px;
        }
        
        .local-container h3 { margin-bottom: 15px; color: #333; }
        
        .local-wrapper {
            width: 100%;
            background: #000;
            border-radius: 10px;
            overflow: hidden;
            aspect-ratio: 4/3;
        }
        
        #localVideo {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transform: scaleX(-1);
        }
        
        /* Controles */
        .controls {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 15px 30px;
            font-size: 18px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s;
        }
        
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .btn-primary { background: #4CAF50; color: white; }
        .btn-primary:hover:not(:disabled) { background: #45a049; transform: translateY(-2px); }
        
        .btn-secondary { background: #f44336; color: white; }
        .btn-secondary:hover:not(:disabled) { background: #d32f2f; transform: translateY(-2px); }
        
        .btn-success { background: #2196F3; color: white; }
        .btn-success:hover:not(:disabled) { background: #1976D2; transform: translateY(-2px); }
        
        .info-box {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid #2196F3;
            margin-top: 20px;
        }
        
        .info-box a {
            color: #1976D2;
            font-weight: bold;
            text-decoration: none;
            background: white;
            padding: 8px 15px;
            border-radius: 5px;
            border: 2px solid #1976D2;
            display: inline-block;
            margin: 10px 0;
        }
        
        .bg-badge {
            background: #FF9800;
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 0.8em;
            margin-left: 10px;
        }
        
        @media (max-width: 768px) {
            .video-container { grid-template-columns: 1fr; }
            .btn { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>
            📷 Câmera com Background 
            <span class="bg-badge">Continua gravando fora da aba</span>
        </h1>
        
        <div class="status-bar">
            <div class="status-item">
                <span class="status-label">Câmera:</span>
                <span id="cameraStatus" class="status-value off">Desligada</span>
            </div>
            <div class="status-item">
                <span class="status-label">Modo Background:</span>
                <span id="bgStatus" class="status-value off">Inativo</span>
            </div>
            <div class="status-item">
                <span class="status-label">Visualização:</span>
                <span id="remoteStatus" class="status-value off">🔒 Bloqueada</span>
            </div>
        </div>

        <div class="video-container">
            <!-- Câmera Local (sempre visível) -->
            <div class="local-container">
                <h3>📱 Visualização Local (seu celular)</h3>
                <div class="local-wrapper">
                    <video id="localVideo" autoplay playsinline muted></video>
                </div>
            </div>

            <!-- Câmera Remota (com senha) -->
            <div class="image-container">
                <h3>📺 Visualização Remota (outro dispositivo)</h3>
                <div class="camera-wrapper">
                    <img id="remoteVideo">
                    
                    <!-- 🔒 SOBREPOSIÇÃO DA SENHA -->
                    <div id="passwordOverlay">
                        <div class="password-box">
                            <h3>🔒 Conteúdo Bloqueado</h3>
                            <p style="margin-bottom: 15px; color: #666;">Digite a senha para liberar</p>
                            <input type="password" id="senhaInput" maxlength="4" placeholder="****">
                            <button onclick="verificarSenha()">Liberar Visualização</button>
                            <div id="erroSenha" class="password-error">Senha incorreta!</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="controls">
            <button id="ligarBtn" class="btn btn-primary" onclick="ligarCamera()">🎥 Ligar Câmera (com background)</button>
            <button id="desligarBtn" class="btn btn-secondary" onclick="desligarCamera()" disabled>⏹️ Desligar</button>
            <button id="fotoBtn" class="btn btn-success" onclick="tirarFoto()" disabled>📸 Tirar Foto</button>
        </div>

        <div class="info-box">
            <h4>📱 Novidade: Background Mode!</h4>
            <ol>
                <li><strong>Neste celular:</strong> Clique em "Ligar Câmera (com background)" e permita</li>
                <li><strong>Mude de aba ou minimize:</strong> A câmera continua gravando!</li>
                <li><strong>No outro dispositivo:</strong> Acesse e digite a senha <strong>"1234"</strong></li>
                <li>O stream continua mesmo com a aba em background! 🎉</li>
            </ol>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const SENHA_CORRETA = "1234";
        
        // Elementos
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        const passwordOverlay = document.getElementById('passwordOverlay');
        const cameraStatus = document.getElementById('cameraStatus');
        const bgStatus = document.getElementById('bgStatus');
        const remoteStatus = document.getElementById('remoteStatus');
        
        // Estado
        let mediaStream = null;
        let worker = null;
        let cameraLigada = false;
        let visualizacaoLiberada = false;
        let videoTrack = null;
        
        // ========== VERIFICAÇÃO DE SENHA ==========
        window.verificarSenha = function() {
            const senha = document.getElementById('senhaInput').value;
            if (senha === SENHA_CORRETA) {
                passwordOverlay.style.display = 'none';
                visualizacaoLiberada = true;
                remoteStatus.textContent = '🔓 Liberada';
                remoteStatus.className = 'status-value on';
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
        
        socket.on('frame', (frameData) => {
            if (visualizacaoLiberada) {
                remoteVideo.src = frameData;
            }
        });
        
        // ========== FUNÇÃO PRINCIPAL COM WEB WORKER ==========
        window.ligarCamera = async function() {
            try {
                // Solicita acesso à câmera
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 640, height: 480 },
                    audio: false
                });
                
                mediaStream = stream;
                videoTrack = stream.getVideoTracks()[0];
                
                // Mostra vídeo local
                localVideo.srcObject = stream;
                
                // Cria um canvas offscreen
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 480;
                const offscreen = canvas.transferControlToOffscreen();
                
                // Inicia o Web Worker
                worker = new Worker(URL.createObjectURL(new Blob([\`
                    let canvas;
                    let ctx;
                    let intervalId;
                    
                    self.onmessage = (e) => {
                        if (e.data.type === 'init') {
                            canvas = e.data.canvas;
                            ctx = canvas.getContext('2d');
                        }
                        
                        if (e.data.type === 'start') {
                            if (intervalId) clearInterval(intervalId);
                            
                            intervalId = setInterval(() => {
                                if (ctx && e.data.videoFrame) {
                                    // Desenha o frame no canvas
                                    ctx.drawImage(e.data.videoFrame, 0, 0, 640, 480);
                                    
                                    // Converte para JPEG
                                    const frame = canvas.toDataURL('image/jpeg', 0.5);
                                    
                                    // Envia de volta para a thread principal
                                    self.postMessage({ type: 'frame', frame });
                                }
                            }, 200); // 5 fps
                        }
                        
                        if (e.data.type === 'stop') {
                            if (intervalId) {
                                clearInterval(intervalId);
                                intervalId = null;
                            }
                        }
                    };
                \`], { type: 'application/javascript' })));
                
                // Configura o worker
                worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);
                
                // Inicia a captura
                worker.postMessage({ type: 'start', videoFrame: localVideo });
                
                // Recebe frames do worker
                worker.onmessage = (e) => {
                    if (e.data.type === 'frame' && cameraLigada) {
                        socket.emit('frame', e.data.frame);
                    }
                };
                
                // Monitora quando a aba fica em background
                document.addEventListener('visibilitychange', () => {
                    if (document.visibilityState === 'hidden') {
                        console.log('Aba em background - worker continua!');
                        bgStatus.textContent = 'Ativo (background)';
                        bgStatus.className = 'status-value on';
                        bgStatus.style.background = '#FF9800';
                    } else {
                        console.log('Aba visível novamente');
                        bgStatus.textContent = 'Ativo (visível)';
                        bgStatus.className = 'status-value on';
                    }
                });
                
                cameraLigada = true;
                cameraStatus.textContent = 'Ligada';
                cameraStatus.className = 'status-value on';
                bgStatus.textContent = 'Ativo';
                bgStatus.className = 'status-value on';
                
                document.getElementById('ligarBtn').disabled = true;
                document.getElementById('desligarBtn').disabled = false;
                document.getElementById('fotoBtn').disabled = false;
                
            } catch (err) {
                alert('Erro: ' + err.message);
            }
        };
        
        window.desligarCamera = function() {
            if (worker) {
                worker.postMessage({ type: 'stop' });
                worker.terminate();
                worker = null;
            }
            
            if (mediaStream) {
                mediaStream.getTracks().forEach(t => t.stop());
            }
            
            localVideo.srcObject = null;
            
            cameraLigada = false;
            cameraStatus.textContent = 'Desligada';
            cameraStatus.className = 'status-value off';
            bgStatus.textContent = 'Inativo';
            bgStatus.className = 'status-value off';
            
            document.getElementById('ligarBtn').disabled = false;
            document.getElementById('desligarBtn').disabled = true;
            document.getElementById('fotoBtn').disabled = true;
        };
        
        window.tirarFoto = function() {
            if (!localVideo.srcObject) return;
            
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            canvas.getContext('2d').drawImage(localVideo, 0, 0, 640, 480);
            
            const link = document.createElement('a');
            link.download = 'foto-' + Date.now() + '.jpg';
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
        };
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
});

server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('📷 SISTEMA DE CÂMERA COM BACKGROUND');
  console.log('='.repeat(60));
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔑 Senha: ${SENHA}`);
  console.log('📱 Agora a câmera continua gravando fora da aba!');
  console.log('='.repeat(60));
});
