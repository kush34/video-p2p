import {io} from 'socket.io-client'
import React,{useState,useEffect,useRef} from 'react'
import { createContext } from 'react'

export const SocketContext = createContext();

export const SocketProvider = ({children}) => {
  const socket = io("http://localhost:3000")
  const [code,setCode] = useState();
  const [email,setEmail] = useState();
  const [flag,setFlag] = useState(false);
  const [list,setList] = useState([]);
  const [stream,setStream] = useState();  
  const [remoteStream,setStreamVideo] = useState();
  const [isCallAlive,setIsCallAlive] = useState(true);
  let pcRef = useRef(null);
  let dcRef = useRef(null);


  let streamRef = useRef(null);
  let remoteRef = useRef(null);

  async function videoCapture(){
    try {
        

    } catch(error) {
        console.error('Error accessing media devices.', error);
    }
  }
 
  const handleJoin = async (email,code)=>{
    socket.emit('enter',email,code);
  } 
  const makeCall = async (code)=>{
    const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
    const constraints = {'video':true,'audio':true}
    const currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    pcRef.current = new RTCPeerConnection(configuration);

    currentStream.getTracks().forEach(track => {
      const video = document.querySelector('#video');
      video.srcObject = currentStream;
      pcRef.current.addTrack(track,currentStream);
    });

    pcRef.current.addEventListener('track', async (event) => {
        const remoteVideo = document.querySelector('#remoteVideo');
        const [remoteStream] = event.streams;
        remoteVideo.srcObject = remoteStream;
    });

    dcRef.current = pcRef.current.createDataChannel("channel");
    dcRef.current.onopen = () => setFlag(true);
    dcRef.current.onmessage = (event) => console.log("Message received:", event.data);    


    pcRef.current.addEventListener('icecandidate', event => {
      if (event.candidate) {
        // console.log("icecandidate update new SDP: " + JSON.stringify(pcRef.localDescription))
        console.log("change of icecandidate")
        socket.emit("icecandidate",event.candidate,code)
      }
    });
    pcRef.current.addEventListener('datachannel', event => {
      const dataChannel = event.channel;
    });

    pcRef.current.addEventListener('connectionstatechange', event => {
      if (pcRef.connectionState === 'connected') {
        console.log('connection success')
        
      }
    });
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer)
    console.log("localDesp set")
    console.log(offer)
    socket.emit("offer",offer,code);
  }
  const answerCall = async (offer)=>{
    const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
    const constraints = {'video':true,'audio':true}
    const currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log(currentStream)
    pcRef.current = new RTCPeerConnection(configuration);
    
    currentStream.getTracks().forEach(track => {
      const video = document.querySelector('#video');
      video.srcObject = currentStream;
      pcRef.current.addTrack(track,currentStream);
    });

    pcRef.current.addEventListener('track', async (event) => {
        const remoteVideo = document.querySelector('#remoteVideo');
        const [remoteStream] = event.streams;
        remoteVideo.srcObject = remoteStream;
    });
  
    pcRef.current.ondatachannel = e =>{
      dcRef.current = e.channel;
      dcRef.current.onopen = () => setFlag(true);
      dcRef.current.onmessage = (event) => console.log("Message received:", event.data);    
    }

    pcRef.current.addEventListener('datachannel', event => {
      const dataChannel = event.channel;
    });
    pcRef.current.addEventListener('icecandidate', event => {
      if (event.candidate) {
        console.log("change of icecandidate")
        socket.emit("icecandidate",event.candidate,code)
      }
    });
      // Listen for connectionstatechange on the local RTCPeerConnection
    pcRef.current.addEventListener('connectionstatechange', event => {
        if (pcRef.current.connectionState === 'connected') {
          console.log('connection success')
          videoCapture();
        }
    });

    pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer)
    console.log("localDesp set")
    console.log(answer)
    console.log('answer created')
    socket.emit("answer",answer,code);
  }
  const handleMSG = (message) => {
    if (dcRef.current && dcRef.current.readyState === "open") {
        dcRef.current.send(message);
        console.log("Message sent:", message);
    } else {
        console.error("Data Channel is not open");
    }
  };

  const setAnswer = async (answer)=>{
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer))
    console.log('remote answer recieved and set')
  }  

  const endCall = async () => {
    if (pcRef.current) {
        setIsCallAlive(false);
        console.log(pcRef.current);
        pcRef.current.close(); // Properly close the connection
        pcRef.current = null; // Reset the ref to null
        socket.emit('endcall',code)
    } else {
        console.error("pcRef is not initialized or already closed.");
    }
};

  useEffect(() => {
    socket.on('enter',(email,code)=>{
      console.log("new-user joined " + email);
      makeCall(code)
    });
    socket.on('offer',(offer,code)=>{
      answerCall(offer);
    });
    socket.on('answer',(answer,code)=>{
      setAnswer(answer);
    });
    socket.on('icecandidate',async (candidate,code)=>{
      try {
        await pcRef.current.addIceCandidate(candidate);;
    } catch (e) {
        console.error('Error adding received ice candidate', e);
    }
    });
    socket.on('endcall',(code)=>{
      endCall();
      console.log('user disconnected, call was ended')
    })
  }, [socket])
  
    return (
      <SocketContext.Provider value={{
        code,
        setCode,
        email,
        setEmail,
        socket,
        isCallAlive,
        handleJoin,
        makeCall,
        pcRef,
        dcRef,
        flag,
        streamRef,
        handleMSG,
        endCall,
      }
      }>
        {children}
      </SocketContext.Provider>
    );
  };