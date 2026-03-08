const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['websocket', 'polling'] // força usar websocket
});

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(req.headers['user-agent']);
  
  if (isMobile) {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Celular</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial; text-align: center; padding: 20px; background: #1a1a1a; color: white; }
        video { width: 100%; border: 2px solid #4CAF50; border-radius: 10px; background: black; }
        .status { padding: 15px; background: #333; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>📱 CELULAR</h1>
    <div class="status" id="status">Iniciando...</div>
    <video id="localVideo" autoplay playsinline muted></video>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io({
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10
        });
        
        const localVideo = document.getElementById('localVideo');
        const statusDiv = document.getElementById('status');

        socket.on('connect', () => {
            statusDiv.innerHTML = '✅ Conectado! ID: ' + socket.id;
            console.log('Conectado:', socket.id);
        });

        socket.on('connect_error', (err) => {
            statusDiv.innerHTML = '❌ Erro conexão: ' + err.message;
            console.error('Erro:', err);
        });
        
        async function iniciarCamera() {
            try {
                statusDiv.innerHTML = '📷 Solicitando câmera...';
                
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 320, height: 240 },
                    audio: false
                });
                
                localVideo.srcObject = stream;
                statusDiv.innerHTML = '✅ Câmera ativa! Enviando...';
                
                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 240;
                const context = canvas.getContext('2d');
                
                let count = 0;
                setInterval(() => {
                    if (stream.active) {
                        context.drawImage(localVideo, 0, 0, 320, 240);
                        const frame = canvas.toDataURL('image/jpeg', 0.3);
                        socket.emit('frame', frame);
                        count++;
                        
                        // Atualiza status a cada 10 frames
                        if(count % 10 === 0) {
                            statusDiv.innerHTML = '✅ Enviando... (' + count + ' frames)';
                        }
                    }
                }, 100);
                
            } catch (err) {
                statusDiv.innerHTML = '❌ Erro: ' + err.message;
            }
        }
        
        iniciarCamera();
    </script>
</body>
</html>
    `);
  } else {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>PC</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial; text-align: center; padding: 20px; background: #1a1a1a; color: white; }
        img { width: 100%; border: 2px solid #4CAF50; border-radius: 10px; background: black; min-height: 240px; }
        .status { padding: 15px; background: #333; border-radius: 5px; margin: 10px 0; }
        #debug { background: #000; padding: 10px; text-align: left; font-size: 12px; height: 150px; overflow: auto; margin-top: 10px; }
    </style>
</head>
<body>
    <h1>💻 PC</h1>
    <div class="status" id="status">Aguardando...</div>
    <img id="remoteVideo">
    <div id="debug">Logs:</div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io({
            transports: ['websocket', 'polling']
        });
        
        const remoteVideo = document.getElementById('remoteVideo');
        const statusDiv = document.getElementById('status');
        const debugDiv = document.getElementById('debug');

        function log(msg) {
            debugDiv.innerHTML += '<br>' + msg;
            debugDiv.scrollTop = debugDiv.scrollHeight;
            console.log(msg);
        }

        socket.on('connect', () => {
            log('✅ Conectado! ID: ' + socket.id);
            statusDiv.innerHTML = 'Conectado, aguardando celular...';
        });

        socket.on('frame', (frameData) => {
            remoteVideo.src = frameData;
            statusDiv.innerHTML = '📱 RECEBENDO VÍDEO!';
            log('📸 Frame recebido');
        });

        socket.on('disconnect', () => {
            log('❌ Desconectado');
            statusDiv.innerHTML = 'Desconectado';
        });
    </script>
</body>
</html>
    `);
  }
});

// Servidor com logs
io.on('connection', (socket) => {
  console.log('🔵 Cliente conectado:', socket.id);
  console.log('   Tipo:', socket.handshake.headers['user-agent'].includes('Mobile') ? 'CELULAR' : 'PC');
  
  socket.on('frame', (frameData) => {
    console.log('📸 Frame recebido de', socket.id, '- tamanho:', Math.round(frameData.length/1024), 'KB');
    // Envia para todos EXCETO quem enviou
    socket.broadcast.emit('frame', frameData);
  });
  
  socket.on('disconnect', () => {
    console.log('🔴 Cliente desconectado:', socket.id);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
