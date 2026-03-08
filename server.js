const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const gameRooms = {};

// ====================== HTML SIMPLES (só vídeo) ======================
const fullHTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vídeo Call Simples</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; background:#000; color:#fff; overflow:hidden; }
    #remote-video { position: fixed; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1; filter: brightness(0.9); }
    #local-video { position: fixed; bottom: 20px; right: 20px; width: 140px; height: 140px; object-fit: cover; border: 4px solid #0ff; border-radius: 15px; box-shadow: 0 0 20px #0ff; z-index: 10; }
    #container { position: relative; z-index: 2; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px; }
    h1 { font-size: 2rem; margin-bottom: 20px; }
    input { padding: 15px; font-size: 1.2rem; width: 280px; margin: 10px; border-radius: 10px; border: none; }
    button { padding: 15px 30px; font-size: 1.2rem; margin: 10px; border: none; border-radius: 50px; background: #00ffcc; color: #000; cursor: pointer; }
    .buttons button { margin: 8px; padding: 12px 20px; font-size: 1rem; background: #00ccff; }
    #status { font-size: 1.3rem; margin: 15px 0; }
    @media (max-width: 600px) { #local-video { width: 110px; height: 110px; } }
  </style>
</head>
<body>
  <div id="join-screen">
    <h1>📹 Vídeo Call Simples</h1>
    <input id="room-code" placeholder="Código da sala (ex: ABC123)" maxlength="10">
    <button onclick="joinRoom()">ENTRAR E LIGAR CÂMERA</button>
    <p>Abra no celular e no PC com o mesmo código</p>
  </div>

  <div id="video-screen" class="hidden">
    <video id="remote-video" autoplay playsinline></video>
    <video id="local-video" autoplay playsinline muted></video>
    
    <div id="container">
      <h2 id="status">Conectando...</h2>
      <p id="room-display"></p>
      
      <div class="buttons">
        <button onclick="switchCamera()">📷 Trocar Câmera</button>
        <button onclick="toggleMute()">🎤 Mutar</button>
        <button onclick="leaveRoom()">Sair</button>
      </div>
    </div>
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    let socket, roomCode, localStream, peerConnection;
    const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const remoteVideo = document.getElementById('remote-video');
    const localVideo = document.getElementById('local-video');

    async function joinRoom() {
      const code = document.getElementById('room-code').value.trim().toUpperCase();
      if (!code) return alert('Digite um código!');
      
      roomCode = code;
      socket = io();
      socket.emit('join-room', roomCode);
      
      setupListeners();
      
      document.getElementById('join-screen').classList.add('hidden');
      document.getElementById('video-screen').classList.remove('hidden');
      document.getElementById('room-display').innerHTML = \`Código da sala: <b>\${roomCode}</b>\`;
    }

    function setupListeners() {
      socket.on('role', () => {
        document.getElementById('status').textContent = 'Câmera ligada! Aguardando...';
        startLocalCamera();           // ← CÂMERA ABRE AUTOMATICAMENTE AQUI
      });

      socket.on('game-start', () => {
        document.getElementById('status').textContent = '✅ Conectado! Vídeo ao vivo';
        startWebRTC(false);
      });

      socket.on('initiate-webrtc', () => startWebRTC(true));

      socket.on('receive-offer', async data => {
        if (!peerConnection) await createPeer();
        await peerConnection.setRemoteDescription(data.sdp);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', { sdp: answer, roomCode });
      });

      socket.on('receive-answer', data => peerConnection.setRemoteDescription(data.sdp));
      socket.on('ice-candidate', data => { if (peerConnection) peerConnection.addIceCandidate(data.candidate); });
      socket.on('opponent-left', () => alert('Oponente saiu!'));
    }

    async function startLocalCamera() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: true 
        });
        localVideo.srcObject = localStream;
      } catch (e) {
        alert('❌ Não consegui ligar a câmera. Verifique permissão no navegador.');
      }
    }

    async function createPeer() {
      peerConnection = new RTCPeerConnection(config);
      peerConnection.onicecandidate = e => { if (e.candidate) socket.emit('ice-candidate', { candidate: e.candidate, roomCode }); };
      peerConnection.ontrack = e => { remoteVideo.srcObject = e.streams[0]; };
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }

    async function startWebRTC(isInitiator) {
      if (!peerConnection) await createPeer();
      if (isInitiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', { sdp: offer, roomCode });
      }
    }

    async function switchCamera() {
      if (!localStream) return;
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

    function leaveRoom() {
      if (peerConnection) peerConnection.close();
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      socket.disconnect();
      location.reload();
    }
  </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(fullHTML));

io.on('connection', (socket) => {
  socket.on('join-room', (roomCode) => {
    socket.roomCode = roomCode;
    socket.join(roomCode);

    if (!gameRooms[roomCode]) {
      gameRooms[roomCode] = { host: socket.id };
      socket.emit('role', { symbol: 'host' });
    } else {
      if (Object.keys(io.sockets.adapter.rooms.get(roomCode) || {}).length >= 3) return socket.emit('room-full');
      socket.emit('role', { symbol: 'guest' });
      io.to(roomCode).emit('game-start');
      socket.emit('initiate-webrtc');
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
httpServer.listen(PORT, () => console.log(`🚀 Vídeo Call Simples rodando na porta ${PORT}`));
