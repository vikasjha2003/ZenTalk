import type {
  ZenUser, ZenChat, ZenMessage, ZenGroup, ZenCommunity,
  ZenContact, ZenSettings, ZenSession, ZenCallShortcut, MemberPermissions, RoleLabels, UserRole
} from './zentalk-types';

const KEYS = {
  USERS: 'zentalk_users',
  SESSION: 'zentalk_session',
  CHATS: 'zentalk_chats',
  MESSAGES: 'zentalk_messages',
  GROUPS: 'zentalk_groups',
  COMMUNITIES: 'zentalk_communities',
  CONTACTS: 'zentalk_contacts',
  CALL_SHORTCUTS: 'zentalk_call_shortcuts',
  SETTINGS: 'zentalk_settings',
  STARRED: 'zentalk_starred',
};

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Users
export const getUsers = (): ZenUser[] => get(KEYS.USERS, []);
export const setUsers = (u: ZenUser[]) => set(KEYS.USERS, u);
export const getUserById = (id: string) => getUsers().find(u => u.id === id);
export const addUser = (u: ZenUser) => setUsers([...getUsers(), u]);
export const updateUser = (id: string, patch: Partial<ZenUser>) => {
  setUsers(getUsers().map(u => u.id === id ? { ...u, ...patch } : u));
};

// Session
export const getSession = (): ZenSession | null => get(KEYS.SESSION, null);
export const setSession = (s: ZenSession | null) => set(KEYS.SESSION, s);
export const clearSession = () => localStorage.removeItem(KEYS.SESSION);

// Chats
export const getChats = (): ZenChat[] => get(KEYS.CHATS, []);
export const setChats = (c: ZenChat[]) => set(KEYS.CHATS, c);
export const getChatById = (id: string) => getChats().find(c => c.id === id);
export const addChat = (c: ZenChat) => setChats([...getChats(), c]);
export const updateChat = (id: string, patch: Partial<ZenChat>) => {
  setChats(getChats().map(c => c.id === id ? { ...c, ...patch } : c));
};
export const deleteChat = (id: string) => setChats(getChats().filter(c => c.id !== id));

// Messages
export const getAllMessages = (): Record<string, ZenMessage[]> => get(KEYS.MESSAGES, {});
export const getMessages = (chatId: string): ZenMessage[] => {
  const all = getAllMessages();
  return all[chatId] || [];
};
export const setMessages = (chatId: string, msgs: ZenMessage[]) => {
  const all = getAllMessages();
  set(KEYS.MESSAGES, { ...all, [chatId]: msgs });
};
export const addMessage = (msg: ZenMessage) => {
  const msgs = getMessages(msg.chatId);
  setMessages(msg.chatId, [...msgs, msg]);
};
export const updateMessage = (chatId: string, msgId: string, patch: Partial<ZenMessage>) => {
  setMessages(chatId, getMessages(chatId).map(m => m.id === msgId ? { ...m, ...patch } : m));
};
export const deleteMessage = (chatId: string, msgId: string, userId: string) => {
  setMessages(chatId, getMessages(chatId).map(m =>
    m.id === msgId ? { ...m, deletedFor: [...m.deletedFor, userId] } : m
  ));
};
export const deleteMessagesForChat = (chatId: string) => {
  const all = getAllMessages();
  const next = { ...all };
  delete next[chatId];
  set(KEYS.MESSAGES, next);
};

function normalizePermissions(role: UserRole, permissions?: Partial<MemberPermissions> | null): MemberPermissions {
  return {
    ...buildPermissions(role),
    ...(permissions ?? {}),
  };
}

function normalizeGroupMembers(members: ZenGroup['members'] = []): ZenGroup['members'] {
  return members.map(member => {
    const role = member.role ?? 'member';
    return {
      ...member,
      role,
      permissions: normalizePermissions(role, member.permissions),
      joinedAt: member.joinedAt ?? Date.now(),
    };
  });
}

function normalizeCommunityMembers(members: ZenCommunity['members'] = []): ZenCommunity['members'] {
  return members.map(member => {
    const role = member.role ?? 'member';
    return {
      ...member,
      role,
      permissions: normalizePermissions(role, member.permissions),
    };
  });
}

// Groups
export const getGroups = (): ZenGroup[] => get(KEYS.GROUPS, []).map((group: ZenGroup) => ({
  ...group,
  members: normalizeGroupMembers(group.members),
}));
export const setGroups = (g: ZenGroup[]) => set(KEYS.GROUPS, g);
export const getGroupById = (id: string) => getGroups().find(g => g.id === id);
export const addGroup = (g: ZenGroup) => setGroups([...getGroups(), g]);
export const updateGroup = (id: string, patch: Partial<ZenGroup>) => {
  setGroups(getGroups().map(g => g.id === id ? { ...g, ...patch } : g));
};

// Communities
export const getCommunities = (): ZenCommunity[] => get(KEYS.COMMUNITIES, []).map((community: ZenCommunity) => ({
  ...community,
  channels: community.channels ?? [],
  linkedGroupIds: community.linkedGroupIds ?? [],
  members: normalizeCommunityMembers(community.members),
  roleLabels: {
    ...DEFAULT_ROLE_LABELS,
    ...(community.roleLabels ?? {}),
  },
  adminsOnlyMessages: community.adminsOnlyMessages ?? false,
}));
export const setCommunities = (c: ZenCommunity[]) => set(KEYS.COMMUNITIES, c);
export const getCommunityById = (id: string) => getCommunities().find(c => c.id === id);
export const addCommunity = (c: ZenCommunity) => setCommunities([...getCommunities(), c]);
export const updateCommunity = (id: string, patch: Partial<ZenCommunity>) => {
  setCommunities(getCommunities().map(c => c.id === id ? { ...c, ...patch } : c));
};
export const deleteCommunity = (id: string) => setCommunities(getCommunities().filter(c => c.id !== id));

// Contacts
export const getContacts = (): ZenContact[] => get(KEYS.CONTACTS, []);
export const setContacts = (c: ZenContact[]) => set(KEYS.CONTACTS, c);
export const addContact = (c: ZenContact) => setContacts([...getContacts(), c]);

// Call shortcuts
export const getCallShortcuts = (): ZenCallShortcut[] => get(KEYS.CALL_SHORTCUTS, []);
export const setCallShortcuts = (entries: ZenCallShortcut[]) => set(KEYS.CALL_SHORTCUTS, entries);
export const addCallShortcut = (entry: ZenCallShortcut) => setCallShortcuts([...getCallShortcuts(), entry]);
export const deleteCallShortcut = (id: string) => setCallShortcuts(getCallShortcuts().filter(entry => entry.id !== id));

// Settings
export const getSettings = (): ZenSettings => get(KEYS.SETTINGS, {
  theme: 'system',
  notifications: true,
  systemNotifications: false,
  aiEnabled: true,
  language: 'en',
  lastSeenPrivacy: 'everyone',
  profilePhotoPrivacy: 'everyone',
  readReceipts: true,
});
export const setSettings = (s: ZenSettings) => set(KEYS.SETTINGS, s);
export const updateSettings = (patch: Partial<ZenSettings>) => setSettings({ ...getSettings(), ...patch });

// Starred messages
export const getStarred = (): string[] => get(KEYS.STARRED, []);
export const toggleStarred = (msgId: string) => {
  const starred = getStarred();
  const next = starred.includes(msgId) ? starred.filter(id => id !== msgId) : [...starred, msgId];
  set(KEYS.STARRED, next);
};

// Utilities
export const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const DEFAULT_ROLE_LABELS: RoleLabels = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Moderator',
  member: 'Member',
};

function buildPermissions(role: UserRole): MemberPermissions {
  if (role === 'owner') {
    return {
      sendMessages: true,
      deleteMessages: true,
      addGroup: true,
      removeGroup: true,
      addMember: true,
      removeMember: true,
      addChannel: true,
      removeChannel: true,
      assignPositions: true,
      adminsOnlyMessagesToggle: true,
      viewMessages: true,
    };
  }

  if (role === 'admin') {
    return {
      sendMessages: true,
      deleteMessages: true,
      addGroup: true,
      removeGroup: true,
      addMember: true,
      removeMember: true,
      addChannel: true,
      removeChannel: true,
      assignPositions: true,
      adminsOnlyMessagesToggle: true,
      viewMessages: true,
    };
  }

  if (role === 'moderator') {
    return {
      sendMessages: true,
      deleteMessages: true,
      addGroup: false,
      removeGroup: false,
      addMember: true,
      removeMember: false,
      addChannel: false,
      removeChannel: false,
      assignPositions: false,
      adminsOnlyMessagesToggle: false,
      viewMessages: true,
    };
  }

  return {
    sendMessages: true,
    deleteMessages: false,
    addGroup: false,
    removeGroup: false,
    addMember: false,
    removeMember: false,
    addChannel: false,
    removeChannel: false,
    assignPositions: false,
    adminsOnlyMessagesToggle: false,
    viewMessages: true,
  };
}

export const initMockData = () => {
  if (getUsers().length > 0) return; // already initialized

  const now = Date.now();
  const users: ZenUser[] = [
    { id: 'user-demo', name: 'You', username: 'demo', email: 'demo@zentalk.app', mobile: '+1-555-0000', password: 'demo123', avatar: '🧑', bio: 'Hey there! I am using ZenTalk.', blockedUserIds: [], status: 'online', lastSeen: now, createdAt: now },
    { id: 'user-alice', name: 'Alice Chen', username: 'alice', email: 'alice@zentalk.app', mobile: '+1-555-0001', password: 'alice123', avatar: '👩', bio: 'Product Designer at ZenTalk', blockedUserIds: [], status: 'online', lastSeen: now - 60000, createdAt: now - 86400000 },
    { id: 'user-bob', name: 'Bob Martinez', username: 'bob', email: 'bob@zentalk.app', mobile: '+1-555-0002', password: 'bob123', avatar: '👨', bio: 'Full-stack developer 🚀', blockedUserIds: [], status: 'offline', lastSeen: now - 3600000, createdAt: now - 172800000 },
    { id: 'user-carlos', name: 'Carlos Rivera', username: 'carlos', email: 'carlos@zentalk.app', mobile: '+1-555-0003', password: 'carlos123', avatar: '🧔', bio: 'Coffee ☕ & Code', blockedUserIds: [], status: 'away', lastSeen: now - 1800000, createdAt: now - 259200000 },
    { id: 'user-diana', name: 'Diana Park', username: 'diana', email: 'diana@zentalk.app', mobile: '+1-555-0004', password: 'diana123', avatar: '👩‍💼', bio: 'Marketing lead | ZenTalk HQ', blockedUserIds: [], status: 'online', lastSeen: now - 300000, createdAt: now - 345600000 },
  ];
  setUsers(users);

  const chats: ZenChat[] = [
    { id: 'chat-alice', type: 'dm', name: 'Alice Chen', avatar: '👩', participants: ['user-demo', 'user-alice'], lastMessage: 'Sounds great! See you then 👋', lastTime: now - 300000, unreadCount: 2, pinned: true, muted: false, archived: false, wallpaper: '', disappearing: 'off' },
    { id: 'chat-bob', type: 'dm', name: 'Bob Martinez', avatar: '👨', participants: ['user-demo', 'user-bob'], lastMessage: 'The PR is ready for review', lastTime: now - 3600000, unreadCount: 0, pinned: false, muted: false, archived: false, wallpaper: '', disappearing: 'off' },
    { id: 'chat-carlos', type: 'dm', name: 'Carlos Rivera', avatar: '🧔', participants: ['user-demo', 'user-carlos'], lastMessage: 'Check out this new framework!', lastTime: now - 7200000, unreadCount: 1, pinned: false, muted: true, archived: false, wallpaper: '', disappearing: 'off' },
    { id: 'chat-group-team', type: 'group', name: 'Team ZenTalk', avatar: '👥', participants: ['user-demo', 'user-alice', 'user-bob', 'user-carlos', 'user-diana'], lastMessage: 'Diana: Sprint review is at 3pm!', lastTime: now - 1800000, unreadCount: 5, pinned: true, muted: false, archived: false, wallpaper: '', disappearing: 'off', groupId: 'group-team' },
    { id: 'chat-community-general', type: 'channel', name: '#general', avatar: '🌐', participants: ['user-demo', 'user-alice', 'user-bob', 'user-carlos', 'user-diana'], lastMessage: 'Welcome to ZenTalk HQ!', lastTime: now - 86400000, unreadCount: 0, pinned: false, muted: false, archived: false, wallpaper: '', disappearing: 'off', communityId: 'community-hq', channelId: 'channel-general' },
  ];
  setChats(chats);

  const aliceMsgs: ZenMessage[] = [
    { id: 'am1', chatId: 'chat-alice', senderId: 'user-alice', text: 'Hey! Are you free for a quick call later?', type: 'text', status: 'read', timestamp: now - 7200000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
    { id: 'am2', chatId: 'chat-alice', senderId: 'user-demo', text: 'Sure! What time works for you?', type: 'text', status: 'read', timestamp: now - 7100000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
    { id: 'am3', chatId: 'chat-alice', senderId: 'user-alice', text: 'How about 3pm? We can discuss the new design system 🎨', type: 'text', status: 'read', timestamp: now - 7000000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: { '❤️': ['user-demo'] } },
    { id: 'am4', chatId: 'chat-alice', senderId: 'user-demo', text: 'Perfect! I\'ll send the meeting link.', type: 'text', status: 'read', timestamp: now - 6900000, forwarded: false, edited: true, editedAt: now - 6800000, deletedFor: [], starred: true, reactions: {} },
    { id: 'am5', chatId: 'chat-alice', senderId: 'user-alice', text: 'Also, did you see the new Figma updates? They\'re amazing!', type: 'text', status: 'read', timestamp: now - 600000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
    { id: 'am6', chatId: 'chat-alice', senderId: 'user-demo', text: 'Yes! The dev mode improvements are 🔥', type: 'text', status: 'read', timestamp: now - 500000, replyTo: 'am5', forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
    { id: 'am7', chatId: 'chat-alice', senderId: 'user-alice', text: 'Sounds great! See you then 👋', type: 'text', status: 'delivered', timestamp: now - 300000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
  ];
  setMessages('chat-alice', aliceMsgs);

  const bobMsgs: ZenMessage[] = [
    { id: 'bm1', chatId: 'chat-bob', senderId: 'user-bob', text: 'Hey, I pushed the new auth module', type: 'text', status: 'read', timestamp: now - 86400000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
    { id: 'bm2', chatId: 'chat-bob', senderId: 'user-demo', text: 'Nice! Any breaking changes?', type: 'text', status: 'read', timestamp: now - 86300000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
    { id: 'bm3', chatId: 'chat-bob', senderId: 'user-bob', text: 'Nope, fully backward compatible. I also added unit tests 🧪', type: 'text', status: 'read', timestamp: now - 86200000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: { '👍': ['user-demo'] } },
    { id: 'bm4', chatId: 'chat-bob', senderId: 'user-demo', text: 'Great work! I\'ll review it this afternoon', type: 'text', status: 'read', timestamp: now - 86100000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
    { id: 'bm5', chatId: 'chat-bob', senderId: 'user-bob', text: 'The PR is ready for review', type: 'text', status: 'read', timestamp: now - 3600000, forwarded: true, edited: false, deletedFor: [], starred: false, reactions: {} },
  ];
  setMessages('chat-bob', bobMsgs);

  const carlosMsgs: ZenMessage[] = [
    { id: 'cm1', chatId: 'chat-carlos', senderId: 'user-carlos', text: 'Bro, have you tried Bun.js? It\'s insanely fast!', type: 'text', status: 'read', timestamp: now - 14400000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
    { id: 'cm2', chatId: 'chat-carlos', senderId: 'user-demo', text: 'Yeah, I\'ve been experimenting with it. The startup time is incredible', type: 'text', status: 'read', timestamp: now - 14300000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
    { id: 'cm3', chatId: 'chat-carlos', senderId: 'user-carlos', text: 'Check out this new framework!', type: 'text', status: 'delivered', timestamp: now - 7200000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
  ];
  setMessages('chat-carlos', carlosMsgs);

  const groupMsgs: ZenMessage[] = [
    { id: 'gm1', chatId: 'chat-group-team', senderId: 'user-alice', text: 'Good morning team! 🌅 Ready for the sprint?', type: 'text', status: 'read', timestamp: now - 86400000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: { '🔥': ['user-demo', 'user-bob'], '👋': ['user-carlos'] } },
    { id: 'gm2', chatId: 'chat-group-team', senderId: 'user-bob', text: 'Let\'s go! I finished the backend APIs last night', type: 'text', status: 'read', timestamp: now - 86300000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
    { id: 'gm3', chatId: 'chat-group-team', senderId: 'user-demo', text: 'Frontend is almost done too. Just polishing the UI', type: 'text', status: 'read', timestamp: now - 86200000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
    { id: 'gm4', chatId: 'chat-group-team', senderId: 'user-carlos', text: 'I\'ll handle the deployment pipeline today', type: 'text', status: 'read', timestamp: now - 86100000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
    { id: 'gm5', chatId: 'chat-group-team', senderId: 'user-diana', text: 'Marketing materials are ready! Check the shared drive 📁', type: 'text', status: 'read', timestamp: now - 7200000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: { '❤️': ['user-alice', 'user-demo'] } },
    { id: 'gm6', chatId: 'chat-group-team', senderId: 'user-alice', text: 'Looks amazing Diana! The brand colors are perfect', type: 'text', status: 'read', timestamp: now - 7100000, replyTo: 'gm5', forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
    { id: 'gm7', chatId: 'chat-group-team', senderId: 'user-diana', text: 'Sprint review is at 3pm!', type: 'text', status: 'delivered', timestamp: now - 1800000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
  ];
  setMessages('chat-group-team', groupMsgs);

  const communityMsgs: ZenMessage[] = [
    { id: 'comm1', chatId: 'chat-community-general', senderId: 'user-alice', text: 'Welcome to ZenTalk HQ! 🎉 This is our official community space.', type: 'text', status: 'read', timestamp: now - 86400000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: { '🎉': ['user-demo', 'user-bob', 'user-carlos', 'user-diana'] } },
    { id: 'comm2', chatId: 'chat-community-general', senderId: 'user-alice', text: 'Feel free to share updates, ideas, and announcements here.', type: 'text', status: 'read', timestamp: now - 86300000, forwarded: false, edited: false, deletedFor: [], starred: false, reactions: {} },
  ];
  setMessages('chat-community-general', communityMsgs);

  const group: ZenGroup = {
    id: 'group-team',
    name: 'Team ZenTalk',
    icon: '👥',
    description: 'The core ZenTalk development team',
    members: [
      { userId: 'user-demo', role: 'owner', permissions: buildPermissions('owner'), joinedAt: now - 86400000 },
      { userId: 'user-alice', role: 'moderator', permissions: buildPermissions('moderator'), joinedAt: now - 86400000 },
      { userId: 'user-bob', role: 'member', permissions: buildPermissions('member'), joinedAt: now - 86400000 },
      { userId: 'user-carlos', role: 'member', permissions: buildPermissions('member'), joinedAt: now - 86400000 },
      { userId: 'user-diana', role: 'admin', permissions: buildPermissions('admin'), joinedAt: now - 86400000 },
    ],
    createdBy: 'user-demo',
    createdAt: now - 86400000,
    isTemporary: false,
  };
  setGroups([group]);

  const community: ZenCommunity = {
    id: 'community-hq',
    name: 'ZenTalk HQ',
    icon: '🌐',
    description: 'Official ZenTalk community space',
    channels: [
      { id: 'channel-general', name: 'general', description: 'General discussion', isBroadcast: false, createdAt: now - 86400000 },
      { id: 'channel-announcements', name: 'announcements', description: 'Official announcements', isBroadcast: true, createdAt: now - 86400000 },
    ],
    linkedGroupIds: ['group-team'],
    members: [
      { userId: 'user-demo', role: 'owner', permissions: buildPermissions('owner') },
      { userId: 'user-alice', role: 'admin', permissions: buildPermissions('admin') },
      { userId: 'user-bob', role: 'member', permissions: buildPermissions('member') },
      { userId: 'user-carlos', role: 'member', permissions: buildPermissions('member') },
      { userId: 'user-diana', role: 'moderator', permissions: buildPermissions('moderator') },
    ],
    roleLabels: DEFAULT_ROLE_LABELS,
    adminsOnlyMessages: false,
    createdBy: 'user-alice',
    createdAt: now - 86400000,
  };
  setCommunities([community]);

  const contacts: ZenContact[] = [
    { id: 'contact-alice', name: 'Alice Chen', username: 'alice', userId: 'user-alice', addedAt: now - 86400000 },
    { id: 'contact-bob', name: 'Bob Martinez', username: 'bob', userId: 'user-bob', addedAt: now - 86400000 },
    { id: 'contact-carlos', name: 'Carlos Rivera', username: 'carlos', userId: 'user-carlos', addedAt: now - 86400000 },
    { id: 'contact-diana', name: 'Diana Park', username: 'diana', userId: 'user-diana', addedAt: now - 86400000 },
  ];
  setContacts(contacts);
};
