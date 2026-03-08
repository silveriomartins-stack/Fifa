const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

// HTML direto (sem pasta public)
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>📷 Câmera Simples - Funcionando</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial; text-align: center; padding: 20px; background: #000; color: #fff; }
        .container { max-width: 900px; margin: 0 auto; background: #111; padding: 20px; border-radius: 15px; }
        button { padding: 15px 30px; font-size: 18px; margin: 10px; border-radius: 8px; border: none; cursor: pointer; }
        #ligar { background: #4CAF50; color: white; }
        #desligar { background: #f44336; color: white; }
        #foto { background: #2196F3; color: white; }
        video, img { width: 100%; max-width: 640px; border: 3px solid #0ff; border-radius: 10px; margin: 10px 0; }
        .status { padding: 12px; margin: 15px 0; background: #1a1a1a; border-radius: 8px; font-size: 1.1rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📷 Câmera Simples (Celular → PC)</h1>
        <div class="status" id="status">Status: Desligada</div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <h3>📱 Seu Celular (Local)</h3>
                <video id="localVideo" autoplay playsinline muted></video>
            </div>
            <div>
                <h3>🖥️ PC (Remoto)</h3>
                <img id="remoteVideo">
            </div>
        </div>
        
        <div style="margin-top: 20px;">
            <button id="ligar">🎥 Ligar Câmera</button>
            <button id="desligar" disabled>⏹️ Desligar</button>
            <button id="foto" disabled>📸 Tirar Foto</button>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        const statusDiv = document.getElementById('status');
        const ligarBtn = document.getElementById('ligar');
        const desligarBtn = document.getElementById('desligar');
        const fotoBtn = document.getElementById('foto');
        
        let mediaStream = null;
        let intervaloEnvio = null;

        socket.on('connect', () => statusDiv.innerHTML = '✅ Conectado ao servidor - Abra no PC também');

        socket.on('frame', (frameData) => {
            remoteVideo.src = frameData;
        });

        ligarBtn.onclick = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 640, height: 480 } 
                });
                
                mediaStream = stream;
                localVideo.srcObject = stream;
                
                statusDiv.innerHTML = '📤 Transmitindo para o PC...';
                ligarBtn.disabled = true;
                desligarBtn.disabled = false;
                fotoBtn.disabled = false;
                
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 480;
                const ctx = canvas.getContext('2d');
                
                intervaloEnvio = setInterval(() => {
                    if (mediaStream?.active) {
                        ctx.drawImage(localVideo, 0, 0, 640, 480);
                        const frame = canvas.toDataURL('image/jpeg', 0.6);
                        socket.emit('frame', frame);
                    }
                }, 180);
                
            } catch (err) {
                alert('Erro ao ligar câmera: ' + err.message);
            }
        };

        desligarBtn.onclick = () => {
            if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
            clearInterval(intervaloEnvio);
            localVideo.srcObject = null;
            statusDiv.innerHTML = '⏹️ Desligada';
            ligarBtn.disabled = false;
            desligarBtn.disabled = true;
            fotoBtn.disabled = true;
        };

        fotoBtn.onclick = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 640; canvas.height = 480;
            canvas.getContext('2d').drawImage(localVideo, 0, 0, 640, 480);
            const link = document.createElement('a');
            link.download = 'foto-' + Date.now() + '.jpg';
            link.href = canvas.toDataURL('image/jpeg', 0.95);
            link.click();
        };
    </script>
</body>
</html>
  `);
});

// Broadcast dos frames
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  socket.on('frame', (frameData) => {
    socket.broadcast.emit('frame', frameData);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT} - Abra o link no celular e no PC!`);
});
