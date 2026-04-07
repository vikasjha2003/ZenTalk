import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  mobile: { type: String, default: '' },
  password: { type: String, required: true },
  avatar: { type: String, default: '🧑' },
  bio: { type: String, default: 'Hey there! I am using ZenTalk.' },
  blockedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  status: { type: String, enum: ['online', 'offline', 'away'], default: 'offline' },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'users',
  versionKey: false,
});

const chatSchema = new mongoose.Schema({
  type: { type: String, enum: ['dm'], default: 'dm', index: true },
  participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }],
  lastMessage: { type: String, default: '' },
  lastTime: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'chats',
  versionKey: false,
});

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, default: '' },
  type: { type: String, enum: ['text', 'image', 'video', 'document', 'audio'], default: 'text' },
  mediaUrl: { type: String, default: '' },
  fileName: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  status: { type: String, enum: ['sending', 'sent', 'delivered', 'read'], default: 'delivered' },
  timestamp: { type: Date, default: Date.now, index: true },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  forwarded: { type: Boolean, default: false },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  starred: { type: Boolean, default: false },
  reactions: { type: Map, of: [String], default: {} },
}, {
  collection: 'messages',
  versionKey: false,
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Chat = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
