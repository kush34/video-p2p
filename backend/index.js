import express from 'express';
import {Server} from 'socket.io';
import cors from 'cors';
import http from 'http';

const app = express();

const server  = http.createServer(app);
const  io = new Server(server,{
		cors: {
		  origin: "http://localhost:5173",
		  methods: ["GET", "POST"]
		}
});

io.on("connection", (socket)=>{
	console.log(`user connected`)
	
	socket.on('enter',async (email,code)=>{
		socket.join(code);
		socket.to(code).emit('enter',email,code);
	});
	socket.on('offer',(offer,code)=>{
		socket.to(code).emit('offer',offer,code);
	})
	socket.on('answer',(answer,code)=>{
		socket.to(code).emit('answer',answer,code)
	});
	socket.on('icecandidate',(candidate,code)=>{
		console.log(candidate)
		socket.to(code).emit('icecandidate',candidate,code)
	});
	socket.on('endcall',(code)=>{
		socket.to(code).emit('endcall');
	})
	socket.on("disconnect", () => {
		console.log(`user disconnected`)
	});
})


server.listen(3000,()=>{
	console.log(`listening on :3000`);
})