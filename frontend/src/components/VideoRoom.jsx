import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

const VideoRoom = () => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);

  const [isJoined, setIsJoined] = useState(false);

  const config = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ],
  };

  const startStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = stream;

    peerConnection.current = new RTCPeerConnection(config);

    stream.getTracks().forEach(track => {
      peerConnection.current.addTrack(track, stream);
    });

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', event.candidate);
      }
    };

    peerConnection.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    socket.on('offer', async (offer) => {
      await peerConnection.current.setRemoteDescription(offer);
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit('answer', answer);
    });

    socket.on('answer', async (answer) => {
      await peerConnection.current.setRemoteDescription(answer);
    });

    socket.on('ice-candidate', async (candidate) => {
      try {
        await peerConnection.current.addIceCandidate(candidate);
      } catch (e) {
        console.error('Error adding received ICE candidate', e);
      }
    });

    setIsJoined(true);
  };

  const createOffer = async () => {
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.emit('offer', offer);
  };

  return (
    <div className="mt-10 flex flex-col items-center">
      {!isJoined ? (
        <button onClick={startStream} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Join Room</button>
      ) : (
        <button onClick={createOffer} className="px-4 py-2 bg-green-500 text-white rounded-lg">Create Offer</button>
      )}

      <div className="flex gap-10 mt-5">
        <video ref={localVideoRef} autoPlay playsInline muted className="w-1/3 rounded-lg border-2" />
        <video ref={remoteVideoRef} autoPlay playsInline className="w-1/3 rounded-lg border-2" />
      </div>
    </div>
  );
};

export default VideoRoom;
