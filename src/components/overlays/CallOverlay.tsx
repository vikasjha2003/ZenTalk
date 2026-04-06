import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function CallOverlay() {
  const { activeCall, incomingCall, acceptCall, rejectCall, endCall, callMinimized, setCallMinimized, allUsers, currentUser } = useApp();
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!activeCall || activeCall.status !== 'active') { setDuration(0); return; }
    const interval = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  const otherUserId = activeCall?.callerId === currentUser?.id ? activeCall?.receiverId : activeCall?.callerId;
  const otherUser = otherUserId ? allUsers.find(u => u.id === otherUserId) : null;
  const callerUser = incomingCall ? allUsers.find(u => u.id === incomingCall.callerId) : null;

  return (
    <AnimatePresence>
      {/* Incoming call */}
      {incomingCall && !activeCall && (
        <motion.div
          initial={{ opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -80 }}
          className="fixed top-4 right-4 z-[100] bg-card border border-border rounded-2xl shadow-2xl p-4 w-72"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
              {callerUser?.avatar || '?'}
            </div>
            <div>
              <p className="font-semibold text-foreground">{callerUser?.name}</p>
              <p className="text-sm text-muted-foreground animate-pulse">
                Incoming {incomingCall.type} call...
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={rejectCall}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors">
              <PhoneOff className="w-4 h-4" /> Decline
            </button>
            <button onClick={acceptCall}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-medium hover:bg-[#25D366]/90 transition-colors">
              <Phone className="w-4 h-4" /> Accept
            </button>
          </div>
        </motion.div>
      )}

      {/* Active call */}
      {activeCall && activeCall.status === 'active' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`fixed z-[100] ${
            callMinimized
              ? 'bottom-4 right-4 w-64 rounded-2xl'
              : 'inset-0 flex items-center justify-center bg-black/80'
          }`}
        >
          {callMinimized ? (
            <div className="bg-gray-900 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                  {otherUser?.avatar || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">{otherUser?.name}</p>
                  <p className="text-gray-400 text-xs">{formatDuration(duration)}</p>
                </div>
                <button onClick={() => setCallMinimized(false)} className="text-gray-400 hover:text-white">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setMuted(p => !p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${muted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'}`}>
                  {muted ? <MicOff className="w-4 h-4 mx-auto" /> : <Mic className="w-4 h-4 mx-auto" />}
                </button>
                <button onClick={endCall}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors">
                  <PhoneOff className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-3xl p-8 w-full max-w-sm mx-4 text-center shadow-2xl">
              {/* Video area */}
              {activeCall.type === 'video' && !videoOff ? (
                <div className="w-full h-48 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mb-6 relative overflow-hidden">
                  <div className="text-6xl">{otherUser?.avatar || '?'}</div>
                  <div className="absolute bottom-2 right-2 w-16 h-20 rounded-xl bg-gray-600 flex items-center justify-center text-2xl">
                    {currentUser?.avatar}
                  </div>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-4xl mx-auto mb-6">
                  {otherUser?.avatar || '?'}
                </div>
              )}

              <h3 className="text-white text-xl font-bold mb-1">{otherUser?.name}</h3>
              <p className="text-gray-400 text-sm mb-2">{activeCall.type === 'video' ? '📹 Video Call' : '📞 Voice Call'}</p>
              <p className="text-[#25D366] text-lg font-mono mb-8">{formatDuration(duration)}</p>

              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setMuted(p => !p)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                {activeCall.type === 'video' && (
                  <button onClick={() => setVideoOff(p => !p)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${videoOff ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {videoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </button>
                )}
                <button onClick={endCall}
                  className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors">
                  <PhoneOff className="w-6 h-6" />
                </button>
                <button onClick={() => setCallMinimized(true)}
                  className="w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Minimize2 className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
