import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { X, Bell, Eye, Bot, Edit2 } from 'lucide-react';

export default function SettingsModal() {
  const { currentUser, updateProfile, settings, updateSettings, setShowSettings } = useApp();
  const [tab, setTab] = useState<'profile' | 'notifications' | 'privacy' | 'appearance' | 'ai'>('profile');
  const [editBio, setEditBio] = useState(false);
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');

  const avatarOptions = ['🧑', '👩', '👨', '🧔', '👩‍💼', '👨‍💼', '🧑‍💻', '👩‍🎨', '🦸', '🧙', '🧝', '🧛', '🤖', '👾', '🦊', '🐱', '🐶', '🦁', '🐯', '🦄'];

  if (!currentUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-muted/30 border-r border-border flex flex-col py-4">
          <div className="px-4 mb-4">
            <h2 className="font-bold text-foreground text-lg">Settings</h2>
          </div>
          {([
            { id: 'profile', label: 'Profile', icon: '👤' },
            { id: 'notifications', label: 'Notifications', icon: '🔔' },
            { id: 'privacy', label: 'Privacy', icon: '🔒' },
            { id: 'appearance', label: 'Appearance', icon: '🎨' },
            { id: 'ai', label: 'AI Features', icon: '🤖' },
          ] as const).map(({ id, label, icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                tab === id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}>
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground capitalize">{tab}</h3>
            <button onClick={() => setShowSettings(false)}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {tab === 'profile' && (
              <>
                {/* Avatar */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-4xl">
                      {currentUser.avatar}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {avatarOptions.map(a => (
                      <button key={a} onClick={() => updateProfile({ avatar: a })}
                        className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${
                          currentUser.avatar === a ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'bg-muted hover:bg-muted/80'
                        }`}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Display Name</label>
                  {editName ? (
                    <div className="flex gap-2">
                      <input value={name} onChange={e => setName(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        autoFocus />
                      <button onClick={() => { updateProfile({ name }); setEditName(false); }}
                        className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90">Save</button>
                      <button onClick={() => setEditName(false)}
                        className="px-4 py-2 rounded-xl border border-border text-sm text-foreground hover:bg-muted">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium">{currentUser.name}</span>
                      <button onClick={() => { setName(currentUser.name); setEditName(true); }}
                        className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Username</label>
                  <p className="text-foreground">@{currentUser.username}</p>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bio</label>
                  {editBio ? (
                    <div className="space-y-2">
                      <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                        maxLength={140} autoFocus />
                      <div className="flex gap-2">
                        <button onClick={() => { updateProfile({ bio }); setEditBio(false); }}
                          className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90">Save</button>
                        <button onClick={() => setEditBio(false)}
                          className="px-4 py-2 rounded-xl border border-border text-sm text-foreground hover:bg-muted">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <p className="text-foreground text-sm flex-1">{currentUser.bio || 'No bio yet'}</p>
                      <button onClick={() => { setBio(currentUser.bio); setEditBio(true); }}
                        className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Email</label>
                  <p className="text-foreground text-sm">{currentUser.email}</p>
                </div>
              </>
            )}

            {tab === 'notifications' && (
              <div className="space-y-4">
                <ToggleRow
                  icon={<Bell className="w-4 h-4" />}
                  label="Message Notifications"
                  description="Get notified for new messages"
                  checked={settings.notifications}
                  onChange={v => updateSettings({ notifications: v })}
                />
                <ToggleRow
                  icon={<Bell className="w-4 h-4" />}
                  label="Group Notifications"
                  description="Notifications for group messages"
                  checked={settings.notifications}
                  onChange={v => updateSettings({ notifications: v })}
                />
                <ToggleRow
                  icon={<Bell className="w-4 h-4" />}
                  label="Call Notifications"
                  description="Incoming call alerts"
                  checked={settings.notifications}
                  onChange={v => updateSettings({ notifications: v })}
                />
              </div>
            )}

            {tab === 'privacy' && (
              <div className="space-y-6">
                <SelectRow
                  label="Last Seen"
                  description="Who can see when you were last online"
                  value={settings.lastSeenPrivacy}
                  options={[
                    { value: 'everyone', label: 'Everyone' },
                    { value: 'contacts', label: 'My Contacts' },
                    { value: 'nobody', label: 'Nobody' },
                  ]}
                  onChange={v => updateSettings({ lastSeenPrivacy: v as any })}
                />
                <SelectRow
                  label="Profile Photo"
                  description="Who can see your profile photo"
                  value={settings.profilePhotoPrivacy}
                  options={[
                    { value: 'everyone', label: 'Everyone' },
                    { value: 'contacts', label: 'My Contacts' },
                    { value: 'nobody', label: 'Nobody' },
                  ]}
                  onChange={v => updateSettings({ profilePhotoPrivacy: v as any })}
                />
                <ToggleRow
                  icon={<Eye className="w-4 h-4" />}
                  label="Read Receipts"
                  description="Let others know when you've read their messages"
                  checked={settings.readReceipts}
                  onChange={v => updateSettings({ readReceipts: v })}
                />
              </div>
            )}

            {tab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Theme</label>
                  <div className="flex gap-3">
                    {(['light', 'dark', 'system'] as const).map(t => (
                      <button key={t} onClick={() => updateSettings({ theme: t })}
                        className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all capitalize ${
                          settings.theme === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:bg-muted'
                        }`}>
                        {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻'} {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Chat Wallpaper</label>
                  <div className="grid grid-cols-6 gap-2">
                    {['', '#f0fdf4', '#eff6ff', '#fdf4ff', '#fff7ed', '#fef2f2', '#f0f9ff', '#1a1a2e', '#0f172a', '#1e1b4b', '#14532d', '#450a0a'].map(color => (
                      <button key={color} onClick={() => {}}
                        className="w-10 h-10 rounded-xl border-2 border-border hover:border-primary transition-colors"
                        style={{ background: color || 'linear-gradient(135deg, #f0f2f5 0%, #e8ecf0 100%)' }}
                        title={color || 'Default'} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'ai' && (
              <div className="space-y-4">
                <ToggleRow
                  icon={<Bot className="w-4 h-4" />}
                  label="AI Auto-Replies"
                  description="Simulate intelligent responses in conversations"
                  checked={settings.aiEnabled}
                  onChange={v => updateSettings({ aiEnabled: v })}
                />
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium text-foreground mb-1">🤖 About AI Features</p>
                  <p className="text-xs text-muted-foreground">
                    ZenTalk uses AI to simulate realistic conversations for demo purposes.
                    When enabled, contacts will send automated replies to your messages.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ icon, label, description, checked, onChange }: {
  icon: React.ReactNode; label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function SelectRow({ label, description, value, options, onChange }: {
  label: string; description: string; value: string;
  options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="text-sm bg-muted border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
