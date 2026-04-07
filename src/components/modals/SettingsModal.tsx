import { useMemo, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { X, Bell, Eye, Bot, Edit2, MonitorSmartphone, Sparkles, Upload, Smartphone, BadgeCheck } from 'lucide-react';
import UserAvatar from '@/components/ui/user-avatar';

export default function SettingsModal() {
  const {
    currentUser,
    updateProfile,
    settings,
    updateSettings,
    setShowSettings,
    notificationPermission,
    requestNotificationPermission,
    sendTestNotification,
  } = useApp();
  const [tab, setTab] = useState<'profile' | 'notifications' | 'privacy' | 'appearance' | 'ai'>('profile');
  const [editBio, setEditBio] = useState(false);
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [mobile, setMobile] = useState(currentUser?.mobile || '');
  const [editMobile, setEditMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarOptions = ['🧑', '👩', '👨', '🧔', '👩‍💼', '👨‍💼', '🧑‍💻', '👩‍🎨', '🦸', '🧙', '🧝', '🧛', '🤖', '👾', '🦊', '🐱', '🐶', '🦁', '🐯', '🦄'];
  const profileChecks = useMemo(() => ([
    Boolean(currentUser?.name.trim()),
    Boolean(currentUser?.email.trim()),
    Boolean(currentUser?.mobile.trim()),
    Boolean(currentUser?.bio.trim()),
    Boolean(currentUser?.avatar && currentUser.avatar !== '🧑'),
  ]), [currentUser?.avatar, currentUser?.bio, currentUser?.email, currentUser?.mobile, currentUser?.name]);
  const profileCompletion = Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100);

  if (!currentUser) return null;

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      updateProfile({ avatar: reader.result });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

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
                <div className="rounded-3xl border border-border bg-muted/30 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Profile Completion</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Complete your photo, phone, and bio for a stronger profile presence in chat and calls.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 px-3 py-2 text-right">
                      <p className="text-xl font-bold text-primary">{profileCompletion}%</p>
                      <p className="text-[11px] uppercase tracking-wider text-primary/80">Complete</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-background">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${profileCompletion}%` }} />
                  </div>
                </div>

                {/* Avatar */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <UserAvatar
                      avatar={currentUser.avatar}
                      name={currentUser.name}
                      className="h-24 w-24 text-4xl ring-4 ring-primary/10"
                      fallbackClassName="bg-primary/10 text-4xl"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-primary/90"
                      title="Upload profile photo"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                  <div className="w-full rounded-2xl border border-border bg-background/70 p-3 text-center">
                    <p className="text-sm font-medium text-foreground">Profile Photo</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Upload from your device or keep using an emoji avatar.
                    </p>
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

                {/* Mobile */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Smartphone className="h-3.5 w-3.5" />
                    Mobile Number
                  </label>
                  {editMobile ? (
                    <div className="flex gap-2">
                      <input
                        value={mobile}
                        onChange={e => setMobile(e.target.value)}
                        className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        autoFocus
                      />
                      <button
                        onClick={() => { updateProfile({ mobile }); setEditMobile(false); }}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditMobile(false)}
                        className="rounded-xl border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">{currentUser.mobile || 'Add a mobile number'}</span>
                      <button
                        onClick={() => { setMobile(currentUser.mobile); setEditMobile(true); }}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
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

                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['online', 'away', 'offline'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => updateProfile({ status })}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                          currentUser.status === status
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
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
                <ToggleRow
                  icon={<MonitorSmartphone className="w-4 h-4" />}
                  label="System Notifications"
                  description="Show notifications on your device outside the browser tab"
                  checked={settings.systemNotifications}
                  onChange={async v => {
                    if (v && notificationPermission !== 'granted') {
                      const result = await requestNotificationPermission();
                      updateSettings({ systemNotifications: result === 'granted' });
                      return;
                    }
                    updateSettings({ systemNotifications: v });
                  }}
                />
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Notification Preview</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Permission: {notificationPermission === 'unsupported' ? 'Unsupported browser' : notificationPermission}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        ZenTalk will show a polished message or call preview on your system when the app is in the background.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { void sendTestNotification(); }}
                    className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                  >
                    Send Test Preview
                  </button>
                </div>
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
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
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
