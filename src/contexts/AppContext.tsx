import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  ZenUser, ZenChat, ZenMessage, ZenGroup, ZenCommunity,
  ZenContact, ZenSettings, ZenCall, CallType
} from '@/lib/zentalk-types';
import * as store from '@/lib/zentalk-store';

interface Toast {
  id: string;
  title: string;
  message: string;
  avatar: string;
  chatId: string;
}

interface AppContextType {
  // Auth
  currentUser: ZenUser | null;
  login: (emailOrUsername: string, password: string) => boolean;
  signup: (data: Partial<ZenUser>) => boolean;
  logout: () => void;
  updateProfile: (patch: Partial<ZenUser>) => void;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Chats
  chats: ZenChat[];
  activeChat: ZenChat | null;
  setActiveChat: (chat: ZenChat | null) => void;
  refreshChats: () => void;

  // Messages
  messages: ZenMessage[];
  sendMessage: (text: string, replyTo?: string, mediaUrl?: string, type?: string) => void;
  editMessage: (msgId: string, newText: string) => void;
  deleteMessage: (msgId: string) => void;
  forwardMessage: (msgId: string, targetChatIds: string[]) => void;
  toggleStar: (msgId: string) => void;
  refreshMessages: () => void;

  // Groups
  groups: ZenGroup[];
  createGroup: (name: string, icon: string, description: string, memberIds: string[], isTemporary: boolean, expiresAt?: number) => void;
  updateGroup: (id: string, patch: Partial<ZenGroup>) => void;
  leaveGroup: (groupId: string) => void;
  kickMember: (groupId: string, userId: string) => void;
  refreshGroups: () => void;

  // Communities
  communities: ZenCommunity[];
  createCommunity: (name: string, icon: string, description: string) => void;
  addChannelToCommunity: (communityId: string, channelName: string, description: string, isBroadcast: boolean, isTemporary: boolean, expiresAt?: number) => void;
  addGroupToCommunity: (communityId: string, groupId: string) => void;
  updateMemberPermissions: (communityId: string, userId: string, permissions: Partial<import('@/lib/zentalk-types').MemberPermissions>) => void;
  updateGroupMemberPermissions: (groupId: string, userId: string, permissions: Partial<import('@/lib/zentalk-types').MemberPermissions>) => void;
  refreshCommunities: () => void;

  // Contacts
  contacts: ZenContact[];
  addContact: (name: string, username: string) => boolean;
  startChatWithUser: (userId: string) => void;
  refreshContacts: () => void;

  // Settings
  settings: ZenSettings;
  updateSettings: (patch: Partial<ZenSettings>) => void;

  // Calls
  activeCall: ZenCall | null;
  incomingCall: ZenCall | null;
  startCall: (chatId: string, type: CallType) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  callMinimized: boolean;
  setCallMinimized: (v: boolean) => void;

  // UI State
  showInfoPanel: boolean;
  setShowInfoPanel: (v: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  inChatSearch: string;
  setInChatSearch: (q: string) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  showContacts: boolean;
  setShowContacts: (v: boolean) => void;
  showCreateGroup: boolean;
  setShowCreateGroup: (v: boolean) => void;
  showCreateCommunity: boolean;
  setShowCreateCommunity: (v: boolean) => void;
  showStarred: boolean;
  setShowStarred: (v: boolean) => void;
  sidebarTab: 'chats' | 'groups' | 'communities' | 'calls';
  setSidebarTab: (t: 'chats' | 'groups' | 'communities' | 'calls') => void;
  mobileShowChat: boolean;
  setMobileShowChat: (v: boolean) => void;

  // Toasts
  toasts: Toast[];
  dismissToast: (id: string) => void;

  // Typing
  typingChats: Set<string>;
  simulateTyping: (chatId: string) => void;

  // Starred messages
  starredIds: string[];
  allUsers: ZenUser[];
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<ZenUser | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [chats, setChats] = useState<ZenChat[]>([]);
  const [activeChat, setActiveChatState] = useState<ZenChat | null>(null);
  const [messages, setMessages] = useState<ZenMessage[]>([]);
  const [groups, setGroups] = useState<ZenGroup[]>([]);
  const [communities, setCommunities] = useState<ZenCommunity[]>([]);
  const [contacts, setContacts] = useState<ZenContact[]>([]);
  const [settings, setSettingsState] = useState<ZenSettings>(store.getSettings());
  const [activeCall, setActiveCall] = useState<ZenCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<ZenCall | null>(null);
  const [callMinimized, setCallMinimized] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inChatSearch, setInChatSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'groups' | 'communities' | 'calls'>('chats');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [typingChats, setTypingChats] = useState<Set<string>>(new Set());
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<ZenUser[]>([]);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  void callDuration; // used by timer

  // Init
  useEffect(() => {
    store.initMockData();
    const session = store.getSession();
    if (session) {
      const user = store.getUserById(session.userId);
      if (user) {
        setCurrentUser(user);
        store.updateUser(user.id, { status: 'online', lastSeen: Date.now() });
      }
    }
    const s = store.getSettings();
    setSettingsState(s);
    const savedTheme = s.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : s.theme;
    setTheme(savedTheme);
    setAllUsers(store.getUsers());
    setStarredIds(store.getStarred());
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const refreshChats = useCallback(() => setChats(store.getChats()), []);
  const refreshGroups = useCallback(() => setGroups(store.getGroups()), []);
  const refreshCommunities = useCallback(() => setCommunities(store.getCommunities()), []);
  const refreshContacts = useCallback(() => setContacts(store.getContacts()), []);
  const refreshMessages = useCallback(() => {
    if (activeChat) setMessages(store.getMessages(activeChat.id));
  }, [activeChat]);

  useEffect(() => {
    if (currentUser) {
      refreshChats();
      refreshGroups();
      refreshCommunities();
      refreshContacts();
      setAllUsers(store.getUsers());
    }
  }, [currentUser, refreshChats, refreshGroups, refreshCommunities, refreshContacts]);

  useEffect(() => {
    if (activeChat) setMessages(store.getMessages(activeChat.id));
  }, [activeChat]);

  const setActiveChat = useCallback((chat: ZenChat | null) => {
    setActiveChatState(chat);
    if (chat) {
      store.updateChat(chat.id, { unreadCount: 0 });
      setChats(store.getChats());
      setMobileShowChat(true);
    }
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = store.genId();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Simulate incoming messages
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      const chatsData = store.getChats();
      const otherChats = chatsData.filter(c => c.id !== activeChat?.id && !c.muted);
      if (otherChats.length === 0 || Math.random() > 0.15) return;
      const randomChat = otherChats[Math.floor(Math.random() * otherChats.length)];
      const otherParticipants = randomChat.participants.filter(id => id !== currentUser.id);
      if (otherParticipants.length === 0) return;
      const senderId = otherParticipants[Math.floor(Math.random() * otherParticipants.length)];
      const sender = store.getUserById(senderId);
      if (!sender) return;
      const simulatedMessages = [
        'Hey, how\'s it going?', 'Did you see the latest update?', 'Can we sync up later?',
        'Just pushed the changes 🚀', 'Looks good to me!', 'Let me check and get back to you',
        'Great work on that! 👏', 'Meeting in 10 mins?', 'Check your email', 'On it! 💪',
      ];
      const text = simulatedMessages[Math.floor(Math.random() * simulatedMessages.length)];
      const msg: ZenMessage = {
        id: store.genId(), chatId: randomChat.id, senderId, text, type: 'text',
        status: 'delivered', timestamp: Date.now(), forwarded: false, edited: false,
        deletedFor: [], starred: false, reactions: {},
      };
      store.addMessage(msg);
      store.updateChat(randomChat.id, {
        lastMessage: text, lastTime: Date.now(),
        unreadCount: (randomChat.unreadCount || 0) + 1,
      });
      setChats(store.getChats());
      if (activeChat?.id === randomChat.id) setMessages(store.getMessages(randomChat.id));
      addToast({ title: sender.name, message: text, avatar: sender.avatar, chatId: randomChat.id });
    }, 18000);
    return () => clearInterval(interval);
  }, [currentUser, activeChat, addToast]);

  const simulateTyping = useCallback((chatId: string) => {
    setTypingChats(prev => new Set([...prev, chatId]));
    setTimeout(() => {
      setTypingChats(prev => { const n = new Set(prev); n.delete(chatId); return n; });
    }, 3000);
  }, []);

  // Auth
  const login = useCallback((emailOrUsername: string, password: string): boolean => {
    const users = store.getUsers();
    const user = users.find(u =>
      (u.email === emailOrUsername || u.username === emailOrUsername) && u.password === password
    );
    if (!user) return false;
    store.setSession({ userId: user.id, loginAt: Date.now() });
    store.updateUser(user.id, { status: 'online', lastSeen: Date.now() });
    setCurrentUser({ ...user, status: 'online' });
    setAllUsers(store.getUsers());
    return true;
  }, []);

  const signup = useCallback((data: Partial<ZenUser>): boolean => {
    const users = store.getUsers();
    if (users.find(u => u.email === data.email || u.username === data.username)) return false;
    const newUser: ZenUser = {
      id: store.genId(),
      name: data.name || '',
      username: data.username || '',
      email: data.email || '',
      mobile: data.mobile || '',
      password: data.password || '',
      avatar: data.avatar || '🧑',
      bio: 'Hey there! I am using ZenTalk.',
      status: 'online',
      lastSeen: Date.now(),
      createdAt: Date.now(),
    };
    store.addUser(newUser);
    store.setSession({ userId: newUser.id, loginAt: Date.now() });
    setCurrentUser(newUser);
    setAllUsers(store.getUsers());
    return true;
  }, []);

  const logout = useCallback(() => {
    if (currentUser) store.updateUser(currentUser.id, { status: 'offline', lastSeen: Date.now() });
    store.clearSession();
    setCurrentUser(null);
    setActiveChatState(null);
    setMessages([]);
    setChats([]);
  }, [currentUser]);

  const updateProfile = useCallback((patch: Partial<ZenUser>) => {
    if (!currentUser) return;
    store.updateUser(currentUser.id, patch);
    const updated = store.getUserById(currentUser.id)!;
    setCurrentUser(updated);
    setAllUsers(store.getUsers());
  }, [currentUser]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      store.updateSettings({ theme: next });
      return next;
    });
  }, []);

  // Messages
  const sendMessage = useCallback((text: string, replyTo?: string, mediaUrl?: string, type = 'text') => {
    if (!currentUser || !activeChat) return;
    const msg: ZenMessage = {
      id: store.genId(), chatId: activeChat.id, senderId: currentUser.id,
      text, type: type as ZenMessage['type'], mediaUrl, status: 'sending',
      timestamp: Date.now(), replyTo, forwarded: false, edited: false,
      deletedFor: [], starred: false, reactions: {},
    };
    store.addMessage(msg);
    store.updateChat(activeChat.id, { lastMessage: text, lastTime: Date.now() });
    setMessages(store.getMessages(activeChat.id));
    setChats(store.getChats());
    // Simulate status progression
    setTimeout(() => { store.updateMessage(activeChat.id, msg.id, { status: 'sent' }); setMessages(store.getMessages(activeChat.id)); }, 500);
    setTimeout(() => { store.updateMessage(activeChat.id, msg.id, { status: 'delivered' }); setMessages(store.getMessages(activeChat.id)); }, 1500);
    setTimeout(() => { store.updateMessage(activeChat.id, msg.id, { status: 'read' }); setMessages(store.getMessages(activeChat.id)); }, 3000);
    // Simulate reply
    if (store.getSettings().aiEnabled) {
      const otherParticipants = activeChat.participants.filter(id => id !== currentUser.id);
      if (otherParticipants.length > 0) {
        simulateTyping(activeChat.id);
        setTimeout(() => {
          const senderId = otherParticipants[Math.floor(Math.random() * otherParticipants.length)];
          const replies = ['Got it! 👍', 'Sure thing!', 'Sounds good!', 'On it!', 'Thanks for the update', 'Will do!', '👋', 'Noted!', 'Perfect!', '🔥'];
          const replyText = replies[Math.floor(Math.random() * replies.length)];
          const reply: ZenMessage = {
            id: store.genId(), chatId: activeChat.id, senderId, text: replyText, type: 'text',
            status: 'delivered', timestamp: Date.now(), forwarded: false, edited: false,
            deletedFor: [], starred: false, reactions: {},
          };
          store.addMessage(reply);
          store.updateChat(activeChat.id, { lastMessage: replyText, lastTime: Date.now() });
          setMessages(store.getMessages(activeChat.id));
          setChats(store.getChats());
        }, 3500 + Math.random() * 2000);
      }
    }
  }, [currentUser, activeChat, simulateTyping]);

  const editMessage = useCallback((msgId: string, newText: string) => {
    if (!activeChat) return;
    store.updateMessage(activeChat.id, msgId, { text: newText, edited: true, editedAt: Date.now() });
    setMessages(store.getMessages(activeChat.id));
  }, [activeChat]);

  const deleteMessage = useCallback((msgId: string) => {
    if (!activeChat || !currentUser) return;
    store.deleteMessage(activeChat.id, msgId, currentUser.id);
    setMessages(store.getMessages(activeChat.id));
  }, [activeChat, currentUser]);

  const forwardMessage = useCallback((msgId: string, targetChatIds: string[]) => {
    if (!currentUser) return;
    const sourceMsg = messages.find(m => m.id === msgId);
    if (!sourceMsg) return;
    targetChatIds.forEach(chatId => {
      const msg: ZenMessage = {
        ...sourceMsg, id: store.genId(), chatId, senderId: currentUser.id,
        forwarded: true, timestamp: Date.now(), status: 'sent',
        replyTo: undefined, reactions: {}, deletedFor: [],
      };
      store.addMessage(msg);
      store.updateChat(chatId, { lastMessage: sourceMsg.text, lastTime: Date.now() });
    });
    setChats(store.getChats());
    if (targetChatIds.includes(activeChat?.id || '')) setMessages(store.getMessages(activeChat!.id));
  }, [currentUser, messages, activeChat]);

  const toggleStar = useCallback((msgId: string) => {
    store.toggleStarred(msgId);
    setStarredIds(store.getStarred());
  }, []);

  // Groups
  const createGroup = useCallback((name: string, icon: string, description: string, memberIds: string[], isTemporary: boolean, expiresAt?: number) => {
    if (!currentUser) return;
    const groupId = store.genId();
    const chatId = `chat-group-${groupId}`;
    const allMemberIds = [currentUser.id, ...memberIds.filter(id => id !== currentUser.id)];
    const group: ZenGroup = {
      id: groupId, name, icon, description,
      members: allMemberIds.map((userId, i) => ({
        userId, role: i === 0 ? 'admin' : 'member',
        permissions: { messaging: true, memberManagement: i === 0, channelCreation: i === 0 },
        joinedAt: Date.now(),
      })),
      createdBy: currentUser.id, createdAt: Date.now(), isTemporary, expiresAt,
    };
    store.addGroup(group);
    const chat: ZenChat = {
      id: chatId, type: 'group', name, avatar: icon, participants: allMemberIds,
      lastMessage: 'Group created', lastTime: Date.now(), unreadCount: 0,
      pinned: false, muted: false, archived: false, wallpaper: '', disappearing: 'off', groupId,
    };
    store.addChat(chat);
    refreshGroups();
    refreshChats();
    setActiveChat(chat);
  }, [currentUser, refreshGroups, refreshChats, setActiveChat]);

  const updateGroup = useCallback((id: string, patch: Partial<ZenGroup>) => {
    store.updateGroup(id, patch);
    refreshGroups();
  }, [refreshGroups]);

  const leaveGroup = useCallback((groupId: string) => {
    if (!currentUser) return;
    const group = store.getGroupById(groupId);
    if (!group) return;
    const newMembers = group.members.filter(m => m.userId !== currentUser.id);
    if (newMembers.length > 0 && group.members.find(m => m.userId === currentUser.id)?.role === 'admin') {
      newMembers[0].role = 'admin';
    }
    store.updateGroup(groupId, { members: newMembers });
    const chatId = `chat-group-${groupId}`;
    if (newMembers.length === 0) store.deleteChat(chatId);
    refreshGroups();
    refreshChats();
    if (activeChat?.groupId === groupId) setActiveChatState(null);
  }, [currentUser, refreshGroups, refreshChats, activeChat]);

  const kickMember = useCallback((groupId: string, userId: string) => {
    const group = store.getGroupById(groupId);
    if (!group) return;
    store.updateGroup(groupId, { members: group.members.filter(m => m.userId !== userId) });
    refreshGroups();
  }, [refreshGroups]);

  // Communities
  const createCommunity = useCallback((name: string, icon: string, description: string) => {
    if (!currentUser) return;
    const communityId = store.genId();
    const channelId = store.genId();
    const community: ZenCommunity = {
      id: communityId, name, icon, description,
      channels: [{ id: channelId, name: 'general', description: 'General discussion', isBroadcast: false, createdAt: Date.now() }],
      members: [{ userId: currentUser.id, role: 'admin', permissions: { messaging: true, memberManagement: true, channelCreation: true } }],
      createdBy: currentUser.id, createdAt: Date.now(),
    };
    store.addCommunity(community);
    const chat: ZenChat = {
      id: `chat-channel-${channelId}`, type: 'channel', name: '#general', avatar: icon,
      participants: [currentUser.id], lastMessage: 'Channel created', lastTime: Date.now(),
      unreadCount: 0, pinned: false, muted: false, archived: false, wallpaper: '', disappearing: 'off',
      communityId, channelId,
    };
    store.addChat(chat);
    refreshCommunities();
    refreshChats();
  }, [currentUser, refreshCommunities, refreshChats]);

  const addChannelToCommunity = useCallback((communityId: string, channelName: string, description: string, isBroadcast: boolean, isTemporary: boolean, expiresAt?: number) => {
    if (!currentUser) return;
    const community = store.getCommunityById(communityId);
    if (!community) return;
    const channelId = store.genId();
    const newChannel = { id: channelId, name: channelName.toLowerCase().replace(/\s+/g, '-'), description, isBroadcast, isTemporary, expiresAt, createdAt: Date.now() };
    store.updateCommunity(communityId, { channels: [...community.channels, newChannel] });
    const chat: ZenChat = {
      id: `chat-channel-${channelId}`, type: 'channel', name: `#${newChannel.name}`, avatar: community.icon,
      participants: community.members.map(m => m.userId), lastMessage: 'Channel created', lastTime: Date.now(),
      unreadCount: 0, pinned: false, muted: false, archived: false, wallpaper: '', disappearing: 'off',
      communityId, channelId,
    };
    store.addChat(chat);
    refreshCommunities();
    refreshChats();
  }, [currentUser, refreshCommunities, refreshChats]);

  const addGroupToCommunity = useCallback((communityId: string, groupId: string) => {
    // Links a group to a community by adding a group-type channel reference
    refreshCommunities();
  }, [refreshCommunities]);

  const updateMemberPermissions = useCallback((communityId: string, userId: string, permissions: Partial<import('@/lib/zentalk-types').MemberPermissions>) => {
    const community = store.getCommunityById(communityId);
    if (!community) return;
    store.updateCommunity(communityId, {
      members: community.members.map(m =>
        m.userId === userId ? { ...m, permissions: { ...m.permissions, ...permissions } } : m
      ),
    });
    refreshCommunities();
  }, [refreshCommunities]);

  const updateGroupMemberPermissions = useCallback((groupId: string, userId: string, permissions: Partial<import('@/lib/zentalk-types').MemberPermissions>) => {
    const group = store.getGroupById(groupId);
    if (!group) return;
    store.updateGroup(groupId, {
      members: group.members.map(m =>
        m.userId === userId ? { ...m, permissions: { ...m.permissions, ...permissions } } : m
      ),
    });
    refreshGroups();
  }, [refreshGroups]);

  // Contacts
  const addContact = useCallback((name: string, username: string): boolean => {
    const user = store.getUsers().find(u => u.username === username);
    if (!user) return false;
    const existing = store.getContacts().find(c => c.userId === user.id);
    if (existing) return false;
    store.addContact({ id: store.genId(), name, username, userId: user.id, addedAt: Date.now() });
    refreshContacts();
    return true;
  }, [refreshContacts]);

  const startChatWithUser = useCallback((userId: string) => {
    if (!currentUser) return;
    const existing = store.getChats().find(c =>
      c.type === 'dm' && c.participants.includes(userId) && c.participants.includes(currentUser.id)
    );
    if (existing) { setActiveChat(existing); return; }
    const user = store.getUserById(userId);
    if (!user) return;
    const chat: ZenChat = {
      id: `chat-dm-${store.genId()}`, type: 'dm', name: user.name, avatar: user.avatar,
      participants: [currentUser.id, userId], lastMessage: '', lastTime: Date.now(),
      unreadCount: 0, pinned: false, muted: false, archived: false, wallpaper: '', disappearing: 'off',
    };
    store.addChat(chat);
    refreshChats();
    setActiveChat(chat);
  }, [currentUser, refreshChats, setActiveChat]);

  const updateSettings = useCallback((patch: Partial<ZenSettings>) => {
    store.updateSettings(patch);
    const s = store.getSettings();
    setSettingsState(s);
    if (patch.theme) {
      const t = patch.theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : patch.theme;
      setTheme(t as 'light' | 'dark');
    }
  }, []);

  // Calls
  const startCall = useCallback((chatId: string, type: CallType) => {
    if (!currentUser) return;
    const chat = store.getChatById(chatId);
    if (!chat) return;
    const receiverId = chat.participants.find(id => id !== currentUser.id) || '';
    const call: ZenCall = {
      id: store.genId(), chatId, callerId: currentUser.id, receiverId,
      type, status: 'active', startedAt: Date.now(),
    };
    setActiveCall(call);
    setCallDuration(0);
    callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    // Simulate incoming call from others
    setTimeout(() => {
      if (Math.random() > 0.5) {
        const otherUser = store.getUserById(receiverId);
        if (otherUser) {
          const incoming: ZenCall = {
            id: store.genId(), chatId, callerId: receiverId, receiverId: currentUser.id,
            type, status: 'incoming',
          };
          setIncomingCall(incoming);
        }
      }
    }, 2000);
  }, [currentUser]);

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    setActiveCall({ ...incomingCall, status: 'active', startedAt: Date.now() });
    setIncomingCall(null);
    setCallDuration(0);
    callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  }, [incomingCall]);

  const rejectCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  const endCall = useCallback(() => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setActiveCall(null);
    setIncomingCall(null);
    setCallMinimized(false);
    setCallDuration(0);
  }, []);

  const value: AppContextType = {
    currentUser, login, signup, logout, updateProfile,
    theme, toggleTheme,
    chats, activeChat, setActiveChat, refreshChats,
    messages, sendMessage, editMessage, deleteMessage, forwardMessage, toggleStar, refreshMessages,
    groups, createGroup, updateGroup, leaveGroup, kickMember, refreshGroups,
    communities, createCommunity, addChannelToCommunity, addGroupToCommunity,
    updateMemberPermissions, updateGroupMemberPermissions, refreshCommunities,
    contacts, addContact, startChatWithUser, refreshContacts,
    settings, updateSettings,
    activeCall, incomingCall, startCall, acceptCall, rejectCall, endCall, callMinimized, setCallMinimized,
    showInfoPanel, setShowInfoPanel,
    searchQuery, setSearchQuery,
    inChatSearch, setInChatSearch,
    showSettings, setShowSettings,
    showContacts, setShowContacts,
    showCreateGroup, setShowCreateGroup,
    showCreateCommunity, setShowCreateCommunity,
    showStarred, setShowStarred,
    sidebarTab, setSidebarTab,
    mobileShowChat, setMobileShowChat,
    toasts, dismissToast,
    typingChats, simulateTyping,
    starredIds, allUsers,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
