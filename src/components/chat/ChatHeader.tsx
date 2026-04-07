import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  Phone, Video, Search, Info, MoreVertical, ArrowLeft,
  VolumeX, Volume2, Trash2, Archive, Clock, CalendarDays, SlidersHorizontal, X, Ban
} from 'lucide-react';
import * as store from '@/lib/zentalk-store';
import UserAvatar from '@/components/ui/user-avatar';

export default function ChatHeader() {
  const {
    activeChat, setActiveChat, currentUser, allUsers, startCall,
    setShowInfoPanel, showInfoPanel, setInChatSearch, inChatSearch, inChatSearchDate, setInChatSearchDate,
    refreshChats, setMobileShowChat, toggleBlockedUser, isUserBlocked,
  } = useApp();
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

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

  const canStartCall = activeChat.type === 'dm' || activeChat.type === 'group';
  const isBlockedDm = activeChat.type === 'dm' && otherUser ? isUserBlocked(otherUser.id) : false;

  const handleMenuAction = (action: string) => {
    setShowMenu(false);
    switch (action) {
      case 'mute': store.updateChat(activeChat.id, { muted: !activeChat.muted }); refreshChats(); break;
      case 'archive': store.updateChat(activeChat.id, { archived: !activeChat.archived }); refreshChats(); break;
      case 'clear': store.setMessages(activeChat.id, []); break;
      case 'block':
        if (otherUser) toggleBlockedUser(otherUser.id);
        break;
      case 'disappear':
        const timers = ['off', '24h', '7d', '90d'] as const;
        const idx = timers.indexOf(activeChat.disappearing);
        store.updateChat(activeChat.id, { disappearing: timers[(idx + 1) % timers.length] });
        refreshChats();
        break;
    }
  };

  const clearAdvancedSearch = () => {
    setInChatSearch('');
    setInChatSearchDate('');
    setShowSearch(false);
    setShowAdvancedSearch(false);
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
        <UserAvatar
          avatar={activeChat.avatar}
          name={activeChat.name}
          className="h-10 w-10 text-xl"
          fallbackClassName="bg-primary/10 text-xl"
          online={activeChat.type === 'dm' ? isOnline : undefined}
          statusClassName={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card ${isOnline ? 'bg-[#25D366]' : 'bg-muted-foreground'}`}
        />
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
          <div className="relative">
            <div className="flex items-center gap-2 rounded-xl bg-muted px-2 py-1.5">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                value={inChatSearch}
                onChange={e => setInChatSearch(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && clearAdvancedSearch()}
                placeholder="Keyword"
                className="w-28 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                onClick={() => setShowAdvancedSearch(p => !p)}
                className={`rounded-lg p-1 transition-colors ${showAdvancedSearch || inChatSearchDate ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-background hover:text-foreground'}`}
                title="Advanced search"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              {(inChatSearch || inChatSearchDate) && (
                <button
                  onClick={clearAdvancedSearch}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {showAdvancedSearch && (
              <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-border bg-card p-4 shadow-xl">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-foreground">Advanced Search</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    First select a date, then add a keyword to narrow the results further.
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <CalendarDays className="w-3.5 h-3.5" />
                      Date
                    </label>
                    <input
                      type="date"
                      value={inChatSearchDate}
                      onChange={e => setInChatSearchDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Keyword
                    </label>
                    <input
                      value={inChatSearch}
                      onChange={e => setInChatSearch(e.target.value)}
                      placeholder="Type a word or phrase"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={clearAdvancedSearch}
                      className="flex-1 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setShowAdvancedSearch(false)}
                      className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => setShowSearch(true)}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Search className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => { if (canStartCall && !isBlockedDm) void startCall(activeChat.id, 'audio'); }}
          disabled={!canStartCall || isBlockedDm}
          title={!canStartCall ? 'Calls are currently available in direct and group chats only' : isBlockedDm ? 'Unblock this user to call' : 'Start voice call'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            canStartCall && !isBlockedDm
              ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
              : 'cursor-not-allowed text-muted-foreground/40'
          }`}>
          <Phone className="w-5 h-5" />
        </button>
        <button
          onClick={() => { if (canStartCall && !isBlockedDm) void startCall(activeChat.id, 'video'); }}
          disabled={!canStartCall || isBlockedDm}
          title={!canStartCall ? 'Calls are currently available in direct and group chats only' : isBlockedDm ? 'Unblock this user to call' : 'Start video call'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            canStartCall && !isBlockedDm
              ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
              : 'cursor-not-allowed text-muted-foreground/40'
          }`}>
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
                  ...(activeChat.type === 'dm' && otherUser ? [{ icon: Ban, label: isBlockedDm ? 'Unblock user' : 'Block user', action: 'block', danger: isBlockedDm ? false : true }] : []),
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
