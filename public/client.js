const socket = io();

const joinScreen = document.getElementById('join-screen');
const appScreen = document.getElementById('app-screen');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const joinError = document.getElementById('join-error');
const meName = document.getElementById('me-name');
const userListEl = document.getElementById('user-list');
const messagesEl = document.getElementById('messages');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const imageInput = document.getElementById('image-input');
const imagePreview = document.getElementById('image-preview');
const previewImg = document.getElementById('preview-img');
const cancelImageBtn = document.getElementById('cancel-image');
const currentChatName = document.getElementById('current-chat-name');
const typingIndicator = document.getElementById('typing-indicator');
const groupChatItem = document.querySelector('.chat-item[data-id="group"]');

let myUsername = '';
let currentChat = 'group'; // 'group' or a socket id
let pendingImage = null;
let typingTimeout = null;

// history[chatKey] = [ {from, text, image, time, mine} ]
const history = { group: [] };

// ---------- Join ----------
function attemptJoin() {
  const name = usernameInput.value.trim();
  if (!name) return;
  socket.emit('join', name);
}
joinBtn.addEventListener('click', attemptJoin);
usernameInput.addEventListener('keydown', e => { if (e.key === 'Enter') attemptJoin(); });

socket.on('join-error', (msg) => { joinError.textContent = msg; });

socket.on('joined', (username) => {
  myUsername = username;
  meName.textContent = `আমি: ${username}`;
  joinScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
});

// ---------- User list ----------
socket.on('user-list', (users) => {
  userListEl.innerHTML = '';
  users.forEach(u => {
    if (u.username === myUsername) return;
    if (!history[u.id]) history[u.id] = [];
    const div = document.createElement('div');
    div.className = 'chat-item';
    div.dataset.id = u.id;
    div.dataset.name = u.username;
    div.innerHTML = `
      <div class="avatar">${u.username[0].toUpperCase()}</div>
      <div class="chat-item-info">
        <div class="chat-item-name">${escapeHtml(u.username)}</div>
        <div class="chat-item-status">অনলাইন</div>
      </div>`;
    div.addEventListener('click', () => switchChat(u.id, u.username));
    userListEl.appendChild(div);
  });
});

groupChatItem.addEventListener('click', () => switchChat('group', 'গ্রুপ চ্যাট (সবাই)'));

function switchChat(id, name) {
  currentChat = id;
  currentChatName.textContent = name;
  document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
  const el = document.querySelector(`.chat-item[data-id="${id}"]`);
  if (el) el.classList.add('active');
  typingIndicator.textContent = '';
  renderMessages();
}

// ---------- Messages ----------
function renderMessages() {
  messagesEl.innerHTML = '';
  const list = history[currentChat] || [];
  list.forEach(addMessageToDOM);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addMessageToDOM(m) {
  const div = document.createElement('div');
  if (m.system) {
    div.className = 'msg system';
    div.textContent = m.text;
  } else {
    div.className = 'msg ' + (m.mine ? 'mine' : 'other');
    const time = new Date(m.time).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    let inner = `<div class="meta">${m.mine ? 'আপনি' : escapeHtml(m.from)} • ${time}</div>`;
    if (m.text) inner += `<div>${escapeHtml(m.text)}</div>`;
    if (m.image) inner += `<img src="${m.image}" onclick="window.open(this.src)">`;
    div.innerHTML = inner;
  }
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

socket.on('group-message', (m) => {
  const mine = m.from === myUsername && !m.system;
  const entry = { ...m, mine };
  history.group.push(entry);
  if (currentChat === 'group') addMessageToDOM(entry);
});

socket.on('private-message', (m) => {
  // figure out which chat bucket this belongs to (the OTHER person's id)
  const otherId = m.fromId === socket.id ? m.toId : m.fromId;
  if (!history[otherId]) history[otherId] = [];
  const mine = m.fromId === socket.id;
  const entry = { ...m, mine };
  history[otherId].push(entry);
  if (currentChat === otherId) addMessageToDOM(entry);
});

socket.on('typing', (info) => {
  if (info.group && currentChat === 'group') {
    typingIndicator.textContent = `${info.username} লিখছে...`;
    clearTimeout(typingIndicator._t);
    typingIndicator._t = setTimeout(() => typingIndicator.textContent = '', 1500);
  } else if (!info.group && info.fromId === currentChat) {
    typingIndicator.textContent = `${info.username} লিখছে...`;
    clearTimeout(typingIndicator._t);
    typingIndicator._t = setTimeout(() => typingIndicator.textContent = '', 1500);
  }
});

// ---------- Sending ----------
function sendMessage() {
  const text = textInput.value.trim();
  if (!text && !pendingImage) return;

  const payload = { text, image: pendingImage };
  if (currentChat === 'group') {
    socket.emit('group-message', payload);
  } else {
    socket.emit('private-message', { toId: currentChat, ...payload });
  }
  textInput.value = '';
  clearImage();
}
sendBtn.addEventListener('click', sendMessage);
textInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

textInput.addEventListener('input', () => {
  clearTimeout(typingTimeout);
  const payload = currentChat === 'group' ? {} : { toId: currentChat };
  socket.emit('typing', payload);
});

// ---------- Image handling (resized client-side to keep it light) ----------
imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 900;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      pendingImage = canvas.toDataURL('image/jpeg', 0.7);
      previewImg.src = pendingImage;
      imagePreview.classList.remove('hidden');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  imageInput.value = '';
});

cancelImageBtn.addEventListener('click', clearImage);
function clearImage() {
  pendingImage = null;
  previewImg.src = '';
  imagePreview.classList.add('hidden');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
