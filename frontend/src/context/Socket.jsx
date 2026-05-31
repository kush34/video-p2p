import { io } from 'socket.io-client';
import React, { useState, useEffect, useRef, useCallback, createContext } from 'react';

export const SocketContext = createContext();

const socket = io(`${import.meta.env.VITE_Socket_URL}`, {
  autoConnect: true,
  reconnectionAttempts: 5,
});

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const MEDIA_CONSTRAINTS = { video: true, audio: true };

export const SocketProvider = ({ children }) => {
  const onMessageRef = useRef(null);
  const [code, setCode] = useState();
  const [email, setEmail] = useState();
  const [flag, setFlag] = useState(false);
  const [streams, setStreams] = useState([]);
  const [isCallAlive, setIsCallAlive] = useState(false);
  const [displayShare, setDisplayShare] = useState(false);
  const [remoteDisplayShare, setRemoteDisplayShare] = useState(false);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const localStreamRef = useRef(null); // tracks the local camera/mic stream
  const screenStreamRef = useRef(null); // tracks the screen share stream
  const codeRef = useRef(null); // always-current code for use inside callbacks

  // Keep codeRef in sync so socket callbacks always have the latest value
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // ─── Media helpers ──────────────────────────────────────────────────────────

  const stopStream = (streamRef) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const attachLocalVideo = (stream) => {
    const video = document.querySelector('#video');
    if (video) video.srcObject = stream;
  };

  // ─── Core cleanup ───────────────────────────────────────────────────────────

  /**
   * Tears down the peer connection, data channel, and all local media tracks.
   * Safe to call multiple times.
   */
  const cleanupCall = useCallback(() => {
    // Stop data channel
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.ondatachannel = null;
      pcRef.current.onnegotiationneeded = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop all local media tracks so camera/mic indicators go off
    stopStream(localStreamRef);
    stopStream(screenStreamRef);

    // Clear local video element
    const video = document.querySelector('#video');
    if (video) {
      video.srcObject = null;
    }

    setStreams([]);
    setFlag(false);
    setIsCallAlive(false);
    setDisplayShare(false);
  }, []);

  // ─── PeerConnection factory ─────────────────────────────────────────────────

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind, event.track.id);
      const mediaStream = new MediaStream([event.track]);
      setStreams((prev) => [...prev, { kind: event.track.kind, mediaStream }]);
    };

    pc.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        socket.emit('icecandidate', event.candidate, codeRef.current);
      }
    });

    pc.addEventListener('connectionstatechange', () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.warn('Peer connection lost — cleaning up');
        cleanupCall();
      }
    });

    return pc;
  }, [cleanupCall]);

  // ─── Get local media ────────────────────────────────────────────────────────

  /**
   * Returns the existing local stream if already running, otherwise requests
   * camera+mic and attaches it to the local <video id="video"> element.
   * This means the user sees themselves as soon as they join, even before
   * any peer connects.
   */
  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
    localStreamRef.current = stream;
    attachLocalVideo(stream);
    return stream;
  }, []);

  // ─── Caller side ────────────────────────────────────────────────────────────

  const makeCall = useCallback(async (roomCode) => {
    try {
      const stream = await getLocalStream(); // reuses stream if already running
      const pc = createPeerConnection();
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Data channel — caller creates it
      const dc = pc.createDataChannel('channel');
      dcRef.current = dc;
      dc.onopen = () => setFlag(true);
      dc.onclose = () => setFlag(false);
      dc.onmessage = (e) => {
        if(onMessageRef.current) onMessageRef.current(e.data);
      };

      pc.onnegotiationneeded = async () => {
        console.log('onnegotiationneeded fired');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('new-offer', offer, roomCode);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', offer, roomCode);
      setIsCallAlive(true);
    } catch (err) {
      console.error('makeCall failed:', err);
      cleanupCall();
    }
  }, [getLocalStream, createPeerConnection, cleanupCall]);

  // ─── Callee side ────────────────────────────────────────────────────────────

  const answerCall = useCallback(async (offer) => {
    try {
      const stream = await getLocalStream(); // reuses stream if already running
      const pc = createPeerConnection();
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Data channel — callee receives it
      pc.ondatachannel = (e) => {
        dcRef.current = e.channel;
        dcRef.current.onopen = () => setFlag(true);
        dcRef.current.onclose = () => setFlag(false);
        dcRef.current.onmessage = (ev) => {
          if(onMessageRef.current) onMessageRef.current(ev.data)
        };
      };

      pc.onnegotiationneeded = async () => {
        console.log('onnegotiationneeded fired (callee)');
        const renegOffer = await pc.createOffer();
        await pc.setLocalDescription(renegOffer);
        socket.emit('new-offer', renegOffer, codeRef.current);
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', answer, codeRef.current);
      setIsCallAlive(true);
    } catch (err) {
      console.error('answerCall failed:', err);
      cleanupCall();
    }
  }, [createPeerConnection, cleanupCall]);

  // ─── SDP renegotiation ──────────────────────────────────────────────────────

  const handleSDPUpdate = useCallback(async (offer) => {
    if (!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);
    socket.emit('new-answer', answer, codeRef.current);
  }, []);

  const updatedSDPAnswer = useCallback(async (answer) => {
    if (!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    console.log('New SDP answer set');
  }, []);

  const setAnswer = useCallback(async (answer) => {
    if (!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    console.log('Remote answer set');
  }, []);

  // ─── Screen share ───────────────────────────────────────────────────────────

  const captureScreen = useCallback(async () => {
    try {
      const dispStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = dispStream;

      dispStream.getTracks().forEach((track) => {
        pcRef.current?.addTrack(track, dispStream);
        // Auto-cleanup when user stops sharing via browser UI
        track.onended = () => {
          stopStream(screenStreamRef);
          setDisplayShare(false);
        };
      });

      const userDispVideo = document.querySelector('#displayUser');
      if (userDispVideo) userDispVideo.srcObject = dispStream;
      setDisplayShare(true);
    } catch (err) {
      console.error('Screen capture failed:', err);
    }
  }, []);

  // ─── End call (user-initiated) ──────────────────────────────────────────────

  const endCall = useCallback(() => {
    socket.emit('endcall', codeRef.current);
    cleanupCall();
  }, [cleanupCall]);

  // ─── Messaging ──────────────────────────────────────────────────────────────

  const handleMSG = useCallback((message) => {
    if (dcRef.current?.readyState === 'open') {
      dcRef.current.send(message);
    } else {
      console.error('Data channel is not open');
    }
  }, []);

  // ─── Join room ──────────────────────────────────────────────────────────────

  const handleJoin = useCallback(async (userEmail, roomCode) => {
    // Start local camera immediately so the user sees themselves
    // before any peer connects. getLocalStream() is idempotent.
    try {
      await getLocalStream();
    } catch (err) {
      console.error('Could not access camera/mic:', err);
    }
    socket.emit('enter', userEmail, roomCode);
  }, [getLocalStream]);

  // ─── Socket event listeners ─────────────────────────────────────────────────

  useEffect(() => {
    const onEnter = (userEmail, roomCode) => {
      console.log('New user joined:', userEmail);
      makeCall(roomCode);
    };

    const onOffer = (offer) => answerCall(offer);
    const onAnswer = (answer) => setAnswer(answer);

    const onIceCandidate = async (candidate) => {
      try {
        if (pcRef.current) {
          await pcRef.current.addIceCandidate(candidate);
        }
      } catch (e) {
        console.error('Error adding ICE candidate:', e);
      }
    };

    const onNewOffer = (offer) => {
      console.log('Renegotiation offer received');
      handleSDPUpdate(offer);
    };

    const onNewAnswer = (answer) => {
      console.log('Renegotiation answer received');
      updatedSDPAnswer(answer);
    };

    const onEndCall = () => {
      console.log('Remote peer ended the call');
      cleanupCall(); // Don't emit back — just clean up locally
    };

    socket.on('enter', onEnter);
    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('icecandidate', onIceCandidate);
    socket.on('new-offer', onNewOffer);
    socket.on('new-answer', onNewAnswer);
    socket.on('endcall', onEndCall);

    return () => {
      socket.off('enter', onEnter);
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('icecandidate', onIceCandidate);
      socket.off('new-offer', onNewOffer);
      socket.off('new-answer', onNewAnswer);
      socket.off('endcall', onEndCall);
    };
  }, [makeCall, answerCall, setAnswer, handleSDPUpdate, updatedSDPAnswer, cleanupCall]);

  // ─── Unmount cleanup ────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <SocketContext.Provider
      value={{
        code,
        setCode,
        email,
        setEmail,
        displayShare,
        remoteDisplayShare,
        streams,
        socket,
        isCallAlive,
        handleJoin,
        makeCall,
        onMessageRef,
        pcRef,
        dcRef,
        flag,
        handleMSG,
        captureScreen,
        endCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};