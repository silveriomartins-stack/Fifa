
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

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// HTML direto na rota principal
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Camera Simples</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial; text-align: center; padding: 20px; background: #f0f0f0; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
        button { padding: 15px 30px; font-size: 18px; margin: 10px; border-radius: 5px; border: none; cursor: pointer; }
        #ligar { background: #4CAF50; color: white; }
        #desligar { background: #f44336; color: white; }
        #foto { background: #2196F3; color: white; }
        video, img { width: 100%; max-width: 640px; border: 2px solid #333; border-radius: 5px; }
        .status { padding: 10px; margin: 10px 0; background: #e3f2fd; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📷 Câmera Simples</h1>
        <div class="status" id="status">Status: Desligada</div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <h3>Local (seu celular)</h3>
                <video id="localVideo" autoplay playsinline muted></video>
            </div>
            <div>
                <h3>Remoto (outro dispositivo)</h3>
                <img id="remoteVideo">
            </div>
        </div>
        
        <div style="margin-top: 20px;">
            <button id="ligar">🎥 Ligar Câmera</button>
            <button id="desligar" disabled>⏹️ Desligar</button>
            <button id="foto" disabled>📸 Foto</button>
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
        let cameraLigada = false;

        socket.on('connect', () => {
            statusDiv.innerHTML = 'Status: Conectado ao servidor';
        });

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
                
                cameraLigada = true;
                statusDiv.innerHTML = 'Status: Câmera ligada - Transmitindo...';
                ligarBtn.disabled = true;
                desligarBtn.disabled = false;
                fotoBtn.disabled = false;
                
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 480;
                const context = canvas.getContext('2d');
                
                intervaloEnvio = setInterval(() => {
                    if (mediaStream?.active) {
                        context.drawImage(localVideo, 0, 0, 640, 480);
                        const frame = canvas.toDataURL('image/jpeg', 0.5);
                        socket.emit('frame', frame);
                    }
                }, 200);
                
            } catch (err) {
                alert('Erro: ' + err.message);
            }
        };

        desligarBtn.onclick = () => {
            if (mediaStream) {
                mediaStream.getTracks().forEach(t => t.stop());
            }
            clearInterval(intervaloEnvio);
            localVideo.srcObject = null;
            cameraLigada = false;
            statusDiv.innerHTML = 'Status: Desligada';
            ligarBtn.disabled = false;
            desligarBtn.disabled = true;
            fotoBtn.disabled = true;
        };

        fotoBtn.onclick = () => {
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

// Socket.IO para broadcast
io.on('connection', (socket) => {
  console.log('Cliente conectado');
  
  socket.on('frame', (frameData) => {
    socket.broadcast.emit('frame', frameData);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
