import { useEffect, useMemo, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Maximize2, Mic, MicOff, Minimize2, Pause, PhoneOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import UserAvatar from '@/components/ui/user-avatar';

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function RemoteMedia({
  stream,
  isVideo,
  muted,
}: {
  stream: MediaStream | null;
  isVideo: boolean;
  muted: boolean;
}) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.srcObject = stream;
      if (stream) {
        void mediaRef.current.play?.().catch(() => {});
      }
    }
  }, [stream, muted]);

  if (!isVideo) {
    return <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} autoPlay playsInline muted={muted} />;
  }

  return (
    <video
      ref={mediaRef as React.RefObject<HTMLVideoElement>}
      autoPlay
      playsInline
      muted={muted}
      className="h-full w-full object-cover"
    />
  );
}

export default function CallOverlay() {
  const {
    activeCall,
    incomingCall,
    localCallStream,
    remoteParticipants,
    callControls,
    callError,
    callDuration,
    acceptCall,
    rejectCall,
    endCall,
    toggleCallMute,
    toggleCallVideo,
    toggleCallSpeaker,
    toggleCallHold,
    clearCallError,
    callMinimized,
    setCallMinimized,
    allUsers,
    currentUser,
  } = useApp();

  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localCallStream;
      if (localCallStream) {
        void localVideoRef.current.play?.().catch(() => {});
      }
    }
  }, [localCallStream]);

  const callerUser = incomingCall ? allUsers.find(user => user.id === incomingCall.callerId) : null;
  const uniqueActiveParticipantIds = useMemo(() => {
    if (!activeCall) return [];
    return Array.from(new Set(activeCall.participantIds.filter(userId => userId !== currentUser?.id)));
  }, [activeCall, currentUser?.id]);
  const activeParticipants = useMemo(() => {
    if (!activeCall) return [];
    return uniqueActiveParticipantIds
      .map(userId => ({
        userId,
        user: allUsers.find(candidate => candidate.id === userId) ?? null,
        remote: remoteParticipants.find(participant => participant.userId === userId) ?? null,
      }));
  }, [activeCall, allUsers, remoteParticipants, uniqueActiveParticipantIds]);

  const connectedParticipantCount = useMemo(
    () => 1 + new Set(remoteParticipants.map(participant => participant.userId)).size,
    [remoteParticipants],
  );
  const incomingParticipantCount = incomingCall
    ? Math.max(1, new Set(incomingCall.participantIds).size - 1)
    : 0;

  const participantLabel = activeParticipants.length === 1
    ? activeParticipants[0]?.user?.name ?? 'Participant'
    : `${activeParticipants.length} participants`;

  const statusLabel = useMemo(() => {
    if (!activeCall) return '';
    if (activeCall.status === 'calling') return `Calling ${participantLabel}...`;
    if (callControls.hold) return 'Your media is on hold';
    if (callControls.connectionState === 'connecting') return 'Connecting participants...';
    return activeCall.type === 'video' ? 'Video room' : 'Voice room';
  }, [activeCall, callControls.connectionState, callControls.hold, participantLabel]);

  const showLocalVideo = activeCall?.type === 'video'
    && callControls.videoEnabled
    && !callControls.hold
    && Boolean(localCallStream?.getVideoTracks().length);
  const showRunningTimer = Boolean(activeCall?.startedAt);
  const durationLabel = showRunningTimer ? formatDuration(callDuration) : '00:00';

  return (
    <AnimatePresence>
      {callError && !activeCall && !incomingCall && (
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          className="fixed top-4 right-4 z-[110] w-[320px] rounded-2xl border border-red-500/30 bg-card p-4 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <PhoneOff className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">Call unavailable</p>
              <p className="mt-1 text-sm text-muted-foreground">{callError}</p>
            </div>
            <button onClick={clearCallError} className="rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-muted">Close</button>
          </div>
        </motion.div>
      )}

      {incomingCall && !activeCall && (
        <motion.div
          initial={{ opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -80 }}
          className="fixed top-4 right-4 z-[100] w-80 rounded-3xl border border-border bg-card p-5 shadow-2xl"
        >
          <div className="mb-5 flex items-center gap-3">
            <UserAvatar
              avatar={callerUser?.avatar}
              name={callerUser?.name || 'Caller'}
              className="h-14 w-14"
              fallbackClassName="bg-primary/10 text-3xl"
            />
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{callerUser?.name}</p>
              <p className="text-sm text-muted-foreground">
                Incoming {incomingCall.type === 'video' ? 'video' : 'voice'} call with {incomingParticipantCount} {incomingParticipantCount === 1 ? 'person' : 'people'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={rejectCall} className="flex-1 rounded-2xl bg-destructive py-3 text-sm font-medium text-white transition-colors hover:bg-destructive/90">Decline</button>
            <button onClick={() => { void acceptCall(); }} className="flex-1 rounded-2xl bg-[#25D366] py-3 text-sm font-medium text-white transition-colors hover:bg-[#25D366]/90">Accept</button>
          </div>
        </motion.div>
      )}

      {activeCall && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          className={`fixed z-[100] ${callMinimized ? 'bottom-4 right-4 w-[320px]' : 'inset-0 flex items-center justify-center bg-black/80 px-4 py-6'}`}
        >
          {activeParticipants.map(participant => (
            <RemoteMedia
              key={`audio-${participant.userId}`}
              stream={participant.remote?.stream ?? null}
              isVideo={false}
              muted={!callControls.speakerEnabled || participant.remote?.hold === true}
            />
          ))}

          {callMinimized ? (
            <div className="w-full rounded-3xl bg-gray-950/95 p-4 text-white shadow-2xl">
              <div className="mb-3 flex items-center gap-3">
                <UserAvatar
                  avatar={activeParticipants[0]?.user?.avatar}
                  name={activeParticipants[0]?.user?.name || 'Participant'}
                  className="h-12 w-12"
                  fallbackClassName="bg-white/10 text-2xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{participantLabel}</p>
                  <p className="truncate text-xs text-gray-400">{showRunningTimer ? durationLabel : statusLabel}</p>
                </div>
                <button onClick={() => setCallMinimized(false)} className="text-gray-400 hover:text-white">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={toggleCallMute} className={`rounded-2xl py-2 transition-colors ${callControls.muted ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white'}`}>
                  {callControls.muted ? <MicOff className="mx-auto h-4 w-4" /> : <Mic className="mx-auto h-4 w-4" />}
                </button>
                <button onClick={toggleCallSpeaker} className={`rounded-2xl py-2 transition-colors ${callControls.speakerEnabled ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-300'}`}>
                  {callControls.speakerEnabled ? <Volume2 className="mx-auto h-4 w-4" /> : <VolumeX className="mx-auto h-4 w-4" />}
                </button>
                <button onClick={toggleCallHold} className={`rounded-2xl py-2 transition-colors ${callControls.hold ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-white'}`}>
                  <Pause className="mx-auto h-4 w-4" />
                </button>
                <button onClick={endCall} className="rounded-2xl bg-red-500 py-2 text-white transition-colors hover:bg-red-600">
                  <PhoneOff className="mx-auto h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-6xl overflow-hidden rounded-[32px] bg-gray-950 text-white shadow-2xl">
              <div className="grid min-h-[720px] md:grid-cols-[1.7fr_0.8fr]">
                <div className="relative bg-black p-4">
                  <div className={`grid h-full gap-4 ${activeParticipants.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                    {activeParticipants.map(participant => {
                      const showVideo = activeCall.type === 'video' && participant.remote?.videoEnabled;
                      return (
                        <div key={participant.userId} className="relative min-h-[260px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-950 to-black">
                          {showVideo ? (
                            <RemoteMedia stream={participant.remote?.stream ?? null} isVideo muted />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-3">
                              <UserAvatar
                                avatar={participant.user?.avatar}
                                name={participant.user?.name || 'Participant'}
                                className="h-24 w-24"
                                fallbackClassName="bg-white/10 text-5xl"
                              />
                              <div className="text-center">
                                <p className="text-xl font-semibold">{participant.user?.name || 'Participant'}</p>
                                <p className="mt-1 text-sm text-gray-400">
                                  {participant.remote?.hold ? 'On hold' : participant.remote?.connectionState || 'Waiting to connect'}
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                            {participant.user?.name || 'Participant'}
                          </div>
                        </div>
                      );
                    })}
                    {activeParticipants.length === 0 && (
                      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-950 to-black">
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-5xl">📞</div>
                        <div className="text-center">
                          <p className="text-2xl font-semibold">{participantLabel}</p>
                          <p className="mt-2 text-sm text-gray-400">{statusLabel}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {showLocalVideo && (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute bottom-6 right-6 h-40 w-32 rounded-2xl border border-white/10 bg-black object-cover shadow-lg"
                    />
                  )}
                  {!showLocalVideo && activeCall.type === 'video' && (
                    <UserAvatar
                      avatar={currentUser?.avatar}
                      name={currentUser?.name || 'You'}
                      className="absolute bottom-6 right-6 h-40 w-32 rounded-2xl border border-white/10 bg-white/5 text-4xl shadow-lg"
                      fallbackClassName="bg-white/5 text-4xl"
                    />
                  )}
                </div>

                <div className="flex flex-col justify-between bg-gray-950 p-6">
                  <div>
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-semibold">{participantLabel}</p>
                        <p className="mt-1 text-sm text-gray-400">{statusLabel}</p>
                      </div>
                      <button onClick={() => setCallMinimized(true)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
                        <Minimize2 className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex items-center justify-between text-sm text-gray-300">
                        <span>Connection</span>
                        <span className="capitalize">{callControls.connectionState}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-gray-300">
                        <span>Participants</span>
                        <span>{connectedParticipantCount}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-gray-300">
                        <span>Duration</span>
                        <span className="font-mono text-lg text-[#25D366]">{durationLabel}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-gray-300">
                        <span>Audio route</span>
                        <span>{callControls.speakerEnabled ? 'Speaker' : 'Muted output'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={toggleCallMute} className={`flex items-center justify-center gap-2 rounded-2xl py-3 transition-colors ${callControls.muted ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white hover:bg-white/15'}`}>
                        {callControls.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        {callControls.muted ? 'Unmute' : 'Mute'}
                      </button>
                      <button onClick={toggleCallSpeaker} className={`flex items-center justify-center gap-2 rounded-2xl py-3 transition-colors ${callControls.speakerEnabled ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-red-500/20 text-red-300'}`}>
                        {callControls.speakerEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                        {callControls.speakerEnabled ? 'Speaker On' : 'Speaker Off'}
                      </button>
                      <button onClick={toggleCallHold} className={`flex items-center justify-center gap-2 rounded-2xl py-3 transition-colors ${callControls.hold ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-white hover:bg-white/15'}`}>
                        <Pause className="h-5 w-5" />
                        {callControls.hold ? 'Resume' : 'Hold'}
                      </button>
                      {activeCall.type === 'video' ? (
                        <button onClick={toggleCallVideo} className={`flex items-center justify-center gap-2 rounded-2xl py-3 transition-colors ${callControls.videoEnabled ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-red-500/20 text-red-300'}`}>
                          {callControls.videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                          {callControls.videoEnabled ? 'Camera On' : 'Camera Off'}
                        </button>
                      ) : (
                        <div className="flex items-center justify-center rounded-2xl border border-white/10 py-3 text-sm text-gray-400">Audio call</div>
                      )}
                    </div>
                    <button onClick={endCall} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 py-3.5 font-medium text-white transition-colors hover:bg-red-600">
                      <PhoneOff className="h-5 w-5" />
                      {activeCall.callerId === currentUser?.id ? 'End room for everyone' : 'Leave call'}
                    </button>
                  </div>
                </div>
              </div>
              {activeCall.status === 'calling' && (
                <div className="border-t border-white/10 bg-white/[0.03] px-6 py-4 text-sm text-gray-400">
                  Invites sent. As people join, their media tiles will appear here in real time.
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
