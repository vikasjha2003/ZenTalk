import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  Phone, Video, Search, Info, MoreVertical, ArrowLeft,
  VolumeX, Volume2, Trash2, Archive, Clock
} from 'lucide-react';
import * as store from '@/lib/zentalk-store';

export default function ChatHeader() {
  const {
    activeChat, setActiveChat, currentUser, allUsers, startCall,
    setShowInfoPanel, showInfoPanel, setInChatSearch, inChatSearch,
    refreshChats, setMobileShowChat,
  } = useApp();
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  if (!activeChat) return null;

  const otherUserId = activeChat.type === 'dm'
    ? activeChat.participants.find(id => id !== currentUser?.id)
    : null;
  const otherUser = otherUserId ? allUsers.find(u => u.id === otherUserId) : null;
  const group = activeChat.groupId ? store.getGroupById(activeChat.groupId) : null;

  const isOnline = otherUser?.status === 'online';
  const lastSeen = otherUser?.lastSeen
    ? `last seen ${new Date(otherUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : '';

  const memberCount = activeChat.type === 'group'
    ? (group?.members.length || activeChat.participants.length)
    : activeChat.participants.length;

  const subtitle = activeChat.type === 'dm'
    ? (isOnline ? 'online' : lastSeen)
    : activeChat.type === 'group'
    ? `${memberCount} members`
    : activeChat.type === 'channel'
    ? 'broadcast channel'
    : '';

  const handleMenuAction = (action: string) => {
    setShowMenu(false);
    switch (action) {
      case 'mute': store.updateChat(activeChat.id, { muted: !activeChat.muted }); refreshChats(); break;
      case 'archive': store.updateChat(activeChat.id, { archived: !activeChat.archived }); refreshChats(); break;
      case 'clear': store.setMessages(activeChat.id, []); break;
      case 'disappear':
        const timers = ['off', '24h', '7d', '90d'] as const;
        const idx = timers.indexOf(activeChat.disappearing);
        store.updateChat(activeChat.id, { disappearing: timers[(idx + 1) % timers.length] });
        refreshChats();
        break;
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
      {/* Back button (mobile) */}
      <button onClick={() => { setMobileShowChat(false); setActiveChat(null); }}
        className="md:hidden w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Avatar + Info */}
      <button onClick={() => setShowInfoPanel(!showInfoPanel)} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
            {activeChat.avatar}
          </div>
          {activeChat.type === 'dm' && (
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card ${isOnline ? 'bg-[#25D366]' : 'bg-muted-foreground'}`} />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{activeChat.name}</p>
          <p className={`text-xs truncate ${isOnline && activeChat.type === 'dm' ? 'text-primary' : 'text-muted-foreground'}`}>
            {subtitle}
          </p>
        </div>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {showSearch ? (
          <input
            autoFocus
            value={inChatSearch}
            onChange={e => setInChatSearch(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && (setShowSearch(false), setInChatSearch(''))}
            placeholder="Search messages..."
            className="w-40 px-3 py-1.5 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        ) : (
          <button onClick={() => setShowSearch(true)}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Search className="w-5 h-5" />
          </button>
        )}
        <button onClick={() => startCall(activeChat.id, 'audio')}
          className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Phone className="w-5 h-5" />
        </button>
        <button onClick={() => startCall(activeChat.id, 'video')}
          className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Video className="w-5 h-5" />
        </button>
        <button onClick={() => setShowInfoPanel(!showInfoPanel)}
          className={`w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors ${showInfoPanel ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}>
          <Info className="w-5 h-5" />
        </button>
        <div className="relative">
          <button onClick={() => setShowMenu(p => !p)}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-10 w-52 bg-card border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                {[
                  { icon: activeChat.muted ? Volume2 : VolumeX, label: activeChat.muted ? 'Unmute' : 'Mute notifications', action: 'mute' },
                  { icon: Clock, label: `Disappearing: ${activeChat.disappearing}`, action: 'disappear' },
                  { icon: Archive, label: activeChat.archived ? 'Unarchive' : 'Archive chat', action: 'archive' },
                  { icon: Trash2, label: 'Clear messages', action: 'clear', danger: true },
                ].map(({ icon: Icon, label, action, danger }) => (
                  <button key={action} onClick={() => handleMenuAction(action)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors ${danger ? 'text-destructive' : 'text-foreground'}`}>
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
