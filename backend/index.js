import express from 'express';
import 'dotenv/config';
import { Server } from 'socket.io';
import cors from 'cors';
import http from 'http';

const app = express();

app.use(
	cors({
		origin: process.env.Frontend_URL,
		credentials: true,
	})
);

const server = http.createServer(app);

const io = new Server(server, {
	cors: {
		origin: process.env.Frontend_URL,
		credentials: true,
	},
});

const userRooms = new Map();

io.on('connection', (socket) => {
	console.log(`connected: ${socket.id}`);

	socket.on('enter', (email, code) => {
		socket.join(code);

		userRooms.set(socket.id, code);

		console.log(`${email} joined ${code}`);

		socket.to(code).emit('enter', email, code);
	});

	socket.on('leave-room', (code) => {
		socket.leave(code);

		userRooms.delete(socket.id);

		socket.to(code).emit('endcall');
	});

	socket.on('offer', (offer, code) => {
		socket.to(code).emit('offer', offer);
	});

	socket.on('answer', (answer, code) => {
		socket.to(code).emit('answer', answer);
	});

	socket.on('new-offer', (offer, code) => {
		socket.to(code).emit('new-offer', offer);
	});

	socket.on('new-answer', (answer, code) => {
		socket.to(code).emit('new-answer', answer);
	});

	socket.on('icecandidate', (candidate, code) => {
		socket.to(code).emit('icecandidate', candidate);
	});

	socket.on('endcall', (code) => {
		socket.to(code).emit('endcall');
	});
	socket.on('leave-room', (code) => {
		socket.leave(code);

		userRooms.delete(socket.id);

		socket.to(code).emit('endcall');

		console.log(`${socket.id} left ${code}`);
	});
	socket.on('disconnecting', () => {
		const room = userRooms.get(socket.id);

		if (room) {
			socket.to(room).emit('endcall');
			userRooms.delete(socket.id);
		}

		console.log(`disconnecting: ${socket.id}`);
	});

	socket.on('disconnect', () => {
		console.log(`disconnected: ${socket.id}`);
	});
});

server.listen(3000, () => {
	console.log('Listening on 3000');
});