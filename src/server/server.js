import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

const PORT = Number(process.env.PORT || 3001);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*' },
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

app.get('/health', (_req, res) => {
  res.json({ ok: true, port: PORT });
});

io.on('connection', (socket) => {
  socket.on('register-user', ({ userId }) => {
    if (!userId) return;
    getSocketSet(userId).add(socket.id);
    socketUsers.set(socket.id, userId);
    socket.emit('registered', { userId, socketId: socket.id });
  });

  socket.on('call-user', (payload) => {
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

  socket.on('join-call', (payload) => {
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

  socket.on('webrtc-offer', (payload) => {
    emitToUser(payload.toUserId, 'webrtc-offer', payload);
  });

  socket.on('webrtc-answer', (payload) => {
    emitToUser(payload.toUserId, 'webrtc-answer', payload);
  });

  socket.on('ice-candidate', (payload) => {
    emitToUser(payload.toUserId, 'ice-candidate', payload);
  });

  socket.on('call-control', (payload) => {
    const room = callRooms.get(payload.callId);
    if (!room) return;
    room.participants.forEach(participantId => {
      if (participantId !== payload.fromUserId) {
        emitToUser(participantId, 'call-control-updated', payload);
      }
    });
  });

  socket.on('call-rejected', (payload) => {
    const room = callRooms.get(payload.callId);
    if (!room) return;

    room.participants.forEach(participantId => {
      if (participantId !== payload.fromUserId) {
        emitToUser(participantId, 'call-rejected', payload);
      }
    });
    room.invitedUsers.delete(payload.fromUserId);
  });

  socket.on('leave-call', (payload) => {
    leaveRoom(payload.callId, payload.fromUserId);
  });

  socket.on('call-ended', (payload) => {
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

httpServer.listen(PORT, () => {
  console.log(`ZenTalk signaling server listening on http://localhost:${PORT}`);
});
