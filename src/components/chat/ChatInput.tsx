import { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { ZenMessage } from '@/lib/zentalk-types';
import { Send, Smile, Paperclip, X, Image, FileText, Mic, Square, LoaderCircle } from 'lucide-react';

const EMOJIS = ['😀','😂','🥰','😍','🤔','😎','🥳','😭','🔥','❤️','👍','👏','🎉','✨','💯','🚀','💪','🙏','😅','🤣','😊','🥺','😤','🤯','💀','🫡','🤝','👋','🎯','⚡','😇','😌','😏','🙌','🤍','🩵','🌟','💫','🎶','📞','💬','🫶','😄','🤗','😬','😴','🤓','😺','🐶','🦄','🍀','🌈','⚙️','📌','✅','❄️','🌙','☀️','🍕','☕','🎧','📷','🧠','💻','🛠️'];

interface Props {
  replyTo: ZenMessage | null;
  onCancelReply: () => void;
  editingMsg: ZenMessage | null;
  onCancelEdit: () => void;
}

export default function ChatInput({ replyTo, onCancelReply, editingMsg, onCancelEdit }: Props) {
  const { sendMessage, editMessage, activeChat, currentUser, communities, isUserBlocked } = useApp();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState('');
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check if user can send in broadcast channel
  const canSend = (() => {
    if (!activeChat || !currentUser) return false;
    if (activeChat.type === 'dm') {
      const otherUserId = activeChat.participants.find(id => id !== currentUser.id);
      if (otherUserId && isUserBlocked(otherUserId)) return false;
    }
    if (activeChat.type !== 'channel') return true;
    const community = communities.find(c => c.id === activeChat.communityId);
    if (!community) return true;
    const channel = community.channels.find(ch => ch.id === activeChat.channelId);
    if (!channel?.isBroadcast) return true;
    const member = community.members.find(m => m.userId === currentUser.id);
    return member?.role === 'admin' || member?.role === 'moderator';
  })();

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && !editingMsg) return;
    if (editingMsg) {
      editMessage(editingMsg.id, trimmed);
      onCancelEdit();
    } else {
      sendMessage(trimmed, replyTo?.id);
      if (replyTo) onCancelReply();
    }
    setText('');
    setShowEmoji(false);
    inputRef.current?.focus();
  }, [text, editingMsg, replyTo, sendMessage, editMessage, onCancelEdit, onCancelReply]);

  const stopRecordingStream = useCallback(() => {
    recordingStreamRef.current?.getTracks().forEach(track => track.stop());
    recordingStreamRef.current = null;
  }, []);

  const resetRecordingState = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
    stopRecordingStream();
  }, [stopRecordingStream]);

  useEffect(() => {
    return () => {
      resetRecordingState();
    };
  }, [resetRecordingState]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (activeChat) {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {}, 1000);
    }
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const isImage = file.type.startsWith('image/');
      sendMessage(file.name, replyTo?.id, dataUrl, isImage ? 'image' : 'document');
      if (replyTo) onCancelReply();
    };
    reader.readAsDataURL(file);
    setShowAttach(false);
    e.target.value = '';
  };

  const startRecording = useCallback(async () => {
    if (isRecording || isProcessingRecording) return;
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setRecordingError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      setRecordingError('');
      setShowEmoji(false);
      setShowAttach(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = event => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        resetRecordingState();
        if (blob.size === 0) {
          setIsProcessingRecording(false);
          setRecordingError('Could not capture audio. Please try again.');
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : '';
          if (dataUrl) {
            sendMessage('Voice message', replyTo?.id, dataUrl, 'audio');
            if (replyTo) onCancelReply();
          } else {
            setRecordingError('Could not process the recording.');
          }
          setIsProcessingRecording(false);
        };
        reader.onerror = () => {
          setRecordingError('Could not process the recording.');
          setIsProcessingRecording(false);
        };
        reader.readAsDataURL(blob);
      };

      recorder.onerror = () => {
        setRecordingError('Recording failed. Please try again.');
        setIsProcessingRecording(false);
        resetRecordingState();
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch {
      resetRecordingState();
      setRecordingError('Microphone permission is required to record audio.');
    }
  }, [isProcessingRecording, isRecording, onCancelReply, replyTo?.id, resetRecordingState, sendMessage]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    setIsProcessingRecording(true);
    recorder.stop();
  }, []);

  const formatRecordingTime = (secs: number) => {
    const minutes = Math.floor(secs / 60).toString().padStart(2, '0');
    const seconds = (secs % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  // Fill edit text
  if (editingMsg && text === '' && editingMsg.text) {
    setText(editingMsg.text);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const blockedDm = activeChat?.type === 'dm' && currentUser
    ? (() => {
        const otherUserId = activeChat.participants.find(id => id !== currentUser.id);
        return otherUserId ? isUserBlocked(otherUserId) : false;
      })()
    : false;

  if (!canSend) {
    return (
      <div className="px-4 py-4 bg-card border-t border-border text-center text-sm text-muted-foreground">
        {blockedDm ? 'You blocked this user. Unblock them from the chat menu to send messages again.' : '🔒 Only admins and moderators can send messages in this broadcast channel'}
      </div>
    );
  }

  return (
    <div className="bg-card border-t border-border">
      {/* Reply/Edit preview */}
      {(replyTo || editingMsg) && (
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-b border-border">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary">
              {editingMsg ? '✏️ Editing message' : `↩ Replying to ${replyTo?.senderId === currentUser?.id ? 'yourself' : 'message'}`}
            </p>
            <p className="text-xs text-muted-foreground truncate">{editingMsg?.text || replyTo?.text}</p>
          </div>
          <button onClick={editingMsg ? onCancelEdit : onCancelReply}
            className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {(isRecording || isProcessingRecording || recordingError) && (
        <div className="border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {isProcessingRecording ? 'Processing voice message...' : isRecording ? 'Recording voice message' : 'Recorder status'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isRecording ? `${formatRecordingTime(recordingSeconds)} live` : recordingError || 'Your recording will be sent as an audio message.'}
              </p>
            </div>
            {isRecording && (
              <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                REC
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 px-3 py-2">
        <div className="relative flex-shrink-0">
          <button onClick={() => { setShowEmoji(p => !p); setShowAttach(false); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showEmoji ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
            <Smile className="w-5 h-5" />
          </button>
          {showEmoji && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
              <div className="absolute bottom-12 left-0 z-50 w-[260px] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                <div className="border-b border-border px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Emoji</p>
                </div>
                <div className="max-h-48 overflow-y-auto p-3">
                  <div className="grid grid-cols-5 gap-2">
                    {EMOJIS.map(e => (
                      <button
                        key={e}
                        onClick={() => { setText(p => p + e); setShowEmoji(false); inputRef.current?.focus(); }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/55 text-xl transition-transform hover:scale-105 hover:bg-background"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative flex-shrink-0">
          <button onClick={() => { setShowAttach(p => !p); setShowEmoji(false); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showAttach ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
            <Paperclip className="w-5 h-5" />
          </button>
          {showAttach && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAttach(false)} />
              <div className="absolute bottom-12 left-0 bg-card border border-border rounded-xl shadow-xl py-1 w-44 z-50 overflow-hidden">
                <button onClick={() => { fileRef.current?.click(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-foreground">
                  <Image className="w-4 h-4 text-primary" /> Photo / Video
                </button>
                <button onClick={() => { fileRef.current?.click(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-foreground">
                  <FileText className="w-4 h-4 text-blue-500" /> Document
                </button>
              </div>
            </>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={handleFile} />

        <textarea
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          rows={1}
          className="flex-1 resize-none bg-muted rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all min-h-[40px] max-h-[120px] leading-relaxed"
          style={{ height: 'auto' }}
        />

        <button
          onClick={text.trim() || editingMsg ? handleSend : isRecording ? stopRecording : startRecording}
          disabled={isProcessingRecording}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
            isProcessingRecording
              ? 'bg-muted text-muted-foreground cursor-wait'
              : text.trim() || editingMsg
              ? 'bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 active:scale-95'
              : isRecording
              ? 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20'
              : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
          }`}>
          {isProcessingRecording ? <LoaderCircle className="w-5 h-5 animate-spin" /> : text.trim() || editingMsg ? <Send className="w-5 h-5" /> : isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
