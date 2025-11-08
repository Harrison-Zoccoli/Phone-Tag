'use client';

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CameraFeed from "@/components/CameraFeed";

type OutboundMessage =
  | { type: "register"; code: string; name: string; role: "player" }
  | { type: "offer"; code: string; name: string; offer: RTCSessionDescriptionInit }
  | {
      type: "candidate";
      code: string;
      name: string;
      candidate: RTCIceCandidateInit;
    }
  | { type: "leave"; code: string; name: string };

type InboundMessage =
  | { type: "registered"; role: "player"; streamerReady?: boolean }
  | { type: "streamer-ready" }
  | { type: "streamer-disconnected" }
  | { type: "answer"; name: string; answer: RTCSessionDescriptionInit }
  | { type: "candidate"; name: string; candidate: RTCIceCandidateInit }
  | { type: "error"; message: string };

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

export default function ArenaPage() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();

  const code = (params.code ?? "").toUpperCase();
  const playerName = searchParams.get("name") ?? "";
  const isHost = searchParams.get("host") === "1";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [signalingStatus, setSignalingStatus] = useState<string | null>(null);
  const [streamerReady, setStreamerReady] = useState(false);
  
  // Shooting mechanics
  const [ammo, setAmmo] = useState(5);
  const [isReloading, setIsReloading] = useState(false);
  const [score, setScore] = useState(0);
  const [reloadProgress, setReloadProgress] = useState(0);

  useEffect(() => {
    let active = true;
    let mediaStream: MediaStream | null = null;

    const startStream = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
        setStreamError(
          "Camera access needs HTTPS and a supported browser. Re-open Pew Pew over a secure connection.",
        );
        return;
      }

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = mediaStream;
        const videoElement = videoRef.current;
        if (videoElement) {
          videoElement.srcObject = mediaStream;
          await videoElement.play().catch(() => undefined);
          setIsStreaming(true);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to access camera.";
        setStreamError(message);
      }
    };

    void startStream();

    return () => {
      active = false;
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const sendMessage = useCallback((message: OutboundMessage) => {
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, []);

  // Handle shooting
  const handleShoot = useCallback(async (targetColor: { r: number; g: number; b: number }) => {
    if (ammo <= 0 || isReloading) return;
    
    // Deduct ammo
    setAmmo(prev => prev - 1);
    
    // Register shot with server
    try {
      const response = await fetch(`/api/game/${code}/shoot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, targetColor })
      });
      
      if (response.ok) {
        const data = await response.json();
        setScore(data.score);
      }
    } catch (error) {
      console.error('Failed to register shot:', error);
    }
    
    // Auto-reload when out of ammo
    if (ammo - 1 <= 0) {
      setIsReloading(true);
      setReloadProgress(0);
      
      const reloadDuration = 3000;
      const startTime = Date.now();
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / reloadDuration) * 100, 100);
        setReloadProgress(progress);
        
        if (progress < 100) {
          requestAnimationFrame(updateProgress);
        } else {
          setIsReloading(false);
          setAmmo(5);
          setReloadProgress(0);
        }
      };
      
      requestAnimationFrame(updateProgress);
    }
  }, [ammo, isReloading, code, playerName]);

  const createPeerConnection = useCallback(async () => {
    if (pcRef.current) {
      return pcRef.current;
    }
    const stream = localStreamRef.current;
    if (!stream) {
      return null;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage({
          type: "candidate",
          code,
          name: playerName,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        setSignalingStatus("Streaming to control booth");
      } else if (state === "connecting") {
        setSignalingStatus("Connecting to control booth...");
      } else if (state === "failed") {
        setSignalingStatus("Connection failed. Retrying when booth is ready.");
      } else if (state === "disconnected") {
        setSignalingStatus("Disconnected from control booth.");
      }
    };

    return pc;
  }, [code, playerName, sendMessage]);

  const startStreaming = useCallback(async () => {
    const pc = await createPeerConnection();
    if (!pc) {
      return;
    }

    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);
      setSignalingStatus("Awaiting control booth response...");
      sendMessage({ type: "offer", code, name: playerName, offer });
    } catch (error) {
      setSignalingStatus("Unable to initiate stream. Retrying soon.");
      console.error("Failed to create offer", error);
    }
  }, [code, createPeerConnection, playerName, sendMessage]);

  useEffect(() => {
    if (!code || !playerName) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/api/signaling`;

    const ensureServerAndConnect = async () => {
      try {
        await fetch("/api/signaling");
      } catch (error) {
        console.warn("Unable to warm up signaling endpoint", error);
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setSignalingStatus("Contacting control booth...");
        sendMessage({ type: "register", code, name: playerName, role: "player" });
        // ensure server is ready for offers once streamer joins
      };

      ws.onmessage = async (event) => {
        let payload: InboundMessage;
        try {
          payload = JSON.parse(event.data);
        } catch (error) {
          console.error("Invalid message", error);
          return;
        }

        switch (payload.type) {
          case "registered": {
            if (payload.streamerReady) {
              setStreamerReady(true);
            }
            break;
          }
          case "streamer-ready": {
            setStreamerReady(true);
            break;
          }
          case "streamer-disconnected": {
            setStreamerReady(false);
            setSignalingStatus("Waiting for control booth to reconnect...");
            break;
          }
          case "answer": {
            if (pcRef.current) {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
              setSignalingStatus("Control booth connected.");
            }
            break;
          }
          case "candidate": {
            if (pcRef.current && payload.candidate) {
              try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (error) {
                console.error("Failed to add ICE candidate", error);
              }
            }
            break;
          }
          case "error": {
            setSignalingStatus(payload.message);
            break;
          }
          default:
            break;
        }
      };

      ws.onerror = () => {
        setSignalingStatus("Signaling connection error. Retrying soon...");
      };

      ws.onclose = () => {
        setSignalingStatus("Signaling connection closed.");
        wsRef.current = null;
        pcRef.current?.close();
        pcRef.current = null;
      };
    };

    void ensureServerAndConnect();

    return () => {
      sendMessage({ type: "leave", code, name: playerName });
      wsRef.current?.close();
      wsRef.current = null;
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, [code, playerName, sendMessage]);

  useEffect(() => {
    if (!streamerReady || !localStreamRef.current) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      if (!cancelled) {
        await startStreaming();
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [startStreaming, streamerReady]);

  const statusMessage = useMemo(() => {
    if (streamError) return streamError;
    if (signalingStatus) return signalingStatus;
    if (isStreaming) return "Camera feed online. Ready to engage.";
    return "Requesting camera access...";
  }, [isStreaming, signalingStatus, streamError]);

  const lobbySearch = useMemo(() => {
    const params = new URLSearchParams();
    if (playerName) {
      params.set("name", playerName);
    }
    if (isHost) {
      params.set("host", "1");
    }
    const query = params.toString();
    return query ? `?${query}` : "";
  }, [isHost, playerName]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      {/* Full screen camera view */}
      <div className="fixed inset-0 z-0">
        <CameraFeed 
          onShoot={handleShoot}
          isActive={isStreaming}
          ammo={ammo}
          isReloading={isReloading}
        />
      </div>

      {/* UI Overlay */}
      <div className="relative z-10 flex min-h-screen flex-col pointer-events-none">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-5 bg-gradient-to-b from-black/60 to-transparent pointer-events-auto">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
              Pew Pew Arena
            </p>
            <h1 className="text-2xl font-bold text-white">
              {playerName || (isHost ? "Host" : "Player")}
            </h1>
            <p className="mt-1 text-xs uppercase tracking-[0.4em] text-slate-500">
              Lobby {code}
            </p>
          </div>
          <Link
            href={`/lobby/${code}${lobbySearch}`}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-300 hover:text-white"
          >
            Back to lobby
          </Link>
        </header>

        {/* Score display */}
        <div className="absolute top-24 right-6 bg-black/70 px-6 py-3 rounded-2xl border border-white/20 pointer-events-auto">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">Score</p>
          <p className="text-4xl font-bold text-white">{score}</p>
        </div>

        {/* Magazine display */}
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex gap-2 pointer-events-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-10 rounded-full border-2 transition-all ${
                i < ammo
                  ? 'bg-gradient-to-t from-yellow-400 to-orange-500 border-yellow-300 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                  : 'bg-gray-800/50 border-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Reload indicator */}
        {isReloading && (
          <div className="absolute bottom-48 left-1/2 transform -translate-x-1/2 pointer-events-auto">
            <div className="relative w-20 h-20">
              <svg className="transform -rotate-90 w-20 h-20">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="rgba(251,191,36,0.9)"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - reloadProgress / 100)}`}
                  className="transition-all duration-100"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {Math.ceil((100 - reloadProgress) / 100 * 3)}s
                </span>
              </div>
            </div>
            <p className="text-center text-white text-sm mt-2 font-semibold">Reloading...</p>
          </div>
        )}

        {/* Fire button */}
        <footer className="sticky bottom-0 flex justify-center bg-gradient-to-t from-black/80 via-black/60 to-transparent pb-10 pt-6 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              const canvas = document.querySelector('canvas');
              if (canvas) {
                canvas.click();
              }
            }}
            disabled={ammo <= 0 || isReloading}
            className={`relative flex h-20 w-56 items-center justify-center rounded-full text-lg font-bold uppercase tracking-[0.6em] text-white shadow-[0_0_40px_rgba(236,72,153,0.5)] transition ${
              ammo <= 0 || isReloading
                ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                : 'bg-gradient-to-r from-rose-500 via-fuchsia-500 to-sky-500 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-200'
            }`}
          >
            {isReloading ? 'Reloading' : ammo <= 0 ? 'Empty' : 'Fire'}
            {!isReloading && ammo > 0 && (
              <span className="absolute inset-1 rounded-full border border-white/20" />
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
