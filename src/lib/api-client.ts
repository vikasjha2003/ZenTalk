import type {
  ZenChat,
  ZenCommunity,
  ZenContact,
  ZenGroup,
  ZenMessage,
  ZenUser,
} from './zentalk-types';

function resolveApiBase() {
  const configured = import.meta.env.VITE_API_URL;
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

const API_BASE = resolveApiBase();

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

interface OtpRequestPayload {
  ok: boolean;
  requestId: string;
  message?: string;
}

interface AddContactPayload {
  ok: boolean;
  contact: ZenContact;
  chat: ZenChat;
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

  const raw = await response.text();
  let data: any = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    if (!response.ok) {
      if (raw.trim().startsWith('<!DOCTYPE') || raw.trim().startsWith('<html')) {
        throw new Error('The ZenTalk backend returned an HTML page instead of the API response. Restart the backend server and try again.');
      }
      throw new Error(raw || 'Request failed');
    }
    throw new Error('The server returned an invalid response.');
  }

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
  mobile: string;
  password: string;
  avatar?: string;
}) {
  return apiFetch<OtpRequestPayload>('/api/auth/signup/request-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifySignupOtpWithApi(payload: { requestId: string; otp: string }) {
  return apiFetch<BootstrapPayload>('/api/auth/signup/verify-otp', {
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

export async function addContactOnApi(payload: { ownerUserId: string; targetUserId: string }) {
  return apiFetch<AddContactPayload>('/api/contacts', {
    method: 'POST',
    body: JSON.stringify(payload),
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
