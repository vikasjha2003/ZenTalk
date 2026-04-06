import { useApp } from '@/contexts/AppContext';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ToastNotifications() {
  const { toasts, dismissToast, setActiveChat, chats } = useApp();

  return (
    <div className="fixed top-4 right-4 z-[90] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' as const }}
            className="pointer-events-auto bg-card border border-border rounded-2xl shadow-xl p-3 w-72 cursor-pointer hover:shadow-2xl transition-shadow"
            onClick={() => {
              const chat = chats.find(c => c.id === toast.chatId);
              if (chat) setActiveChat(chat);
              dismissToast(toast.id);
            }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
                {toast.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{toast.title}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{toast.message}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); dismissToast(toast.id); }}
                className="w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
