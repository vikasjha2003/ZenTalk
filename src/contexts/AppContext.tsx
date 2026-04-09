import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ZenUser, ZenChat, ZenMessage, ZenGroup, ZenCommunity,
  ZenContact, ZenSettings, ZenCall, CallType, ZenCallControls, ZenRemoteParticipant, ZenCallShortcut,
  MemberPermissions, RoleLabels, UserRole
} from '@/lib/zentalk-types';
import * as store from '@/lib/zentalk-store';
import {
  fetchBootstrap,
  loginWithApi,
  logoutFromApi,
  sendDirectMessageOnApi,
  signupWithApi,
  updateProfileOnApi,
  verifySignupOtpWithApi,
} from '@/lib/api-client';
import { createPeerConnection, getLocalStream, setAudioEnabled, setVideoEnabled, stopStream } from '@/lib/webrtc';

interface Toast {
  id: string;
  title: string;
  message: string;
  avatar: string;
  chatId: string;
  kind?: 'message' | 'call' | 'system';
  accent?: string;
}

interface IncomingCallPayload {
  callId: string;
  chatId: string;
  fromUserId: string;
  targetUserIds: string[];
  participantIds: string[];
  type: CallType;
  chatName?: string;
  chatAvatar?: string;
}

interface JoinCallPayload {
  callId: string;
  chatId: string;
  fromUserId: string;
}

interface WebRtcOfferPayload {
  callId: string;
  fromUserId: string;
  toUserId: string;
  offer: RTCSessionDescriptionInit;
}

interface WebRtcAnswerPayload {
  callId: string;
  fromUserId: string;
  toUserId: string;
  answer: RTCSessionDescriptionInit;
}

interface IceCandidatePayload {
  callId: string;
  fromUserId: string;
  toUserId: string;
  candidate: RTCIceCandidateInit;
}

interface CallControlPayload {
  callId: string;
  fromUserId: string;
  controls: Partial<Pick<ZenCallControls, 'muted' | 'videoEnabled' | 'hold'>>;
}

interface ParticipantJoinedPayload {
  callId: string;
  userId: string;
}

interface ParticipantLeftPayload {
  callId: string;
  userId: string;
}

function resolveSignalingServerUrl() {
  const configured = import.meta.env.VITE_SIGNALING_SERVER_URL;
  if (typeof window === 'undefined') return configured ?? 'http://localhost:3001';

  const fallback = `${window.location.protocol}//${window.location.hostname}:3001`;
  if (!configured) return fallback;

  try {
    const url = new URL(configured);
    if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      url.hostname = window.location.hostname;
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    return fallback;
  }

  return configured;
}

const SIGNALING_SERVER_URL = resolveSignalingServerUrl();
const APP_NOTIFICATION_ICON = '/favicon.ico';

const createDefaultCallControls = (type: CallType = 'audio'): ZenCallControls => ({
  muted: false,
  videoEnabled: type === 'video',
  speakerEnabled: true,
  hold: false,
  canSwitchSpeaker: typeof window !== 'undefined'
    && 'HTMLMediaElement' in window
    && 'setSinkId' in window.HTMLMediaElement.prototype,
  connectionState: 'idle',
});

const DEFAULT_COMMUNITY_ROLE_LABELS: RoleLabels = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Moderator',
  member: 'Member',
};

const buildPermissions = (role: UserRole): MemberPermissions => {
  if (role === 'owner' || role === 'admin') {
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
};

const syncCommunityChannelParticipants = (communityId: string, participantIds: string[]) => {
  store.setChats(store.getChats().map(chat =>
    chat.communityId === communityId && chat.type === 'channel'
      ? { ...chat, participants: participantIds }
      : chat
  ));
};

interface AppContextType {
  // Auth
  currentUser: ZenUser | null;
  login: (emailOrUsername: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signup: (data: Partial<ZenUser>) => Promise<{ ok: boolean; message?: string; requestId?: string }>;
  verifySignupOtp: (requestId: string, otp: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  updateProfile: (patch: Partial<ZenUser>) => void;
  toggleBlockedUser: (userId: string) => void;
  isUserBlocked: (userId: string) => boolean;

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
  deleteMessageForEveryone: (msgId: string) => void;
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
  createCommunity: (name: string, icon: string, description: string, options?: { roleLabels?: Partial<RoleLabels>; adminsOnlyMessages?: boolean; memberIds?: string[] }) => void;
  deleteCommunity: (communityId: string) => void;
  addChannelToCommunity: (communityId: string, channelName: string, description: string, isBroadcast: boolean, isTemporary: boolean, expiresAt?: number) => void;
  addGroupToCommunity: (communityId: string, groupId: string) => void;
  removeGroupFromCommunity: (communityId: string, groupId: string) => void;
  createCommunityGroup: (communityId: string, name: string, icon: string, description: string, memberIds: string[], isTemporary: boolean, expiresAt?: number) => void;
  addMemberToCommunity: (communityId: string, userId: string, role?: UserRole) => void;
  removeMemberFromCommunity: (communityId: string, userId: string) => void;
  updateCommunityRole: (communityId: string, userId: string, role: UserRole) => void;
  updateCommunityRoleLabels: (communityId: string, labels: Partial<RoleLabels>) => void;
  toggleCommunityAdminsOnlyMessages: (communityId: string, value: boolean) => void;
  updateMemberPermissions: (communityId: string, userId: string, permissions: Partial<MemberPermissions>) => void;
  updateGroupMemberPermissions: (groupId: string, userId: string, permissions: Partial<MemberPermissions>) => void;
  updateGroupMemberRole: (groupId: string, userId: string, role: UserRole) => void;
  refreshCommunities: () => void;

  // Contacts
  contacts: ZenContact[];
  callShortcuts: ZenCallShortcut[];
  addContact: (name: string, username: string) => boolean;
  saveCallShortcut: (label: string, phoneNumber: string) => { ok: boolean; message?: string };
  deleteCallShortcut: (id: string) => void;
  startChatWithUser: (userId: string) => void;
  startDirectCallByUserId: (userId: string, type: CallType) => Promise<void>;
  startGroupCall: (chatId: string, type: CallType) => Promise<void>;
  refreshContacts: () => void;

  // Settings
  settings: ZenSettings;
  updateSettings: (patch: Partial<ZenSettings>) => void;
  notificationPermission: NotificationPermission | 'unsupported';
  requestNotificationPermission: () => Promise<NotificationPermission | 'unsupported'>;
  sendTestNotification: () => Promise<void>;

  // Calls
  activeCall: ZenCall | null;
  incomingCall: ZenCall | null;
  localCallStream: MediaStream | null;
  remoteCallStream: MediaStream | null;
  remoteParticipants: ZenRemoteParticipant[];
  callControls: ZenCallControls;
  callError: string | null;
  callDuration: number;
  startCall: (chatId: string, type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleCallMute: () => void;
  toggleCallVideo: () => void;
  toggleCallSpeaker: () => void;
  toggleCallHold: () => void;
  clearCallError: () => void;
  callMinimized: boolean;
  setCallMinimized: (v: boolean) => void;

  // UI State
  showInfoPanel: boolean;
  setShowInfoPanel: (v: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  inChatSearch: string;
  setInChatSearch: (q: string) => void;
  inChatSearchDate: string;
  setInChatSearchDate: (date: string) => void;
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
  const [callShortcuts, setCallShortcuts] = useState<ZenCallShortcut[]>([]);
  const [settings, setSettingsState] = useState<ZenSettings>(store.getSettings());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [activeCall, setActiveCall] = useState<ZenCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<ZenCall | null>(null);
  const [localCallStream, setLocalCallStream] = useState<MediaStream | null>(null);
  const [remoteCallStream, setRemoteCallStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<ZenRemoteParticipant[]>([]);
  const [callControls, setCallControls] = useState<ZenCallControls>(createDefaultCallControls());
  const [callError, setCallError] = useState<string | null>(null);
  const [callMinimized, setCallMinimized] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inChatSearch, setInChatSearch] = useState('');
  const [inChatSearchDate, setInChatSearchDate] = useState('');
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
  const [backendMode, setBackendMode] = useState(false);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localCallStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const pendingOffersRef = useRef<Map<string, RTCSessionDescriptionInit>>(new Map());
  const queuedIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const activeCallRef = useRef<ZenCall | null>(null);
  const incomingCallRef = useRef<ZenCall | null>(null);
  const currentUserRef = useRef<ZenUser | null>(null);
  const activeChatRef = useRef<ZenChat | null>(null);
  const backendModeRef = useRef(false);

  const fetchCallLogs = async () => {
    const res = await fetch(`http://localhost:3001/api/calls/${currentUser.id}`);
    const data = await res.json();

    if (data.ok) {
      setCallLogs(data.calls);
    }
  };

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) fetchCallLogs();
  }, [currentUser]);
  
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    backendModeRef.current = backendMode;
  }, [backendMode]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  const hydrateBackendState = useCallback((payload: {
    currentUser: ZenUser;
    users: ZenUser[];
    chats: ZenChat[];
    messagesByChat: Record<string, ZenMessage[]>;
    groups: ZenGroup[];
    communities: ZenCommunity[];
    contacts: ZenContact[];
  }) => {
    store.setUsers(payload.users);
    store.setChats(payload.chats);
    Object.entries(payload.messagesByChat).forEach(([chatId, chatMessages]) => {
      store.setMessages(chatId, chatMessages);
    });
    store.setGroups(payload.groups);
    store.setCommunities(payload.communities);
    store.setContacts(payload.contacts);
    store.setSession({ userId: payload.currentUser.id, loginAt: Date.now() });
    setCurrentUser(payload.currentUser);
    setAllUsers(payload.users);
    setChats(payload.chats);
    setGroups(payload.groups);
    setCommunities(payload.communities);
    setContacts(payload.contacts);
    setMessages([]);
    setBackendMode(true);
  }, []);

  // Init
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const s = store.getSettings();
      if (!cancelled) {
        setSettingsState(s);
        const savedTheme = s.theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : s.theme;
        setTheme(savedTheme);
        setStarredIds(store.getStarred());
        setCallShortcuts(store.getCallShortcuts());
      }

      const session = store.getSession();
      if (session?.userId) {
        try {
          const bootstrap = await fetchBootstrap(session.userId);
          if (!cancelled) {
            hydrateBackendState(bootstrap);
          }
          return;
        } catch {
          // Fall back to local mock data below when backend bootstrap is unavailable.
        }
      }

      store.initMockData();
      const existingUsers = store.getUsers();
      const renamedDemoUser = existingUsers.find(user => user.id === 'user-demo' && user.name === 'You (Demo)');
      if (renamedDemoUser) {
        store.updateUser('user-demo', { name: 'You' });
      }

      if (session) {
        const user = store.getUserById(session.userId);
        if (user && !cancelled) {
          setCurrentUser(user);
          store.updateUser(user.id, { status: 'online', lastSeen: Date.now() });
        }
      }

      if (!cancelled) {
        setAllUsers(store.getUsers());
        setBackendMode(false);
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [hydrateBackendState]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (!activeCall?.startedAt) {
      setCallDuration(0);
      return;
    }

    setCallDuration(Math.floor((Date.now() - activeCall.startedAt) / 1000));
    callTimerRef.current = setInterval(() => {
      if (!activeCall.startedAt) return;
      setCallDuration(Math.floor((Date.now() - activeCall.startedAt) / 1000));
    }, 1000);

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [activeCall?.startedAt]);

  const refreshChats = useCallback(() => setChats(store.getChats()), []);
  const refreshGroups = useCallback(() => setGroups(store.getGroups()), []);
  const refreshCommunities = useCallback(() => setCommunities(store.getCommunities()), []);
  const refreshContacts = useCallback(() => setContacts(store.getContacts()), []);
  const refreshCallShortcuts = useCallback(() => setCallShortcuts(store.getCallShortcuts()), []);
  const refreshMessages = useCallback(() => {
    if (activeChat) setMessages(store.getMessages(activeChat.id));
  }, [activeChat]);

  useEffect(() => {
    if (currentUser) {
      refreshChats();
      refreshGroups();
      refreshCommunities();
      refreshContacts();
      refreshCallShortcuts();
      setAllUsers(store.getUsers());
    }
  }, [currentUser, refreshChats, refreshGroups, refreshCommunities, refreshContacts, refreshCallShortcuts]);

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

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return undefined;

    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'zentalk-notification-click') return;
      const chatId = event.data.chatId;
      if (!chatId) return;
      const chat = store.getChatById(chatId);
      if (chat) setActiveChat(chat);
    };

    navigator.serviceWorker.addEventListener('message', handleWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleWorkerMessage);
    };
  }, [setActiveChat]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const resolveToastSender = useCallback((toast: Omit<Toast, 'id'>): Omit<Toast, 'id'> => {
    if (toast.kind !== 'message' || !currentUserRef.current) return toast;

    const currentUser = currentUserRef.current;
    if (toast.title && toast.title !== currentUser.name && toast.title !== 'You') return toast;

    const chat = store.getChatById(toast.chatId);
    if (!chat) return toast;

    const latestIncomingMessage = [...store.getMessages(chat.id)]
      .reverse()
      .find(message => message.senderId !== currentUser.id && !message.deletedFor.includes(currentUser.id));

    const fallbackUserId = chat.type === 'dm'
      ? chat.participants.find(id => id !== currentUser.id)
      : latestIncomingMessage?.senderId;

    const sender = store.getUserById(latestIncomingMessage?.senderId || fallbackUserId || '');
    if (!sender) return toast;

    return {
      ...toast,
      title: sender.name,
      avatar: sender.avatar,
    };
  }, []);

  const showSystemNotification = useCallback(async (toast: Omit<Toast, 'id'>) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (!settings.notifications || !settings.systemNotifications) return;
    if (Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible' && document.hasFocus() && toast.kind !== 'call') return;

    const options: NotificationOptions = {
      body: toast.message,
      icon: APP_NOTIFICATION_ICON,
      badge: APP_NOTIFICATION_ICON,
      tag: `${toast.kind ?? 'message'}-${toast.chatId}`,
      data: { chatId: toast.chatId },
    };

    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(toast.title, options);
      return;
    }

    const notification = new Notification(toast.title, options);
    notification.onclick = () => {
      window.focus();
      const chat = store.getChatById(toast.chatId);
      if (chat) setActiveChat(chat);
      notification.close();
    };
  }, [setActiveChat, settings.notifications, settings.systemNotifications]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const resolvedToast = resolveToastSender(toast);
    const id = store.genId();
    setToasts(prev => [...prev, { ...resolvedToast, id }]);
    void showSystemNotification(resolvedToast);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, [resolveToastSender, showSystemNotification]);

  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission | 'unsupported'> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return 'unsupported';
    }

    const result = await Notification.requestPermission();
    setNotificationPermission(result);
    if (result === 'granted') {
      store.updateSettings({ systemNotifications: true });
      setSettingsState(store.getSettings());
    }
    return result;
  }, []);

  const sendTestNotification = useCallback(async () => {
    addToast({
      title: 'ZenTalk Preview',
      message: 'System notifications are ready for new messages and incoming calls.',
      avatar: '🔔',
      chatId: activeChat?.id || chats[0]?.id || 'preview',
      kind: 'system',
      accent: 'from-sky-500/20 to-cyan-500/10',
    });
  }, [activeChat?.id, addToast, chats]);

  const clearCallError = useCallback(() => {
    setCallError(null);
  }, []);

  const syncPrimaryRemoteStream = useCallback(() => {
    const firstRemote = Array.from(remoteStreamsRef.current.values())[0] ?? null;
    setRemoteCallStream(firstRemote ? new MediaStream(firstRemote.getTracks()) : null);
  }, []);

  const syncRemoteParticipants = useCallback(() => {
    const nextParticipants = Array.from(remoteStreamsRef.current.entries()).map(([userId, stream]) => {
      const peerConnection = peerConnectionsRef.current.get(userId);
      const existing = remoteParticipants.find(participant => participant.userId === userId);
      return {
        userId,
        stream: new MediaStream(stream.getTracks()),
        connectionState: peerConnection?.connectionState ?? existing?.connectionState ?? 'connecting',
        muted: existing?.muted ?? false,
        videoEnabled: stream.getVideoTracks().some(track => track.enabled),
        hold: existing?.hold ?? false,
      } satisfies ZenRemoteParticipant;
    });
    setRemoteParticipants(nextParticipants);
    syncPrimaryRemoteStream();
  }, [remoteParticipants, syncPrimaryRemoteStream]);

  const updateRemoteParticipantState = useCallback((userId: string, patch: Partial<ZenRemoteParticipant>) => {
    setRemoteParticipants(prev => {
      const exists = prev.some(participant => participant.userId === userId);
      if (!exists) {
        return [...prev, {
          userId,
          stream: remoteStreamsRef.current.get(userId) ?? null,
          connectionState: 'connecting',
          muted: false,
          videoEnabled: true,
          hold: false,
          ...patch,
        }];
      }
      return prev.map(participant => participant.userId === userId ? { ...participant, ...patch } : participant);
    });
  }, []);

  const resetPeerConnections = useCallback(() => {
    peerConnectionsRef.current.forEach(peerConnection => {
      peerConnection.onicecandidate = null;
      peerConnection.ontrack = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
    });
    peerConnectionsRef.current.clear();
  }, []);

  const resetStreams = useCallback(() => {
    stopStream(localCallStreamRef.current);
    remoteStreamsRef.current.forEach(stream => stopStream(stream));
    localCallStreamRef.current = null;
    remoteStreamsRef.current.clear();
    setLocalCallStream(null);
    setRemoteCallStream(null);
    setRemoteParticipants([]);
  }, []);

  const resetCallUi = useCallback((type: CallType = 'audio') => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    queuedIceCandidatesRef.current.clear();
    pendingOffersRef.current.clear();
    setCallDuration(0);
    setCallMinimized(false);
    setCallControls(createDefaultCallControls(type));
  }, []);

  const finishCallLocally = useCallback((type: CallType = 'audio') => {
    resetPeerConnections();
    resetStreams();
    resetCallUi(type);
    setActiveCall(null);
    setIncomingCall(null);
  }, [resetCallUi, resetPeerConnections, resetStreams]);

  const syncLocalTrackState = useCallback((controls: ZenCallControls) => {
    const stream = localCallStreamRef.current;
    if (!stream) return;
    setAudioEnabled(stream, !controls.muted && !controls.hold);
    setVideoEnabled(stream, controls.videoEnabled && !controls.hold);
  }, []);

  const emitCallControls = useCallback((controls: Partial<Pick<ZenCallControls, 'muted' | 'videoEnabled' | 'hold'>>) => {
    const socket = socketRef.current;
    const call = activeCallRef.current;
    const user = currentUserRef.current;
    if (!socket || !call || !user) return;

    socket.emit('call-control', {
      callId: call.id,
      fromUserId: user.id,
      controls,
    } satisfies CallControlPayload);
  }, []);

  const flushQueuedIceCandidates = useCallback(async (remoteUserId: string) => {
    const peerConnection = peerConnectionsRef.current.get(remoteUserId);
    const queued = queuedIceCandidatesRef.current.get(remoteUserId) ?? [];
    if (!peerConnection || queued.length === 0) return;

    queuedIceCandidatesRef.current.delete(remoteUserId);
    const pending = [...queued];
    for (const candidate of pending) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const createManagedPeerConnection = useCallback((remoteUserId: string, callId: string) => {
    const existing = peerConnectionsRef.current.get(remoteUserId);
    if (existing) return existing;
    const peerConnection = createPeerConnection();
    const remoteStream = new MediaStream();
    remoteStreamsRef.current.set(remoteUserId, remoteStream);
    syncRemoteParticipants();
    updateRemoteParticipantState(remoteUserId, { connectionState: 'connecting' });

    peerConnection.onicecandidate = (event) => {
      const socket = socketRef.current;
      const user = currentUserRef.current;
      if (!event.candidate || !socket || !user) return;

      socket.emit('ice-candidate', {
        callId,
        fromUserId: user.id,
        toUserId: remoteUserId,
        candidate: event.candidate.toJSON(),
      } satisfies IceCandidatePayload);
    };

    peerConnection.ontrack = (event) => {
      const stream = remoteStreamsRef.current.get(remoteUserId);
      if (!stream) return;
      event.streams[0].getTracks().forEach(track => {
        const exists = stream.getTracks().some(existingTrack => existingTrack.id === track.id);
        if (!exists) stream.addTrack(track);
      });
      updateRemoteParticipantState(remoteUserId, {
        stream: new MediaStream(stream.getTracks()),
        videoEnabled: stream.getVideoTracks().some(track => track.enabled),
      });
      syncRemoteParticipants();
    };

    peerConnection.onconnectionstatechange = () => {
      const nextState = peerConnection.connectionState || 'connecting';
      setCallControls(prev => ({ ...prev, connectionState: nextState }));
      updateRemoteParticipantState(remoteUserId, { connectionState: nextState });

      if (nextState === 'connected') {
        setActiveCall(prev => prev
          ? {
              ...prev,
              status: 'active',
              startedAt: prev.startedAt ?? Date.now(),
            }
          : prev);
      }

      if (nextState === 'failed' || nextState === 'disconnected' || nextState === 'closed') {
        peerConnectionsRef.current.delete(remoteUserId);
        remoteStreamsRef.current.delete(remoteUserId);
        setRemoteParticipants(prev => prev.filter(participant => participant.userId !== remoteUserId));
        syncPrimaryRemoteStream();
      }
    };

    const stream = localCallStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    }

    peerConnectionsRef.current.set(remoteUserId, peerConnection);
    return peerConnection;
  }, [syncPrimaryRemoteStream, syncRemoteParticipants, updateRemoteParticipantState]);

  const createOfferForParticipant = useCallback(async (remoteUserId: string, callId: string) => {
    const socket = socketRef.current;
    const currentUser = currentUserRef.current;
    if (!socket || !currentUser) return;

    const peerConnection = createManagedPeerConnection(remoteUserId, callId);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('webrtc-offer', {
      callId,
      fromUserId: currentUser.id,
      toUserId: remoteUserId,
      offer,
    } satisfies WebRtcOfferPayload);
  }, [createManagedPeerConnection]);

  const prepareLocalMedia = useCallback(async (type: CallType) => {
    stopStream(localCallStreamRef.current);
    remoteStreamsRef.current.forEach(stream => stopStream(stream));
    const stream = await getLocalStream(type);
    localCallStreamRef.current = stream;
    setLocalCallStream(stream);
    setRemoteCallStream(null);
    remoteStreamsRef.current.clear();
    setRemoteParticipants([]);
    setCallControls(createDefaultCallControls(type));
    return stream;
  }, []);

  useEffect(() => {
    if (!currentUser) return undefined;

    const socket = io(SIGNALING_SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });

    socketRef.current = socket;

    const registerCurrentUser = () => {
      socket.emit('register-user', { userId: currentUser.id });
    };

    const handleIncomingCall = (payload: IncomingCallPayload) => {
      const currentActiveCall = activeCallRef.current;
      if (currentActiveCall) {
        socket.emit('call-rejected', {
          callId: payload.callId,
          fromUserId: currentUser.id,
          reason: 'busy',
        });
        return;
      }

      setCallError(null);
      setCallControls(createDefaultCallControls(payload.type));
      setIncomingCall({
        id: payload.callId,
        chatId: payload.chatId,
        callerId: payload.fromUserId,
        receiverId: currentUser.id,
        participantIds: payload.participantIds,
        type: payload.type,
        status: 'incoming',
      });
      const caller = store.getUserById(payload.fromUserId);
      addToast({
        title: caller?.name || 'Incoming call',
        message: `${payload.type === 'video' ? 'Video' : 'Voice'} call${payload.participantIds.length > 2 ? ` with ${payload.participantIds.length - 1} participants` : ''}`,
        avatar: caller?.avatar || '📞',
        chatId: payload.chatId,
        kind: 'call',
        accent: 'from-emerald-500/20 to-teal-500/10',
      });
    };

    const handleParticipantJoined = async (payload: ParticipantJoinedPayload) => {
      const call = activeCallRef.current;
      const user = currentUserRef.current;
      if (!call || !user || call.id !== payload.callId || payload.userId === user.id) return;
      setActiveCall(prev => prev
        ? {
            ...prev,
            status: 'active',
            startedAt: prev.startedAt ?? Date.now(),
          }
        : prev);
      await createOfferForParticipant(payload.userId, payload.callId);
    };

    const handleWebRtcOffer = async (payload: WebRtcOfferPayload) => {
      const call = activeCallRef.current ?? incomingCallRef.current;
      if (!call || call.id !== payload.callId) return;
      pendingOffersRef.current.set(payload.fromUserId, payload.offer);

      const peerConnection = createManagedPeerConnection(payload.fromUserId, payload.callId);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.offer));
      await flushQueuedIceCandidates(payload.fromUserId);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('webrtc-answer', {
        callId: payload.callId,
        fromUserId: currentUser.id,
        toUserId: payload.fromUserId,
        answer,
      } satisfies WebRtcAnswerPayload);
    };

    const handleWebRtcAnswer = async (payload: WebRtcAnswerPayload) => {
      if (activeCallRef.current?.id !== payload.callId) return;
      const peerConnection = peerConnectionsRef.current.get(payload.fromUserId);
      if (!peerConnection) return;
      await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.answer));
      await flushQueuedIceCandidates(payload.fromUserId);
    };

    const handleRemoteIceCandidate = async (payload: IceCandidatePayload) => {
      if (activeCallRef.current?.id !== payload.callId && incomingCallRef.current?.id !== payload.callId) return;

      const peerConnection = peerConnectionsRef.current.get(payload.fromUserId);
      if (!peerConnection || !peerConnection.remoteDescription) {
        const currentQueue = queuedIceCandidatesRef.current.get(payload.fromUserId) ?? [];
        currentQueue.push(payload.candidate);
        queuedIceCandidatesRef.current.set(payload.fromUserId, currentQueue);
        return;
      }

      await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
    };

    const handleParticipantLeft = (payload: ParticipantLeftPayload) => {
      if (activeCallRef.current?.id !== payload.callId && incomingCallRef.current?.id !== payload.callId) return;
      const peerConnection = peerConnectionsRef.current.get(payload.userId);
      if (peerConnection) {
        peerConnection.close();
        peerConnectionsRef.current.delete(payload.userId);
      }
      remoteStreamsRef.current.delete(payload.userId);
      setRemoteParticipants(prev => prev.filter(participant => participant.userId !== payload.userId));
      syncPrimaryRemoteStream();
    };

    const handleCallEnded = (payload: { callId: string; fromUserId: string }) => {
      if (activeCallRef.current?.id !== payload.callId && incomingCallRef.current?.id !== payload.callId) return;
      addToast({
        title: 'Call ended',
        message: 'The other participant left the call.',
        avatar: '📞',
        chatId: activeCallRef.current?.chatId || incomingCallRef.current?.chatId || '',
        kind: 'call',
        accent: 'from-emerald-500/20 to-teal-500/10',
      });
      finishCallLocally(activeCallRef.current?.type ?? incomingCallRef.current?.type ?? 'audio');
    };

    const handleCallRejected = (payload: { callId: string; reason?: string }) => {
      if (activeCallRef.current?.id !== payload.callId && incomingCallRef.current?.id !== payload.callId) return;
      setCallError(payload.reason === 'busy'
        ? 'The other user is already in another call.'
        : 'The call was declined.');
      finishCallLocally(activeCallRef.current?.type ?? incomingCallRef.current?.type ?? 'audio');
    };

    const handleRemoteControls = (payload: CallControlPayload) => {
      if (activeCallRef.current?.id !== payload.callId && incomingCallRef.current?.id !== payload.callId) return;
      updateRemoteParticipantState(payload.fromUserId, {
        muted: payload.controls.muted ?? false,
        videoEnabled: payload.controls.videoEnabled ?? true,
        hold: payload.controls.hold ?? false,
      });
    };

    const handleCallFailed = (payload: { callId: string; message: string }) => {
      if (activeCallRef.current?.id !== payload.callId) return;
      setCallError(payload.message);
      finishCallLocally(activeCallRef.current?.type ?? 'audio');
    };

    const handleRealtimeMessage = (payload: { chat: ZenChat; message: ZenMessage }) => {
      const activeUser = currentUserRef.current;
      if (!activeUser) return;

      const existingChat = store.getChatById(payload.chat.id);
      const nextUnreadCount = payload.message.senderId === activeUser.id || activeChatRef.current?.id === payload.chat.id
        ? 0
        : (existingChat?.unreadCount ?? 0) + 1;

      if (existingChat) {
        store.updateChat(payload.chat.id, {
          ...payload.chat,
          unreadCount: nextUnreadCount,
          lastMessage: payload.chat.lastMessage || payload.message.text,
          lastTime: payload.chat.lastTime || payload.message.timestamp,
        });
      } else {
        store.addChat({
          ...payload.chat,
          unreadCount: nextUnreadCount,
        });
      }

      const currentMessages = store.getMessages(payload.chat.id);
      if (!currentMessages.some(message => message.id === payload.message.id)) {
        store.addMessage(payload.message);
      }

      setChats(store.getChats());
      if (activeChatRef.current?.id === payload.chat.id) {
        setMessages(store.getMessages(payload.chat.id));
      }

      if (payload.message.senderId !== activeUser.id) {
        const sender = store.getUserById(payload.message.senderId);
        addToast({
          title: sender?.name || payload.chat.name,
          message: payload.message.text || (payload.message.type === 'audio' ? 'Voice message' : 'New attachment'),
          avatar: sender?.avatar || payload.chat.avatar,
          chatId: payload.chat.id,
          kind: 'message',
          accent: 'from-primary/20 to-primary/5',
        });
      }
    };

    socket.on('connect', registerCurrentUser);
    socket.on('incoming-call', handleIncomingCall);
    socket.on('participant-joined', handleParticipantJoined);
    socket.on('webrtc-offer', handleWebRtcOffer);
    socket.on('webrtc-answer', handleWebRtcAnswer);
    socket.on('ice-candidate', handleRemoteIceCandidate);
    socket.on('participant-left', handleParticipantLeft);
    socket.on('call-ended', handleCallEnded);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-control-updated', handleRemoteControls);
    socket.on('call-failed', handleCallFailed);
    socket.on('message-created', handleRealtimeMessage);
    socket.connect();
    registerCurrentUser();

    return () => {
      socket.off('connect', registerCurrentUser);
      socket.off('incoming-call', handleIncomingCall);
      socket.off('participant-joined', handleParticipantJoined);
      socket.off('webrtc-offer', handleWebRtcOffer);
      socket.off('webrtc-answer', handleWebRtcAnswer);
      socket.off('ice-candidate', handleRemoteIceCandidate);
      socket.off('participant-left', handleParticipantLeft);
      socket.off('call-ended', handleCallEnded);
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-control-updated', handleRemoteControls);
      socket.off('call-failed', handleCallFailed);
      socket.off('message-created', handleRealtimeMessage);
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [addToast, createManagedPeerConnection, createOfferForParticipant, currentUser, finishCallLocally, flushQueuedIceCandidates, syncPrimaryRemoteStream, updateRemoteParticipantState]);

  // Simulate incoming messages
  useEffect(() => {
    if (!currentUser || backendMode) return;
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
      addToast({
        title: sender.name,
        message: text,
        avatar: sender.avatar,
        chatId: randomChat.id,
        kind: 'message',
        accent: 'from-primary/20 to-primary/5',
      });
    }, 18000);
    return () => clearInterval(interval);
  }, [backendMode, currentUser, activeChat, addToast]);

  const simulateTyping = useCallback((chatId: string) => {
    setTypingChats(prev => new Set([...prev, chatId]));
    setTimeout(() => {
      setTypingChats(prev => { const n = new Set(prev); n.delete(chatId); return n; });
    }, 3000);
  }, []);

  // Auth
  const login = useCallback(async (emailOrUsername: string, password: string): Promise<{ ok: boolean; message?: string }> => {
    try {
      const payload = await loginWithApi(emailOrUsername, password);
      hydrateBackendState(payload);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Unable to sign in.' };
    }
  }, [hydrateBackendState]);

  const signup = useCallback(async (data: Partial<ZenUser>): Promise<{ ok: boolean; message?: string; requestId?: string }> => {
    try {
      const payload = await signupWithApi({
        name: data.name || '',
        username: data.username || '',
        email: data.email || '',
        mobile: data.mobile || '',
        password: data.password || '',
        avatar: data.avatar || '🧑',
      });
      return { ok: true, requestId: payload.requestId, message: payload.message };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Unable to create account.' };
    }
  }, []);

  const verifySignupOtp = useCallback(async (requestId: string, otp: string): Promise<{ ok: boolean; message?: string }> => {
    try {
      const payload = await verifySignupOtpWithApi({ requestId, otp });
      hydrateBackendState(payload);
      return { ok: true, message: payload.message };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Unable to verify the code.' };
    }
  }, [hydrateBackendState]);

  const logout = useCallback(() => {
    if (currentUser) {
      store.updateUser(currentUser.id, { status: 'offline', lastSeen: Date.now() });
      if (backendModeRef.current) {
        void logoutFromApi(currentUser.id);
      }
    }
    finishCallLocally(activeCallRef.current?.type ?? incomingCallRef.current?.type ?? 'audio');
    store.clearSession();
    setCurrentUser(null);
    setActiveChatState(null);
    setMessages([]);
    setChats([]);
    setGroups([]);
    setCommunities([]);
    setContacts([]);
    setBackendMode(false);
  }, [currentUser, finishCallLocally]);

  const updateProfile = useCallback((patch: Partial<ZenUser>) => {
    if (!currentUser) return;
    store.updateUser(currentUser.id, patch);
    const updated = store.getUserById(currentUser.id)!;
    setCurrentUser(updated);
    setAllUsers(store.getUsers());
    if (backendModeRef.current) {
      void updateProfileOnApi(currentUser.id, patch).then(response => {
        store.updateUser(currentUser.id, response.user);
        setCurrentUser(response.user);
        setAllUsers(store.getUsers());
      }).catch(() => {});
    }
  }, [currentUser]);

  const isUserBlocked = useCallback((userId: string) => {
    if (!currentUser) return false;
    return (currentUser.blockedUserIds ?? []).includes(userId);
  }, [currentUser]);

  const toggleBlockedUser = useCallback((userId: string) => {
    if (!currentUser) return;
    const blockedUserIds = currentUser.blockedUserIds ?? [];
    const nextBlockedUserIds = blockedUserIds.includes(userId)
      ? blockedUserIds.filter(id => id !== userId)
      : [...blockedUserIds, userId];

    store.updateUser(currentUser.id, { blockedUserIds: nextBlockedUserIds });
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
    if (activeChat.type === 'dm') {
      const otherUserId = activeChat.participants.find(id => id !== currentUser.id);
      if (otherUserId && (currentUser.blockedUserIds ?? []).includes(otherUserId)) return;
      if (backendModeRef.current && otherUserId) {
        void sendDirectMessageOnApi({
          fromUserId: currentUser.id,
          toUserId: otherUserId,
          text,
          replyTo,
          mediaUrl,
          type: type as ZenMessage['type'],
        }).then(({ chat, message }) => {
          const existingTempChatId = activeChatRef.current?.id;
          const currentMessages = store.getMessages(chat.id);
          if (!currentMessages.some(existingMessage => existingMessage.id === message.id)) {
            store.setMessages(chat.id, [...currentMessages, message]);
          }
          const knownChat = store.getChatById(chat.id);
          if (knownChat) {
            store.updateChat(chat.id, chat);
          } else {
            if (existingTempChatId?.startsWith('chat-dm-') && existingTempChatId !== chat.id) {
              store.deleteChat(existingTempChatId);
            }
            store.addChat(chat);
          }
          setChats(store.getChats());
          setActiveChat(chat);
          setMessages(store.getMessages(chat.id));
        }).catch(error => {
          setCallError(error.message);
        });
        return;
      }
    }
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

  const deleteMessageForEveryone = useCallback((msgId: string) => {
    if (!activeChat) return;
    store.updateMessage(activeChat.id, msgId, { deletedFor: [...activeChat.participants] });
    setMessages(store.getMessages(activeChat.id));
  }, [activeChat]);

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
        userId, role: i === 0 ? 'owner' : 'member',
        permissions: buildPermissions(i === 0 ? 'owner' : 'member'),
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
    if (newMembers.length > 0 && ['owner', 'admin'].includes(group.members.find(m => m.userId === currentUser.id)?.role || '')) {
      newMembers[0].role = 'owner';
      newMembers[0].permissions = buildPermissions('owner');
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
  const createCommunity = useCallback((name: string, icon: string, description: string, options?: { roleLabels?: Partial<RoleLabels>; adminsOnlyMessages?: boolean; memberIds?: string[] }) => {
    if (!currentUser) return;
    const communityId = store.genId();
    const channelId = store.genId();
    const roleLabels = { ...DEFAULT_COMMUNITY_ROLE_LABELS, ...(options?.roleLabels ?? {}) };
    const memberIds = Array.from(new Set([currentUser.id, ...(options?.memberIds ?? [])]));
    const community: ZenCommunity = {
      id: communityId, name, icon, description,
      channels: [{ id: channelId, name: 'general', description: 'General discussion', isBroadcast: false, createdAt: Date.now() }],
      linkedGroupIds: [],
      members: memberIds.map(userId => ({
        userId,
        role: userId === currentUser.id ? 'owner' : 'member',
        permissions: buildPermissions(userId === currentUser.id ? 'owner' : 'member'),
      })),
      roleLabels,
      adminsOnlyMessages: options?.adminsOnlyMessages ?? false,
      createdBy: currentUser.id, createdAt: Date.now(),
    };
    store.addCommunity(community);
    const chat: ZenChat = {
      id: `chat-channel-${channelId}`, type: 'channel', name: '#general', avatar: icon,
      participants: memberIds, lastMessage: 'Channel created', lastTime: Date.now(),
      unreadCount: 0, pinned: false, muted: false, archived: false, wallpaper: '', disappearing: 'off',
      communityId, channelId,
    };
    store.addChat(chat);
    refreshCommunities();
    refreshChats();
    setActiveChat(chat);
  }, [currentUser, refreshCommunities, refreshChats, setActiveChat]);

  const deleteCommunity = useCallback((communityId: string) => {
    const community = store.getCommunityById(communityId);
    if (!community) return;

    const communityChats = store.getChats().filter(chat => chat.communityId === communityId);
    communityChats.forEach(chat => {
      store.deleteMessagesForChat(chat.id);
      store.deleteChat(chat.id);
    });

    store.deleteCommunity(communityId);
    refreshChats();
    refreshCommunities();

    if (activeChatRef.current?.communityId === communityId) {
      setShowInfoPanel(false);
      setActiveChatState(null);
      setMessages([]);
    }
  }, [refreshChats, refreshCommunities]);

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
    const community = store.getCommunityById(communityId);
    const group = store.getGroupById(groupId);
    if (!community || !group) return;
    const linkedGroupIds = Array.from(new Set([...community.linkedGroupIds, groupId]));
    const existingMemberIds = new Set(community.members.map(member => member.userId));
    const nextMembers = [...community.members];
    group.members.forEach(member => {
      if (!existingMemberIds.has(member.userId)) {
        nextMembers.push({ userId: member.userId, role: 'member', permissions: buildPermissions('member') });
      }
    });
    store.updateCommunity(communityId, { linkedGroupIds, members: nextMembers });
    syncCommunityChannelParticipants(communityId, nextMembers.map(member => member.userId));
    refreshCommunities();
    refreshChats();
  }, [refreshChats, refreshCommunities]);

  const removeGroupFromCommunity = useCallback((communityId: string, groupId: string) => {
    const community = store.getCommunityById(communityId);
    if (!community) return;
    store.updateCommunity(communityId, {
      linkedGroupIds: community.linkedGroupIds.filter(id => id !== groupId),
    });
    refreshCommunities();
    refreshChats();
  }, [refreshChats, refreshCommunities]);

  const createCommunityGroup = useCallback((communityId: string, name: string, icon: string, description: string, memberIds: string[], isTemporary: boolean, expiresAt?: number) => {
    if (!currentUser) return;
    const community = store.getCommunityById(communityId);
    if (!community) return;
    const groupId = store.genId();
    const chatId = `chat-group-${groupId}`;
    const allMemberIds = Array.from(new Set([currentUser.id, ...memberIds]));
    const group: ZenGroup = {
      id: groupId,
      name,
      icon,
      description,
      members: allMemberIds.map((userId, index) => ({
        userId,
        role: index === 0 ? 'owner' : 'member',
        permissions: buildPermissions(index === 0 ? 'owner' : 'member'),
        joinedAt: Date.now(),
      })),
      createdBy: currentUser.id,
      createdAt: Date.now(),
      isTemporary,
      expiresAt,
    };
    store.addGroup(group);
    store.addChat({
      id: chatId,
      type: 'group',
      name,
      avatar: icon,
      participants: allMemberIds,
      lastMessage: 'Group created inside community',
      lastTime: Date.now(),
      unreadCount: 0,
      pinned: false,
      muted: false,
      archived: false,
      wallpaper: '',
      disappearing: 'off',
      groupId,
      communityId,
    });
    const existingMembers = new Set(community.members.map(member => member.userId));
    store.updateCommunity(communityId, {
      linkedGroupIds: Array.from(new Set([...community.linkedGroupIds, groupId])),
      members: [
        ...community.members,
        ...allMemberIds
          .filter(userId => !existingMembers.has(userId))
          .map(userId => ({ userId, role: 'member' as const, permissions: buildPermissions('member') })),
      ],
    });
    syncCommunityChannelParticipants(communityId, Array.from(new Set([...community.members.map(member => member.userId), ...allMemberIds])));
    refreshGroups();
    refreshCommunities();
    refreshChats();
  }, [currentUser, refreshChats, refreshCommunities, refreshGroups]);

  const addMemberToCommunity = useCallback((communityId: string, userId: string, role: UserRole = 'member') => {
    const community = store.getCommunityById(communityId);
    if (!community) return;
    if (community.members.some(member => member.userId === userId)) return;
    store.updateCommunity(communityId, {
      members: [...community.members, { userId, role, permissions: buildPermissions(role) }],
    });
    syncCommunityChannelParticipants(communityId, [...community.members.map(member => member.userId), userId]);
    refreshCommunities();
    refreshChats();
  }, [refreshChats, refreshCommunities]);

  const removeMemberFromCommunity = useCallback((communityId: string, userId: string) => {
    const community = store.getCommunityById(communityId);
    if (!community) return;
    store.updateCommunity(communityId, {
      members: community.members.filter(member => member.userId !== userId),
    });
    syncCommunityChannelParticipants(communityId, community.members.filter(member => member.userId !== userId).map(member => member.userId));
    refreshCommunities();
    refreshChats();
  }, [refreshChats, refreshCommunities]);

  const updateCommunityRole = useCallback((communityId: string, userId: string, role: UserRole) => {
    const community = store.getCommunityById(communityId);
    if (!community) return;
    store.updateCommunity(communityId, {
      members: community.members.map(member =>
        member.userId === userId ? { ...member, role, permissions: { ...member.permissions, ...buildPermissions(role) } } : member
      ),
    });
    refreshCommunities();
  }, [refreshCommunities]);

  const updateCommunityRoleLabels = useCallback((communityId: string, labels: Partial<RoleLabels>) => {
    const community = store.getCommunityById(communityId);
    if (!community) return;
    store.updateCommunity(communityId, {
      roleLabels: { ...community.roleLabels, ...labels },
    });
    refreshCommunities();
  }, [refreshCommunities]);

  const toggleCommunityAdminsOnlyMessages = useCallback((communityId: string, value: boolean) => {
    const community = store.getCommunityById(communityId);
    if (!community) return;
    store.updateCommunity(communityId, { adminsOnlyMessages: value });
    refreshCommunities();
  }, [refreshCommunities]);

  const updateMemberPermissions = useCallback((communityId: string, userId: string, permissions: Partial<MemberPermissions>) => {
    const community = store.getCommunityById(communityId);
    if (!community) return;
    store.updateCommunity(communityId, {
      members: community.members.map(m =>
        m.userId === userId ? { ...m, permissions: { ...m.permissions, ...permissions } } : m
      ),
    });
    refreshCommunities();
  }, [refreshCommunities]);

  const updateGroupMemberPermissions = useCallback((groupId: string, userId: string, permissions: Partial<MemberPermissions>) => {
    const group = store.getGroupById(groupId);
    if (!group) return;
    store.updateGroup(groupId, {
      members: group.members.map(m =>
        m.userId === userId ? { ...m, permissions: { ...m.permissions, ...permissions } } : m
      ),
    });
    refreshGroups();
  }, [refreshGroups]);

  const updateGroupMemberRole = useCallback((groupId: string, userId: string, role: UserRole) => {
    const group = store.getGroupById(groupId);
    if (!group) return;
    store.updateGroup(groupId, {
      members: group.members.map(member =>
        member.userId === userId ? { ...member, role, permissions: { ...member.permissions, ...buildPermissions(role) } } : member
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

  const saveCallShortcut = useCallback((label: string, phoneNumber: string) => {
    const normalized = phoneNumber.trim();
    const title = label.trim();
    if (!title || !normalized) {
      return { ok: false, message: 'Name and number are required.' };
    }

    const matchedUser = store.getUsers().find(user => user.mobile === normalized);
    const duplicate = store.getCallShortcuts().find(entry => entry.phoneNumber === normalized);
    if (duplicate) {
      return { ok: false, message: 'This number is already saved in quick dial.' };
    }

    store.addCallShortcut({
      id: store.genId(),
      label: title,
      phoneNumber: normalized,
      userId: matchedUser?.id,
      addedAt: Date.now(),
    });
    refreshCallShortcuts();
    return { ok: true };
  }, [refreshCallShortcuts]);

  const deleteCallShortcut = useCallback((id: string) => {
    store.deleteCallShortcut(id);
    refreshCallShortcuts();
  }, [refreshCallShortcuts]);

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

  const getOrCreateDirectChat = useCallback((userId: string) => {
    if (!currentUser) return null;
    const existing = store.getChats().find(c =>
      c.type === 'dm'
      && c.participants.includes(userId)
      && c.participants.includes(currentUser.id)
      && c.participants.length === 2
    );
    if (existing) return existing;

    const user = store.getUserById(userId);
    if (!user) return null;

    const chat: ZenChat = {
      id: `chat-dm-${store.genId()}`,
      type: 'dm',
      name: user.name,
      avatar: user.avatar,
      participants: [currentUser.id, userId],
      lastMessage: '',
      lastTime: Date.now(),
      unreadCount: 0,
      pinned: false,
      muted: false,
      archived: false,
      wallpaper: '',
      disappearing: 'off',
    };
    store.addChat(chat);
    refreshChats();
    return chat;
  }, [currentUser, refreshChats]);

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

  const startCall = useCallback(async (chatId: string, type: CallType) => {
    if (!currentUser) return;

    const socket = socketRef.current;
    const chat = store.getChatById(chatId);
    if (!chat) return;

    if (chat.type === 'dm') {
      const otherUserId = chat.participants.find(id => id !== currentUser.id);
      if (otherUserId && (currentUser.blockedUserIds ?? []).includes(otherUserId)) {
        setCallError('Unblock this user to start a call.');
        return;
      }
    }

    if (!socket) {
      setCallError('Signaling server not connected. Start `npm run signaling` and try again.');
      return;
    }

    if (activeCallRef.current || incomingCallRef.current) {
      setCallError('Finish the current call before starting a new one.');
      return;
    }

    const participantIds = Array.from(new Set(chat.participants.filter(id => id !== currentUser.id)));
    if (participantIds.length === 0) {
      setCallError('No available participants were found for this call.');
      return;
    }

    const nextCall: ZenCall = {
      id: store.genId(),
      chatId,
      callerId: currentUser.id,
      receiverId: participantIds[0],
      participantIds: [currentUser.id, ...participantIds],
      type,
      status: 'calling',
    };

    setCallError(null);
    setIncomingCall(null);
    setActiveCall(nextCall);
    setCallMinimized(false);

    try {
      await prepareLocalMedia(type);
      socket.emit('call-user', {
        callId: nextCall.id,
        chatId,
        fromUserId: currentUser.id,
        targetUserIds: participantIds,
        participantIds: nextCall.participantIds,
        type,
        chatName: chat.name,
        chatAvatar: chat.avatar,
      } satisfies IncomingCallPayload);
      socket.emit('join-call', {
        callId: nextCall.id,
        chatId,
        fromUserId: currentUser.id,
      } satisfies JoinCallPayload);
    } catch (error) {
      setCallError(error instanceof Error ? error.message : 'Unable to start the call.');
      finishCallLocally(type);
    }
  }, [currentUser, finishCallLocally, prepareLocalMedia]);

  const startDirectCallByUserId = useCallback(async (userId: string, type: CallType) => {
    const chat = getOrCreateDirectChat(userId);
    if (!chat) {
      setCallError('Could not create a direct chat for this user.');
      return;
    }
    setActiveChat(chat);
    await startCall(chat.id, type);
  }, [getOrCreateDirectChat, setActiveChat, startCall]);

  const startGroupCall = useCallback(async (chatId: string, type: CallType) => {
    await startCall(chatId, type);
  }, [startCall]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall || !currentUser) return;

    const socket = socketRef.current;
    if (!socket) {
      setCallError('Signaling server not connected. Start `npm run signaling` and try again.');
      return;
    }

    setCallError(null);

    try {
      await prepareLocalMedia(incomingCall.type);
      setActiveCall({
        ...incomingCall,
        status: 'active',
        startedAt: Date.now(),
      });
      setIncomingCall(null);
      socket.emit('join-call', {
        callId: incomingCall.id,
        chatId: incomingCall.chatId,
        fromUserId: currentUser.id,
      } satisfies JoinCallPayload);
    } catch (error) {
      setCallError(error instanceof Error ? error.message : 'Unable to answer the call.');
      finishCallLocally(incomingCall.type);
    }
  }, [currentUser, finishCallLocally, incomingCall, prepareLocalMedia]);

  const rejectCall = useCallback(() => {
    if (incomingCall && socketRef.current && currentUser) {
      socketRef.current.emit('call-rejected', {
        callId: incomingCall.id,
        fromUserId: currentUser.id,
      });
    }

    finishCallLocally(incomingCall?.type ?? 'audio');
  }, [currentUser, finishCallLocally, incomingCall]);

  const endCall = useCallback(() => {
    const currentCall = activeCallRef.current;
    const socket = socketRef.current;
    const user = currentUserRef.current;

    if (currentCall && socket && user) {
      socket.emit(currentCall.callerId === user.id ? 'call-ended' : 'leave-call', {
        callId: currentCall.id,
        fromUserId: user.id,
      });
    }

    finishCallLocally(currentCall?.type ?? 'audio');
  }, [finishCallLocally]);

  const toggleCallMute = useCallback(() => {
    setCallControls(prev => {
      const next = { ...prev, muted: !prev.muted };
      syncLocalTrackState(next);
      emitCallControls({ muted: next.muted });
      return next;
    });
  }, [emitCallControls, syncLocalTrackState]);

  const toggleCallVideo = useCallback(() => {
    setCallControls(prev => {
      if (!activeCallRef.current || activeCallRef.current.type !== 'video') return prev;
      const next = { ...prev, videoEnabled: !prev.videoEnabled };
      syncLocalTrackState(next);
      emitCallControls({ videoEnabled: next.videoEnabled });
      return next;
    });
  }, [emitCallControls, syncLocalTrackState]);

  const toggleCallSpeaker = useCallback(() => {
    setCallControls(prev => ({ ...prev, speakerEnabled: !prev.speakerEnabled }));
  }, []);

  const toggleCallHold = useCallback(() => {
    setCallControls(prev => {
      const next = { ...prev, hold: !prev.hold };
      syncLocalTrackState(next);
      emitCallControls({ hold: next.hold });
      return next;
    });
  }, [emitCallControls, syncLocalTrackState]);

  const value: AppContextType = {
    currentUser, login, signup, verifySignupOtp, logout, updateProfile, toggleBlockedUser, isUserBlocked,
    theme, toggleTheme,
    chats, activeChat, setActiveChat, refreshChats,
    messages, sendMessage, editMessage, deleteMessage, deleteMessageForEveryone, forwardMessage, toggleStar, refreshMessages,
    groups, createGroup, updateGroup, leaveGroup, kickMember, refreshGroups,
    communities, createCommunity, deleteCommunity, addChannelToCommunity, addGroupToCommunity,
    removeGroupFromCommunity, createCommunityGroup, addMemberToCommunity, removeMemberFromCommunity,
    updateCommunityRole, updateCommunityRoleLabels, toggleCommunityAdminsOnlyMessages,
    updateMemberPermissions, updateGroupMemberPermissions, updateGroupMemberRole, refreshCommunities,
    contacts, callShortcuts, addContact, saveCallShortcut, deleteCallShortcut, startChatWithUser, startDirectCallByUserId, startGroupCall, refreshContacts,
    settings, updateSettings, notificationPermission, requestNotificationPermission, sendTestNotification,
    activeCall, incomingCall, localCallStream, remoteCallStream, remoteParticipants, callControls, callError, callDuration,
    startCall, acceptCall, rejectCall, endCall, toggleCallMute, toggleCallVideo, toggleCallSpeaker, toggleCallHold, clearCallError,
    callMinimized, setCallMinimized,
    showInfoPanel, setShowInfoPanel,
    searchQuery, setSearchQuery,
    inChatSearch, setInChatSearch,
    inChatSearchDate, setInChatSearchDate,
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
