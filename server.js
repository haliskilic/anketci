const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const localtunnel = require('localtunnel');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static('public'));
app.use(express.json());

// ─── State ───────────────────────────────────────────────────
let questions = [];
let session = null; // { active, currentIndex, players, votes, timerEnd, phase }

function resetSession() {
  session = {
    active: false,
    currentIndex: -1,
    players: {},        // socketId -> { nickname, score }
    votes: {},          // socketId -> optionIndex
    phase: 'lobby',     // lobby | question | results | finished
    timerEnd: null,
    timerInterval: null
  };
}
resetSession();

// ─── REST API for admin question management ──────────────────
app.get('/api/questions', (req, res) => {
  res.json(questions);
});

app.post('/api/questions', (req, res) => {
  const { text, options, duration } = req.body;
  if (!text || !options || options.length < 2) {
    return res.status(400).json({ error: 'Soru metni ve en az 2 seçenek gerekli' });
  }
  const q = {
    id: Date.now().toString(),
    text,
    options, // array of strings
    duration: duration || 30
  };
  questions.push(q);
  res.json(q);
});

app.put('/api/questions/:id', (req, res) => {
  const idx = questions.findIndex(q => q.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Soru bulunamadı' });
  const { text, options, duration } = req.body;
  if (text) questions[idx].text = text;
  if (options) questions[idx].options = options;
  if (duration) questions[idx].duration = duration;
  res.json(questions[idx]);
});

app.delete('/api/questions/:id', (req, res) => {
  questions = questions.filter(q => q.id !== req.params.id);
  res.json({ ok: true });
});

// ─── QR endpoint ─────────────────────────────────────────────
let publicUrl = null;

app.get('/api/qr', async (req, res) => {
  const base = publicUrl || `http://${req.hostname}:${PORT}`;
  const url = `${base}/player.html`;
  try {
    const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
    res.json({ qr: dataUrl, url });
  } catch (e) {
    res.status(500).json({ error: 'QR oluşturulamadı' });
  }
});

// ─── Socket.IO ───────────────────────────────────────────────
io.on('connection', (socket) => {
  // Identify role
  socket.on('register-admin', () => {
    socket.join('admin');
    socket.join('display');
    socket.emit('state', getPublicState());
  });

  socket.on('register-display', () => {
    socket.join('display');
    socket.emit('state', getPublicState());
  });

  // Player joins
  socket.on('join', (nickname, cb) => {
    if (!session.active) {
      return cb({ error: 'Henüz aktif bir oturum yok' });
    }
    if (session.phase !== 'lobby') {
      return cb({ error: 'Oturum zaten başladı, katılım kapalı' });
    }
    if (Object.keys(session.players).length >= 200) {
      return cb({ error: 'Maksimum katılımcı sayısına ulaşıldı (200)' });
    }
    const taken = Object.values(session.players).some(p => p.nickname === nickname);
    if (taken) {
      return cb({ error: 'Bu kullanıcı adı zaten alınmış' });
    }
    session.players[socket.id] = { nickname, score: 0 };
    socket.join('players');
    cb({ ok: true });

    // Broadcast updated player list
    broadcastState();
  });

  // Player votes
  socket.on('vote', (optionIndex) => {
    if (!session.active || session.phase !== 'question') return;
    if (!session.players[socket.id]) return;
    if (session.votes[socket.id] !== undefined) return; // already voted

    session.votes[socket.id] = optionIndex;

    // Notify admin/display of vote count
    io.to('display').emit('vote-count', Object.keys(session.votes).length);
  });

  // ─── Admin controls ────────────────────────────────────────
  socket.on('start-session', () => {
    if (questions.length === 0) {
      return socket.emit('error-msg', 'Önce soru ekleyin');
    }
    resetSession();
    session.active = true;
    session.phase = 'lobby';
    broadcastState();
  });

  socket.on('next-question', () => {
    if (!session.active) return;

    // Clear previous timer
    if (session.timerInterval) {
      clearInterval(session.timerInterval);
      session.timerInterval = null;
    }

    session.currentIndex++;
    if (session.currentIndex >= questions.length) {
      session.phase = 'finished';
      broadcastState();
      return;
    }

    session.votes = {};
    session.phase = 'question';

    const q = questions[session.currentIndex];
    session.timerEnd = Date.now() + q.duration * 1000;

    broadcastState();

    // Timer countdown
    session.timerInterval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((session.timerEnd - Date.now()) / 1000));
      io.to('display').to('players').emit('timer', remaining);

      if (remaining <= 0) {
        clearInterval(session.timerInterval);
        session.timerInterval = null;
        session.phase = 'results';
        broadcastState();
      }
    }, 1000);
  });

  socket.on('end-session', () => {
    if (session.timerInterval) {
      clearInterval(session.timerInterval);
    }
    resetSession();
    broadcastState();
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (session && session.players[socket.id]) {
      delete session.players[socket.id];
      broadcastState();
    }
  });
});

function getPublicState() {
  const q = session.currentIndex >= 0 && session.currentIndex < questions.length
    ? questions[session.currentIndex]
    : null;

  const state = {
    active: session.active,
    phase: session.phase,
    currentIndex: session.currentIndex,
    totalQuestions: questions.length,
    playerCount: Object.keys(session.players).length,
    players: Object.values(session.players).map(p => p.nickname),
    voteCount: Object.keys(session.votes).length
  };

  if (q) {
    state.question = {
      text: q.text,
      options: q.options,
      duration: q.duration
    };
  }

  // Include results when in results phase
  if (session.phase === 'results' && q) {
    const totals = new Array(q.options.length).fill(0);
    Object.values(session.votes).forEach(idx => {
      if (idx >= 0 && idx < totals.length) totals[idx]++;
    });
    const totalVotes = Object.keys(session.votes).length;
    state.results = q.options.map((opt, i) => ({
      option: opt,
      count: totals[i],
      percent: totalVotes > 0 ? Math.round((totals[i] / totalVotes) * 100) : 0
    }));
  }

  return state;
}

function broadcastState() {
  const state = getPublicState();
  io.to('display').emit('state', state);
  io.to('players').emit('state', state);
}

// ─── Start server ────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🚀 Anketci çalışıyor: http://localhost:${PORT}`);
  console.log(`   Admin Panel:      http://localhost:${PORT}/admin.html`);
  console.log(`   Projeksiyon:      http://localhost:${PORT}/display.html\n`);

  // Attempt tunnel for external access (required - players connect via tunnel)
  console.log('🔗 Tunnel açılıyor...');
  try {
    const tunnel = await localtunnel({ port: PORT });
    publicUrl = tunnel.url;
    console.log(`✅ Tunnel hazır: ${tunnel.url}`);
    console.log(`   Oyuncular bu linkle katılacak: ${tunnel.url}/player.html`);
    console.log(`   QR kod bu adresi gösterecek.\n`);
    tunnel.on('close', () => {
      console.log('⚠️  Tunnel kapandı. Sunucuyu yeniden başlatın.');
      publicUrl = null;
    });
  } catch (e) {
    console.log('⚠️  localtunnel bağlanamadı. ngrok ile manuel tunnel açın:');
    console.log('   ngrok http 3000');
    console.log('   Ardından TUNNEL_URL ortam değişkenini ayarlayın ve yeniden başlatın.\n');
  }

  // Support manual tunnel URL (e.g. ngrok)
  if (process.env.TUNNEL_URL) {
    publicUrl = process.env.TUNNEL_URL.replace(/\/+$/, '');
    console.log(`🔗 Manuel tunnel URL: ${publicUrl}\n`);
  }
});
