import React, { useContext, useEffect, useState } from 'react'
import { SocketContext } from '../context/Socket'
import { FaMessage } from "react-icons/fa6";
import { BsCameraReels } from "react-icons/bs";
import { FaMicrophone } from "react-icons/fa";
import { ImPhoneHangUp } from "react-icons/im";

const Room = () => {
  const {email,code,makeCall,handleJoin,dcRef,flag,handleMSG,streamRef,remoteRef,videoCapture,stream} = useContext(SocketContext);
  const [msg,setMsg] = useState('');
  const [msgBool,setMsgBool] = useState(false);
  const sendMsg = ()=>{
    handleMSG(msg);
  }
 
  useEffect(()=>{
    handleJoin(email,code);
  },[])
  return (
    <div className='bg-zinc-900 w-full h-screen text-white flex flex-col items-center'>
      <div className='text-2xl m-4 font-semibold text-sky-600'>
        Room
      </div>
      <div className="you flex gap-5 justify-center items-center w-full">
        <div>
          Email : {email}
        </div>
        <div>
          Code : {code}
        </div>
      </div>
      <div className='flex flex-col md:flex-row w-full h-1/2 md:h-4/5 p-5 gap-5'>
        <div className = 'w-full md:w-1/2 h-3/4 rounded bg-zinc-700'>
          <video  id='video' className='video p-2 w-full h-full' autoPlay muted src={stream}/>
        </div>
        <div className = 'remote w-full md:w-1/2 h-3/4 rounded bg-zinc-700'>
          <video id='remoteVideo' className='video p-2 w-full h-full' autoPlay src={stream}/>
        </div>
      </div>
      <div className="navigation absolute bottom-0 flex gap-5 justify-around bg-zinc-600 w-full">
        <button onClick={(e)=>setMsgBool(value=>!value)} className='m-2 text-white text-2xl hover:text-sky-700 duration-100 ease-out'><FaMessage /></button>
        {
          msgBool &&
          <div className="form flex gap-5">
            <input onChange={(e)=>setMsg(e.target.value)} type="text" className='p-1 m-1 bg-zinc-800 rounded outline-none' placeholder='enter your message' />
            {
              flag &&
              <button onClick={sendMsg} className='bg-blue-700 px-2 py-1 rounded'>send</button>
            }
          </div>
        }
        {
          <>
            <div className="camera m-2 text-2xl hover:text-sky-700 duration-100 ease-out">
              <BsCameraReels />
            </div>
            <div className="camera m-2 text-2xl hover:text-sky-700 duration-100 ease-out">
              <FaMicrophone />
            </div>
            <div className="camera m-2 text-red-500 text-2xl hover:text-red-700 duration-100 ease-out">
              <ImPhoneHangUp/>
            </div>
            </>
        }
      </div>
    </div>
    
  )
}

export default Room