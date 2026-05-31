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
        <div className="relative min-h-screen overflow-hidden bg-zinc-900 flex items-center justify-center">
            {/* Card */}
            <div className="relative z-10 w-[420px] rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">

                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-900 border border-cyan-500/20 flex items-center justify-center">
                        <span className="text-2xl text-white"><BsCameraReels/></span>
                    </div>
                </div>

                {/* Heading */}
                <div className="text-center mb-8">
                    <h1 className="text-white text-3xl font-bold">
                        Join Meeting
                    </h1>

                    <p className="text-zinc-400 text-sm mt-2">
                        Connect instantly with your team
                    </p>
                </div>

                {/* Inputs */}
                <div className="space-y-4">

                    <input
                        type="email"
                        placeholder="Enter your email"
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
                    />

                    <input
                        type="text"
                        placeholder="Enter room code"
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
                    />
                </div>

                {/* Button */}
                <button
                    onClick={handleJoin}
                    className="w-full mt-6 py-3 rounded-xl bg-cyan-500 text-black font-semibold hover:bg-cyan-400 transition-all duration-300"
                >
                    Join Room
                </button>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-zinc-500">
                        Secure peer-to-peer video calling
                    </p>
                </div>
            </div>
        </div>
    );
}
export default App;