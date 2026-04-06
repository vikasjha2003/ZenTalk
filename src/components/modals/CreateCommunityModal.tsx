import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { X, Globe } from 'lucide-react';

const ICONS = ['🌐', '🏢', '🎓', '🎮', '🎨', '🚀', '💼', '🌍', '🏆', '📚', '🎵', '💡', '🔬', '🌱', '⚡'];

export default function CreateCommunityModal() {
  const { createCommunity, setShowCreateCommunity } = useApp();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🌐');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!name.trim()) { setError('Please enter a community name'); return; }
    createCommunity(name.trim(), icon, description);
    setShowCreateCommunity(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-foreground text-lg">New Community</h2>
          <button onClick={() => setShowCreateCommunity(false)}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Community Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(i => (
                <button key={i} onClick={() => setIcon(i)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    icon === i ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'bg-muted hover:bg-muted/80'
                  }`}>
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Community Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Enter community name"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What's this community about?"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium text-foreground mb-1">🌐 About Communities</p>
            <p className="text-xs text-muted-foreground">
              Communities contain channels for organized discussions. A default #general channel will be created automatically.
              You can add more channels and invite members after creation.
            </p>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button onClick={() => setShowCreateCommunity(false)}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleCreate}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98]">
            <Globe className="w-4 h-4" /> Create Community
          </button>
        </div>
      </div>
    </div>
  );
}
