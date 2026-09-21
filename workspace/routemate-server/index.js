/**
 * routemate-server/index.js
 *
 * Express + Socket.io server for Route Mate pod chat.
 *
 * Each pod is a Socket.io "room".  When a user connects they join
 * their pod room and receive the last 50 messages.  Messages are
 * written to the in-memory store and broadcast to every member of
 * that room in real time.
 *
 * REST endpoints let the React app fetch history and pod metadata
 * without an open socket (e.g. on initial page load).
 *
 * To swap the in-memory store for PostgreSQL in iteration two:
 *   - Replace the _messages / _pods objects with DB queries
 *   - Everything else (Socket.io events, REST routes) stays the same
 */
 
const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const cors      = require('cors');
const { v4: uuid } = require('uuid');
 
const PORT = process.env.PORT || 3001;
 
// ── App setup ─────────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
 
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
 
app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], credentials: true }));
app.use(express.json());
 
// ── In-memory data store ──────────────────────────────────────────────────────
 
const HISTORY_LIMIT = 50;   // messages kept per pod
 
const _pods = {
  '1': { id: '1', name: 'Midrand → Wits',       type: 'Route-based · Gautrain', members: 0 },
  '2': { id: '2', name: 'Wits Campus Students',  type: 'Interest-based',         members: 0 },
  '3': { id: '3', name: 'Pretoria CBD Evening',  type: 'Route · 5–7pm',          members: 0 },
};
 
// Seed a few messages so the chat isn't empty on first open
const _messages = {
  '1': [
    { id: uuid(), podId: '1', authorId: 'seed1', authorName: 'Thandiwe N.', initials: 'TN', avatarColor: '#C7EF4E', avatarText: '#003310', text: '8:04 is super full today — standing room only on platform 3 🚆', type: 'text', timestamp: Date.now() - 1000 * 60 * 18 },
    { id: uuid(), podId: '1', authorId: 'seed2', authorName: 'Boland M.',   initials: 'BM', avatarColor: '#F59E0B', avatarText: '#412402', text: 'Coffee at Station Deli is 🔥 btw — opens at 6:45am',             type: 'text', timestamp: Date.now() - 1000 * 60 * 12 },
    { id: uuid(), podId: '1', authorId: 'seed3', authorName: 'Kagiso D.',   initials: 'KD', avatarColor: '#3B8BD4', avatarText: '#042C53', text: 'Anyone heading to Wits library after lectures? Study group?',      type: 'text', timestamp: Date.now() - 1000 * 60 * 6  },
  ],
  '2': [
    { id: uuid(), podId: '2', authorId: 'seed4', authorName: 'Lerato N.',   initials: 'LN', avatarColor: '#C7EF4E', avatarText: '#003310', text: 'Does anyone know if the library opens early on Fridays?',         type: 'text', timestamp: Date.now() - 1000 * 60 * 30 },
  ],
  '3': [],
};
 
// Track which socket IDs are in which pod (for member counts)
const _socketPods = {};   // socketId → podId
 
// ── Helpers ───────────────────────────────────────────────────────────────────
 
function getPodMessages(podId) {
  return (_messages[podId] ?? []).slice(-HISTORY_LIMIT);
}
 
function addMessage(msg) {
  if (!_messages[msg.podId]) _messages[msg.podId] = [];
  _messages[msg.podId].push(msg);
  // Trim to limit
  if (_messages[msg.podId].length > HISTORY_LIMIT) {
    _messages[msg.podId] = _messages[msg.podId].slice(-HISTORY_LIMIT);
  }
}
 
function updateMemberCounts() {
  Object.keys(_pods).forEach(podId => {
    const room = io.sockets.adapter.rooms.get(podId);
    _pods[podId].members = room ? room.size : 0;
  });
}
 
function formatTimestamp(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000)         return 'Just now';
  if (diff < 3_600_000)      return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)     return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}
 
// ── REST endpoints ────────────────────────────────────────────────────────────
 
// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
 
// List all pods
app.get('/pods', (req, res) => {
  updateMemberCounts();
  res.json(Object.values(_pods));
});
 
// Get a pod's message history
app.get('/pods/:podId/messages', (req, res) => {
  const msgs = getPodMessages(req.params.podId).map(m => ({
    ...m,
    timeLabel: formatTimestamp(m.timestamp),
  }));
  res.json(msgs);
});
 
// ── Socket.io ─────────────────────────────────────────────────────────────────
 
io.on('connection', (socket) => {
  console.log(`[connect]  ${socket.id}`);
 
  /**
   * join_pod  — client sends { podId, user: { name, initials, avatarColor, avatarText } }
   * Server:
   *   1. Adds socket to the pod room
   *   2. Sends message history to the joining socket
   *   3. Broadcasts a system "user joined" event to the rest of the room
   *   4. Broadcasts updated member count to everyone in the room
   */
  socket.on('join_pod', ({ podId, user }) => {
    // Leave previous pod if any
    const prev = _socketPods[socket.id];
    if (prev && prev !== podId) {
      socket.leave(prev);
      socket.to(prev).emit('user_left', { userId: socket.id, podId: prev });
    }
 
    socket.join(podId);
    _socketPods[socket.id] = podId;
    updateMemberCounts();
 
    // Send history to this socket only
    const history = getPodMessages(podId).map(m => ({
      ...m, timeLabel: formatTimestamp(m.timestamp),
    }));
    socket.emit('message_history', { podId, messages: history });
 
    // System message to the rest of the room
    if (user?.name) {
      socket.to(podId).emit('system_message', {
        id: uuid(), podId,
        text: `${user.name} joined the pod`,
        timestamp: Date.now(),
      });
    }
 
    // Updated member count to everyone in room
    io.to(podId).emit('member_count', { podId, count: _pods[podId]?.members ?? 0 });
 
    console.log(`[join]     ${socket.id} → pod ${podId}`);
  });
 
  /**
   * send_message  — client sends { podId, text, user, type? }
   * Server:
   *   1. Builds a full message object with a server-generated id + timestamp
   *   2. Saves to in-memory store
   *   3. Broadcasts to ALL sockets in the room (including sender)
   */
  socket.on('send_message', ({ podId, text, user, type = 'text' }) => {
    if (!text?.trim() || !podId) return;
 
    const msg = {
      id:          uuid(),
      podId,
      authorId:    socket.id,
      authorName:  user?.name      ?? 'Anonymous',
      initials:    user?.initials  ?? '?',
      avatarColor: user?.avatarColor ?? '#C7EF4E',
      avatarText:  user?.avatarText  ?? '#003310',
      text:        text.trim(),
      type,
      timestamp:   Date.now(),
      timeLabel:   'Just now',
    };
 
    addMessage(msg);
    io.to(podId).emit('new_message', msg);
 
    console.log(`[message]  pod ${podId} — ${user?.name}: ${text.trim().slice(0, 60)}`);
  });
 
  /**
   * typing  — client sends { podId, user }
   * Relays to room (excluding sender) so others can show a "typing" indicator
   */
  socket.on('typing', ({ podId, user }) => {
    socket.to(podId).emit('user_typing', { userId: socket.id, name: user?.name });
  });
 
  /**
   * stop_typing — clears the typing indicator
   */
  socket.on('stop_typing', ({ podId }) => {
    socket.to(podId).emit('user_stop_typing', { userId: socket.id });
  });
 
  /**
   * disconnect — clean up room membership
   */
  socket.on('disconnect', () => {
    const podId = _socketPods[socket.id];
    if (podId) {
      socket.to(podId).emit('user_left', { userId: socket.id, podId });
      delete _socketPods[socket.id];
      updateMemberCounts();
      io.to(podId).emit('member_count', { podId, count: _pods[podId]?.members ?? 0 });
    }
    console.log(`[disconnect] ${socket.id}`);
  });
});
 
// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🚀  Route Mate chat server running on http://localhost:${PORT}`);
  console.log(`   Socket.io ready — waiting for pod connections\n`);
});