import React, { useContext, useEffect, useState } from "react";
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
    email,
    code,
    makeCall,
    handleJoin,
    dcRef,
    flag,
    streams,
    handleMSG,
    streamRef,
    remoteRef,
    videoCapture,
    stream,
    endCall,
    isCallAlive,
    captureScreen,
    displayShare,
    remoteDisplayShare,
  } = useContext(SocketContext);

  const [msg, setMsg] = useState("");
  const [msgBool, setMsgBool] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const [messages, setMessages] = useState([]);

  const sendMsg = () => {
    if (!msg.trim()) return;
    handleMSG(msg);
    setMessages((prev) => [...prev, { text: msg, self: true }]);
    setMsg("");
  };

  const handleEndCall = async () => {
    endCall();
    navigate("/");
  };

  useEffect(() => {
    handleJoin(email, code);
  }, []);

  const remoteVideoStreams = streams.filter((s) => s.kind === "video");

  return (
    <div className="bg-[#0a0a0f] w-full h-screen text-white flex flex-col overflow-hidden font-mono relative">

      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Ambient glow top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-sky-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-6 text-xs text-white/30">
          <div className="flex items-center gap-2">
            <span className="text-white/20">user</span>
            <span className="text-white/60 font-semibold tracking-wide">{email}</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-white/20">room</span>
            <span className="text-sky-400 font-semibold tracking-widest">{code}</span>
          </div>
        </div>

        <div className="text-xs text-white/20 tracking-widest uppercase">
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </header>

      {/* Main video area */}
      <div className="relative z-10 flex-1 flex gap-3 p-4 overflow-hidden min-h-0">

        {/* Local video */}
        <div
          className={`relative rounded-2xl overflow-hidden bg-[#111118] border border-white/5 flex-shrink-0 group transition-all duration-500
            ${remoteVideoStreams.length === 0 ? "w-full" : "w-1/2"}`}
        >
          <video
            id="video"
            className="w-full h-full object-cover"
            autoPlay
            muted
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
          {/* Label */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-white/60 font-semibold tracking-wider">YOU</span>
          </div>
          {/* Corner accent */}
          {/* <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-sky-500/40 rounded-tl-2xl" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-sky-500/40 rounded-tr-2xl" /> */}
        </div>

        {/* Remote video streams */}
        {remoteVideoStreams.length > 0 && (
          <div
            className={`flex-1 grid gap-3 min-h-0
              ${remoteVideoStreams.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
          >
            {remoteVideoStreams.map((s, index) => (
              <div
                key={index}
                className="relative rounded-2xl overflow-hidden bg-[#111118] border border-white/5 group"
              >
                <video
                  className="w-full h-full object-cover"
                  autoPlay
                  ref={(el) => {
                    if (el && !el.srcObject) el.srcObject = s.mediaStream;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span className="text-xs text-white/50 font-semibold tracking-wider">
                    PEER {index + 1}
                  </span>
                </div>
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-sky-500/30 rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-sky-500/30 rounded-tr-2xl" />
              </div>
            ))}
          </div>
        )}

        {/* Chat panel slide-in */}
        {msgBool && (
          <div className="w-72 flex-shrink-0 flex flex-col rounded-2xl bg-[#111118] border border-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.15em] text-white/40 font-semibold">
                Messages
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm scrollbar-none">
              {messages.length === 0 ? (
                <div className="text-center text-white/15 text-xs mt-8 tracking-wide">
                  no messages yet
                </div>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.self ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed
                        ${m.self
                          ? "bg-sky-500/20 text-sky-200 rounded-br-sm"
                          : "bg-white/5 text-white/70 rounded-bl-sm"
                        }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            {flag && (
              <div className="p-3 border-t border-white/5 flex gap-2">
                <input
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMsg()}
                  type="text"
                  className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-xs text-white/80 outline-none placeholder-white/20 border border-white/5 focus:border-sky-500/40 transition-colors"
                  placeholder="type a message…"
                />
                <button
                  onClick={sendMsg}
                  className="px-3 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 rounded-xl text-xs font-semibold transition-colors border border-sky-500/20"
                >
                  ↑
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="relative z-10 flex items-center justify-center gap-3 py-4 px-6 border-t border-white/5">

        {/* Chat toggle */}
        <button
          onClick={() => setMsgBool((v) => !v)}
          className={`group relative w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all duration-200
            ${msgBool
              ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
              : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 border border-white/5"
            }`}
        >
          <FaMessage className="text-base" />
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] text-white/30 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase">
            chat
          </span>
        </button>

        {/* Camera */}
        <button
          onClick={() => setCamActive((v) => !v)}
          className={`group relative w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all duration-200
            ${camActive
              ? "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 border border-white/5"
              : "bg-red-500/15 text-red-400 border border-red-500/20"
            }`}
        >
          <BsCameraReels className="text-base" />
          {!camActive && (
            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="block w-7 h-px bg-red-400 rotate-45 rounded-full absolute" />
            </span>
          )}
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] text-white/30 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase">
            camera
          </span>
        </button>

        {/* Mic */}
        <button
          onClick={() => setMicActive((v) => !v)}
          className={`group relative w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all duration-200
            ${micActive
              ? "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 border border-white/5"
              : "bg-red-500/15 text-red-400 border border-red-500/20"
            }`}
        >
          <FaMicrophone className="text-base" />
          {!micActive && (
            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="block w-7 h-px bg-red-400 rotate-45 rounded-full absolute" />
            </span>
          )}
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] text-white/30 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase">
            mic
          </span>
        </button>

        {/* Screen share */}
        <button
          onClick={captureScreen}
          className="group relative w-12 h-12 rounded-2xl flex items-center justify-center text-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 border border-white/5 transition-all duration-200"
        >
          <MdScreenShare className="text-base" />
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] text-white/30 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase">
            share
          </span>
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10 mx-1" />

        {/* End call */}
        <button
          onClick={handleEndCall}
          className="group relative w-14 h-12 rounded-2xl flex items-center justify-center text-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 hover:text-red-300 border border-red-500/25 hover:border-red-500/40 transition-all duration-200 shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]"
        >
          <ImPhoneHangUp className="text-base" />
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] text-red-400/50 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase">
            end
          </span>
        </button>
      </div>
    </div>
  );
};

export default Room;