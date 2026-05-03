import { useState, useEffect, useRef } from 'react';

export default function useVoiceChat(socket, roomId, myId, micOn, soundOn) {
  const [peers, setPeers] = useState({});
  const localStreamRef = useRef(null);
  const peersRef = useRef({});

  // 1. Initialize local stream
  useEffect(() => {
    async function initAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        
        // Apply initial mic state
        stream.getAudioTracks().forEach(track => {
          track.enabled = micOn;
        });

        // Tell the server we are ready to receive connections, and to broadcast our presence
        socket.emit('webrtc_ready', { roomId });
      } catch (err) {
        console.error("Failed to get local audio:", err);
      }
    }
    
    initAudio();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.values(peersRef.current).forEach(peer => peer.close());
    };
  }, [roomId, socket]);

  // 2. Handle mic toggle
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = micOn;
      });
    }
  }, [micOn]);

  // 3. WebRTC Signaling Logic
  useEffect(() => {
    if (!socket) return;

    // When a new player is ready, we create an offer and send it to them
    const handleNewPeer = async (peerSocketId) => {
      if (peerSocketId === myId) return;
      
      const peerConnection = createPeerConnection(peerSocketId);
      peersRef.current[peerSocketId] = peerConnection;

      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('webrtc_signal', { to: peerSocketId, signalData: offer });
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    };

    const handleSignal = async ({ from, signalData }) => {
      let peerConnection = peersRef.current[from];

      if (!peerConnection) {
        // If we don't have a connection with this peer yet, create one
        peerConnection = createPeerConnection(from);
        peersRef.current[from] = peerConnection;
      }

      try {
        if (signalData.type === 'offer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit('webrtc_signal', { to: from, signalData: answer });
        } else if (signalData.type === 'answer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
        } else if (signalData.candidate) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signalData));
        }
      } catch (err) {
        console.error('Error handling signal:', err);
      }
    };

    const handlePeerDisconnect = (peerSocketId) => {
      if (peersRef.current[peerSocketId]) {
        peersRef.current[peerSocketId].close();
        delete peersRef.current[peerSocketId];
        
        setPeers(prev => {
          const newPeers = { ...prev };
          delete newPeers[peerSocketId];
          return newPeers;
        });
      }
    };

    socket.on('peer_ready', handleNewPeer);
    socket.on('webrtc_signal', handleSignal);
    socket.on('peer_disconnected', handlePeerDisconnect);

    return () => {
      socket.off('peer_ready', handleNewPeer);
      socket.off('webrtc_signal', handleSignal);
      socket.off('peer_disconnected', handlePeerDisconnect);
    };
  }, [socket, myId]);

  const createPeerConnection = (peerId) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    });

    // Add local stream tracks to the peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    // Send ICE candidates to the peer
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc_signal', { to: peerId, signalData: event.candidate });
      }
    };

    // When receiving remote track, save it to state
    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setPeers(prev => ({
        ...prev,
        [peerId]: remoteStream
      }));
    };

    return peerConnection;
  };

  return { peers };
}
