import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { buildBackendUrl } from '@/lib/backend-url';
import type { ZenMessage } from '@/lib/zentalk-types';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import ChatHeader from './ChatHeader';
import { MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import UserAvatar from '@/components/ui/user-avatar';

import { socket } from "@/lib/socket";


function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-full border border-border">{date}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function formatDateLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function ForwardModal({ message, onClose }: { message: ZenMessage; onClose: () => void }) {
  const { chats, forwardMessage } = useApp();
  const [selected, setSelected] = useState<string[]>([]);

  const handleForward = () => {
    if (selected.length === 0) return;
    forwardMessage(message.id, selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Forward Message</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">"{message.text}"</p>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {chats.map(chat => (
            <label key={chat.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/60 cursor-pointer transition-colors">
              <input type="checkbox" checked={selected.includes(chat.id)}
                onChange={e => setSelected(p => e.target.checked ? [...p, chat.id] : p.filter(id => id !== chat.id))}
                className="w-4 h-4 rounded accent-primary" />
              <UserAvatar
                avatar={chat.avatar}
                name={chat.name}
                className="h-9 w-9 text-lg"
                fallbackClassName="bg-primary/10 text-lg"
              />
              <span className="text-sm font-medium text-foreground">{chat.name}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleForward} disabled={selected.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            Forward ({selected.length})
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ChatWindow() {
  const { 
  activeChat, 
  messages, 
  setMessages, // 🔥 ADD THIS
  currentUser, 
  inChatSearch, 
  inChatSearchDate 
} = useApp();
  const [replyTo, setReplyTo] = useState<ZenMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ZenMessage | null>(null);
  const [forwardMsg, setForwardMsg] = useState<ZenMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    setReplyTo(null);
    setEditingMsg(null);
  }, [activeChat?.id]);

  useEffect(() => {
  if (activeChat?.type === "group" && activeChat.groupId) {
    socket.emit("join-group", { groupId: activeChat.groupId });
  }
}, [activeChat]);

const [groupWarning, setGroupWarning] = useState<string | null>(null);

useEffect(() => {
  socket.on("group-warning", (data) => {
    console.log("⚠️ Warning:", data);
    setGroupWarning(data.message);
  });

  return () => {
    socket.off("group-warning");
  };
}, []);

useEffect(() => {
  socket.on("group-message", (data) => {
    console.log("📩 Group message received:", data);

    if (data.groupId === activeChat?.groupId) {
      setMessages((prev) => [...prev, data.message]);
    }
  });

  return () => {
    socket.off("group-message");
  };
}, [activeChat]);

useEffect(() => {
  if (activeChat?.type !== 'group' || !activeChat.groupId) return;

  const loadMessages = async () => {
    const res = await fetch(buildBackendUrl(`/api/messages/group/${activeChat.groupId}`));
    const data = await res.json();

    if (data.ok) {
      setMessages(data.messages);
    }
  };

  loadMessages();
}, [activeChat]);

  const matchesSelectedDate = (timestamp: number, selectedDate: string) => {
    if (!selectedDate) return true;
    const messageDate = new Date(timestamp);
    const [year, month, day] = selectedDate.split('-').map(Number);
    return (
      messageDate.getFullYear() === year &&
      messageDate.getMonth() === month - 1 &&
      messageDate.getDate() === day
    );
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">ZenTalk</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Select a conversation to start messaging, or search for someone new.
          </p>
        </motion.div>
      </div>
    );
  }

  // Filter messages
  const visibleMessages = messages.filter(m => {
    if (m.deletedFor.includes(currentUser?.id || '')) return false;
    const matchesKeyword = inChatSearch
      ? m.text.toLowerCase().includes(inChatSearch.toLowerCase())
      : true;
    const matchesDate = matchesSelectedDate(m.timestamp, inChatSearchDate);
    return matchesKeyword && matchesDate;
  });

  // Group by date
  const grouped: { date: string; messages: ZenMessage[] }[] = [];
  visibleMessages.forEach(msg => {
    const label = formatDateLabel(msg.timestamp);
    const last = grouped[grouped.length - 1];
    if (!last || last.date !== label) grouped.push({ date: label, messages: [msg] });
    else last.messages.push(msg);
  });

  const messageCanvasStyle = activeChat.wallpaper
    ? {
        background: activeChat.wallpaper,
        backgroundAttachment: 'local',
        backgroundRepeat: activeChat.wallpaper.includes('url(') ? 'no-repeat' : undefined,
        backgroundSize: activeChat.wallpaper.includes('url(') ? 'cover' : undefined,
        backgroundPosition: activeChat.wallpaper.includes('url(') ? 'center' : undefined,
      }
    : undefined;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ChatHeader />

      {/* Messages */}
      <div
        ref={containerRef}
        className="zentalk-chat-canvas relative flex-1 overflow-y-auto transition-colors duration-300"
      >
        <div className="relative min-h-full py-2" style={messageCanvasStyle}>
        <div className="zentalk-chat-doodles pointer-events-none absolute inset-0" />
        <div className="relative">
          {groupWarning && (
  <div className="text-center my-2">
    <span className="bg-yellow-100 text-yellow-800 px-4 py-1 rounded-full text-xs font-medium">
      {groupWarning}
    </span>
  </div>
)}
        {visibleMessages.length === 0 && (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-3xl">
              {activeChat.avatar}
            </div>
            <p className="font-semibold text-foreground">{activeChat.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {(inChatSearch || inChatSearchDate) ? 'No messages match your search' : 'No messages yet. Say hello! 👋'}
            </p>
          </div>
        )}

        {grouped.map(group => (
          <div key={group.date}>
            <DateSeparator date={group.date} />
            {group.messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.senderId === currentUser?.id}
                onReply={setReplyTo}
                onForward={setForwardMsg}
                onEdit={setEditingMsg}
                highlighted={inChatSearch ? msg.text.toLowerCase().includes(inChatSearch.toLowerCase()) : false}
              />
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
        </div>
        </div>
      </div>

      <ChatInput
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editingMsg={editingMsg}
        onCancelEdit={() => setEditingMsg(null)}
      />

      {forwardMsg && <ForwardModal message={forwardMsg} onClose={() => setForwardMsg(null)} />}
    </div>
  );
}
