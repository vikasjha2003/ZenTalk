import { useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { MemberPermissions, RoleLabels, UserRole } from '@/lib/zentalk-types';
import UserAvatar from '@/components/ui/user-avatar';
import {
  X, Phone, Video, UserMinus, Shield, Crown, Edit2, Check, Trash2,
  Plus, Hash, Megaphone, Clock, Users, ChevronDown, ChevronRight,
  UserCog, UserPlus
} from 'lucide-react';
import * as store from '@/lib/zentalk-store';

const CHAT_WALLPAPER_PRESETS = [
  { id: 'default', label: 'Default', preview: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)', value: '' },
  { id: 'sage', label: 'Sage', preview: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', value: 'linear-gradient(135deg, rgba(220,252,231,0.9) 0%, rgba(187,247,208,0.92) 100%)' },
  { id: 'ocean', label: 'Ocean', preview: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', value: 'linear-gradient(135deg, rgba(219,234,254,0.9) 0%, rgba(191,219,254,0.92) 100%)' },
  { id: 'sunset', label: 'Sunset', preview: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', value: 'linear-gradient(135deg, rgba(255,237,213,0.92) 0%, rgba(254,215,170,0.94) 100%)' },
  { id: 'rose', label: 'Rose', preview: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)', value: 'linear-gradient(135deg, rgba(255,228,230,0.92) 0%, rgba(254,205,211,0.94) 100%)' },
  { id: 'violet', label: 'Violet', preview: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', value: 'linear-gradient(135deg, rgba(237,233,254,0.9) 0%, rgba(221,214,254,0.92) 100%)' },
  { id: 'midnight', label: 'Midnight', preview: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', value: 'linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.95) 100%)' },
  { id: 'forest', label: 'Forest', preview: 'linear-gradient(135deg, #052e16 0%, #166534 100%)', value: 'linear-gradient(135deg, rgba(5,46,22,0.96) 0%, rgba(22,101,52,0.95) 100%)' },
  { id: 'aurora', label: 'Aurora', preview: 'linear-gradient(135deg, #082f49 0%, #164e63 50%, #083344 100%)', value: 'radial-gradient(circle at top left, rgba(34,211,238,0.16), transparent 35%), linear-gradient(135deg, rgba(8,47,73,0.98) 0%, rgba(22,78,99,0.97) 50%, rgba(8,51,68,0.98) 100%)' },
];

const PERMISSION_OPTIONS: Array<{ key: keyof MemberPermissions; label: string }> = [
  { key: 'sendMessages', label: 'Send messages' },
  { key: 'deleteMessages', label: 'Delete messages' },
  { key: 'addGroup', label: 'Add group' },
  { key: 'removeGroup', label: 'Remove group' },
  { key: 'addMember', label: 'Add member' },
  { key: 'removeMember', label: 'Remove member' },
  { key: 'addChannel', label: 'Add channel' },
  { key: 'removeChannel', label: 'Remove channel' },
  { key: 'assignPositions', label: 'Assign positions' },
  { key: 'adminsOnlyMessagesToggle', label: 'Admins only message toggle' },
  { key: 'viewMessages', label: 'See messages' },
];

const DEFAULT_ROLE_LABELS: RoleLabels = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Moderator',
  member: 'Member',
};

const getAssignableRoles = (actorRole?: UserRole | null) => {
  if (actorRole === 'owner') return ['admin', 'moderator', 'member'] as UserRole[];
  if (actorRole === 'admin') return ['moderator', 'member'] as UserRole[];
  return [] as UserRole[];
};

// ─── Add Channel Modal ────────────────────────────────────────────────────────
function AddChannelModal({ communityId, onClose }: { communityId: string; onClose: () => void }) {
  const { addChannelToCommunity } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [isTemporary, setIsTemporary] = useState(false);
  const [expiryHours, setExpiryHours] = useState(24);
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!name.trim()) { setError('Channel name is required'); return; }
    const expiresAt = isTemporary ? Date.now() + expiryHours * 3600000 : undefined;
    addChannelToCommunity(communityId, name.trim(), description, isBroadcast, isTemporary, expiresAt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">Add Channel</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Channel Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. announcements"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What's this channel for?"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          {/* Broadcast toggle */}
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Broadcast Channel</p>
                <p className="text-xs text-muted-foreground">Only admins/mods can send</p>
              </div>
            </div>
            <Toggle checked={isBroadcast} onChange={setIsBroadcast} />
          </div>
          {/* Temporary toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Temporary Channel</p>
                <p className="text-xs text-muted-foreground">Auto-deletes after a set time</p>
              </div>
            </div>
            <Toggle checked={isTemporary} onChange={setIsTemporary} />
          </div>
          {isTemporary && (
            <select value={expiryHours} onChange={e => setExpiryHours(Number(e.target.value))}
              className="w-full text-sm bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value={1}>Expires in 1 hour</option>
              <option value={6}>Expires in 6 hours</option>
              <option value={24}>Expires in 24 hours</option>
              <option value={72}>Expires in 3 days</option>
              <option value={168}>Expires in 1 week</option>
            </select>
          )}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleCreate} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">Create</button>
        </div>
      </div>
    </div>
  );
}

// ─── Add/Create Group in Community Modal ─────────────────────────────────────
function AddGroupModal({ communityId, onClose }: { communityId: string; onClose: () => void }) {
  const { groups, communities, addGroupToCommunity, createCommunityGroup, currentUser, allUsers } = useApp();
  const [mode, setMode] = useState<'existing' | 'create'>('existing');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('👥');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [error, setError] = useState('');

  const community = communities.find(item => item.id === communityId);
  const linkedGroupIds = new Set(community?.linkedGroupIds ?? []);
  const availableGroups = groups.filter(group => !linkedGroupIds.has(group.id));
  const availableUsers = allUsers.filter(user => user.id !== currentUser?.id && community?.members.some(member => member.userId === user.id));

  const handleAdd = () => {
    if (!selectedGroupId) return;
    addGroupToCommunity(communityId, selectedGroupId);
    onClose();
  };

  const handleCreate = () => {
    if (!name.trim()) { setError('Group name is required'); return; }
    const expiresAt = undefined;
    createCommunityGroup(communityId, name.trim(), icon, description, selectedMembers, false, expiresAt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">Community Groups</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex border-b border-border">
          {(['existing', 'create'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setMode(tab); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-medium ${mode === tab ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            >
              {tab === 'existing' ? 'Add Existing' : 'Create New'}
            </button>
          ))}
        </div>
        {mode === 'existing' ? (
          <div className="p-5 space-y-3">
            {availableGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No unlinked groups available. Create one in this community.</p>
            ) : availableGroups.map(g => (
              <label key={g.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 cursor-pointer transition-colors">
                <input type="radio" name="group" value={g.id} checked={selectedGroupId === g.id}
                  onChange={() => setSelectedGroupId(g.id)} className="accent-primary" />
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-lg">{g.icon}</div>
                <div>
                  <p className="text-sm font-medium text-foreground">{g.name}</p>
                  <p className="text-xs text-muted-foreground">{g.members.length} members</p>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Group name"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <div className="flex flex-wrap gap-2">
              {['👥', '🎓', '📚', '🏫', '🧪', '💼', '🎯', '🌐'].map(choice => (
                <button key={choice} onClick={() => setIcon(choice)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${icon === choice ? 'bg-primary/20 ring-2 ring-primary' : 'bg-muted'}`}>
                  {choice}
                </button>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add Members</p>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {availableUsers.map(user => (
                  <label key={user.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted/60">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(user.id)}
                      onChange={() => setSelectedMembers(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])}
                      className="accent-primary"
                    />
                    <div className="text-sm text-foreground">{user.name}</div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
          <button
            onClick={mode === 'existing' ? handleAdd : handleCreate}
            disabled={mode === 'existing' ? !selectedGroupId : !name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {mode === 'existing' ? 'Link Group' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCommunityMembersModal({ communityId, onClose }: { communityId: string; onClose: () => void }) {
  const { communities, allUsers, addMemberToCommunity } = useApp();
  const community = communities.find(item => item.id === communityId);
  const existingIds = new Set(community?.members.map(member => member.userId) ?? []);
  const candidates = allUsers.filter(user => !existingIds.has(user.id));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">Add Community Members</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-5 space-y-2">
          {candidates.length === 0 && <p className="text-sm text-muted-foreground">All available users are already in this community.</p>}
          {candidates.map(user => (
            <button
              key={user.id}
              onClick={() => { addMemberToCommunity(communityId, user.id, 'member'); onClose(); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-muted/60"
            >
              <UserAvatar
                avatar={user.avatar}
                name={user.name}
                className="h-9 w-9 text-lg"
                fallbackClassName="bg-primary/10 text-lg"
              />
              <div>
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Toggle helper ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[0.9rem]' : 'translate-x-0'}`} />
    </button>
  );
}

// ─── Permission Row ───────────────────────────────────────────────────────────
function PermRow({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-3 py-1.5 ${disabled ? 'opacity-40' : ''}`}>
      <span className="flex-1 pr-2 text-xs leading-4 text-foreground">{label}</span>
      <div className="mt-0.5 flex-shrink-0">
        <Toggle checked={checked} onChange={disabled ? () => {} : onChange} />
      </div>
    </div>
  );
}

// ─── Main InfoPanel ───────────────────────────────────────────────────────────
export default function InfoPanel() {
  const {
    activeChat, setActiveChat, setShowInfoPanel, allUsers, currentUser,
    refreshGroups, refreshChats, startCall, leaveGroup, kickMember,
    communities, groups, removeMemberFromCommunity,
    removeGroupFromCommunity,
    updateCommunityRole, updateCommunityRoleLabels, toggleCommunityAdminsOnlyMessages,
    updateMemberPermissions, updateGroupMemberPermissions, updateGroupMemberRole,
  } = useApp();

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingRoleLabels, setEditingRoleLabels] = useState(false);
  const [roleLabelsDraft, setRoleLabelsDraft] = useState<RoleLabels>(DEFAULT_ROLE_LABELS);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'media'>('info');
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  if (!activeChat) return null;

  const otherUserId = activeChat.type === 'dm'
    ? activeChat.participants.find(id => id !== currentUser?.id)
    : null;
  const otherUser = otherUserId ? allUsers.find(u => u.id === otherUserId) : null;
  const group = activeChat.groupId ? store.getGroupById(activeChat.groupId) : null;
  const community = activeChat.communityId ? communities.find(c => c.id === activeChat.communityId) : null;

  const currentMemberInGroup = group?.members.find(m => m.userId === currentUser?.id);
  const canManageGroup = Boolean(currentMemberInGroup?.permissions.assignPositions || currentMemberInGroup?.permissions.removeMember);

  const currentMemberInCommunity = community?.members.find(m => m.userId === currentUser?.id);
  const isCommunityOwner = currentMemberInCommunity?.role === 'owner';
  const canManageCommunity = Boolean(currentMemberInCommunity?.permissions.assignPositions || currentMemberInCommunity?.permissions.addGroup || currentMemberInCommunity?.permissions.addMember || isCommunityOwner);
  const roleLabels = community?.roleLabels ?? DEFAULT_ROLE_LABELS;
  const linkedGroups = groups.filter(item => community?.linkedGroupIds.includes(item.id));

  const sharedMedia = store.getMessages(activeChat.id).filter(m => m.type === 'image' && m.mediaUrl);

  const handleSaveName = () => {
    if (group && newName.trim()) {
      store.updateGroup(group.id, { name: newName.trim() });
      store.updateChat(activeChat.id, { name: newName.trim() });
      refreshGroups();
      refreshChats();
    }
    setEditingName(false);
  };

  const handleRoleChange = (userId: string, role: UserRole) => {
    if (!group) return;
    updateGroupMemberRole(group.id, userId, role);
  };

  const handleCommunityRoleChange = (userId: string, role: UserRole) => {
    if (!community) return;
    updateCommunityRole(community.id, userId, role);
  };

  const handleWallpaperChange = (wallpaper: string) => {
    store.updateChat(activeChat.id, { wallpaper });
    const updatedChat = store.getChatById(activeChat.id);
    refreshChats();
    if (updatedChat) setActiveChat(updatedChat);
  };

  const handleWallpaperUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      handleWallpaperChange(`url(${reader.result}) center/cover no-repeat`);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const saveRoleLabels = () => {
    if (!community) return;
    updateCommunityRoleLabels(community.id, roleLabelsDraft);
    setEditingRoleLabels(false);
  };

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'members', label: activeChat.type === 'dm' ? 'About' : 'Members' },
    { id: 'media', label: 'Media' },
  ] as const;

  return (
    <>
      <div className="w-80 flex flex-col bg-card border-l border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <h3 className="font-semibold text-foreground text-sm">
            {activeChat.type === 'dm' ? 'Contact Info' : activeChat.type === 'group' ? 'Group Info' : 'Channel Info'}
          </h3>
          <button onClick={() => setShowInfoPanel(false)}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar + Name */}
        <div className="flex flex-col items-center py-5 px-4 border-b border-border flex-shrink-0">
          <UserAvatar
            avatar={activeChat.avatar}
            name={activeChat.name}
            className="mb-2 h-16 w-16 text-3xl"
            fallbackClassName="bg-primary/10 text-3xl"
          />
          {editingName && group ? (
            <div className="flex items-center gap-2">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus onKeyDown={e => e.key === 'Enter' && handleSaveName()} />
              <button onClick={handleSaveName} className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center">
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">{activeChat.name}</h2>
              {canManageGroup && group && (
                <button onClick={() => { setNewName(activeChat.name); setEditingName(true); }}
                  className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          {activeChat.type === 'dm' && otherUser && (
            <p className="text-xs text-muted-foreground mt-0.5">@{otherUser.username}</p>
          )}
          {activeChat.type === 'group' && (
            <p className="text-xs text-muted-foreground mt-0.5">{group?.members.length || 0} members</p>
          )}
          {activeChat.type === 'channel' && community && (
            <p className="text-xs text-muted-foreground mt-0.5">{community.name}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === t.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── INFO TAB ── */}
          {activeTab === 'info' && (
            <div className="space-y-0">
              {/* DM actions */}
              {activeChat.type === 'dm' && otherUser && (
                <div className="px-4 py-4 border-b border-border">
                  <div className="flex gap-2">
                    <button onClick={() => startCall(activeChat.id, 'audio')}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                      <Phone className="w-4 h-4" /> Call
                    </button>
                    <button onClick={() => startCall(activeChat.id, 'video')}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                      <Video className="w-4 h-4" /> Video
                    </button>
                  </div>
                </div>
              )}

              {/* Group description */}
              {group?.description && (
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-foreground">{group.description}</p>
                </div>
              )}

              <div className="px-4 py-4 border-b border-border">
                <div className="mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chat Background</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose a separate wallpaper theme for this conversation.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {CHAT_WALLPAPER_PRESETS.map(preset => {
                    const selected = activeChat.wallpaper === preset.value || (!activeChat.wallpaper && preset.value === '');
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleWallpaperChange(preset.value)}
                        className={`rounded-2xl border p-1.5 text-left transition-all ${
                          selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <div
                          className="h-16 rounded-xl border border-white/20"
                          style={{ background: preset.preview }}
                        />
                        <p className={`px-1 pt-2 text-[11px] font-medium ${selected ? 'text-primary' : 'text-foreground'}`}>
                          {preset.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <input
                  ref={wallpaperInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleWallpaperUpload}
                />
                <button
                  onClick={() => wallpaperInputRef.current?.click()}
                  className="mt-3 w-full rounded-2xl border border-dashed border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-muted/40"
                >
                  Upload From Device
                </button>
              </div>

              {/* Community channels */}
              {activeChat.type === 'channel' && community && (
                <>
                <div className="px-4 py-3 border-b border-border">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Channels</p>
                    {(isCommunityOwner || currentMemberInCommunity?.permissions.addChannel) && (
                      <button onClick={() => setShowAddChannel(true)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {community.channels.map(ch => (
                      <div key={ch.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/60 transition-colors">
                        {ch.isBroadcast ? <Megaphone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <Hash className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                        <span className="text-sm text-foreground flex-1 truncate">{ch.name}</span>
                        <div className="flex items-center gap-1">
                          {ch.isBroadcast && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">broadcast</span>}
                          {ch.isTemporary && <span className="text-[10px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />temp</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {(isCommunityOwner || currentMemberInCommunity?.permissions.addGroup) && (
                    <button onClick={() => setShowAddGroup(true)}
                      className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                      <Users className="w-3.5 h-3.5" /> Add or Create Group
                    </button>
                  )}
                </div>
                <div className="px-4 py-3 border-b border-border">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Community Groups</p>
                    {(isCommunityOwner || currentMemberInCommunity?.permissions.addGroup) && (
                      <button onClick={() => setShowAddGroup(true)} className="text-xs text-primary hover:underline">Manage</button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {linkedGroups.length === 0 && (
                      <p className="text-sm text-muted-foreground">No groups linked yet.</p>
                    )}
                    {linkedGroups.map(item => (
                      <div key={item.id} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-lg">{item.icon}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.members.length} members</p>
                        </div>
                        {(isCommunityOwner || currentMemberInCommunity?.permissions.removeGroup) && (
                          <button
                            onClick={() => removeGroupFromCommunity(community.id, item.id)}
                            className="rounded-lg p-2 text-destructive transition-colors hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-border">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role Titles</p>
                      <p className="mt-1 text-xs text-muted-foreground">Rename roles to match your community structure like Teachers or Students.</p>
                    </div>
                    {canManageCommunity && !editingRoleLabels && (
                      <button
                        onClick={() => { setRoleLabelsDraft(roleLabels); setEditingRoleLabels(true); }}
                        className="text-xs text-primary hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {editingRoleLabels ? (
                    <div className="space-y-2">
                      {(['owner', 'admin', 'moderator', 'member'] as const).map(role => (
                        <input
                          key={role}
                          value={roleLabelsDraft[role]}
                          onChange={e => setRoleLabelsDraft(prev => ({ ...prev, [role]: e.target.value }))}
                          placeholder={DEFAULT_ROLE_LABELS[role]}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      ))}
                      <div className="flex gap-2">
                        <button onClick={() => setEditingRoleLabels(false)} className="flex-1 rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:bg-muted">Cancel</button>
                        <button onClick={saveRoleLabels} className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90">Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {(['owner', 'admin', 'moderator', 'member'] as const).map(role => (
                        <div key={role} className="rounded-xl bg-muted/40 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{DEFAULT_ROLE_LABELS[role]}</p>
                          <p className="text-sm font-medium text-foreground">{roleLabels[role]}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admins Only Messaging</p>
                      <p className="mt-1 text-xs text-muted-foreground">Turn the community into announcement mode.</p>
                    </div>
                    <Toggle
                      checked={community.adminsOnlyMessages}
                      onChange={value => {
                        if (isCommunityOwner || currentMemberInCommunity?.permissions.adminsOnlyMessagesToggle) {
                          toggleCommunityAdminsOnlyMessages(community.id, value);
                        }
                      }}
                    />
                  </div>
                </div>
                </>
              )}

              {/* Danger zone */}
              <div className="px-4 py-3 space-y-1">
                {activeChat.type === 'group' && (
                  <button onClick={() => leaveGroup(activeChat.groupId!)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors">
                    <UserMinus className="w-4 h-4" /> Leave Group
                  </button>
                )}
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4" /> Delete Chat
                </button>
              </div>
            </div>
          )}

          {/* ── MEMBERS TAB ── */}
          {activeTab === 'members' && (
            <div>
              {/* DM About */}
              {activeChat.type === 'dm' && otherUser && (
                <div className="px-4 py-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bio</p>
                    <p className="text-sm text-foreground">{otherUser.bio || 'No bio yet'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${otherUser.status === 'online' ? 'bg-[#25D366]' : otherUser.status === 'away' ? 'bg-yellow-400' : 'bg-muted-foreground'}`} />
                      <span className="text-sm text-foreground capitalize">{otherUser.status}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Username</p>
                    <p className="text-sm text-foreground">@{otherUser.username}</p>
                  </div>
                </div>
              )}

              {/* Group Members */}
              {activeChat.type === 'group' && group && (
                <div className="py-2">
                  {group.members.map(member => {
                    const user = allUsers.find(u => u.id === member.userId);
                    if (!user) return null;
                    const isMe = user.id === currentUser?.id;
                    const isExpanded = expandedMember === member.userId;

                    return (
                      <div key={member.userId}>
                        <div
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors cursor-pointer"
                          onClick={() => setExpandedMember(isExpanded ? null : member.userId)}
                        >
                          <UserAvatar
                            avatar={user.avatar}
                            name={user.name}
                            className="h-9 w-9 flex-shrink-0 text-lg"
                            fallbackClassName="bg-primary/10 text-lg"
                          />
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-foreground truncate">{user.name}{isMe ? ' (You)' : ''}</span>
                              {(member.role === 'owner' || member.role === 'admin') && <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                              {member.role === 'moderator' && <Shield className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                            </div>
                            <p className="truncate text-xs text-muted-foreground capitalize">{member.role}</p>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1 self-center">
                            {currentMemberInGroup?.permissions.removeMember && !isMe && member.role !== 'owner' && (
                              <button onClick={e => { e.stopPropagation(); kickMember(group.id, member.userId); }}
                                className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive transition-colors">
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canManageGroup && (
                              isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Permissions panel */}
                        {isExpanded && canManageGroup && !isMe && (
                          <div className="mx-4 mb-2 px-3 py-3 bg-muted/40 rounded-xl border border-border">
                            <div className="flex items-center gap-1.5 mb-2">
                              <UserCog className="w-3.5 h-3.5 text-primary" />
                              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Permissions</p>
                            </div>
                            {currentMemberInGroup?.permissions.assignPositions && member.role !== 'owner' && (
                              <div className="mb-3">
                                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Role</p>
                                <select
                                  value={member.role}
                                  onChange={e => handleRoleChange(member.userId, e.target.value as UserRole)}
                                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                >
                                  {getAssignableRoles(currentMemberInGroup?.role).map(role => (
                                    <option key={role} value={role}>{role}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {PERMISSION_OPTIONS.map(permission => (
                              <PermRow
                                key={permission.key}
                                label={permission.label}
                                checked={member.permissions[permission.key]}
                                onChange={v => updateGroupMemberPermissions(group.id, member.userId, { [permission.key]: v })}
                                disabled={member.role === 'owner'}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Community Members */}
              {activeChat.type === 'channel' && community && (
                <div className="py-2">
                  {(isCommunityOwner || currentMemberInCommunity?.permissions.addMember) && (
                    <div className="px-4 pb-2">
                      <button
                        onClick={() => setShowAddMembers(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add Member
                      </button>
                    </div>
                  )}
                  {community.members.map(member => {
                    const user = allUsers.find(u => u.id === member.userId);
                    if (!user) return null;
                    const isMe = user.id === currentUser?.id;
                    const isExpanded = expandedMember === member.userId;

                    return (
                      <div key={member.userId}>
                        <div
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors cursor-pointer"
                          onClick={() => setExpandedMember(isExpanded ? null : member.userId)}
                        >
                          <UserAvatar
                            avatar={user.avatar}
                            name={user.name}
                            className="h-9 w-9 flex-shrink-0 text-lg"
                            fallbackClassName="bg-primary/10 text-lg"
                          />
                          <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground truncate">{user.name}{isMe ? ' (You)' : ''}</span>
                              {(member.role === 'owner' || member.role === 'admin') && <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                              {member.role === 'moderator' && <Shield className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">{roleLabels[member.role]}</p>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1 self-center">
                            {(isCommunityOwner || currentMemberInCommunity?.permissions.removeMember) && !isMe && member.role !== 'owner' && (
                              <button
                                onClick={e => { e.stopPropagation(); removeMemberFromCommunity(community.id, member.userId); }}
                                className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive transition-colors"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canManageCommunity && (
                              isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Permissions panel */}
                        {isExpanded && canManageCommunity && !isMe && (
                          <div className="mx-4 mb-2 px-3 py-3 bg-muted/40 rounded-xl border border-border">
                            <div className="flex items-center gap-1.5 mb-2">
                              <UserCog className="w-3.5 h-3.5 text-primary" />
                              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Permissions</p>
                            </div>
                            {(isCommunityOwner || currentMemberInCommunity?.permissions.assignPositions) && member.role !== 'owner' && (
                              <div className="mb-3">
                                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Role</p>
                                <select
                                  value={member.role}
                                  onChange={e => handleCommunityRoleChange(member.userId, e.target.value as UserRole)}
                                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                >
                                  {getAssignableRoles(currentMemberInCommunity?.role).map(role => (
                                    <option key={role} value={role}>{roleLabels[role]}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {PERMISSION_OPTIONS.map(permission => (
                              <PermRow
                                key={permission.key}
                                label={permission.label}
                                checked={member.permissions[permission.key]}
                                onChange={v => updateMemberPermissions(community.id, member.userId, { [permission.key]: v })}
                                disabled={member.role === 'owner'}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── MEDIA TAB ── */}
          {activeTab === 'media' && (
            <div className="p-4">
              {sharedMedia.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No shared media yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {sharedMedia.map(m => (
                    <img key={m.id} src={m.mediaUrl} alt="" className="w-full aspect-square object-cover rounded-lg" />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddChannel && activeChat.communityId && (
        <AddChannelModal communityId={activeChat.communityId} onClose={() => setShowAddChannel(false)} />
      )}
      {showAddGroup && activeChat.communityId && (
        <AddGroupModal communityId={activeChat.communityId} onClose={() => setShowAddGroup(false)} />
      )}
      {showAddMembers && activeChat.communityId && (
        <AddCommunityMembersModal communityId={activeChat.communityId} onClose={() => setShowAddMembers(false)} />
      )}
    </>
  );
}
