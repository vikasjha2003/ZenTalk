import { useState, useRef, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { ZenMessage } from '@/lib/zentalk-types';
import { Send, Smile, Paperclip, X, Image, FileText, Mic } from 'lucide-react';

const EMOJIS = ['😀','😂','🥰','😍','🤔','😎','🥳','😭','🔥','❤️','👍','👏','🎉','✨','💯','🚀','💪','🙏','😅','🤣','😊','🥺','😤','🤯','💀','🫡','🤝','👋','🎯','⚡'];

interface Props {
  replyTo: ZenMessage | null;
  onCancelReply: () => void;
  editingMsg: ZenMessage | null;
  onCancelEdit: () => void;
}

export default function ChatInput({ replyTo, onCancelReply, editingMsg, onCancelEdit }: Props) {
  const { sendMessage, editMessage, activeChat, currentUser, communities } = useApp();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if user can send in broadcast channel
  const canSend = (() => {
    if (!activeChat || !currentUser) return false;
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

  // Fill edit text
  if (editingMsg && text === '' && editingMsg.text) {
    setText(editingMsg.text);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  if (!canSend) {
    return (
      <div className="px-4 py-4 bg-card border-t border-border text-center text-sm text-muted-foreground">
        🔒 Only admins and moderators can send messages in this broadcast channel
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

      {/* Emoji picker */}
      {showEmoji && (
        <div className="px-4 py-3 border-b border-border">
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => { setText(p => p + e); setShowEmoji(false); inputRef.current?.focus(); }}
                className="text-xl hover:scale-125 transition-transform">
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 px-3 py-2">
        <button onClick={() => { setShowEmoji(p => !p); setShowAttach(false); }}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${showEmoji ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
          <Smile className="w-5 h-5" />
        </button>

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
          onClick={handleSend}
          disabled={!text.trim() && !editingMsg}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
            text.trim() || editingMsg
              ? 'bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 active:scale-95'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}>
          {text.trim() || editingMsg ? <Send className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
