export type UserRole = 'admin' | 'moderator' | 'member';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'image' | 'video' | 'document' | 'audio';
export type ChatType = 'dm' | 'group' | 'channel';
export type CallType = 'audio' | 'video';
export type CallStatus = 'incoming' | 'active' | 'ended';
export type DisappearTimer = 'off' | '24h' | '7d' | '90d';

export interface ZenUser {
  id: string;
  name: string;
  username: string;
  email: string;
  mobile: string; // private, never shown to others
  password: string;
  avatar: string; // emoji or data URL
  bio: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: number;
  createdAt: number;
}

export interface MemberPermissions {
  messaging: boolean;
  memberManagement: boolean;
  channelCreation: boolean;
}

export interface GroupMember {
  userId: string;
  role: UserRole;
  permissions: MemberPermissions;
  joinedAt: number;
}

export interface ZenGroup {
  id: string;
  name: string;
  icon: string;
  description: string;
  members: GroupMember[];
  createdBy: string;
  createdAt: number;
  expiresAt?: number; // for temporary groups
  isTemporary: boolean;
}

export interface ZenChannel {
  id: string;
  name: string;
  description: string;
  isBroadcast: boolean; // only admin/mod can send
  isTemporary?: boolean;
  expiresAt?: number;
  createdAt: number;
}

export interface CommunityMember {
  userId: string;
  role: UserRole;
  permissions: MemberPermissions;
}

export interface ZenCommunity {
  id: string;
  name: string;
  icon: string;
  description: string;
  channels: ZenChannel[];
  members: CommunityMember[];
  createdBy: string;
  createdAt: number;
}

export interface ZenChat {
  id: string;
  type: ChatType;
  name: string;
  avatar: string;
  participants: string[]; // user IDs
  lastMessage: string;
  lastTime: number;
  unreadCount: number;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  wallpaper: string; // color or empty
  disappearing: DisappearTimer;
  groupId?: string;
  communityId?: string;
  channelId?: string;
}

export interface ZenMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  type: MessageType;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  status: MessageStatus;
  timestamp: number;
  replyTo?: string; // message ID
  forwarded: boolean;
  edited: boolean;
  editedAt?: number;
  deletedFor: string[]; // user IDs
  starred: boolean;
  reactions: Record<string, string[]>; // emoji -> userIds
  disappearsAt?: number;
}

export interface ZenContact {
  id: string;
  name: string;
  username: string;
  userId: string;
  addedAt: number;
}

export interface ZenSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  aiEnabled: boolean;
  language: string;
  lastSeenPrivacy: 'everyone' | 'contacts' | 'nobody';
  profilePhotoPrivacy: 'everyone' | 'contacts' | 'nobody';
  readReceipts: boolean;
}

export interface ZenCall {
  id: string;
  chatId: string;
  callerId: string;
  receiverId: string;
  type: CallType;
  status: CallStatus;
  startedAt?: number;
  endedAt?: number;
  duration?: number;
}

export interface ZenSession {
  userId: string;
  loginAt: number;
}
