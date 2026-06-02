import { io } from 'socket.io-client';
import React, { useState, useEffect, useRef, useCallback, createContext } from 'react';

export const SocketContext = createContext();

const socket = io(`${import.meta.env.VITE_Socket_URL}`, { autoConnect:true, reconnectionAttempts:5 });
const RTC_CONFIG = { iceServers:[{urls:'stun:stun.l.google.com:19302'}] };
const MEDIA_CONSTRAINTS = { video:true, audio:true };

export const SocketProvider = ({ children }) => {
  const onMessageRef = useRef(null);
  const [code, setCode] = useState();
  const [email, setEmail] = useState();
  const [flag, setFlag] = useState(false);
  const [streams, setStreams] = useState([]);
  const [isCallAlive, setIsCallAlive] = useState(false);
  const [displayShare, setDisplayShare] = useState(false);
  const [peerStates, setPeerStates] = useState({});
  const [notifications, setNotifications] = useState([]);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const codeRef = useRef(null);
  const emailRef = useRef(null);

  useEffect(()=>{ codeRef.current=code; },[code]);
  useEffect(()=>{ emailRef.current=email; },[email]);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const pushNotification = useCallback((message,type='info')=>{
    const id = Date.now()+Math.random();
    setNotifications(p=>[...p,{id,message,type}]);
    setTimeout(()=>setNotifications(p=>p.filter(n=>n.id!==id)),4000);
  },[]);

  const dismissNotification = useCallback((id)=>{
    setNotifications(p=>p.filter(n=>n.id!==id));
  },[]);

  // ── Media helpers ──────────────────────────────────────────────────────────
  const stopStream = (ref)=>{ if(ref.current){ref.current.getTracks().forEach(t=>t.stop());ref.current=null;} };

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const cleanupCall = useCallback(()=>{
    if(dcRef.current){dcRef.current.close();dcRef.current=null;}
    if(pcRef.current){
      pcRef.current.ontrack=null; pcRef.current.onicecandidate=null;
      pcRef.current.ondatachannel=null; pcRef.current.onnegotiationneeded=null;
      pcRef.current.onconnectionstatechange=null;
      pcRef.current.close(); pcRef.current=null;
    }
    stopStream(localStreamRef); stopStream(screenStreamRef);
    const v=document.querySelector('#video'); if(v) v.srcObject=null;
    setStreams([]); setFlag(false); setIsCallAlive(false); setDisplayShare(false); setPeerStates({});
  },[]);

  // ── PeerConnection ─────────────────────────────────────────────────────────
  const createPeerConnection = useCallback(()=>{
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pc.ontrack = (e)=>{
      const ms = new MediaStream([e.track]);
      setStreams(p=>[...p,{kind:e.track.kind,mediaStream:ms}]);
    };
    pc.addEventListener('icecandidate',e=>{ if(e.candidate) socket.emit('icecandidate',e.candidate,codeRef.current); });
    pc.addEventListener('connectionstatechange',()=>{
      if(pc.connectionState==='failed'||pc.connectionState==='disconnected') cleanupCall();
    });
    return pc;
  },[cleanupCall]);

  const getLocalStream = useCallback(async()=>{
    if(localStreamRef.current) return localStreamRef.current;
    const s = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
    localStreamRef.current=s;
    const v=document.querySelector('#video'); if(v) v.srcObject=s;
    return s;
  },[]);

  const emitMediaState = useCallback((patch)=>{ socket.emit('media-state',patch); },[]);

  // ── Caller ─────────────────────────────────────────────────────────────────
  const makeCall = useCallback(async(roomCode)=>{
    try {
      const s=await getLocalStream();
      const pc=createPeerConnection(); pcRef.current=pc;
      s.getTracks().forEach(t=>pc.addTrack(t,s));
      const dc=pc.createDataChannel('channel'); dcRef.current=dc;
      dc.onopen=()=>setFlag(true); dc.onclose=()=>setFlag(false);
      dc.onmessage=e=>{ if(onMessageRef.current) onMessageRef.current(e.data); };
      // NOTE: no onnegotiationneeded — we drive offer/answer manually
      const offer=await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer',offer,roomCode);
      setIsCallAlive(true);
    } catch(err){ console.error('makeCall:',err); cleanupCall(); }
  },[getLocalStream,createPeerConnection,cleanupCall]);

  // ── Callee ─────────────────────────────────────────────────────────────────
  const answerCall = useCallback(async(offer)=>{
    try {
      const s=await getLocalStream();
      const pc=createPeerConnection(); pcRef.current=pc;
      s.getTracks().forEach(t=>pc.addTrack(t,s));
      pc.ondatachannel=e=>{
        dcRef.current=e.channel;
        dcRef.current.onopen=()=>setFlag(true); dcRef.current.onclose=()=>setFlag(false);
        dcRef.current.onmessage=ev=>{ if(onMessageRef.current) onMessageRef.current(ev.data); };
      };
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer=await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer',answer,codeRef.current);
      setIsCallAlive(true);
    } catch(err){ console.error('answerCall:',err); cleanupCall(); }
  },[createPeerConnection,getLocalStream,cleanupCall]);

  const handleSDPUpdate = useCallback(async(offer)=>{
    if(!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer=await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);
    socket.emit('new-answer',answer,codeRef.current);
  },[]);

  const updatedSDPAnswer = useCallback(async(answer)=>{
    if(!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
  },[]);

  const setAnswer = useCallback(async(answer)=>{
    if(!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
  },[]);

  // ── Screen share — REPLACE sender track, no addTrack ──────────────────────
  const captureScreen = useCallback(async()=>{
    try {
      const ds = await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
      screenStreamRef.current=ds;
      const [screenTrack] = ds.getVideoTracks();

      if(pcRef.current) {
        // Find existing video sender and replace its track — avoids addTrack + renegotiation
        const sender = pcRef.current.getSenders().find(s=>s.track&&s.track.kind==='video');
        if(sender) {
          await sender.replaceTrack(screenTrack);
        } else {
          // No existing video sender (cam was off) — must addTrack + renegotiate
          pcRef.current.addTrack(screenTrack, ds);
          const offer=await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          socket.emit('new-offer',offer,codeRef.current);
        }
      }

      screenTrack.onended=async()=>{
        // Restore camera track when user stops screen share
        const camTrack = localStreamRef.current?.getVideoTracks()[0];
        if(camTrack && pcRef.current) {
          const sender = pcRef.current.getSenders().find(s=>s.track?.kind==='video');
          if(sender) await sender.replaceTrack(camTrack);
        }
        stopStream(screenStreamRef);
        setDisplayShare(false);
        emitMediaState({screen:false});
        pushNotification('You stopped sharing screen','screen-off');
      };

      setDisplayShare(true);
      emitMediaState({screen:true});
    } catch(err){ console.error('captureScreen:',err); }
  },[emitMediaState,pushNotification]);

  // ── End call ───────────────────────────────────────────────────────────────
  const endCall = useCallback(()=>{
    socket.emit('endcall',codeRef.current); cleanupCall();
  },[cleanupCall]);

  const handleEndCall = endCall;

  const handleMSG = useCallback((msg)=>{
    if(dcRef.current?.readyState==='open') dcRef.current.send(msg);
  },[]);

  const handleJoin = useCallback(async(userEmail,roomCode)=>{
    try { await getLocalStream(); } catch(e){ console.error('media:',e); }
    socket.emit('enter',userEmail,roomCode);
  },[getLocalStream]);

  // ── Socket events ──────────────────────────────────────────────────────────
  useEffect(()=>{
    const onEnter=(ue,rc)=>{ pushNotification(`${ue} joined the room`,'join'); makeCall(rc); };
    const onOffer=(o)=>answerCall(o);
    const onAnswer=(a)=>setAnswer(a);
    const onIce=async(c)=>{ try{ if(pcRef.current) await pcRef.current.addIceCandidate(c); }catch(e){} };
    const onNewOffer=(o)=>handleSDPUpdate(o);
    const onNewAnswer=(a)=>updatedSDPAnswer(a);
    const onEndCall=()=>cleanupCall();

    const onPeerMediaState=({email:pe,mic,cam,screen})=>{
      setPeerStates(prev=>{
        const old=prev[pe]||{};
        if(old.mic!==undefined&&old.mic!==mic) pushNotification(`${pe} ${mic?'unmuted mic':'muted mic'}`,mic?'mic-on':'mic-off');
        if(old.cam!==undefined&&old.cam!==cam) pushNotification(`${pe} turned ${cam?'on':'off'} camera`,cam?'cam-on':'cam-off');
        if(old.screen!==undefined&&old.screen!==screen) pushNotification(`${pe} ${screen?'started':'stopped'} screen share`,screen?'screen-on':'screen-off');
        return {...prev,[pe]:{mic,cam,screen}};
      });
    };

    const onPeerLeft=({email:pe})=>{
      pushNotification(`${pe} left the call`,'leave');
      setPeerStates(prev=>{ const n={...prev}; delete n[pe]; return n; });
    };

    socket.on('enter',onEnter); socket.on('offer',onOffer); socket.on('answer',onAnswer);
    socket.on('icecandidate',onIce); socket.on('new-offer',onNewOffer); socket.on('new-answer',onNewAnswer);
    socket.on('endcall',onEndCall); socket.on('peer-media-state',onPeerMediaState); socket.on('peer-left',onPeerLeft);
    return()=>{
      socket.off('enter',onEnter); socket.off('offer',onOffer); socket.off('answer',onAnswer);
      socket.off('icecandidate',onIce); socket.off('new-offer',onNewOffer); socket.off('new-answer',onNewAnswer);
      socket.off('endcall',onEndCall); socket.off('peer-media-state',onPeerMediaState); socket.off('peer-left',onPeerLeft);
    };
  },[makeCall,answerCall,setAnswer,handleSDPUpdate,updatedSDPAnswer,cleanupCall,pushNotification]);

  useEffect(()=>()=>cleanupCall(),[cleanupCall]);

  return (
    <SocketContext.Provider value={{
      code,setCode,email,setEmail,displayShare,streams,socket,isCallAlive,
      handleJoin,makeCall,onMessageRef,pcRef,dcRef,flag,handleMSG,
      captureScreen,endCall,handleEndCall,localStreamRef,screenStreamRef,emitMediaState,
      peerStates,notifications,dismissNotification,
    }}>
      {children}
    </SocketContext.Provider>
  );
};