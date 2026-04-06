import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { X, Users, Clock } from 'lucide-react';

const ICONS = ['👥', '🚀', '💼', '🎯', '🔥', '⚡', '🌟', '🎮', '🎨', '🏆', '🌍', '💡', '🎵', '📚', '🏋️'];

export default function CreateGroupModal() {
  const { allUsers, currentUser, createGroup, setShowCreateGroup } = useApp();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('👥');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isTemporary, setIsTemporary] = useState(false);
  const [expiryHours, setExpiryHours] = useState(24);
  const [error, setError] = useState('');

  const availableUsers = allUsers.filter(u => u.id !== currentUser?.id);

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = () => {
    if (!name.trim()) { setError('Please enter a group name'); return; }
    if (selectedMembers.length === 0) { setError('Please add at least one member'); return; }
    const expiresAt = isTemporary ? Date.now() + expiryHours * 3600000 : undefined;
    createGroup(name.trim(), icon, description, selectedMembers, isTemporary, expiresAt);
    setShowCreateGroup(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-foreground text-lg">New Group</h2>
          <button onClick={() => setShowCreateGroup(false)}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>}

          {/* Icon picker */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Group Icon</label>
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

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Group Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          {/* Temporary group */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Temporary Group</span>
              </div>
              <button onClick={() => setIsTemporary(p => !p)}
                className={`w-11 h-6 rounded-full transition-colors relative ${isTemporary ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isTemporary ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {isTemporary && (
              <div className="mt-3">
                <label className="block text-xs text-muted-foreground mb-1.5">Auto-delete after</label>
                <select value={expiryHours} onChange={e => setExpiryHours(Number(e.target.value))}
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={72}>3 days</option>
                  <option value={168}>1 week</option>
                </select>
              </div>
            )}
          </div>

          {/* Members */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Add Members ({selectedMembers.length} selected)
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {availableUsers.map(user => (
                <label key={user.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/60 cursor-pointer transition-colors">
                  <input type="checkbox" checked={selectedMembers.includes(user.id)}
                    onChange={() => toggleMember(user.id)}
                    className="w-4 h-4 rounded accent-primary" />
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-lg">{user.avatar}</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button onClick={() => setShowCreateGroup(false)}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleCreate}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98]">
            <Users className="w-4 h-4" /> Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
