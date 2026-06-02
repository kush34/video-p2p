import React, { useContext, useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SocketContext } from "../context/Socket";
import { BsCameraVideo, BsCameraVideoOff } from "react-icons/bs";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { ImPhoneHangUp } from "react-icons/im";
import { MdScreenShare, MdStopScreenShare, MdMoreVert, MdPeople, MdChat } from "react-icons/md";
import { HiVolumeUp } from "react-icons/hi";
import { TbPinned, TbPinnedOff } from "react-icons/tb";

// ── Notification sound ────────────────────────────────────────────────────────
function playSound(type) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    const freq = { join:[520,660], leave:[440,330], 'mic-off':[400,360], 'mic-on':[460,540],
                   'cam-off':[400,360], 'cam-on':[460,540], 'screen-on':[500,620], 'screen-off':[420,360] };
    const [f1,f2] = freq[type]||[480,480];
    osc.frequency.setValueAtTime(f1, ctx.currentTime);
    osc.frequency.setValueAtTime(f2, ctx.currentTime+0.1);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.3);
    osc.start(); osc.stop(ctx.currentTime+0.3);
    osc.onended = ()=>ctx.close();
  } catch(_){}
}

// ── Toast ─────────────────────────────────────────────────────────────────────
const TOAST_COLORS = {
  join:'bg-[#1e2a1e] border-[#3a5c3a] text-[#86efac]',
  leave:'bg-[#2a1e1e] border-[#5c3a3a] text-[#fca5a5]',
  'mic-off':'bg-[#2a2a1e] border-[#5c5a3a] text-[#fde68a]',
  'mic-on':'bg-[#1e222a] border-[#3a4a5c] text-[#93c5fd]',
  'cam-off':'bg-[#2a2a1e] border-[#5c5a3a] text-[#fde68a]',
  'cam-on':'bg-[#1e222a] border-[#3a4a5c] text-[#93c5fd]',
  'screen-on':'bg-[#1e242a] border-[#3a5060] text-[#67e8f9]',
  'screen-off':'bg-[#2a221e] border-[#5c4a3a] text-[#fdba74]',
  info:'bg-[#1e1e2a] border-[#3a3a5c] text-[#c4b5fd]',
};
const TOAST_ICONS = { join:'↗', leave:'↙', 'mic-on':'🎙', 'mic-off':'🔇',
                      'cam-on':'📹', 'cam-off':'⬛', 'screen-on':'🖥', 'screen-off':'⏹', info:'ℹ' };

const Toast = ({ n, onDismiss }) => {
  useEffect(()=>{ playSound(n.type); },[]);
  return (
    <div onClick={()=>onDismiss(n.id)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer select-none
        shadow-lg backdrop-blur-sm ${TOAST_COLORS[n.type]||TOAST_COLORS.info}`}
      style={{animation:'toast-in 0.2s ease forwards'}}>
      <span className="text-sm shrink-0">{TOAST_ICONS[n.type]||'ℹ'}</span>
      <span className="font-medium">{n.message}</span>
    </div>
  );
};

// ── VAD hook ──────────────────────────────────────────────────────────────────
function useVAD(stream, enabled) {
  const [active, setActive] = useState(false);
  const raf = useRef(null);
  const ctxRef = useRef(null);
  useEffect(()=>{
    if(!stream||!enabled){ setActive(false); return; }
    const ctx = new AudioContext();
    const an = ctx.createAnalyser(); an.fftSize=512;
    ctx.createMediaStreamSource(stream).connect(an);
    ctxRef.current=ctx;
    const buf = new Uint8Array(an.frequencyBinCount);
    const tick=()=>{ an.getByteFrequencyData(buf); setActive(buf.reduce((a,b)=>a+b,0)/buf.length>12); raf.current=requestAnimationFrame(tick); };
    raf.current=requestAnimationFrame(tick);
    return ()=>{ cancelAnimationFrame(raf.current); ctx.close(); setActive(false); };
  },[stream,enabled]);
  return active;
}

// ── Initials avatar ───────────────────────────────────────────────────────────
function getInitials(name='') {
  const parts = name.split(/[\s@]+/).filter(Boolean);
  if(parts.length>=2) return (parts[0][0]+parts[1][0]).toUpperCase();
  return (parts[0]||'?').slice(0,2).toUpperCase();
}
const AVATAR_COLORS=['bg-[#1a73e8]','bg-[#0f9d58]','bg-[#e37400]','bg-[#a142f4]','bg-[#ea4335]','bg-[#00897b]'];
function avatarColor(name=''){
  let h=0; for(let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))&0xffff;
  return AVATAR_COLORS[h%AVATAR_COLORS.length];
}

const Avatar = ({ name, size='md' }) => {
  const sz = size==='sm' ? 'w-8 h-8 text-xs' : size==='lg' ? 'w-16 h-16 text-xl' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} ${avatarColor(name)} rounded-full flex items-center justify-center text-white font-semibold shrink-0 select-none`}>
      {getInitials(name)}
    </div>
  );
};

// ── Safe video element — suppresses native controls on mobile browsers ────────
const SafeVideo = ({ className, autoPlay, muted, playsInline=true, srcObject, onRef, style }) => {
  const ref = useRef(null);
  useEffect(()=>{
    const el = ref.current;
    if(!el) return;
    // Suppress any browser-injected controls
    el.controls = false;
    el.disablePictureInPicture = true;
    el.setAttribute('controlsList','nodownload nofullscreen noremoteplayback');
    el.setAttribute('disablepictureinpicture','');
    el.setAttribute('webkit-playsinline','');
    el.setAttribute('playsinline','');
    if(srcObject && el.srcObject !== srcObject) {
      el.srcObject = srcObject;
      el.play().catch(()=>{});
    }
    if(onRef) onRef(el);
  },[srcObject]);

  return (
    <video
      ref={ref}
      className={className}
      style={{ ...style, WebkitUserSelect:'none', userSelect:'none' }}
      autoPlay={autoPlay}
      muted={muted}
      playsInline
      controls={false}
      disablePictureInPicture
    />
  );
};

// ── Speaker tile (large) ──────────────────────────────────────────────────────
const SpeakerTile = ({ name, stream, camOn, micOn, speaking, muted=false, pinned=false, onPin }) => {
  const videoRef = useRef(null);
  useEffect(()=>{
    const el = videoRef.current;
    if(!el) return;
    if(stream && el.srcObject !== stream){ el.srcObject = stream; el.play().catch(()=>{}); }
    else if(!stream && muted && el.srcObject){
      // local — handled by parent attaching localStreamRef
    }
  },[stream]);

  return (
    <div className={`relative w-full h-full rounded-xl overflow-hidden bg-[#1c1c1c] transition-all duration-200
      ${speaking&&micOn ? 'ring-2 ring-[#1a73e8]' : ''}`}>
      {camOn ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted={muted}
          playsInline
          controls={false}
          disablePictureInPicture
          style={{ WebkitUserSelect:'none', userSelect:'none' }}
          onLoadedMetadata={() => videoRef.current?.play().catch(()=>{})}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#1c1c1c]">
          <Avatar name={name} size="lg" />
        </div>
      )}
      {/* Gradient overlay — pointer-events:none so no native controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
      {/* Bottom bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          {!micOn && <div className="w-6 h-6 rounded-full bg-[#ea4335] flex items-center justify-center"><FaMicrophoneSlash className="text-white text-[10px]"/></div>}
          <span className="text-white text-sm font-medium drop-shadow">{name}</span>
        </div>
        {pinned && <div className="w-6 h-6 rounded-full bg-[#1a73e8]/80 flex items-center justify-center pointer-events-auto"><TbPinned className="text-white text-xs"/></div>}
      </div>
    </div>
  );
};

// ── Filmstrip tile ────────────────────────────────────────────────────────────
const FilmTile = ({ name, stream, camOn, micOn, speaking, muted=false, onClick, onDoubleClick, active=false, pinned=false }) => {
  const videoRef = useRef(null);
  useEffect(()=>{
    const el = videoRef.current;
    if(!el) return;
    if(stream && el.srcObject !== stream){ 
      el.srcObject = stream; 
      el.play().catch(()=>{});
    }
  },[stream]);

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`relative shrink-0 w-[160px] h-[108px] rounded-lg overflow-hidden bg-[#2a2a2a] cursor-pointer
        transition-all duration-150 hover:brightness-110 select-none
        ${active ? 'ring-2 ring-[#1a73e8]' : speaking&&micOn ? 'ring-2 ring-[#1a73e8]/60' : 'ring-1 ring-white/10'}`}
    >
      {camOn ? (
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          autoPlay
          muted={muted}
          playsInline
          controls={false}
          disablePictureInPicture
          style={{ WebkitUserSelect:'none', userSelect:'none', pointerEvents:'none' }}
          onLoadedMetadata={() => videoRef.current?.play().catch(()=>{})}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#2a2a2a]">
          <Avatar name={name} size="md" />
        </div>
      )}
      {/* Overlay — pointer-events:none so browser never shows video controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" style={{pointerEvents:'none'}} />
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between" style={{pointerEvents:'none'}}>
        <span className="text-white text-[11px] font-medium truncate drop-shadow">{name}</span>
        <div className="flex items-center gap-1">
          {pinned && <TbPinned className="text-[#1a73e8] text-xs"/>}
          {speaking&&micOn && <HiVolumeUp className="text-[#1a73e8] text-sm"/>}
          {!micOn && <FaMicrophoneSlash className="text-[#ea4335] text-xs"/>}
        </div>
      </div>
    </div>
  );
};

// ── Control icon button ───────────────────────────────────────────────────────
const CtrlBtn = ({ onClick, icon, label, red=false, active=true }) => (
  <button onClick={onClick} title={label}
    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 text-lg
      ${red ? 'bg-[#ea4335] text-white hover:bg-[#c5382b] active:scale-95'
             : active ? 'bg-[#3c3c3c] text-white hover:bg-[#4a4a4a] active:scale-95'
                      : 'bg-[#ea4335]/20 text-[#ea4335] hover:bg-[#ea4335]/30 active:scale-95'}`}>
    {icon}
  </button>
);

// ── Participants panel ────────────────────────────────────────────────────────
const ParticipantsPanel = ({ self, peers, peerStates }) => {
  const all = [
    { email: self, isSelf: true, mic: true, cam: true },
    ...Object.entries(peerStates).map(([email,s])=>({ email, ...s })),
    ...peers.filter(p=>!peerStates[p]).map(p=>({ email:p, mic:true, cam:true }))
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#3a3a3a]">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa] text-sm">🔍</span>
          <input className="w-full bg-[#2a2a2a] text-[#e0e0e0] text-sm rounded-full pl-9 pr-4 py-2 outline-none border border-transparent focus:border-[#1a73e8] placeholder-[#888]"
            placeholder="Search for people" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 text-xs text-[#aaa] font-medium tracking-wide uppercase">On the call</div>
        {all.map(({ email, isSelf, mic, cam })=>(
          <div key={email} className="flex items-center gap-3 px-4 py-2 hover:bg-[#2a2a2a] transition-colors">
            <Avatar name={email} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[#e0e0e0] font-medium truncate">
                {email}{isSelf ? ' (You)' : ''}
              </div>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center
              ${mic ? 'bg-[#1a73e8]' : 'bg-[#3a3a3a]'}`}>
              {mic ? <HiVolumeUp className="text-white text-sm"/> : <FaMicrophoneSlash className="text-[#aaa] text-xs"/>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Chat panel ────────────────────────────────────────────────────────────────
const ChatPanel = ({ messages, msg, setMsg, sendMsg, flag, msgEndRef }) => (
  <div className="flex flex-col h-full">
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
      {messages.length===0 ? (
        <p className="text-center text-sm text-[#888] mt-8">No messages yet</p>
      ) : messages.map((m,i)=>(
        <div key={i} className={`flex ${m.self?'justify-end':'justify-start'}`}>
          <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm
            ${m.self ? 'bg-[#1a73e8] text-white rounded-br-sm' : 'bg-[#2a2a2a] text-[#e0e0e0] rounded-bl-sm'}`}>
            {m.text}
          </div>
        </div>
      ))}
      <div ref={msgEndRef}/>
    </div>
    {flag && (
      <div className="p-3 border-t border-[#3a3a3a] flex gap-2">
        <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()}
          className="flex-1 bg-[#2a2a2a] text-[#e0e0e0] text-sm rounded-full px-4 py-2 outline-none border border-transparent focus:border-[#1a73e8] placeholder-[#666]"
          placeholder="Send a message…" />
        <button onClick={sendMsg}
          className="w-9 h-9 rounded-full bg-[#1a73e8] text-white flex items-center justify-center hover:bg-[#1557b0] transition-colors text-sm">
          ↑
        </button>
      </div>
    )}
  </div>
);

// ── Room ──────────────────────────────────────────────────────────────────────
const Room = () => {
  const navigate = useNavigate();
  const {
    email, code, handleJoin, dcRef, flag, streams,
    handleMSG, handleEndCall, captureScreen,
    localStreamRef, screenStreamRef, onMessageRef, emitMediaState,
    peerStates, notifications, dismissNotification, displayShare, isCallAlive,
  } = useContext(SocketContext);

  const msgEndRef = useRef(null);
  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const screenFilmRef = useRef(null);

  const [msg, setMsg] = useState('');
  // Panels closed by default
  const [panel, setPanel] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [messages, setMessages] = useState([]);
  const [activeSpeaker, setActiveSpeaker] = useState('self');
  // Pin state: null = no pin, else same values as activeSpeaker
  const [pinnedId, setPinnedId] = useState(null);
  const wasCallAliveRef = useRef(false);

  useEffect(()=>{ msgEndRef.current?.scrollIntoView({behavior:'smooth'}); },[messages]);
  useEffect(()=>{ handleJoin(email,code); },[]);
  useEffect(()=>{
    if(wasCallAliveRef.current && !isCallAlive){
      navigate('/', { replace: true });
    }
    wasCallAliveRef.current = isCallAlive;
  },[isCallAlive, navigate]);
  useEffect(()=>{
    onMessageRef.current=(text)=>setMessages(p=>[...p,{text,self:false}]);
    return()=>{ onMessageRef.current=null; };
  },[]);

  // Attach local video
  useEffect(()=>{
    const attach=()=>{
      const s=localStreamRef?.current;
      if(s && localVideoRef.current && localVideoRef.current.srcObject !== s){
        localVideoRef.current.srcObject = s;
        localVideoRef.current.play().catch(()=>{});
      }
    };
    attach();
    const iv=setInterval(()=>{
      if(localStreamRef?.current && localVideoRef.current && !localVideoRef.current.srcObject){
        attach(); clearInterval(iv);
      }
    },300);
    return()=>clearInterval(iv);
  },[]);

  // Attach screen share video
  useEffect(()=>{
    const attachScreen = (el) => {
      if(!el) return;
      const s = screenStreamRef?.current;
      if(s && el.srcObject !== s){ el.srcObject = s; el.play().catch(()=>{}); }
    };
    if(screenVideoRef.current) attachScreen(screenVideoRef.current);
    if(screenFilmRef.current) attachScreen(screenFilmRef.current);
  },[displayShare]);

  const toggleMic=useCallback(()=>{
    const s=localStreamRef?.current; if(!s)return;
    const next=!micOn; s.getAudioTracks().forEach(t=>{t.enabled=next;});
    setMicOn(next); emitMediaState({mic:next});
  },[micOn,localStreamRef,emitMediaState]);

  const toggleCam=useCallback(()=>{
    const s=localStreamRef?.current; if(!s)return;
    const next=!camOn; s.getVideoTracks().forEach(t=>{t.enabled=next;});
    setCamOn(next); emitMediaState({cam:next});
  },[camOn,localStreamRef,emitMediaState]);

  const sendMsg=()=>{ if(!msg.trim())return; handleMSG(msg); setMessages(p=>[...p,{text:msg,self:true}]); setMsg(''); };
  const leaveCall = useCallback(()=>{
    handleEndCall();
    navigate('/', { replace: true });
  },[handleEndCall, navigate]);

  const localStream=localStreamRef?.current;
  const isSpeaking=useVAD(localStream,micOn);
  const remoteVideoStreams=streams.filter(s=>s.kind==='video');
  const peerEmails=Object.keys(peerStates);

  // Handle pin logic
  const handlePin = useCallback((id) => {
    setPinnedId(prev => prev === id ? null : id);
    setActiveSpeaker(id);
  }, []);

  // Auto-switch main view: pinned overrides, else screen share auto-pins when sharing starts
  useEffect(()=>{
    if(pinnedId !== null) return; // user has pinned something, don't auto-switch
    if(displayShare) setActiveSpeaker('screen');
    else if(activeSpeaker==='screen') setActiveSpeaker('self');
  },[displayShare, pinnedId]);

  // If screen share stops and it was pinned, unpin
  useEffect(()=>{
    if(!displayShare && pinnedId === 'screen'){
      setPinnedId(null);
      setActiveSpeaker('self');
    }
  },[displayShare]);

  // Effective active speaker (pinned takes priority)
  const effectiveActive = pinnedId !== null ? pinnedId : activeSpeaker;

  // Build filmstrip entries
  const filmstrip = [
    { id:'self', name:email, isLocal:true },
    ...(displayShare ? [{ id:'screen', name:`Your screen`, isScreen:true }] : []),
    ...remoteVideoStreams.map((s,i)=>({ id:i, name:peerEmails[i]||`Peer ${i+1}`, stream:s.mediaStream, ps:peerStates[peerEmails[i]]||{} }))
  ];

  const activeFilm = filmstrip.find(f=>f.id===effectiveActive);

  // Active tile data
  const activeTile = activeFilm?.isLocal
    ? { name:email, isLocal:true, camOn, micOn, speaking:isSpeaking }
    : activeFilm?.isScreen
    ? { name:`Your screen`, isScreen:true }
    : activeFilm
    ? {
        name:activeFilm.name,
        stream:activeFilm.stream,
        camOn:activeFilm.ps?.cam!==false,
        micOn:activeFilm.ps?.mic!==false,
        speaking:false
      }
    : { name:email, isLocal:true, camOn, micOn, speaking:isSpeaking };

  // Mobile panel overlay state
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const togglePanel = (tab) => {
    if(panel === tab && !mobilePanelOpen) { setPanel(null); return; }
    setPanel(tab);
    setMobilePanelOpen(true);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-[#1c1c1c] text-white overflow-hidden" style={{fontFamily:'Google Sans, Roboto, sans-serif', touchAction:'manipulation'}}>

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" style={{maxWidth:'280px'}}>
        {notifications.map(n=>(
          <div key={n.id} className="pointer-events-auto"><Toast n={n} onDismiss={dismissNotification}/></div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#202020] border-b border-[#3a3a3a] shrink-0 h-12 md:h-14">
        <div className="flex items-center gap-2">
          <div>
            <div className="text-[10px] text-[#aaa] leading-none">Room</div>
            <div className="text-xs md:text-sm font-medium text-white leading-tight truncate max-w-[140px] md:max-w-[200px]">{code}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs md:text-sm">
          <button onClick={()=>togglePanel('chat')}
            className={`px-3 py-1 rounded-full transition-colors ${panel==='chat'?'bg-[#3c3c3c] text-white':'text-[#aaa] hover:bg-[#2a2a2a]'}`}>
            Chat
          </button>
          <button onClick={()=>togglePanel('participants')}
            className={`px-3 py-1 rounded-full transition-colors ${panel==='participants'?'bg-[#3c3c3c] text-white':'text-[#aaa] hover:bg-[#2a2a2a]'}`}>
            People {peerEmails.length+1>0&&<span className="ml-0.5 text-[10px] text-[#aaa]">{peerEmails.length+1}</span>}
          </button>
        </div>
        <div className="text-[10px] md:text-xs text-[#aaa] tabular-nums hidden sm:block">
          {new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">

        {/* Left: video + filmstrip */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* Main speaker */}
          <div className="flex-1 min-h-0 p-2 pb-1">
            {activeTile.isScreen ? (
              <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#111]">
                <video
                  ref={screenVideoRef}
                  className="w-full h-full object-contain"
                  autoPlay
                  muted
                  playsInline
                  controls={false}
                  disablePictureInPicture
                  style={{ WebkitUserSelect:'none', userSelect:'none' }}
                  onLoadedMetadata={() => screenVideoRef.current?.play().catch(()=>{})}
                />
                <div className="absolute inset-0 pointer-events-none" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/50 px-2 py-1 rounded-md pointer-events-none">
                  <MdScreenShare className="text-[#1a73e8] text-sm"/>
                  <span className="text-white text-xs font-medium">You are presenting</span>
                </div>
                {pinnedId === 'screen' && (
                  <div className="absolute top-3 right-3 bg-[#1a73e8]/80 rounded-full px-2 py-1 flex items-center gap-1 pointer-events-none">
                    <TbPinned className="text-white text-xs"/>
                    <span className="text-white text-[10px]">Pinned</span>
                  </div>
                )}
              </div>
            ) : activeTile.isLocal ? (
              <div className={`relative w-full h-full rounded-xl overflow-hidden bg-[#1c1c1c] transition-all duration-200
                ${activeTile.speaking && activeTile.micOn ? 'ring-2 ring-[#1a73e8]' : ''}`}>
                {camOn ? (
                  <video
                    ref={localVideoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    playsInline
                    controls={false}
                    disablePictureInPicture
                    style={{ WebkitUserSelect:'none', userSelect:'none' }}
                    onLoadedMetadata={() => localVideoRef.current?.play().catch(()=>{})}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Avatar name={email} size="lg" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"/>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-2">
                    {!micOn && <div className="w-6 h-6 rounded-full bg-[#ea4335] flex items-center justify-center"><FaMicrophoneSlash className="text-white text-[10px]"/></div>}
                    <span className="text-white text-sm font-medium drop-shadow">{email} (You)</span>
                  </div>
                  {pinnedId === 'self' && <TbPinned className="text-[#1a73e8] text-sm"/>}
                </div>
              </div>
            ) : (
              <RemoteSpeakerTile
                name={activeTile.name}
                stream={activeTile.stream}
                camOn={activeTile.camOn}
                micOn={activeTile.micOn}
                speaking={activeTile.speaking}
                pinned={pinnedId === effectiveActive}
              />
            )}
          </div>

          {/* Filmstrip */}
          <div className="shrink-0 px-2 pb-1">
            <div className="flex gap-2 overflow-x-auto scrollbar-none py-2 px-0.5">
              {filmstrip.map((f)=>{
                const isActive = f.id === effectiveActive;
                const isPinned = f.id === pinnedId;

                if(f.isLocal) return (
                  <div key="self" className="shrink-0">
                    <LocalFilmTile
                      name={email}
                      localVideoRef={localVideoRef}
                      localStreamRef={localStreamRef}
                      camOn={camOn}
                      micOn={micOn}
                      speaking={isSpeaking}
                      active={isActive}
                      pinned={isPinned}
                      onClick={()=>setActiveSpeaker('self')}
                      onDoubleClick={()=>handlePin('self')}
                    />
                  </div>
                );

                if(f.isScreen) return (
                  <div key="screen"
                    onClick={()=>setActiveSpeaker('screen')}
                    onDoubleClick={()=>handlePin('screen')}
                    className={`relative shrink-0 w-[160px] h-[108px] rounded-lg overflow-hidden bg-[#111] cursor-pointer
                      transition-all hover:brightness-110 border select-none
                      ${isActive?'border-[#1a73e8]':'border-white/10'}`}>
                    <video
                      ref={screenFilmRef}
                      className="w-full h-full object-contain"
                      autoPlay muted playsInline
                      controls={false}
                      disablePictureInPicture
                      style={{ WebkitUserSelect:'none', userSelect:'none', pointerEvents:'none' }}
                      onLoadedMetadata={() => screenFilmRef.current?.play().catch(()=>{})}
                    />
                    <div className="absolute inset-0" style={{pointerEvents:'none'}}/>
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1" style={{pointerEvents:'none'}}>
                      <MdScreenShare className="text-[#1a73e8] text-xs shrink-0"/>
                      <span className="text-white text-[11px] font-medium truncate">Your screen</span>
                      {isPinned && <TbPinned className="text-[#1a73e8] text-xs ml-auto"/>}
                    </div>
                  </div>
                );

                const ps=f.ps||{};
                return (
                  <FilmTile key={f.id} name={f.name}
                    stream={f.stream}
                    camOn={ps.cam!==false} micOn={ps.mic!==false} speaking={false}
                    active={isActive} pinned={isPinned}
                    onClick={()=>setActiveSpeaker(f.id)}
                    onDoubleClick={()=>handlePin(f.id)}
                  />
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="shrink-0 flex items-center justify-center gap-2 md:gap-3 py-3 border-t border-[#2a2a2a] bg-[#202020]">
            <CtrlBtn onClick={toggleCam} icon={camOn?<BsCameraVideo/>:<BsCameraVideoOff/>}
              label={camOn?'Turn off camera':'Turn on camera'} active={camOn} />
            <CtrlBtn onClick={toggleMic} icon={micOn?<FaMicrophone/>:<FaMicrophoneSlash/>}
              label={micOn?'Mute':'Unmute'} active={micOn} />
            {/* Screen share button — shows stop icon when actively sharing */}
            <CtrlBtn
              onClick={captureScreen}
              icon={displayShare ? <MdStopScreenShare /> : <MdScreenShare />}
              label={displayShare ? 'Stop sharing screen' : 'Share screen'}
              active={displayShare}
              // Highlight red when sharing so user knows to click to stop
              red={displayShare}
            />
            <CtrlBtn onClick={leaveCall} icon={<ImPhoneHangUp/>} label="Leave call" red />
          </div>
        </div>

        {/* Right panel — desktop: sidebar, mobile: overlay */}
        {panel && (
          <>
            {/* Mobile backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-30 md:hidden"
              onClick={()=>{ setPanel(null); setMobilePanelOpen(false); }}
            />
            <div className={`
              z-40 flex flex-col bg-[#242424] border-[#3a3a3a] overflow-hidden
              md:relative md:w-[300px] md:shrink-0 md:border-l
              fixed bottom-0 left-0 right-0 h-[70vh] rounded-t-2xl border-t
              md:top-auto md:h-auto md:rounded-none md:inset-auto
            `}>
              {/* Panel tabs */}
              <div className="flex border-b border-[#3a3a3a] shrink-0">
                {/* Mobile drag handle */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-[#4a4a4a] rounded-full md:hidden"/>
                {['chat','participants'].map(tab=>(
                  <button key={tab} onClick={()=>setPanel(tab)}
                    className={`flex-1 py-3 pt-5 md:pt-3 text-sm font-medium capitalize transition-colors relative
                      ${panel===tab?'text-[#1a73e8]':'text-[#aaa] hover:text-[#e0e0e0]'}`}>
                    {tab==='chat'?'Chat':'Participants'}
                    {panel===tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1a73e8]"/>}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                {panel==='participants'
                  ? <ParticipantsPanel self={email} peers={peerEmails} peerStates={peerStates}/>
                  : <ChatPanel messages={messages} msg={msg} setMsg={setMsg} sendMsg={sendMsg} flag={flag} msgEndRef={msgEndRef}/>
                }
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pin hint — shows briefly when pinning */}
      {pinnedId !== null && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 pointer-events-none"
          style={{animation:'toast-in 0.2s ease forwards'}}>
          <TbPinned className="text-[#1a73e8]"/>
          Pinned — double-click again to unpin
        </div>
      )}

      <style>{`
        @keyframes toast-in { from{opacity:0;transform:translateY(-8px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
        .scrollbar-none::-webkit-scrollbar { display:none; }
        .scrollbar-none { -ms-overflow-style:none; scrollbar-width:none; }
        /* Force-hide native video controls on all browsers */
        video::-webkit-media-controls { display:none !important; }
        video::-webkit-media-controls-enclosure { display:none !important; }
        video::-webkit-media-controls-panel { display:none !important; }
        video::--moz-range-thumb { display:none !important; }
        video { -webkit-appearance:none; }
      `}</style>
    </div>
  );
};

// ── Remote speaker tile (separate to handle stream attachment) ────────────────
const RemoteSpeakerTile = ({ name, stream, camOn, micOn, speaking, pinned }) => {
  const videoRef = useRef(null);
  useEffect(()=>{
    const el = videoRef.current;
    if(!el || !stream) return;
    if(el.srcObject !== stream){ el.srcObject = stream; el.play().catch(()=>{}); }
  },[stream]);

  return (
    <div className={`relative w-full h-full rounded-xl overflow-hidden bg-[#1c1c1c] transition-all duration-200
      ${speaking&&micOn ? 'ring-2 ring-[#1a73e8]' : ''}`}>
      {camOn && stream ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          controls={false}
          disablePictureInPicture
          style={{ WebkitUserSelect:'none', userSelect:'none' }}
          onLoadedMetadata={() => videoRef.current?.play().catch(()=>{})}
          // NOTE: NOT muted — remote audio should play
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Avatar name={name} size="lg" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"/>
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          {!micOn && <div className="w-6 h-6 rounded-full bg-[#ea4335] flex items-center justify-center"><FaMicrophoneSlash className="text-white text-[10px]"/></div>}
          <span className="text-white text-sm font-medium drop-shadow">{name}</span>
        </div>
        {pinned && <TbPinned className="text-[#1a73e8] text-sm"/>}
      </div>
    </div>
  );
};

// ── Local filmstrip tile (uses passed ref to avoid double-attaching) ──────────
const LocalFilmTile = ({ name, localVideoRef, localStreamRef, camOn, micOn, speaking, active, pinned, onClick, onDoubleClick }) => {
  const filmRef = useRef(null);
  useEffect(()=>{
    const attach = () => {
      const el = filmRef.current;
      const s = localStreamRef?.current;
      if(!el || !s) return false;
      if(el.srcObject !== s){
        el.srcObject = s;
        el.play().catch(()=>{});
      }
      return true;
    };

    if(attach()) return;

    const iv = setInterval(()=>{
      if(attach()) clearInterval(iv);
    }, 250);

    return ()=>clearInterval(iv);
  },[localStreamRef]);

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`relative shrink-0 w-[160px] h-[108px] rounded-lg overflow-hidden bg-[#2a2a2a] cursor-pointer
        transition-all duration-150 hover:brightness-110 select-none
        ${active ? 'ring-2 ring-[#1a73e8]' : speaking&&micOn ? 'ring-2 ring-[#1a73e8]/60' : 'ring-1 ring-white/10'}`}
    >
      {camOn ? (
        <video
          ref={filmRef}
          className="w-full h-full object-contain bg-black"
          autoPlay muted playsInline
          controls={false}
          disablePictureInPicture
          style={{ WebkitUserSelect:'none', userSelect:'none', pointerEvents:'none' }}
          onLoadedMetadata={() => filmRef.current?.play().catch(()=>{})}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#2a2a2a]">
          <Avatar name={name} size="md" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" style={{pointerEvents:'none'}}/>
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between" style={{pointerEvents:'none'}}>
        <span className="text-white text-[11px] font-medium truncate drop-shadow">{name} (You)</span>
        <div className="flex items-center gap-1">
          {pinned && <TbPinned className="text-[#1a73e8] text-xs"/>}
          {speaking&&micOn && <HiVolumeUp className="text-[#1a73e8] text-sm"/>}
          {!micOn && <FaMicrophoneSlash className="text-[#ea4335] text-xs"/>}
        </div>
      </div>
    </div>
  );
};

export default Room;
