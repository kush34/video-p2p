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
    pcRef = new RTCPeerConnection(configuration);

    currentStream.getTracks().forEach(track => {
      const video = document.querySelector('#video');
      video.srcObject = currentStream;
      pcRef.addTrack(track,currentStream);
    });

    pcRef.addEventListener('track', async (event) => {
      const remoteVideo = document.querySelector('#remoteVideo');
      const [remoteStream] = event.streams;
      remoteVideo.srcObject = remoteStream;
    });

    dcRef.current = pcRef.createDataChannel("channel");
    dcRef.current.onopen = () => setFlag(true);
    dcRef.current.onmessage = (event) => console.log("Message received:", event.data);    


    pcRef.addEventListener('icecandidate', event => {
      if (event.candidate) {
        // console.log("icecandidate update new SDP: " + JSON.stringify(pcRef.localDescription))
        console.log("change of icecandidate")
        socket.emit("icecandidate",event.candidate,code)
      }
    });
    pcRef.addEventListener('datachannel', event => {
      const dataChannel = event.channel;
    });

    pcRef.addEventListener('connectionstatechange', event => {
      if (pcRef.connectionState === 'connected') {
        console.log('connection success')
        
      }
    });
    const offer = await pcRef.createOffer();
    await pcRef.setLocalDescription(offer)
    console.log("localDesp set")
    console.log(offer)
    socket.emit("offer",offer,code);
  }
  const answerCall = async (offer)=>{
    const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
    const constraints = {'video':true,'audio':true}
    const currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log(currentStream)
    pcRef = new RTCPeerConnection(configuration);
    
    currentStream.getTracks().forEach(track => {
      const video = document.querySelector('#video');
      video.srcObject = currentStream;
      pcRef.addTrack(track,currentStream);
    });

    pcRef.addEventListener('track', async (event) => {
      const remoteVideo = document.querySelector('#remoteVideo');
      const [remoteStream] = event.streams;
      remoteVideo.srcObject = remoteStream;
    });
  
    pcRef.ondatachannel = e =>{
      dcRef.current = e.channel;
      dcRef.current.onopen = () => setFlag(true);
      dcRef.current.onmessage = (event) => console.log("Message received:", event.data);    
    }

    pcRef.addEventListener('datachannel', event => {
      const dataChannel = event.channel;
    });
    pcRef.addEventListener('icecandidate', event => {
      if (event.candidate) {
        console.log("change of icecandidate")
        socket.emit("icecandidate",event.candidate,code)
      }
    });
      // Listen for connectionstatechange on the local RTCPeerConnection
    pcRef.addEventListener('connectionstatechange', event => {
        if (pcRef.connectionState === 'connected') {
          console.log('connection success')
          videoCapture();
        }
    });

    pcRef.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pcRef.createAnswer();
    await pcRef.setLocalDescription(answer)
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
    await pcRef.setRemoteDescription(new RTCSessionDescription(answer))
    console.log('remote answer recieved and set')
  }  

  useEffect(() => {
    socket.on('enter',(email,code)=>{
      console.log("new-user joined " + email);
      makeCall(code)
    });
    socket.on('offer',(offer,code)=>{
      answerCall(offer);
    })
    socket.on('answer',(answer,code)=>{
      setAnswer(answer);
    })
    socket.on('icecandidate',async (candidate,code)=>{
      try {
        await pcRef.addIceCandidate(candidate);;
    } catch (e) {
        console.error('Error adding received ice candidate', e);
    }
    })
  }, [socket])
  
    return (
      <SocketContext.Provider value={{
        code,
        setCode,
        email,
        setEmail,
        socket,
        handleJoin,
        makeCall,
        pcRef,
        dcRef,
        flag,
        streamRef,
        handleMSG,
      }
      }>
        {children}
      </SocketContext.Provider>
    );
  };