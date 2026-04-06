import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { MemberPermissions } from '@/lib/zentalk-types';
import {
  X, Phone, Video, UserMinus, Shield, Crown, Edit2, Check, Trash2,
  Plus, Hash, Megaphone, Clock, Users, ChevronDown, ChevronRight,
  MessageSquare, Settings2, UserCog
} from 'lucide-react';
import * as store from '@/lib/zentalk-store';

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

// ─── Add Group to Community Modal ─────────────────────────────────────────────
function AddGroupModal({ communityId, onClose }: { communityId: string; onClose: () => void }) {
  const { groups, addGroupToCommunity } = useApp();
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const handleAdd = () => {
    if (!selectedGroupId) return;
    addGroupToCommunity(communityId, selectedGroupId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">Add Group to Community</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No groups available. Create a group first.</p>
          ) : groups.map(g => (
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
        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleAdd} disabled={!selectedGroupId}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">Add Group</button>
        </div>
      </div>
    </div>
  );
}

// ─── Toggle helper ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

// ─── Permission Row ───────────────────────────────────────────────────────────
function PermRow({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${disabled ? 'opacity-40' : ''}`}>
      <span className="text-xs text-foreground">{label}</span>
      <Toggle checked={checked} onChange={disabled ? () => {} : onChange} />
    </div>
  );
}

// ─── Main InfoPanel ───────────────────────────────────────────────────────────
export default function InfoPanel() {
  const {
    activeChat, setShowInfoPanel, allUsers, currentUser,
    refreshGroups, refreshChats, startCall, leaveGroup, kickMember,
    communities, updateMemberPermissions, updateGroupMemberPermissions,
  } = useApp();

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'media'>('info');

  if (!activeChat) return null;

  const otherUserId = activeChat.type === 'dm'
    ? activeChat.participants.find(id => id !== currentUser?.id)
    : null;
  const otherUser = otherUserId ? allUsers.find(u => u.id === otherUserId) : null;
  const group = activeChat.groupId ? store.getGroupById(activeChat.groupId) : null;
  const community = activeChat.communityId ? communities.find(c => c.id === activeChat.communityId) : null;

  const currentMemberInGroup = group?.members.find(m => m.userId === currentUser?.id);
  const isGroupAdmin = currentMemberInGroup?.role === 'admin';
  const isGroupMod = currentMemberInGroup?.role === 'moderator';
  const canManageGroup = isGroupAdmin || isGroupMod;

  const currentMemberInCommunity = community?.members.find(m => m.userId === currentUser?.id);
  const isCommunityAdmin = currentMemberInCommunity?.role === 'admin';
  const isCommunityMod = currentMemberInCommunity?.role === 'moderator';
  const canManageCommunity = isCommunityAdmin || isCommunityMod;

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

  const handleRoleChange = (userId: string, role: 'admin' | 'moderator' | 'member') => {
    if (!group) return;
    const defaultPerms: MemberPermissions = {
      messaging: true,
      memberManagement: role !== 'member',
      channelCreation: role === 'admin',
    };
    store.updateGroup(group.id, {
      members: group.members.map(m => m.userId === userId ? { ...m, role, permissions: defaultPerms } : m),
    });
    refreshGroups();
  };

  const handleCommunityRoleChange = (userId: string, role: 'admin' | 'moderator' | 'member') => {
    if (!community) return;
    const defaultPerms: MemberPermissions = {
      messaging: true,
      memberManagement: role !== 'member',
      channelCreation: role === 'admin',
    };
    store.updateCommunity(community.id, {
      members: community.members.map(m => m.userId === userId ? { ...m, role, permissions: defaultPerms } : m),
    });
    refreshChats();
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
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl mb-2">
            {activeChat.avatar}
          </div>
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

              {/* Community channels */}
              {activeChat.type === 'channel' && community && (
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Channels</p>
                    {canManageCommunity && (
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
                  {canManageCommunity && (
                    <button onClick={() => setShowAddGroup(true)}
                      className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                      <Users className="w-3.5 h-3.5" /> Add Group to Community
                    </button>
                  )}
                </div>
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
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">{user.avatar}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-foreground truncate">{user.name}{isMe ? ' (You)' : ''}</span>
                              {member.role === 'admin' && <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                              {member.role === 'moderator' && <Shield className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {isGroupAdmin && !isMe && (
                              <select
                                value={member.role}
                                onChange={e => { e.stopPropagation(); handleRoleChange(member.userId, e.target.value as any); }}
                                onClick={e => e.stopPropagation()}
                                className="text-xs bg-muted border border-border rounded-lg px-1.5 py-1 text-foreground focus:outline-none"
                              >
                                <option value="member">Member</option>
                                <option value="moderator">Moderator</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}
                            {isGroupAdmin && !isMe && (
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
                            <PermRow
                              label="Can send messages"
                              checked={member.permissions.messaging}
                              onChange={v => updateGroupMemberPermissions(group.id, member.userId, { messaging: v })}
                            />
                            <PermRow
                              label="Can manage members"
                              checked={member.permissions.memberManagement}
                              onChange={v => updateGroupMemberPermissions(group.id, member.userId, { memberManagement: v })}
                              disabled={member.role === 'member'}
                            />
                            <PermRow
                              label="Can create channels"
                              checked={member.permissions.channelCreation}
                              onChange={v => updateGroupMemberPermissions(group.id, member.userId, { channelCreation: v })}
                              disabled={member.role !== 'admin'}
                            />
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
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">{user.avatar}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-foreground truncate">{user.name}{isMe ? ' (You)' : ''}</span>
                              {member.role === 'admin' && <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                              {member.role === 'moderator' && <Shield className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {isCommunityAdmin && !isMe && (
                              <select
                                value={member.role}
                                onChange={e => { e.stopPropagation(); handleCommunityRoleChange(member.userId, e.target.value as any); }}
                                onClick={e => e.stopPropagation()}
                                className="text-xs bg-muted border border-border rounded-lg px-1.5 py-1 text-foreground focus:outline-none"
                              >
                                <option value="member">Member</option>
                                <option value="moderator">Moderator</option>
                                <option value="admin">Admin</option>
                              </select>
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
                            <PermRow
                              label="Can send messages"
                              checked={member.permissions.messaging}
                              onChange={v => updateMemberPermissions(community.id, member.userId, { messaging: v })}
                            />
                            <PermRow
                              label="Can manage members"
                              checked={member.permissions.memberManagement}
                              onChange={v => updateMemberPermissions(community.id, member.userId, { memberManagement: v })}
                              disabled={member.role === 'member'}
                            />
                            <PermRow
                              label="Can create channels"
                              checked={member.permissions.channelCreation}
                              onChange={v => updateMemberPermissions(community.id, member.userId, { channelCreation: v })}
                              disabled={member.role !== 'admin'}
                            />
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
    </>
  );
}
