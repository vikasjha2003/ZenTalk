import type {
  ZenChat,
  ZenCommunity,
  ZenContact,
  ZenGroup,
  ZenMessage,
  ZenUser,
} from './zentalk-types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface BootstrapPayload {
  ok: boolean;
  currentUser: ZenUser;
  users: ZenUser[];
  chats: ZenChat[];
  messagesByChat: Record<string, ZenMessage[]>;
  groups: ZenGroup[];
  communities: ZenCommunity[];
  contacts: ZenContact[];
  message?: string;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Request failed');
  }
  return data as T;
}

export async function checkHealth() {
  return apiFetch<{ ok: boolean; mongo: string }>('/api/health');
}

export async function loginWithApi(emailOrUsername: string, password: string) {
  return apiFetch<BootstrapPayload>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrUsername, password }),
  });
}

export async function signupWithApi(payload: {
  name: string;
  username: string;
  email: string;
  mobile?: string;
  password: string;
  avatar?: string;
}) {
  return apiFetch<BootstrapPayload>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchBootstrap(userId: string) {
  return apiFetch<BootstrapPayload>(`/api/bootstrap/${userId}`);
}

export async function logoutFromApi(userId: string) {
  return apiFetch<{ ok: boolean }>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function updateProfileOnApi(userId: string, patch: Partial<ZenUser>) {
  return apiFetch<{ ok: boolean; user: ZenUser }>(`/api/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function sendDirectMessageOnApi(payload: {
  fromUserId: string;
  toUserId: string;
  text: string;
  replyTo?: string;
  mediaUrl?: string;
  type?: ZenMessage['type'];
}) {
  return apiFetch<{ ok: boolean; chat: ZenChat; message: ZenMessage }>('/api/messages/dm', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
