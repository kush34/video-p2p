import React, { useContext, useEffect, useState } from 'react'
import { SocketContext } from '../context/Socket'

const Room = () => {
  const {email,code,makeCall,handleJoin,dcRef,flag,handleMSG,streamRef,remoteRef,videoCapture,stream} = useContext(SocketContext);
  const [msg,setMsg] = useState('');
  const sendMsg = ()=>{
    handleMSG(msg);
  }
  useEffect(()=>{
    handleJoin(email,code);
  },[])
  return (
    <div className='bg-zinc-900 w-full h-screen text-white flex flex-col justify-center items-center'>
      <div>
        Room
      </div>
      <div className="you flex flex-col m-4">
        <div>
          Email : {email}
        </div>
        <div>
          Code : {code}
        </div>
      </div>
      <div className="form flex gap-5">
        <input onChange={(e)=>setMsg(e.target.value)} type="text" className='bg-zinc-800 px-2 py-1 rounded outline' placeholder='enter your message' />
        {
          flag &&
          <button onClick={sendMsg} className='bg-blue-700 px-2 py-1 rounded'>send</button>
        }

      </div>
      <div className='flex w-full h-full'>
        <div className = 'w-1/2 h-1/2 border'>
          <video  id='video' className='video w-full h-full' autoPlay muted src={stream}/>
        </div>
        <div className = 'remote w-1/2 h-1/2 border'>
          <video id='remoteVideo' className='video w-full h-full' autoPlay muted src={stream}/>
        </div>
      </div>
    </div>
    
  )
}

export default Room