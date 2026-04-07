import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { X, Search, UserPlus, MessageCircle, Phone, CheckCircle2, UserCheck } from 'lucide-react';
import UserAvatar from '@/components/ui/user-avatar';

export default function ContactsModal() {
  const { contacts, allUsers, currentUser, addContact, startChatWithUser, startDirectCallByUserId, setShowContacts } = useApp();
  const [search, setSearch] = useState('');
  const [addQuery, setAddQuery] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [tab, setTab] = useState<'contacts' | 'add'>('contacts');

  // Filtered existing contacts
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  // Live search for add tab — search all users except self and already-added contacts
  const contactUserIds = useMemo(() => new Set(contacts.map(c => c.userId)), [contacts]);
  const searchResults = useMemo(() => {
    if (!addQuery.trim()) return [];
    const q = addQuery.toLowerCase();
    return allUsers.filter(u =>
      u.id !== currentUser?.id &&
      !contactUserIds.has(u.id) &&
      (u.username.toLowerCase().includes(q) ||
       u.name.toLowerCase().includes(q) ||
       u.email.toLowerCase().includes(q))
    );
  }, [addQuery, allUsers, currentUser, contactUserIds]);

  const handleAdd = (username: string, name: string) => {
    setAddError('');
    setAddSuccess('');
    const ok = addContact(name, username);
    if (!ok) setAddError('User not found or already in contacts');
    else {
      setAddSuccess(`${name} added to contacts!`);
      setAddQuery('');
      setTimeout(() => setAddSuccess(''), 3000);
    }
  };

  const handleStartChat = (userId: string) => {
    startChatWithUser(userId);
    setShowContacts(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-bold text-foreground text-lg">Contacts</h2>
          <button onClick={() => setShowContacts(false)}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {(['contacts', 'add'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setAddError(''); setAddSuccess(''); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {t === 'contacts' ? `My Contacts (${contacts.length})` : 'Add Contact'}
            </button>
          ))}
        </div>

        {/* ── CONTACTS TAB ── */}
        {tab === 'contacts' && (
          <>
            <div className="px-4 py-3 border-b border-border flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredContacts.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <UserCheck className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {search ? 'No contacts found' : 'No contacts yet'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {search ? 'Try a different search term' : 'Switch to "Add Contact" to find people'}
                  </p>
                </div>
              ) : filteredContacts.map(contact => {
                const user = allUsers.find(u => u.id === contact.userId);
                return (
                  <div key={contact.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors">
                    <UserAvatar
                      avatar={user?.avatar || '👤'}
                      name={user?.name || contact.name}
                      className="h-11 w-11 text-xl"
                      fallbackClassName="bg-primary/10 text-xl"
                      online={user?.status === 'online'}
                      statusClassName={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${
                        user?.status === 'online' ? 'bg-[#25D366]' :
                        user?.status === 'away' ? 'bg-yellow-400' : 'bg-muted-foreground/40'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">@{contact.username}
                        {user?.bio && <span className="ml-1 text-muted-foreground/70">· {user.bio.slice(0, 30)}{user.bio.length > 30 ? '…' : ''}</span>}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => handleStartChat(contact.userId)}
                        className="w-8 h-8 rounded-full hover:bg-primary/10 flex items-center justify-center text-primary transition-colors"
                        title="Message">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { void startDirectCallByUserId(contact.userId, 'audio'); setShowContacts(false); }}
                        className="w-8 h-8 rounded-full hover:bg-primary/10 flex items-center justify-center text-primary transition-colors"
                        title="Call">
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── ADD CONTACT TAB ── */}
        {tab === 'add' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search input */}
            <div className="px-4 py-4 border-b border-border flex-shrink-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={addQuery}
                  onChange={e => { setAddQuery(e.target.value); setAddError(''); setAddSuccess(''); }}
                  placeholder="Search by name, username or email…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>
              {addError && (
                <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">{addError}</div>
              )}
              {addSuccess && (
                <div className="p-2.5 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> {addSuccess}
                </div>
              )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {!addQuery.trim() ? (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <UserPlus className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">Find People</p>
                  <p className="text-xs text-muted-foreground">Search by name, username, or email to add contacts</p>
                  <div className="mt-4 p-3 rounded-xl bg-muted/60 text-left">
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Demo users you can add:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['alice', 'bob', 'carlos', 'diana'].map(u => (
                        <button key={u} onClick={() => setAddQuery(u)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">
                          @{u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-medium text-foreground mb-1">No users found</p>
                  <p className="text-xs text-muted-foreground">Try a different name or username</p>
                </div>
              ) : (
                <div className="py-2">
                  <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                  </p>
                  {searchResults.map(user => (
                    <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors">
                      <UserAvatar
                        avatar={user.avatar}
                        name={user.name}
                        className="h-11 w-11 text-xl"
                        fallbackClassName="bg-primary/10 text-xl"
                        online={user.status === 'online'}
                        statusClassName={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${
                          user.status === 'online' ? 'bg-[#25D366]' :
                          user.status === 'away' ? 'bg-yellow-400' : 'bg-muted-foreground/40'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                        {user.bio && <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{user.bio}</p>}
                      </div>
                      <button
                        onClick={() => handleAdd(user.username, user.name)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all active:scale-95 flex-shrink-0">
                        <UserPlus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
