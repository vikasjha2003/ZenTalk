import express from 'express';
import bcrypt from 'bcryptjs';
import { createServer } from 'node:http';
import { isValidObjectId, Types } from 'mongoose';
import { Server } from 'socket.io';

import { connectToDatabase } from './db.js';
import { Chat, Message, User } from './models.js';

const PORT = Number(process.env.PORT || 3001);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

const userSockets = new Map();
const socketUsers = new Map();
const callRooms = new Map();

function getSocketSet(userId) {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  return userSockets.get(userId);
}

function emitToUser(userId, event, payload) {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) return false;
  sockets.forEach(socketId => io.to(socketId).emit(event, payload));
  return true;
}

function getOrCreateRoom(callId, callerId, chatId, participantIds = []) {
  if (!callRooms.has(callId)) {
    callRooms.set(callId, {
      callId,
      chatId,
      callerId,
      participants: new Set([callerId]),
      invitedUsers: new Set(participantIds),
    });
  }
  return callRooms.get(callId);
}

function removeSocket(socketId) {
  const userId = socketUsers.get(socketId);
  if (!userId) return;

  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) userSockets.delete(userId);
  }

  socketUsers.delete(socketId);
}

function leaveRoom(callId, userId, { endRoom = false } = {}) {
  const room = callRooms.get(callId);
  if (!room) return;

  if (endRoom) {
    room.participants.forEach(participantId => {
      if (participantId !== userId) {
        emitToUser(participantId, 'call-ended', { callId, fromUserId: userId });
      }
    });
    callRooms.delete(callId);
    return;
  }

  if (room.participants.has(userId)) {
    room.participants.delete(userId);
    room.participants.forEach(participantId => {
      emitToUser(participantId, 'participant-left', { callId, userId });
    });
  }

  if (room.participants.size === 0) {
    callRooms.delete(callId);
  }
}

function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name || '',
    username: user.username || '',
    email: user.email || '',
    mobile: user.mobile || '',
    avatar: user.avatar || '🧑',
    bio: user.bio || '',
    blockedUserIds: (user.blockedUserIds || []).map(id => id.toString()),
    status: user.status || 'offline',
    lastSeen: new Date(user.lastSeen || Date.now()).getTime(),
    createdAt: new Date(user.createdAt || Date.now()).getTime(),
  };
}

function serializeMessage(message) {
  return {
    id: message._id.toString(),
    chatId: message.chatId.toString(),
    senderId: message.senderId.toString(),
    text: message.text || '',
    type: message.type || 'text',
    mediaUrl: message.mediaUrl || undefined,
    fileName: message.fileName || undefined,
    fileSize: message.fileSize || undefined,
    status: message.status || 'delivered',
    timestamp: new Date(message.timestamp || Date.now()).getTime(),
    replyTo: message.replyTo ? message.replyTo.toString() : undefined,
    forwarded: Boolean(message.forwarded),
    edited: Boolean(message.edited),
    editedAt: message.editedAt ? new Date(message.editedAt).getTime() : undefined,
    deletedFor: (message.deletedFor || []).map(id => id.toString()),
    starred: Boolean(message.starred),
    reactions: Object.fromEntries(
      message.reactions && typeof message.reactions.entries === 'function'
        ? Array.from(message.reactions.entries())
        : Object.entries(message.reactions || {}),
    ),
  };
}

function serializeChat(chat, currentUserId, usersById) {
  const participantIds = (chat.participantIds || []).map(id => id.toString());
  const otherUserId = participantIds.find(id => id !== currentUserId) || participantIds[0] || '';
  const otherUser = usersById.get(otherUserId);

  return {
    id: chat._id.toString(),
    type: 'dm',
    name: otherUser?.name || 'Direct Message',
    avatar: otherUser?.avatar || '🧑',
    participants: participantIds,
    lastMessage: chat.lastMessage || '',
    lastTime: new Date(chat.lastTime || chat.createdAt || Date.now()).getTime(),
    unreadCount: 0,
    pinned: false,
    muted: false,
    archived: false,
    wallpaper: '',
    disappearing: 'off',
  };
}

async function comparePassword(inputPassword, storedPassword) {
  if (!storedPassword) return false;
  if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
    return bcrypt.compare(inputPassword, storedPassword);
  }
  return inputPassword === storedPassword;
}

async function findOrCreateDirectChat(userIdA, userIdB) {
  const participantIds = [userIdA, userIdB].sort();
  let chat = await Chat.findOne({
    type: 'dm',
    participantIds: { $all: participantIds, $size: 2 },
  });

  if (!chat) {
    chat = await Chat.create({
      type: 'dm',
      participantIds: participantIds.map(id => new Types.ObjectId(id)),
      lastMessage: '',
      lastTime: new Date(),
      createdAt: new Date(),
    });
  }

  return chat;
}

async function buildBootstrap(userId) {
  await connectToDatabase();

  const users = await User.find({}).sort({ createdAt: 1 });
  const usersById = new Map(users.map(user => [user._id.toString(), user]));
  const currentUser = usersById.get(userId);
  if (!currentUser) {
    throw new Error('User not found.');
  }

  const otherUsers = users.filter(user => user._id.toString() !== userId);
  const chats = [];
  const messagesByChat = {};

  for (const otherUser of otherUsers) {
    const chat = await findOrCreateDirectChat(userId, otherUser._id.toString());
    chats.push(chat);
  }

  const chatIds = chats.map(chat => chat._id);
  const rawMessages = chatIds.length > 0
    ? await Message.find({ chatId: { $in: chatIds } }).sort({ timestamp: 1 })
    : [];

  rawMessages.forEach(message => {
    const chatId = message.chatId.toString();
    if (!messagesByChat[chatId]) messagesByChat[chatId] = [];
    messagesByChat[chatId].push(serializeMessage(message));
  });

  return {
    currentUser: serializeUser(currentUser),
    users: users.map(serializeUser),
    chats: chats
      .sort((a, b) => new Date(b.lastTime || b.createdAt).getTime() - new Date(a.lastTime || a.createdAt).getTime())
      .map(chat => serializeChat(chat, userId, usersById)),
    messagesByChat,
    groups: [],
    communities: [],
    contacts: otherUsers.map(otherUser => ({
      id: `contact-${otherUser._id.toString()}`,
      name: otherUser.name || '',
      username: otherUser.username || '',
      userId: otherUser._id.toString(),
      addedAt: new Date(otherUser.createdAt || Date.now()).getTime(),
    })),
  };
}

function ensureObjectId(value, fieldName) {
  if (!isValidObjectId(value)) {
    const error = new Error(`Invalid ${fieldName}.`);
    error.statusCode = 400;
    throw error;
  }
  return new Types.ObjectId(value);
}

app.get('/health', async (_req, res) => {
  try {
    await connectToDatabase();
    res.json({ ok: true, port: PORT, mongo: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, port: PORT, mongo: 'error', message: error.message });
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    await connectToDatabase();
    res.json({ ok: true, mongo: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, mongo: 'error', message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    await connectToDatabase();
    const { emailOrUsername, password } = req.body || {};
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });

    if (!user || !(await comparePassword(password, user.password))) {
      res.status(401).json({ ok: false, message: 'Invalid credentials.' });
      return;
    }

    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    const bootstrap = await buildBootstrap(user._id.toString());
    res.json({ ok: true, ...bootstrap });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, message: error.message });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    await connectToDatabase();
    const { name, username, email, mobile, password, avatar } = req.body || {};
    if (!name || !username || !email || !password) {
      res.status(400).json({ ok: false, message: 'Missing required fields.' });
      return;
    }

    const existing = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existing) {
      res.status(409).json({ ok: false, message: 'Email or username already taken.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      username,
      email,
      mobile: mobile || '',
      password: hashedPassword,
      avatar: avatar || '🧑',
      bio: 'Hey there! I am using ZenTalk.',
      blockedUserIds: [],
      status: 'online',
      lastSeen: new Date(),
      createdAt: new Date(),
    });

    const bootstrap = await buildBootstrap(user._id.toString());
    res.status(201).json({ ok: true, ...bootstrap });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, message: error.message });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    await connectToDatabase();
    const { userId } = req.body || {};
    if (isValidObjectId(userId)) {
      await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() });
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get('/api/bootstrap/:userId', async (req, res) => {
  try {
    const bootstrap = await buildBootstrap(req.params.userId);
    res.json({ ok: true, ...bootstrap });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, message: error.message });
  }
});

app.patch('/api/users/:userId', async (req, res) => {
  try {
    await connectToDatabase();
    const allowedFields = ['name', 'mobile', 'avatar', 'bio', 'status', 'blockedUserIds'];
    const updates = Object.fromEntries(
      Object.entries(req.body || {}).filter(([key]) => allowedFields.includes(key)),
    );

    const user = await User.findByIdAndUpdate(req.params.userId, updates, { new: true });
    if (!user) {
      res.status(404).json({ ok: false, message: 'User not found.' });
      return;
    }

    res.json({ ok: true, user: serializeUser(user) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, message: error.message });
  }
});

app.post('/api/messages/dm', async (req, res) => {
  try {
    await connectToDatabase();
    const {
      fromUserId,
      toUserId,
      text = '',
      replyTo = null,
      mediaUrl = '',
      type = 'text',
    } = req.body || {};

    const senderId = ensureObjectId(fromUserId, 'fromUserId');
    const recipientId = ensureObjectId(toUserId, 'toUserId');
    const chat = await findOrCreateDirectChat(senderId.toString(), recipientId.toString());

    const message = await Message.create({
      chatId: chat._id,
      senderId,
      text,
      type,
      mediaUrl,
      status: 'delivered',
      timestamp: new Date(),
      replyTo: replyTo && isValidObjectId(replyTo) ? new Types.ObjectId(replyTo) : null,
      forwarded: false,
      edited: false,
      deletedFor: [],
      starred: false,
      reactions: {},
    });

    chat.lastMessage = text || (type === 'audio' ? 'Voice message' : type === 'image' ? 'Image' : 'Attachment');
    chat.lastTime = message.timestamp;
    await chat.save();

    const users = await User.find({ _id: { $in: chat.participantIds } });
    const usersById = new Map(users.map(user => [user._id.toString(), user]));
    const serializedChatForSender = serializeChat(chat, senderId.toString(), usersById);
    const serializedChatForRecipient = serializeChat(chat, recipientId.toString(), usersById);
    const serializedMessage = serializeMessage(message);

    emitToUser(senderId.toString(), 'message-created', {
      chat: serializedChatForSender,
      message: serializedMessage,
    });
    emitToUser(recipientId.toString(), 'message-created', {
      chat: serializedChatForRecipient,
      message: serializedMessage,
    });

    res.status(201).json({
      ok: true,
      chat: serializedChatForSender,
      message: serializedMessage,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, message: error.message });
  }
});

io.on('connection', socket => {
  socket.on('register-user', ({ userId }) => {
    if (!userId) return;
    getSocketSet(userId).add(socket.id);
    socketUsers.set(socket.id, userId);
    socket.emit('registered', { userId, socketId: socket.id });
  });

  socket.on('call-user', payload => {
    const room = getOrCreateRoom(payload.callId, payload.fromUserId, payload.chatId, payload.targetUserIds);
    payload.targetUserIds.forEach(targetUserId => room.invitedUsers.add(targetUserId));

    let deliveredCount = 0;
    payload.targetUserIds.forEach(targetUserId => {
      const delivered = emitToUser(targetUserId, 'incoming-call', payload);
      if (delivered) deliveredCount += 1;
    });

    if (deliveredCount === 0) {
      socket.emit('call-failed', {
        callId: payload.callId,
        message: 'None of the invited users are currently connected.',
      });
      callRooms.delete(payload.callId);
    }
  });

  socket.on('join-call', payload => {
    const room = getOrCreateRoom(payload.callId, payload.fromUserId, payload.chatId);
    room.participants.add(payload.fromUserId);
    room.invitedUsers.delete(payload.fromUserId);

    room.participants.forEach(participantId => {
      if (participantId !== payload.fromUserId) {
        emitToUser(participantId, 'participant-joined', {
          callId: payload.callId,
          userId: payload.fromUserId,
        });
      }
    });
  });

  socket.on('webrtc-offer', payload => {
    emitToUser(payload.toUserId, 'webrtc-offer', payload);
  });

  socket.on('webrtc-answer', payload => {
    emitToUser(payload.toUserId, 'webrtc-answer', payload);
  });

  socket.on('ice-candidate', payload => {
    emitToUser(payload.toUserId, 'ice-candidate', payload);
  });

  socket.on('call-control', payload => {
    const room = callRooms.get(payload.callId);
    if (!room) return;
    room.participants.forEach(participantId => {
      if (participantId !== payload.fromUserId) {
        emitToUser(participantId, 'call-control-updated', payload);
      }
    });
  });

  socket.on('call-rejected', payload => {
    const room = callRooms.get(payload.callId);
    if (!room) return;
    room.participants.forEach(participantId => {
      if (participantId !== payload.fromUserId) {
        emitToUser(participantId, 'call-rejected', payload);
      }
    });
    room.invitedUsers.delete(payload.fromUserId);
  });

  socket.on('leave-call', payload => {
    leaveRoom(payload.callId, payload.fromUserId);
  });

  socket.on('call-ended', payload => {
    leaveRoom(payload.callId, payload.fromUserId, { endRoom: true });
  });

  socket.on('disconnect', () => {
    const userId = socketUsers.get(socket.id);
    if (userId) {
      callRooms.forEach((room, callId) => {
        if (room.participants.has(userId) && !(userSockets.get(userId)?.size > 1)) {
          leaveRoom(callId, userId);
        }
      });
    }
    removeSocket(socket.id);
  });
});

httpServer.listen(PORT, async () => {
  try {
    await connectToDatabase();
    console.log(`ZenTalk realtime server listening on http://localhost:${PORT}`);
  } catch (error) {
    console.error('ZenTalk server started without Mongo connection:', error.message);
    console.log(`ZenTalk realtime server listening on http://localhost:${PORT}`);
  }
});
