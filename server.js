const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');

const app = express();
const server = http.createServer(app);
// Big limit so photos can be sent as base64 over the local socket connection
const io = new Server(server, { maxHttpBufferSize: 15 * 1024 * 1024 });

app.use(express.static(path.join(__dirname, 'public')));

// username(lowercase) -> { id, username }
const users = new Map();

function broadcastUserList() {
  const list = Array.from(users.values()).map(u => ({ id: u.id, username: u.username }));
  io.emit('user-list', list);
}

function systemMessage(text) {
  io.emit('group-message', {
    from: 'System',
    text,
    time: Date.now(),
    system: true
  });
}

io.on('connection', (socket) => {

  socket.on('join', (username) => {
    username = (username || '').trim().slice(0, 24);
    if (!username) {
      socket.emit('join-error', 'নাম দিতে হবে');
      return;
    }
    const key = username.toLowerCase();
    if (users.has(key)) {
      socket.emit('join-error', 'এই নামটা আগে থেকেই আছে, অন্য নাম দিন');
      return;
    }
    users.set(key, { id: socket.id, username });
    socket.data.username = username;
    socket.data.key = key;

    socket.emit('joined', username);
    broadcastUserList();
    systemMessage(`${username} গ্রুপে যোগ দিয়েছে`);
  });

  // Group (broadcast) message: { text, image }
  socket.on('group-message', (payload) => {
    if (!socket.data.username) return;
    io.emit('group-message', {
      from: socket.data.username,
      fromId: socket.id,
      text: (payload && payload.text) ? String(payload.text).slice(0, 2000) : '',
      image: payload && payload.image ? payload.image : null,
      time: Date.now()
    });
  });

  // Private message: { toId, text, image }
  socket.on('private-message', (payload) => {
    if (!socket.data.username || !payload || !payload.toId) return;
    const target = io.sockets.sockets.get(payload.toId);
    const msg = {
      from: socket.data.username,
      fromId: socket.id,
      toId: payload.toId,
      text: payload.text ? String(payload.text).slice(0, 2000) : '',
      image: payload.image || null,
      time: Date.now()
    };
    if (target) target.emit('private-message', msg);
    // echo back to sender so their own chat window shows it
    socket.emit('private-message', msg);
  });

  socket.on('typing', (info) => {
    if (!socket.data.username) return;
    if (info && info.toId) {
      const target = io.sockets.sockets.get(info.toId);
      if (target) target.emit('typing', { fromId: socket.id, username: socket.data.username });
    } else {
      socket.broadcast.emit('typing', { fromId: socket.id, username: socket.data.username, group: true });
    }
  });

  socket.on('disconnect', () => {
    if (socket.data.key && users.has(socket.data.key)) {
      users.delete(socket.data.key);
      broadcastUserList();
      systemMessage(`${socket.data.username} চলে গেছে`);
    }
  });
});

function getLocalIPs() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n=== Hotspot Chat চালু হয়েছে ===');
  console.log(`পোর্ট: ${PORT}`);
  const ips = getLocalIPs();
  if (ips.length === 0) {
    console.log('কোনো লোকাল IP পাওয়া যায়নি। হটস্পট চালু আছে কিনা দেখুন।');
  } else {
    console.log('অন্যরা ব্রাউজারে এই ঠিকানাগুলোর যেকোনো একটা লিখে ঢুকতে পারবে:');
    ips.forEach(ip => console.log(`  http://${ip}:${PORT}`));
  }
  console.log('================================\n');
});
