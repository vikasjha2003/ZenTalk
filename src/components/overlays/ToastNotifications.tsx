import { useApp } from '@/contexts/AppContext';
import { BellRing, PhoneCall, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import UserAvatar from '@/components/ui/user-avatar';

export default function ToastNotifications() {
  const { toasts, dismissToast, setActiveChat, chats } = useApp();

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[90] flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map(toast => {
          const isCall = toast.kind === 'call';
          const isSystem = toast.kind === 'system';
          const AccentIcon = isCall ? PhoneCall : isSystem ? Sparkles : BellRing;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.92 }}
              transition={{ duration: 0.22, ease: 'easeOut' as const }}
              className="pointer-events-auto relative w-80 cursor-pointer overflow-hidden rounded-[22px] border border-border bg-card/95 shadow-2xl backdrop-blur"
              onClick={() => {
                const chat = chats.find(c => c.id === toast.chatId);
                if (chat) setActiveChat(chat);
                dismissToast(toast.id);
              }}
            >
              <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-r ${toast.accent ?? 'from-primary/15 to-primary/5'}`} />
              <div className="relative p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      avatar={toast.avatar}
                      name={toast.title}
                      className="h-12 w-12 rounded-2xl text-2xl shadow-sm ring-1 ring-border/70"
                      fallbackClassName="bg-background/90 text-2xl"
                    />
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">{toast.title}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          <AccentIcon className="h-3 w-3" />
                          {isCall ? 'Call' : isSystem ? 'Preview' : 'Message'}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{toast.message}</p>
                    </div>
                  </div>
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      dismissToast(toast.id);
                    }}
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                    ZenTalk Notification
                  </p>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                    Open chat
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
