import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { ZenMessage } from '@/lib/zentalk-types';
import {
  Check, CheckCheck, MoreVertical, Reply, Forward, Edit2, Trash2,
  Copy, Star, StarOff, Download, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  message: ZenMessage;
  isOwn: boolean;
  onReply: (msg: ZenMessage) => void;
  onForward: (msg: ZenMessage) => void;
  onEdit: (msg: ZenMessage) => void;
  highlighted?: boolean;
}

function StatusIcon({ status }: { status: ZenMessage['status'] }) {
  if (status === 'sending') return <Check className="w-3 h-3 text-white/60" />;
  if (status === 'sent') return <Check className="w-3 h-3 text-white/80" />;
  if (status === 'delivered') return <CheckCheck className="w-3 h-3 text-white/80" />;
  return <CheckCheck className="w-3 h-3 text-blue-300" />;
}

export default function MessageBubble({ message, isOwn, onReply, onForward, onEdit, highlighted }: Props) {
  const { currentUser, allUsers, messages, deleteMessage, toggleStar, starredIds } = useApp();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);
  const isDeleted = message.deletedFor.includes(currentUser?.id || '');
  const isStarred = starredIds.includes(message.id);

  const sender = allUsers.find(u => u.id === message.senderId);
  const replyMsg = message.replyTo ? messages.find(m => m.id === message.replyTo) : null;
  const replySender = replyMsg ? allUsers.find(u => u.id === replyMsg.senderId) : null;

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text).catch(() => {});
    setShowMenu(false);
  };

  if (isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4 py-0.5`}>
        <div className="px-4 py-2 rounded-2xl bg-muted/50 text-muted-foreground text-sm italic max-w-xs">
          🚫 This message was deleted
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        ref={bubbleRef}
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' as const }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4 py-0.5 group`}
        onContextMenu={handleContextMenu}
      >
        {/* Avatar for received */}
        {!isOwn && (
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm mr-2 mt-auto mb-1 flex-shrink-0">
            {sender?.avatar || '?'}
          </div>
        )}

        <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Sender name (groups) */}
          {!isOwn && sender && (
            <span className="text-xs font-semibold text-primary mb-1 px-1">{sender.name}</span>
          )}

          {/* Bubble */}
          <div className={`relative rounded-2xl px-3 py-2 shadow-sm ${
            isOwn
              ? 'bg-primary text-white rounded-br-sm'
              : 'bg-card text-foreground border border-border rounded-bl-sm'
          } ${highlighted ? 'ring-2 ring-yellow-400' : ''}`}>

            {/* Forwarded label */}
            {message.forwarded && (
              <div className={`flex items-center gap-1 text-xs mb-1 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                <Forward className="w-3 h-3" />
                <span>Forwarded</span>
              </div>
            )}

            {/* Reply preview */}
            {replyMsg && (
              <div className={`mb-2 px-2 py-1.5 rounded-lg border-l-2 ${
                isOwn ? 'bg-white/10 border-white/40' : 'bg-muted border-primary'
              }`}>
                <p className={`text-xs font-semibold mb-0.5 ${isOwn ? 'text-white/80' : 'text-primary'}`}>
                  {replySender?.name || 'Unknown'}
                </p>
                <p className={`text-xs truncate ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                  {replyMsg.text}
                </p>
              </div>
            )}

            {/* Media */}
            {message.mediaUrl && message.type === 'image' && (
              <img src={message.mediaUrl} alt="media" className="rounded-lg max-w-full mb-2 max-h-48 object-cover" />
            )}
            {message.mediaUrl && message.type === 'document' && (
              <div className={`flex items-center gap-2 mb-2 p-2 rounded-lg ${isOwn ? 'bg-white/10' : 'bg-muted'}`}>
                <FileText className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs truncate">{message.fileName || 'Document'}</span>
                <Download className="w-4 h-4 flex-shrink-0" />
              </div>
            )}

            {/* Text */}
            {message.text && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
            )}

            {/* Meta row */}
            <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? 'justify-end' : 'justify-end'}`}>
              {isStarred && <Star className={`w-2.5 h-2.5 ${isOwn ? 'text-yellow-300' : 'text-yellow-500'}`} />}
              {message.edited && (
                <span className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-muted-foreground'}`}>edited</span>
              )}
              <span className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                {formatTime(message.timestamp)}
              </span>
              {isOwn && <StatusIcon status={message.status} />}
            </div>
          </div>

          {/* Reactions */}
          {Object.keys(message.reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 px-1">
              {Object.entries(message.reactions).map(([emoji, users]) => (
                <span key={emoji} className="flex items-center gap-0.5 bg-card border border-border rounded-full px-2 py-0.5 text-xs shadow-sm">
                  {emoji} <span className="text-muted-foreground">{users.length}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Quick action button */}
        <button
          onClick={e => { e.stopPropagation(); setMenuPos({ x: e.clientX, y: e.clientY }); setShowMenu(true); }}
          className={`opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0 self-center ${isOwn ? 'order-first mr-1' : 'ml-1'}`}>
          <MoreVertical className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Context Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="fixed z-50 bg-card border border-border rounded-xl shadow-xl py-1 w-44 overflow-hidden"
              style={{
                left: Math.min(menuPos.x, window.innerWidth - 180),
                top: Math.min(menuPos.y, window.innerHeight - 300),
              }}
            >
              {[
                { icon: Reply, label: 'Reply', action: () => { onReply(message); setShowMenu(false); } },
                { icon: Forward, label: 'Forward', action: () => { onForward(message); setShowMenu(false); } },
                ...(isOwn ? [{ icon: Edit2, label: 'Edit', action: () => { onEdit(message); setShowMenu(false); } }] : []),
                { icon: Copy, label: 'Copy', action: handleCopy },
                { icon: isStarred ? StarOff : Star, label: isStarred ? 'Unstar' : 'Star', action: () => { toggleStar(message.id); setShowMenu(false); } },
                { icon: Trash2, label: 'Delete', action: () => { deleteMessage(message.id); setShowMenu(false); }, danger: true },
              ].map(({ icon: Icon, label, action, danger }) => (
                <button key={label} onClick={action}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors ${danger ? 'text-destructive' : 'text-foreground'}`}>
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
