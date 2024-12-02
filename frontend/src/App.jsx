import React, { useContext, useEffect, useState } from 'react'
import {SocketContext} from './context/Socket'
import { useNavigate } from 'react-router-dom'
const App = () => {
    const navigate = useNavigate();
    const {email,setEmail,code,setCode} = useContext(SocketContext);
    const handleJoin = ()=>{
        // console.log(email)
        // console.log(code)
        navigate(`room/${code}`)
    }
   return (
    <div className='bg-zinc-900 w-full h-screen text-whtie'>
        <div className="main flex flex-col justify-center items-center h-screen">
            <div className='text-white font-semibold text-2xl'>
                <h1>Join Room</h1>
            </div>
            <div className='flex flex-col gap-5 w-1/5 m-2'>
                <input onChange={(e)=>setEmail(e.target.value)}  type="email" name="" className='text-white bg-zinc-700 rounded px-2 py-1 outline-none' id="" placeholder='enter email'/>
                <input onChange={(e)=>setCode(e.target.value)}   type="text" name="" className='text-white bg-zinc-700 rounded px-2 py-1 outline-none' id="" placeholder='enter room number' />
            </div>
            <div>
                <button onClick={handleJoin} className='bg-zinc-600 px-2 py-1 rounded mt-2 text-white hover:bg-blue-700 duration-100 ease-out'>Join</button>
            </div>
        </div>
    </div>
  )
}

export default App