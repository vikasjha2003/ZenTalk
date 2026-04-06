import { useApp } from '@/contexts/AppContext';
import { X, Star } from 'lucide-react';
import * as store from '@/lib/zentalk-store';

export default function StarredModal() {
  const { setShowStarred, starredIds, allUsers, chats, setActiveChat, toggleStar } = useApp();

  const starredMessages = starredIds.map(id => {
    const allMsgs = store.getAllMessages();
    for (const chatId in allMsgs) {
      const msg = allMsgs[chatId].find(m => m.id === id);
      if (msg) return { msg, chatId };
    }
    return null;
  }).filter(Boolean) as { msg: any; chatId: string }[];

  const handleGoToMessage = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) { setActiveChat(chat); setShowStarred(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <h2 className="font-bold text-foreground text-lg">Starred Messages</h2>
          </div>
          <button onClick={() => setShowStarred(false)}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {starredMessages.length === 0 ? (
            <div className="p-12 text-center">
              <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No starred messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">Long-press or right-click a message to star it</p>
            </div>
          ) : starredMessages.map(({ msg, chatId }) => {
            const sender = allUsers.find(u => u.id === msg.senderId);
            const chat = chats.find(c => c.id === chatId);
            return (
              <div key={msg.id} className="px-4 py-3 border-b border-border hover:bg-muted/60 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                    {sender?.avatar || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-primary">{sender?.name}</span>
                      <span className="text-xs text-muted-foreground">{chat?.name}</span>
                    </div>
                    <p className="text-sm text-foreground">{msg.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => handleGoToMessage(chatId)}
                      className="text-xs text-primary hover:underline">Go to</button>
                    <button onClick={() => toggleStar(msg.id)}
                      className="text-xs text-muted-foreground hover:text-destructive">Unstar</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
