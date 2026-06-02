import express from 'express';
import 'dotenv/config';
import { Server } from 'socket.io';
import cors from 'cors';
import http from 'http';

const app = express();
app.use(cors({ origin: process.env.Frontend_URL, credentials: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.Frontend_URL, credentials: true },
});

// socket.id -> { code, email, mic, cam, screen }
const userState = new Map();

io.on('connection', (socket) => {
  console.log(`connected: ${socket.id}`);

  socket.on('enter', (email, code) => {
    socket.join(code);
    userState.set(socket.id, { code, email, mic: true, cam: true, screen: false });
    console.log(`${email} joined ${code}`);
    socket.to(code).emit('enter', email, code);
  });

  socket.on('offer', (offer, code) => socket.to(code).emit('offer', offer));
  socket.on('answer', (answer, code) => socket.to(code).emit('answer', answer));
  socket.on('new-offer', (offer, code) => socket.to(code).emit('new-offer', offer));
  socket.on('new-answer', (answer, code) => socket.to(code).emit('new-answer', answer));
  socket.on('icecandidate', (candidate, code) => socket.to(code).emit('icecandidate', candidate));

  // ── Media state change ──────────────────────────────────────────────────
  // payload: { mic?, cam?, screen? }  (only changed keys needed)
  socket.on('media-state', (payload) => {
    const state = userState.get(socket.id);
    if (!state) return;
    Object.assign(state, payload);
    // broadcast to everyone else in the room with the sender's email
    socket.to(state.code).emit('peer-media-state', {
      email: state.email,
      mic: state.mic,
      cam: state.cam,
      screen: state.screen,
    });
  });

  // ── End call ────────────────────────────────────────────────────────────
  const doLeave = () => {
    const state = userState.get(socket.id);
    if (state) {
      socket.to(state.code).emit('endcall');
      socket.to(state.code).emit('peer-left', { email: state.email });
      userState.delete(socket.id);
    }
  };

  socket.on('endcall', (code) => {
    socket.to(code).emit('endcall');
    const state = userState.get(socket.id);
    if (state) {
      socket.to(code).emit('peer-left', { email: state.email });
      userState.delete(socket.id);
    }
  });

  socket.on('leave-room', (code) => {
    socket.leave(code);
    doLeave();
    console.log(`${socket.id} left ${code}`);
  });

  socket.on('disconnecting', () => {
    doLeave();
    console.log(`disconnecting: ${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log(`disconnected: ${socket.id}`);
  });
});

server.listen(3000, () => console.log('Listening on 3000'));