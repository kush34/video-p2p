import React, { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../context/Socket";
import { FaMessage } from "react-icons/fa6";
import { BsCameraReels } from "react-icons/bs";
import { FaMicrophone } from "react-icons/fa";
import { ImPhoneHangUp } from "react-icons/im";
import { useNavigate } from "react-router-dom";
import { MdScreenShare } from "react-icons/md";

const Room = () => {
  const navigate = useNavigate();
  const {
    email, code, makeCall, handleJoin, dcRef, flag, streams,
    handleMSG, streamRef, remoteRef, handleEndCall, videoCapture, stream, endCall,
    isCallAlive, captureScreen, displayShare, remoteDisplayShare, onMessageRef
  } = useContext(SocketContext);

  const msgEndRef = useRef(null);
  const [msg, setMsg] = useState("");
  const [msgBool, setMsgBool] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    handleJoin(email, code);
  }, []);

  const sendMsg = () => {
    if (!msg.trim()) return;
    handleMSG(msg);
    setMessages((prev) => [...prev, { text: msg, self: true }]);
    setMsg("");
  };

  const remoteVideoStreams = streams.filter((s) => s.kind === "video");
  useEffect(() => {
    onMessageRef.current = (text) => {
      setMessages((prev) => [...prev, { text, self: false }]);
    };
    return () => { onMessageRef.current = null; };
  }, []);
  return (
    <div
      className="w-full h-screen text-white flex flex-col overflow-hidden font-mono relative"
      style={{
        background: `
          radial-gradient(ellipse 80% 60% at 60% 20%, rgba(175,109,255,0.18), transparent 65%),
          radial-gradient(ellipse 70% 60% at 20% 80%, rgba(255,100,180,0.12), transparent 65%),
          radial-gradient(ellipse 60% 50% at 60% 65%, rgba(255,235,170,0.08), transparent 62%),
          radial-gradient(ellipse 65% 40% at 50% 60%, rgba(120,190,255,0.10), transparent 68%),
          #0a0a0f
        `,
      }}
    >
      {/* Grid background */}
      {/* <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      /> */}

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <header
        className="relative z-10 flex items-center justify-between px-6 py-3 border-b backdrop-blur-sm"
        style={{ borderColor: "rgba(175,109,255,0.1)" }}
      >
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span style={{ color: "rgba(255,255,255,0.2)" }}>user</span>
            <span style={{ color: "rgba(255,255,255,0.6)" }} className="font-semibold tracking-wide">
              {email}
            </span>
          </div>
          <div className="w-px h-3" style={{ background: "rgba(175,109,255,0.2)" }} />
          <div className="flex items-center gap-2">
            <span style={{ color: "rgba(255,255,255,0.2)" }}>room</span>
            <span className="font-semibold tracking-widest" style={{ color: "#c084fc" }}>
              {code}
            </span>
          </div>
        </div>
        <div className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </header>

      {/* Main video area */}
      <div className="relative z-10 flex-1 flex gap-3 p-4 overflow-hidden min-h-0">

        {/* Local video */}
        <div
          className={`relative rounded-2xl overflow-hidden flex-shrink-0 transition-all duration-500 border
            ${remoteVideoStreams.length === 0 ? "w-full" : "w-1/2"}`}
          style={{ background: "#0f0f18", borderColor: "rgba(175,109,255,0.12)" }}
        >
          <video id="video" className="w-full h-full object-cover" autoPlay muted />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold tracking-wider" style={{ color: "rgba(255,255,255,0.6)" }}>
              YOU
            </span>
          </div>
        </div>

        {/* Remote streams */}
        {remoteVideoStreams.length > 0 && (
          <div className={`flex-1 grid gap-3 min-h-0 ${remoteVideoStreams.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {remoteVideoStreams.map((s, index) => (
              <div
                key={index}
                className="relative rounded-2xl overflow-hidden border"
                style={{ background: "#0f0f18", borderColor: "rgba(175,109,255,0.12)" }}
              >
                <video
                  className="w-full h-full object-cover"
                  autoPlay
                  ref={(el) => { if (el && !el.srcObject) el.srcObject = s.mediaStream; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#c084fc" }} />
                  <span className="text-xs font-semibold tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                    PEER {index + 1}
                  </span>
                </div>
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 rounded-tl-2xl" style={{ borderColor: "rgba(192,132,252,0.3)" }} />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 rounded-tr-2xl" style={{ borderColor: "rgba(192,132,252,0.3)" }} />
              </div>
            ))}
          </div>
        )}

        {/* Chat panel */}
        {msgBool && (
          <div
            className="w-72 flex-shrink-0 flex flex-col rounded-2xl overflow-hidden border"
            style={{
              background: "rgba(15,15,24,0.90)",
              borderColor: "rgba(175,109,255,0.15)",
              backdropFilter: "blur(16px)",
            }}
          >
            {/* Chat header */}
            <div
              className="px-4 py-3 flex items-center justify-between flex-shrink-0 border-b"
              style={{ borderColor: "rgba(175,109,255,0.1)" }}
            >
              <span className="text-xs uppercase tracking-[0.15em] font-semibold" style={{ color: "rgba(192,132,252,0.6)" }}>
                Messages
              </span>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#c084fc" }} />
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 scrollbar-none">
              {messages.length === 0 ? (
                <div className="text-center text-xs mt-8 tracking-wide" style={{ color: "rgba(255,255,255,0.12)" }}>
                  no messages yet
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`flex ${m.self ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                      style={
                        m.self
                          ? {
                            background: "rgba(192,132,252,0.15)",
                            color: "#e9d5ff",
                            border: "0.5px solid rgba(192,132,252,0.25)",
                            borderBottomRightRadius: "4px",
                          }
                          : {
                            background: "rgba(255,255,255,0.05)",
                            color: "rgba(255,255,255,0.65)",
                            border: "0.5px solid rgba(255,255,255,0.07)",
                            borderBottomLeftRadius: "4px",
                          }
                      }
                    >
                      {m.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={msgEndRef} />
            </div>

            {/* Input */}
            {flag && (
              <div
                className="p-3 flex gap-2 flex-shrink-0 border-t"
                style={{ borderColor: "rgba(175,109,255,0.1)" }}
              >
                <input
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMsg()}
                  type="text"
                  className="flex-1 rounded-xl px-3 py-2 text-xs outline-none transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.8)",
                    border: "0.5px solid rgba(175,109,255,0.2)",
                    fontFamily: "inherit",
                  }}
                  placeholder="type a message…"
                />
                <button
                  onClick={sendMsg}
                  className="px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                  style={{
                    background: "rgba(192,132,252,0.12)",
                    color: "#c084fc",
                    border: "0.5px solid rgba(192,132,252,0.25)",
                  }}
                >
                  ↑
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control bar */}
      <div
        className="relative z-10 flex items-center justify-center gap-3 py-4 px-6 border-t"
        style={{ borderColor: "rgba(175,109,255,0.1)" }}
      >
        {/* Chat */}
        <CtrlBtn
          active={msgBool}
          onClick={() => setMsgBool((v) => !v)}
          label="chat"
          activeStyle={{ background: "rgba(192,132,252,0.18)", color: "#c084fc", border: "0.5px solid rgba(192,132,252,0.3)" }}
        >
          <FaMessage className="text-base" />
        </CtrlBtn>

        {/* Camera */}
        <CtrlBtn
          active={camActive}
          onClick={() => setCamActive((v) => !v)}
          label="camera"
          strikethrough={!camActive}
        >
          <BsCameraReels className="text-base" />
        </CtrlBtn>

        {/* Mic */}
        <CtrlBtn
          active={micActive}
          onClick={() => setMicActive((v) => !v)}
          label="mic"
          strikethrough={!micActive}
        >
          <FaMicrophone className="text-base" />
        </CtrlBtn>

        {/* Screen share */}
        <CtrlBtn active={true} onClick={captureScreen} label="share">
          <MdScreenShare className="text-base" />
        </CtrlBtn>

        <div className="w-px h-8 mx-1" style={{ background: "rgba(175,109,255,0.15)" }} />

        {/* End call */}
        <button
          onClick={handleEndCall}
          className="group relative w-14 h-12 rounded-2xl flex items-center justify-center text-lg transition-all duration-200"
          style={{
            background: "rgba(239,68,68,0.12)",
            color: "#f87171",
            border: "0.5px solid rgba(239,68,68,0.25)",
          }}
        >
          <ImPhoneHangUp className="text-base" />
          <span
            className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase"
            style={{ color: "rgba(248,113,113,0.5)" }}
          >
            end
          </span>
        </button>
      </div>
    </div>
  );
};

// Small helper to reduce repetition in control buttons
const CtrlBtn = ({ active, onClick, label, children, strikethrough = false, activeStyle }) => {
  const defaultActive = {
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.5)",
    border: "0.5px solid rgba(255,255,255,0.07)",
  };
  const inactiveStyle = {
    background: "rgba(239,68,68,0.12)",
    color: "#f87171",
    border: "0.5px solid rgba(239,68,68,0.2)",
  };

  return (
    <button
      onClick={onClick}
      className="group relative w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all duration-200"
      style={active ? (activeStyle || defaultActive) : inactiveStyle}
    >
      {children}
      {strikethrough && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="block w-7 h-px bg-red-400 rotate-45 rounded-full absolute" />
        </span>
      )}
      <span
        className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase"
        style={{ color: "rgba(255,255,255,0.25)" }}
      >
        {label}
      </span>
    </button>
  );
};

export default Room;