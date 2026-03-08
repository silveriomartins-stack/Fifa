const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const gameRooms = {};

// ====================== HTML AUTOMÁTICO (celular ↔ PC) ======================
const fullHTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vídeo Celular → PC</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; background:#000; color:#fff; overflow:hidden; }
    #remote-video { position: fixed; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1; }
    #local-video { position: fixed; bottom: 20px; right: 20px; width: 140px; height: 140px; object-fit: cover; border: 4px solid #0ff; border-radius: 15px; box-shadow: 0 0 20px #0ff; z-index: 10; }
    #info { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.85); padding: 20px 30px; border-radius: 20px; text-align: center; z-index: 30; max-width: 90%; }
    #info h1 { font-size: 1.8rem; margin-bottom: 8px; }
    button { padding: 12px 25px; font-size: 1.1rem; margin: 8px; border: none; border-radius: 50px; background: #00ffcc; color: #000; cursor: pointer; }
    @media (max-width: 768px) { #local-video { width: 110px; height: 110px; } }
  </style>
</head>
<body>
  <video id="remote-video" autoplay playsinline></video>
  <video id="local-video" autoplay playsinline muted></video>
  
  <div id="info">
    <h1 id="title">Conectando...</h1>
    <p id="subtitle">Aguarde o outro dispositivo...</p>
  </div>

  <div id="buttons" style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:30;display:none;">
    <button onclick="switchCamera()">📷 Trocar Câmera</button>
    <button onclick="toggleMute()">🎤 Mutar</button>
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    let socket, localStream, peerConnection, isMobileDevice;
    const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const remoteVideo = document.getElementById('remote-video');
    const localVideo = document.getElementById('local-video');
    const FIXED_ROOM = 'VIDEO-CALL-AUTO';

    // DETECÇÃO AUTOMÁTICA: celular ou PC?
    isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     window.innerWidth < 768 || 'ontouchstart' in window;

    async function start() {
      socket = io();
      socket.emit('join-room', FIXED_ROOM);

      socket.on('start-webrtc', () => {
        if (isMobileDevice) startCall(true);   // só o celular inicia a chamada
      });

      socket.on('receive-offer', async (data) => {
        if (!peerConnection) await createPeer();
        await peerConnection.setRemoteDescription(data.sdp);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', { sdp: answer, roomCode: FIXED_ROOM });
      });

      socket.on('receive-answer', (data) => {
        if (peerConnection) peerConnection.setRemoteDescription(data.sdp);
      });

      socket.on('ice-candidate', (data) => {
        if (peerConnection) peerConnection.addIceCandidate(data.candidate);
      });

      socket.on('opponent-left', () => location.reload());
    }

    async function createPeer() {
      peerConnection = new RTCPeerConnection(config);
      peerConnection.onicecandidate = e => {
        if (e.candidate) socket.emit('ice-candidate', { candidate: e.candidate, roomCode: FIXED_ROOM });
      };
      peerConnection.ontrack = e => {
        remoteVideo.srcObject = e.streams[0];
      };
    }

    async function startCall(isInitiator) {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: true 
        });
        localVideo.srcObject = localStream;

        if (!peerConnection) await createPeer();
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        document.getElementById('title').innerHTML = '📱 CELULAR<br>Enviando vídeo ao vivo';
        document.getElementById('subtitle').textContent = 'PC está recebendo';
        document.getElementById('buttons').style.display = 'block';

        if (isInitiator) {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.emit('offer', { sdp: offer, roomCode: FIXED_ROOM });
        }
      } catch (e) {
        alert('❌ Não consegui ligar a câmera. Verifique a permissão.');
      }
    }

    async function switchCamera() {
      if (!localStream || !isMobileDevice) return;
      const newMode = localStream.getVideoTracks()[0].getSettings().facingMode === 'user' ? 'environment' : 'user';
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newMode }, audio: true });
      localStream.getTracks().forEach(t => t.stop());
      localStream = newStream;
      localVideo.srcObject = newStream;
      const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(newStream.getVideoTracks()[0]);
    }

    function toggleMute() {
      if (localStream) localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
    }

    // ====================== INÍCIO AUTOMÁTICO ======================
    window.onload = () => {
      if (!isMobileDevice) {
        // PC
        document.getElementById('title').innerHTML = '🖥️ PC<br>Recebendo vídeo do celular';
        document.getElementById('subtitle').textContent = 'Aguarde o celular ligar a câmera';
        localVideo.style.display = 'none';
      }
      start();
    };
  </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(fullHTML));

io.on('connection', (socket) => {
  socket.on('join-room', (roomCode) => {
    socket.roomCode = roomCode;
    socket.join(roomCode);

    const clients = io.sockets.adapter.rooms.get(roomCode);
    if (clients && clients.size === 2) {
      io.to(roomCode).emit('start-webrtc');   // avisa que os 2 estão conectados
    }
  });

  socket.on('offer', (data) => socket.to(data.roomCode).emit('receive-offer', data));
  socket.on('answer', (data) => socket.to(data.roomCode).emit('receive-answer', data));
  socket.on('ice-candidate', (data) => socket.to(data.roomCode).emit('ice-candidate', data));

  socket.on('disconnect', () => {
    if (socket.roomCode && gameRooms[socket.roomCode]) {
      io.to(socket.roomCode).emit('opponent-left');
      delete gameRooms[socket.roomCode];
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`🚀 Sistema automático rodando na porta ${PORT}`));
