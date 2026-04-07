import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  MessageCircle, Users, Globe, Phone, Search, Plus, MoreVertical,
  Settings, Star, Archive, LogOut, Moon, Sun, UserPlus,
  Pin, PinOff, Trash2, VolumeX, Volume2, Hash, Megaphone, Clock, Video, UserRoundPlus
} from 'lucide-react';
import type { ZenChat } from '@/lib/zentalk-types';
import * as store from '@/lib/zentalk-store';
import UserAvatar from '@/components/ui/user-avatar';

function formatTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return new Date(ts).toLocaleDateString([], { weekday: 'short' });
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function Avatar({ src, size = 'md', online }: { src: string; size?: 'sm' | 'md' | 'lg'; online?: boolean }) {
  const sizes = { sm: 'h-8 w-8 text-base', md: 'h-11 w-11 text-xl', lg: 'h-14 w-14 text-2xl' };
  return (
    <UserAvatar avatar={src} className={sizes[size]} fallbackClassName="bg-primary/10 font-medium" online={online} />
  );
}

function ChatListItem({ chat, active, onSelect, onContextMenu }: {
  chat: ZenChat; active: boolean; onSelect: () => void; onContextMenu: (e: React.MouseEvent) => void;
}) {
  const { typingChats, allUsers, currentUser } = useApp();
  const isTyping = typingChats.has(chat.id);
  const otherUserId = chat.type === 'dm' ? chat.participants.find(id => id !== currentUser?.id) : null;
  const otherUser = otherUserId ? allUsers.find(u => u.id === otherUserId) : null;
  const isOnline = otherUser?.status === 'online';

  return (
    <div
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group relative ${
        active ? 'bg-primary/10' : 'hover:bg-muted/60'
      }`}
    >
      <Avatar src={chat.avatar} online={chat.type === 'dm' ? isOnline : undefined} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {chat.pinned && <Pin className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
            <span className="font-semibold text-sm text-foreground truncate">{chat.name}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {chat.muted && <VolumeX className="w-3 h-3 text-muted-foreground" />}
            <span className="text-xs text-muted-foreground">{formatTime(chat.lastTime)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className={`text-xs truncate ${isTyping ? 'text-primary italic' : 'text-muted-foreground'}`}>
            {isTyping ? 'typing...' : chat.lastMessage}
          </span>
          {chat.unreadCount > 0 && !chat.muted && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1">
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </span>
          )}
          {chat.unreadCount > 0 && chat.muted && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-muted-foreground/40 text-white text-[10px] font-bold flex items-center justify-center px-1">
              {chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SidebarNav() {
  const {
    currentUser, chats, activeChat, setActiveChat, sidebarTab, setSidebarTab,
    theme, toggleTheme, setShowSettings, setShowContacts, setShowCreateGroup,
    setShowCreateCommunity, setShowStarred, logout, communities, groups,
    searchQuery, setSearchQuery, refreshChats, startChatWithUser, allUsers,
    callShortcuts, saveCallShortcut, deleteCallShortcut, startDirectCallByUserId, startGroupCall,
  } = useApp();

  const [showMenu, setShowMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chat: ZenChat } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [dialLabel, setDialLabel] = useState('');
  const [dialNumber, setDialNumber] = useState('');
  const [dialError, setDialError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const visibleChats = chats.filter(c => {
    if (!searchQuery) return !c.archived;
    return c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const archivedChats = chats.filter(c => c.archived);
  const pinnedChats = visibleChats.filter(c => c.pinned);
  const unpinnedChats = visibleChats.filter(c => !c.pinned);

  const handleContextMenu = (e: React.MouseEvent, chat: ZenChat) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, chat });
  };

  const handleContextAction = (action: string) => {
    if (!contextMenu) return;
    const { chat } = contextMenu;
    switch (action) {
      case 'pin': store.updateChat(chat.id, { pinned: !chat.pinned }); break;
      case 'mute': store.updateChat(chat.id, { muted: !chat.muted }); break;
      case 'archive': store.updateChat(chat.id, { archived: !chat.archived }); break;
      case 'delete': store.deleteChat(chat.id); break;
    }
    refreshChats();
    setContextMenu(null);
  };

  const groupChats = chats.filter(c => c.type === 'group');
  const communityChats = chats.filter(c => c.type === 'channel');

  const quickDialEntries = callShortcuts.map(entry => ({
    ...entry,
    user: entry.userId ? allUsers.find(user => user.id === entry.userId) : null,
  }));

  const handleSaveShortcut = () => {
    const result = saveCallShortcut(dialLabel, dialNumber);
    if (!result.ok) {
      setDialError(result.message || 'Could not save this number.');
      return;
    }
    setDialLabel('');
    setDialNumber('');
    setDialError('');
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <UserAvatar
            avatar={currentUser?.avatar}
            name={currentUser?.name}
            className="h-9 w-9 text-lg"
            fallbackClassName="bg-primary/10 text-lg"
          />
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowStarred(true)}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Starred messages">
            <Star className="w-5 h-5" />
          </button>
          <button onClick={toggleTheme}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle theme">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(p => !p)}
              className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 w-52 bg-card border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                {[
                  { icon: UserPlus, label: 'New Contact', action: () => { setShowContacts(true); setShowMenu(false); } },
                  { icon: Users, label: 'New Group', action: () => { setShowCreateGroup(true); setShowMenu(false); } },
                  { icon: Globe, label: 'New Community', action: () => { setShowCreateCommunity(true); setShowMenu(false); } },
                  { icon: Archive, label: 'Archived Chats', action: () => { setShowArchived(p => !p); setShowMenu(false); } },
                  { icon: Star, label: 'Starred Messages', action: () => { setShowStarred(true); setShowMenu(false); } },
                  { icon: Settings, label: 'Settings', action: () => { setShowSettings(true); setShowMenu(false); } },
                  { icon: LogOut, label: 'Logout', action: () => { logout(); setShowMenu(false); }, danger: true },
                ].map(({ icon: Icon, label, action, danger }) => (
                  <button key={label} onClick={action}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors ${danger ? 'text-destructive' : 'text-foreground'}`}>
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {([
          { id: 'chats', icon: MessageCircle, label: 'Chats' },
          { id: 'groups', icon: Users, label: 'Groups' },
          { id: 'communities', icon: Globe, label: 'Communities' },
          { id: 'calls', icon: Phone, label: 'Calls' },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setSidebarTab(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
              sidebarTab === id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <Icon className="w-4 h-4" />
            <span className="hidden sm:block">{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {sidebarTab === 'chats' && (
          <>
            {searchQuery && visibleChats.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">No chats found</div>
            )}
            {/* Pinned */}
            {pinnedChats.length > 0 && (
              <>
                <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pinned</div>
                {pinnedChats.map(chat => (
                  <ChatListItem key={chat.id} chat={chat} active={activeChat?.id === chat.id}
                    onSelect={() => setActiveChat(chat)} onContextMenu={e => handleContextMenu(e, chat)} />
                ))}
              </>
            )}
            {/* Regular */}
            {unpinnedChats.length > 0 && (
              <>
                {pinnedChats.length > 0 && <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">All Chats</div>}
                {unpinnedChats.map(chat => (
                  <ChatListItem key={chat.id} chat={chat} active={activeChat?.id === chat.id}
                    onSelect={() => setActiveChat(chat)} onContextMenu={e => handleContextMenu(e, chat)} />
                ))}
              </>
            )}
            {/* Archived */}
            {archivedChats.length > 0 && (
              <button onClick={() => setShowArchived(p => !p)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/60 transition-colors">
                <Archive className="w-4 h-4" />
                <span>Archived ({archivedChats.length})</span>
              </button>
            )}
            {showArchived && archivedChats.map(chat => (
              <ChatListItem key={chat.id} chat={chat} active={activeChat?.id === chat.id}
                onSelect={() => setActiveChat(chat)} onContextMenu={e => handleContextMenu(e, chat)} />
            ))}
            {/* New chat from contacts */}
            {searchQuery && (
              <div className="px-4 py-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2 font-medium">People</p>
                {allUsers.filter(u => u.id !== currentUser?.id &&
                  (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   u.username.toLowerCase().includes(searchQuery.toLowerCase()))
                ).map(u => (
                  <button key={u.id} onClick={() => { startChatWithUser(u.id); setSearchQuery(''); }}
                    className="w-full flex items-center gap-3 py-2 hover:bg-muted/60 rounded-lg px-2 transition-colors">
                    <UserAvatar
                      avatar={u.avatar}
                      name={u.name}
                      className="h-9 w-9 text-lg"
                      fallbackClassName="bg-primary/10 text-lg"
                    />
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {sidebarTab === 'groups' && (
          <>
            <div className="p-3">
              <button onClick={() => setShowCreateGroup(true)}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                <Plus className="w-4 h-4" /> New Group
              </button>
            </div>
            {groupChats.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No groups yet</div>
            ) : groupChats.map(chat => (
              <ChatListItem key={chat.id} chat={chat} active={activeChat?.id === chat.id}
                onSelect={() => setActiveChat(chat)} onContextMenu={e => handleContextMenu(e, chat)} />
            ))}
          </>
        )}

        {sidebarTab === 'communities' && (
          <>
            <div className="p-3">
              <button onClick={() => setShowCreateCommunity(true)}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                <Plus className="w-4 h-4" /> New Community
              </button>
            </div>
            {communities.map(community => (
              <div key={community.id} className="mb-2">
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-lg">{community.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{community.name}</p>
                    <p className="text-xs text-muted-foreground">{community.channels.length} channels</p>
                  </div>
                </div>
                {community.channels.map(ch => {
                  const chatId = `chat-channel-${ch.id}`;
                  const chat = chats.find(c => c.channelId === ch.id) || {
                    id: chatId, type: 'channel' as const, name: `#${ch.name}`, avatar: community.icon,
                    participants: [], lastMessage: '', lastTime: 0, unreadCount: 0,
                    pinned: false, muted: false, archived: false, wallpaper: '', disappearing: 'off' as const,
                    communityId: community.id, channelId: ch.id,
                  };
                  const isExpired = ch.isTemporary && ch.expiresAt && ch.expiresAt < Date.now();
                  if (isExpired) return null;
                  return (
                    <button key={ch.id} onClick={() => setActiveChat(chat as ZenChat)}
                      className={`w-full flex items-center gap-2 px-8 py-2 text-sm hover:bg-muted/60 transition-colors ${
                        activeChat?.channelId === ch.id ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                      }`}>
                      {ch.isBroadcast
                        ? <Megaphone className="w-3.5 h-3.5 flex-shrink-0" />
                        : <Hash className="w-3.5 h-3.5 flex-shrink-0" />}
                      <span className="font-medium flex-1 text-left truncate">{ch.name}</span>
                      <div className="flex items-center gap-1">
                        {ch.isBroadcast && <span className="text-[10px] bg-muted px-1 py-0.5 rounded text-muted-foreground">broadcast</span>}
                        {ch.isTemporary && <Clock className="w-3 h-3 text-yellow-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
            {communityChats.filter(c => !communities.some(comm => comm.channels.some(ch => ch.id === c.channelId))).map(chat => (
              <ChatListItem key={chat.id} chat={chat} active={activeChat?.id === chat.id}
                onSelect={() => setActiveChat(chat)} onContextMenu={e => handleContextMenu(e, chat)} />
            ))}
          </>
        )}

        {sidebarTab === 'calls' && (
          <div className="space-y-4 p-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center gap-2">
                <UserRoundPlus className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Quick Dial</p>
              </div>
              <div className="space-y-2">
                <input
                  value={dialLabel}
                  onChange={e => setDialLabel(e.target.value)}
                  placeholder="Contact label"
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  value={dialNumber}
                  onChange={e => setDialNumber(e.target.value)}
                  placeholder="Saved mobile number"
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {dialError && <p className="text-xs text-destructive">{dialError}</p>}
                <button
                  onClick={handleSaveShortcut}
                  className="w-full rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  Save Number
                </button>
              </div>
            </div>

            <div>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved Numbers</p>
              <div className="space-y-2">
                {quickDialEntries.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                    Save a number here. If it matches a ZenTalk user, you can call them instantly from this panel.
                  </div>
                )}
                {quickDialEntries.map(entry => (
                  <div key={entry.id} className="rounded-2xl border border-border bg-background px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        avatar={entry.user?.avatar || '📞'}
                        name={entry.user?.name || entry.label}
                        className="h-11 w-11 text-xl"
                        fallbackClassName="bg-primary/10 text-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{entry.label}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {entry.phoneNumber}
                          {entry.user ? ` · @${entry.user.username}` : ' · not linked to a ZenTalk user yet'}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteCallShortcut(entry.id)}
                        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                        title="Delete saved number"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { if (entry.userId) void startDirectCallByUserId(entry.userId, 'audio'); }}
                        disabled={!entry.userId}
                        className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                          entry.userId
                            ? 'bg-primary text-white hover:bg-primary/90'
                            : 'cursor-not-allowed bg-muted text-muted-foreground'
                        }`}
                      >
                        Voice Call
                      </button>
                      <button
                        onClick={() => { if (entry.userId) void startDirectCallByUserId(entry.userId, 'video'); }}
                        disabled={!entry.userId}
                        className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                          entry.userId
                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                            : 'cursor-not-allowed bg-muted text-muted-foreground'
                        }`}
                      >
                        Video Call
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Group Calls</p>
              <div className="space-y-2">
                {groupChats.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                    Create or join a group to start a multi-member call.
                  </div>
                )}
                {groupChats.map(chat => {
                  const group = groups.find(item => item.id === chat.groupId);
                  const memberCount = group?.members.length ?? chat.participants.length;
                  return (
                    <div key={chat.id} className="rounded-2xl border border-border bg-background px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-xl">
                          {chat.avatar}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{chat.name}</p>
                          <p className="text-xs text-muted-foreground">{memberCount} members available for a live call</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => void startGroupCall(chat.id, 'audio')}
                          className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                        >
                          <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4" /> Voice Room</span>
                        </button>
                        <button
                          onClick={() => void startGroupCall(chat.id, 'video')}
                          className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                        >
                          <span className="inline-flex items-center gap-2"><Video className="h-4 w-4" /> Video Room</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 bg-card border border-border rounded-xl shadow-xl py-1 w-48 overflow-hidden"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 250) }}>
            {[
              { icon: contextMenu.chat.pinned ? PinOff : Pin, label: contextMenu.chat.pinned ? 'Unpin' : 'Pin', action: 'pin' },
              { icon: contextMenu.chat.muted ? Volume2 : VolumeX, label: contextMenu.chat.muted ? 'Unmute' : 'Mute', action: 'mute' },
              { icon: Archive, label: contextMenu.chat.archived ? 'Unarchive' : 'Archive', action: 'archive' },
              { icon: Trash2, label: 'Delete Chat', action: 'delete', danger: true },
            ].map(({ icon: Icon, label, action, danger }) => (
              <button key={action} onClick={() => handleContextAction(action)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors ${danger ? 'text-destructive' : 'text-foreground'}`}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Click outside menu */}
      {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />}
    </div>
  );
}
