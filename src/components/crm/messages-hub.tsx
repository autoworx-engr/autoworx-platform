"use client";

import { cn } from "@/lib/utils";
import Pusher from "pusher-js";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Send,
  Video,
  VideoOff,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";

/* ───────────────────────── types ───────────────────────── */

type Teammate = { id: number; name: string; email: string };

type ChatMessage = {
  id: number;
  content: string;
  createdAt: string;
  sender: { id: number; firstName: string; lastName: string | null };
};

type CallState =
  | { phase: "idle" }
  | { phase: "calling"; peerId: number; peerName: string }
  | { phase: "ringing"; peerId: number; peerName: string; offer: RTCSessionDescriptionInit }
  | { phase: "active"; peerId: number; peerName: string };

/* ───────────────────────── helpers ─────────────────────── */

function dmRoomId(a: number, b: number) {
  return `dm_${Math.min(a, b)}_${Math.max(a, b)}`;
}

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/* ───────────────────────── ICE config ──────────────────── */

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/* ─────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────── */

type Props = {
  myId: number;
  myName: string;
  companyId: number;
  teammates: Teammate[];
  pusherKey: string;
  pusherCluster: string;
};

export function MessagesHub({
  myId,
  myName,
  teammates,
  pusherKey,
  pusherCluster,
}: Props) {
  const [activeThread, setActiveThread] = useState<Teammate | null>(
    teammates[0] ?? null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [callState, setCallState] = useState<CallState>({ phase: "idle" });
  const [videoEnabled, setVideoEnabled] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  /* ── Init Pusher ── */
  useEffect(() => {
    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: "/api/pusher/auth",
    });
    pusherRef.current = pusher;

    // Personal private channel for signaling
    const myChannel = pusher.subscribe(`private-user-${myId}`);

    myChannel.bind("call-offer", handleIncomingOffer);
    myChannel.bind("call-answer", handleCallAnswer);
    myChannel.bind("ice-candidate", handleRemoteIce);
    myChannel.bind("call-hangup", handleRemoteHangup);
    myChannel.bind("call-reject", handleCallRejected);

    return () => {
      pusher.unsubscribe(`private-user-${myId}`);
      pusher.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, pusherKey, pusherCluster]);

  /* ── Subscribe to active thread messages ── */
  useEffect(() => {
    if (!activeThread || !pusherRef.current) return;
    const roomId = dmRoomId(myId, activeThread.id);
    const channelName = `private-chat-${roomId}`;

    const channel = pusherRef.current.subscribe(channelName);
    channel.bind("new-message", (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      pusherRef.current?.unsubscribe(channelName);
    };
  }, [activeThread, myId]);

  /* ── Load history when thread changes ── */
  useEffect(() => {
    if (!activeThread) return;
    const roomId = dmRoomId(myId, activeThread.id);
    setLoadingMsgs(true);
    fetch(`/api/chat/messages?roomId=${roomId}`)
      .then((r) => r.json())
      .then((data: ChatMessage[]) => {
        setMessages(data);
        setLoadingMsgs(false);
      })
      .catch(() => setLoadingMsgs(false));
  }, [activeThread, myId]);

  /* ── Scroll to bottom on new messages ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ─── Chat send ─── */
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activeThread || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: dmRoomId(myId, activeThread.id), content }),
      });
      const msg: ChatMessage = await res.json();
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } catch {
      toast.error("Could not send message");
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  /* ─── WebRTC helpers ─── */

  async function signal(targetUserId: number, event: string, payload: unknown) {
    await fetch("/api/chat/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, event, payload }),
    });
  }

  async function getUserMedia(video: boolean) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video,
      });
    } catch {
      toast.error("Microphone / camera access denied");
      return null;
    }
  }

  function createPeerConnection(peerId: number) {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        void signal(peerId, "ice-candidate", candidate.toJSON());
      }
    };

    pc.ontrack = (ev) => {
      if (remoteVideoRef.current && ev.streams[0]) {
        remoteVideoRef.current.srcObject = ev.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        endCall();
      }
    };

    pcRef.current = pc;
    return pc;
  }

  /* ─── Initiate call ─── */
  async function startCall(peer: Teammate, withVideo = false) {
    if (callState.phase !== "idle") return;
    setCallState({ phase: "calling", peerId: peer.id, peerName: peer.name });
    setVideoEnabled(withVideo);

    const stream = await getUserMedia(withVideo);
    if (!stream) {
      setCallState({ phase: "idle" });
      return;
    }
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const pc = createPeerConnection(peer.id);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await signal(peer.id, "call-offer", { offer, video: withVideo, callerName: myName });
  }

  /* ─── Handle incoming offer ─── */
  const handleIncomingOffer = useCallback(
    (data: { fromUserId: number; fromName: string; payload: { offer: RTCSessionDescriptionInit; video: boolean } }) => {
      if (callState.phase !== "idle") {
        void signal(data.fromUserId, "call-reject", {});
        return;
      }
      setVideoEnabled(data.payload.video);
      setCallState({
        phase: "ringing",
        peerId: data.fromUserId,
        peerName: data.fromName,
        offer: data.payload.offer,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callState.phase],
  );

  /* ─── Answer call ─── */
  async function answerCall() {
    if (callState.phase !== "ringing") return;
    const { peerId, peerName, offer } = callState;

    const stream = await getUserMedia(videoEnabled);
    if (!stream) return;
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const pc = createPeerConnection(peerId);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await signal(peerId, "call-answer", answer);

    setCallState({ phase: "active", peerId, peerName });
  }

  /* ─── Handle answer ─── */
  const handleCallAnswer = useCallback(
    async (data: { fromUserId: number; payload: RTCSessionDescriptionInit }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.payload));
      setCallState((prev) =>
        prev.phase === "calling"
          ? { phase: "active", peerId: prev.peerId, peerName: prev.peerName }
          : prev,
      );
    },
    [],
  );

  /* ─── Handle ICE ─── */
  const handleRemoteIce = useCallback(
    async (data: { payload: RTCIceCandidateInit }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.payload));
      } catch {
        // ignore stale candidates
      }
    },
    [],
  );

  /* ─── Hang up ─── */
  function endCall() {
    if (callState.phase !== "idle") {
      void signal(callState.peerId, "call-hangup", {});
    }
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState({ phase: "idle" });
  }

  const handleRemoteHangup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState({ phase: "idle" });
    toast("Call ended");
  }, []);

  const handleCallRejected = useCallback(() => {
    endCall();
    toast.error("Call rejected");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── UI ─── */

  const inCall = callState.phase === "active" || callState.phase === "calling";

  return (
    <div className="flex flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-card dark:shadow-card-dark">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 overflow-y-auto border-r border-border bg-muted/30 sidebar-scroll">
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Team ({teammates.length})
          </p>
        </div>
        <ul>
          {teammates.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setActiveThread(t)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  activeThread?.id === t.id
                    ? "bg-teal-50 text-teal-900 dark:bg-teal-900/20 dark:text-teal-300"
                    : "text-foreground hover:bg-muted/60",
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 text-xs font-bold text-white shadow-[0_0_8px_rgba(45,212,191,0.25)]">
                  {t.name.charAt(0).toUpperCase()}
                </span>
                <span className="truncate text-sm font-medium">{t.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeThread ? (
          <>
            {/* Thread header */}
            <div className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 text-xs font-bold text-white">
                  {activeThread.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {activeThread.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{activeThread.email}</p>
                </div>
              </div>
              {callState.phase === "idle" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startCall(activeThread, false)}
                    title="Voice call"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-900/20 dark:hover:text-teal-400"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startCall(activeThread, true)}
                    title="Video call"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-900/20 dark:hover:text-teal-400"
                  >
                    <Video className="h-4 w-4" />
                  </button>
                </div>
              )}
              {inCall && (
                <button
                  type="button"
                  onClick={endCall}
                  className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                >
                  <PhoneOff className="h-3.5 w-3.5" />
                  Hang up
                </button>
              )}
            </div>

            {/* Call overlay banners */}
            {callState.phase === "ringing" && (
              <div className="flex items-center justify-between bg-teal-700 px-4 py-2 text-sm text-white">
                <span className="flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 animate-pulse" />
                  Incoming {videoEnabled ? "video" : "voice"} call from{" "}
                  <strong>{callState.peerName}</strong>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={answerCall}
                    className="rounded bg-white/90 px-3 py-1 text-xs font-semibold text-teal-800 hover:bg-white"
                  >
                    Answer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void signal(callState.peerId, "call-reject", {});
                      setCallState({ phase: "idle" });
                    }}
                    className="rounded bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}
            {callState.phase === "calling" && (
              <div className="flex items-center gap-2 bg-amber-500 px-4 py-2 text-sm text-white">
                <PhoneCall className="h-4 w-4 animate-pulse" />
                Calling <strong>{callState.peerName}</strong>…
              </div>
            )}
            {callState.phase === "active" && (
              <div className="flex items-center gap-2 bg-emerald-600 px-4 py-2 text-sm text-white">
                <Phone className="h-4 w-4" />
                In call with <strong>{callState.peerName}</strong>
              </div>
            )}

            {/* Video panels */}
            {callState.phase !== "idle" && (
              <div className="flex shrink-0 gap-2 bg-zinc-950 px-4 py-2">
                <div className="relative">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="h-32 w-48 rounded-lg object-cover bg-zinc-900"
                  />
                  <span className="absolute bottom-1 left-2 text-[10px] text-white/70">
                    {callState.peerName}
                  </span>
                </div>
                <div className="relative">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-32 w-48 rounded-lg object-cover bg-zinc-900"
                  />
                  <span className="absolute bottom-1 left-2 text-[10px] text-white/70">
                    You
                  </span>
                  {!videoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-zinc-900/80">
                      <VideoOff className="h-6 w-6 text-zinc-400" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-background px-4 py-4 sidebar-scroll">
              {loadingMsgs ? (
                <p className="text-center text-sm text-muted-foreground">Loading…</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  No messages yet. Say hi!
                </p>
              ) : (
                <ul className="space-y-3">
                  {messages.map((msg) => {
                    const isMe = msg.sender.id === myId;
                    return (
                      <li
                        key={msg.id}
                        className={cn(
                          "flex flex-col",
                          isMe ? "items-end" : "items-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                            isMe
                              ? "rounded-br-sm bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-[0_0_16px_rgba(45,212,191,0.2)]"
                              : "rounded-bl-sm bg-muted text-foreground",
                          )}
                        >
                          {msg.content}
                        </div>
                        <span className="mt-1 text-[10px] text-muted-foreground/60">
                          {isMe
                            ? "You"
                            : `${msg.sender.firstName} ${msg.sender.lastName ?? ""}`}
                          {" · "}
                          {fmtTime(msg.createdAt)}
                        </span>
                      </li>
                    );
                  })}
                  <div ref={bottomRef} />
                </ul>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={sendMessage}
              className="flex items-center gap-2 border-t border-border bg-card px-4 py-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message ${activeThread.name}…`}
                className="flex-1 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-background transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150",
                  input.trim() && !sending
                    ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-[0_0_12px_rgba(45,212,191,0.3)] hover:shadow-[0_0_18px_rgba(45,212,191,0.4)]"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-muted-foreground">
              No teammates yet. Invite others to your workspace.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
