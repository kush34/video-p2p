import {io} from 'socket.io-client'
import React,{useState,useEffect,useRef} from 'react'
import { createContext } from 'react'

export const SocketContext = createContext();

export const SocketProvider = ({children}) => {
  const socket = io(`${import.meta.env.VITE_Socket_URL}`)
  const [code,setCode] = useState();
  const [email,setEmail] = useState();
  const [flag,setFlag] = useState(false);
  const [list,setList] = useState([]);
  const [streams, setStreams] = useState([]);
  const [remoteStream,setStreamVideo] = useState();
  const [isCallAlive,setIsCallAlive] = useState(true);
  const [displayShare,setDisplayShare] = useState(false);
  const [remoteDisplayShare,setRemoteDisplayShare] = useState(false);
  let pcRef = useRef(null);
  let dcRef = useRef(null);


  let streamRef = useRef(null);
  let remoteRef = useRef(null);

 
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
    const remoteTracks = new Set();
    pcRef.current.ontrack = (event) => {
      remoteTracks.add(event.track);
      console.log('Received remote track:', event.track?.kind, event.track?.id);

      console.log('All received tracks so far:');
      remoteTracks.forEach((track) => console.log(track?.kind, track?.id));

      // Create a MediaStream for this track
    const mediaStream = new MediaStream([event.track]);

    setStreams((prevStreams) => [...prevStreams, { kind: event.track.kind, mediaStream }]);
  };
  
    dcRef.current = pcRef.current.createDataChannel("channel");
    dcRef.current.onopen = () => setFlag(true);
    dcRef.current.onmessage = (event) => console.log("Message received:", event.data);    

    pcRef.current.onnegotiationneeded = async () => {
      console.log('negotiation fired')
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socket.emit('new-offer', offer, code); // Signal the new offer
    };
    
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
    pcRef.current.onnegotiationneeded = async () => {
      console.log('negotiation fired');
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socket.emit('new-offer', offer, code); // Signal the new offer
    };
    const remoteTracks = new Set();

    pcRef.current.ontrack = (event) => {
        remoteTracks.add(event.track);
        console.log('Received remote track:', event.track?.kind, event.track?.id);

        console.log('All received tracks so far:');
        remoteTracks.forEach((track) => console.log(track?.kind, track?.id));

        // Create a MediaStream for this track
      const mediaStream = new MediaStream([event.track]);

      setStreams((prevStreams) => [...prevStreams, { kind: event.track.kind, mediaStream }]);
    };
  
  
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
  };  
  const captureScreen =async ()=>{
    try{
      const dispStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      dispStream.getTracks().forEach((track) => {
          pcRef.current.addTrack(track, dispStream);
      });
      const userDispVideo = document.querySelector('#displayUser');
      if (dispStream) {
        userDispVideo.srcObject = dispStream; // 'stream' is your MediaStream
      } else {
        console.error("Element not found");
      }
      setDisplayShare(true);
    }
  catch(err){
    console.log(err);
  }
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
  //handles SDP update when new stream is added and emits the new answer
  const handleSDPUpdate = async (offer)=>{
    pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);
    socket.emit('new-answer',answer,code);
  }
  //set the new-answer as remote descrotion
  const UpdatedSDPAnswer= async (answer)=>{
    pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    console.log('new answer set')
  }
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
    socket.on('new-offer',(offer,code)=>{
      console.log('new offer recieved');
      handleSDPUpdate(offer);
    });
    socket.on('new-answer',(answer,code)=>{
      console.log('new answer revieved');
      UpdatedSDPAnswer(answer);
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
        displayShare,
        streams,
        remoteDisplayShare,
        socket,
        isCallAlive,
        handleJoin,
        makeCall,
        pcRef,
        dcRef,
        flag,
        streamRef,
        handleMSG,
        captureScreen,
        endCall,
      }
      }>
        {children}
      </SocketContext.Provider>
    );
  };
