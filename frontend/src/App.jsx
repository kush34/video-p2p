import React, { useContext, useEffect, useState } from 'react'
import { SocketContext } from './context/Socket'
import { useNavigate } from 'react-router-dom'
import { BsCamera, BsCameraReels } from 'react-icons/bs';
const App = () => {
    const navigate = useNavigate();
    const { email, setEmail, code, setCode } = useContext(SocketContext);
    const handleJoin = () => {
        // console.log(email)
        // console.log(code)
        navigate(`room/${code}`)
    }
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-8"
            style={{
                background: `
      radial-gradient(ellipse 80% 60% at 60% 20%, rgba(175,109,255,0.50), transparent 65%),
      radial-gradient(ellipse 70% 60% at 20% 80%, rgba(255,100,180,0.45), transparent 65%),
      radial-gradient(ellipse 60% 50% at 60% 65%, rgba(255,235,170,0.43), transparent 62%),
      radial-gradient(ellipse 65% 40% at 50% 60%, rgba(120,190,255,0.48), transparent 68%),
      linear-gradient(180deg, #f7eaff 0%, #fde2ea 100%)
    `
            }}>
            <div className="w-full max-w-sm rounded-2xl p-8 border border-white/50"
                style={{ background: 'rgba(255,255,255,0.28)', backdropFilter: 'blur(18px)' }}>

                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-purple-300/40"
                    style={{ background: 'rgba(145,80,220,0.18)' }}>
                    <BsCameraReels className="text-2xl text-purple-700" />
                </div>

                {/* Heading */}
                <div className="text-center mb-7">
                    <h1 className="text-[#3b1a6e] text-2xl font-semibold">Samvad</h1>
                    <h1 className="text-[#3b1a6e] text-2xl font-medium">Join Meeting</h1>
                    <p className="text-[#9b6bbf] text-sm mt-1">Connect instantly with your team</p>
                </div>

                {/* Inputs */}
                <div className="space-y-3">
                    <input
                        type="email"
                        placeholder="Enter your email"
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm text-[#3b1a6e] outline-none transition-all border border-purple-300/40 placeholder:text-[#b48fcf] focus:border-purple-400/70 focus:bg-white/60"
                        style={{ background: 'rgba(255,255,255,0.45)' }}
                    />
                    <input
                        type="text"
                        placeholder="Enter room code"
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm text-[#3b1a6e] outline-none transition-all border border-purple-300/40 placeholder:text-[#b48fcf] focus:border-purple-400/70 focus:bg-white/60"
                        style={{ background: 'rgba(255,255,255,0.45)' }}
                    />
                </div>

                {/* Button */}
                <button
                    onClick={handleJoin}
                    className="w-full mt-5 py-3 rounded-xl bg-pink-500 text-white font-medium text-sm hover:opacity-85 transition-opacity"
                    // style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' }}
                >
                    Join Room
                </button>

                {/* Footer */}
                <p className="text-center text-xs text-[#b48fcf] mt-5">
                    Secure peer-to-peer video calling
                </p>
            </div>
        </div>
    );
}
export default App;