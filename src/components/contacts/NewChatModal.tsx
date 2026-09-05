import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Contact } from '../../types';
import {
  X,
  Search,
  UserPlus,
  Users,
  MessageSquare,
  Phone,
  Video,
  Share2,
  Check,
  Loader2,
  Camera,
  ArrowRight,
  ExternalLink,
  Trash2,
} from 'lucide-react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
  onCreateGroup: () => void;
  onStartCall?: (user: User, type: 'voice' | 'video') => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
  onCreateGroup,
  onStartCall,
}) => {
  const { currentUser, allUsers, contacts, addContact, deleteContact } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'add_contact'>('list');

  // Add Contact Form State
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactAbout, setNewContactAbout] = useState('');
  const [newContactAvatar, setNewContactAvatar] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [addContactMessage, setAddContactMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Search users dynamically from server/db
  useEffect(() => {
    if (!isOpen) return;

    if (!searchQuery.trim()) {
      // Filter out current user from all registered users
      setSearchResults(allUsers.filter((u) => u.id !== currentUser?.id));
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(searchQuery.trim())}&currentUserId=${encodeURIComponent(currentUser?.id || '')}`
        );
        if (res.ok) {
          const results = await res.json();
          setSearchResults(results);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, allUsers, currentUser?.id]);

  // Format saved contacts into user objects
  const savedContactUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/[^0-9]/g, '');

    return contacts
      .filter((c) => {
        if (!q) return true;
        const nameMatch = c.name.toLowerCase().includes(q);
        const phoneClean = (c.phoneNumber || '').replace(/[^0-9]/g, '');
        const phoneMatch = cleanQ.length > 0 && phoneClean.includes(cleanQ);
        return nameMatch || phoneMatch;
      })
      .map((c) => {
        const matchedRegistered = allUsers.find(
          (u) => (c.contactUserId && u.id === c.contactUserId) || 
                 (c.phoneNumber && u.phoneNumber && u.phoneNumber.replace(/[^0-9]/g, '') === c.phoneNumber.replace(/[^0-9]/g, ''))
        );

        const userObj: User = {
          id: matchedRegistered?.id || c.contactUserId || `usr_cnt_${c.id}`,
          displayName: c.name,
          phoneNumber: c.phoneNumber,
          avatarUrl: c.avatarUrl || matchedRegistered?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.phoneNumber || c.name}`,
          about: c.about || matchedRegistered?.about || 'Saved Contact',
          isOnline: matchedRegistered?.isOnline || false,
          lastSeen: matchedRegistered?.lastSeen || Date.now(),
          role: 'user',
          createdAt: matchedRegistered?.createdAt || c.createdAt || Date.now(),
        };
        return {
          user: userObj,
          contactId: c.id,
          isRegistered: Boolean(matchedRegistered),
        };
      });
  }, [contacts, allUsers, searchQuery]);

  if (!isOpen) return null;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNewContactAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) return;

    setIsSavingContact(true);
    setAddContactMessage(null);

    const res = await addContact(
      newContactName.trim(),
      newContactPhone.trim(),
      newContactAvatar || undefined,
      newContactAbout.trim() || undefined
    );

    setIsSavingContact(false);

    if (res.success) {
      setAddContactMessage({
        type: 'success',
        text: `Contact saved! ${newContactName} has been saved to your contacts.`,
      });
      setNewContactName('');
      setNewContactPhone('');
      setNewContactAbout('');
      setNewContactAvatar('');
      setTimeout(() => {
        setAddContactMessage(null);
        setActiveView('list');
      }, 1500);
    } else {
      setAddContactMessage({
        type: 'error',
        text: res.error || 'Failed to save contact. Please try again.',
      });
    }
  };

  const handleShareInvite = () => {
    const shareUrl = window.location.origin;
    const shareText = `Join me on ERROREN CHAT — Secure. Private. Real-time messaging app: ${shareUrl}`;
    if (navigator.share) {
      navigator.share({ title: 'ERROREN CHAT', text: shareText, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Invite link copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              {activeView === 'add_contact' ? <UserPlus className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {activeView === 'add_contact' ? 'Add New Contact' : 'New Chat & Contacts'}
              </h3>
              <p className="text-xs text-slate-400">
                {activeView === 'add_contact'
                  ? 'Save contact details to your personal address book'
                  : 'Start a conversation or create a group'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {activeView === 'add_contact' ? (
          /* Add Contact View */
          <form onSubmit={handleSaveContact} className="p-5 overflow-y-auto space-y-4">
            {addContactMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  addContactMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : addContactMessage.type === 'info'
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
                    : 'bg-red-500/10 border border-red-500/30 text-red-300'
                }`}
              >
                {addContactMessage.type === 'success' && <Check className="w-4 h-4 shrink-0" />}
                <span>{addContactMessage.text}</span>
              </div>
            )}

            {/* Avatar Selector */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <img
                  src={
                    newContactAvatar ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${newContactName || 'NewContact'}`
                  }
                  alt="Contact Avatar"
                  className="w-20 h-20 rounded-full object-cover bg-slate-800 border border-slate-700"
                />
                <label className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition text-white text-[10px]">
                  <Camera className="w-4 h-4 mb-0.5" />
                  <span>Photo</span>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contact Name <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Alex Morgan"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="e.g. +92 300 1234567"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">About / Note</label>
              <input
                type="text"
                placeholder="e.g. Colleague from engineering"
                value={newContactAbout}
                onChange={(e) => setNewContactAbout(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSavingContact || !newContactName.trim()}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                {isSavingContact ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Contact'}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          /* New Chat / Contacts List View */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search Input */}
            <div className="p-3 sm:p-4 border-b border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search registered users by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
                {isSearching && (
                  <Loader2 className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            {!searchQuery && (
              <div className="p-3 border-b border-slate-800 space-y-1 bg-slate-900/40">
                <button
                  onClick={() => setActiveView('add_contact')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 text-left transition group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white">
                      New Contact
                    </div>
                    <div className="text-[11px] text-slate-400">Add a person to your address book</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onCreateGroup();
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 text-left transition group"
                >
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white">
                      New Group
                    </div>
                    <div className="text-[11px] text-slate-400">Collaborate with multiple people</div>
                  </div>
                </button>
              </div>
            )}

            {/* Users & Contacts List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 divide-y divide-slate-800/40">
              {/* Saved Contacts Section */}
              {savedContactUsers.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase px-2 py-1 tracking-wider flex items-center justify-between">
                    <span>Saved Contacts ({savedContactUsers.length})</span>
                    <span className="text-[10px] text-slate-500 font-normal">Address Book</span>
                  </div>

                  {savedContactUsers.map(({ user, contactId, isRegistered }) => (
                    <div
                      key={contactId}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-800/60 transition group"
                    >
                      <button
                        onClick={() => {
                          onSelectUser(user);
                          onClose();
                        }}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                      >
                        <div className="relative">
                          <img
                            src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                            alt={user.displayName}
                            className="w-10 h-10 rounded-full bg-slate-800 object-cover border border-slate-700"
                          />
                          {user.isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white truncate">
                              {user.displayName}
                            </span>
                            {user.phoneNumber && (
                              <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                {user.phoneNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {user.about || (isRegistered ? 'Registered on ERROREN' : 'Saved Contact')}
                          </div>
                        </div>
                      </button>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 pl-2">
                        {onStartCall && (
                          <>
                            <button
                              title="Voice Call"
                              onClick={() => {
                                onClose();
                                onStartCall(user, 'voice');
                              }}
                              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 flex items-center justify-center transition"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Video Call"
                              onClick={() => {
                                onClose();
                                onStartCall(user, 'video');
                              }}
                              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 flex items-center justify-center transition"
                            >
                              <Video className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            onSelectUser(user);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-semibold text-xs transition flex items-center gap-1"
                        >
                          <span>Chat</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          title="Delete Contact"
                          onClick={() => deleteContact(contactId)}
                          className="w-7 h-7 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Registered Users Section */}
              {searchResults.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase px-2 py-1 tracking-wider">
                    {searchQuery ? 'Matching Users' : 'All ERROREN CHAT Users'}
                  </div>

                  {searchResults
                    .filter((u) => !savedContactUsers.some((sc) => sc.user.id === u.id))
                    .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-800/60 transition group"
                    >
                      <button
                        onClick={() => {
                          onSelectUser(user);
                          onClose();
                        }}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                      >
                        <div className="relative">
                          <img
                            src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                            alt={user.displayName}
                            className="w-10 h-10 rounded-full bg-slate-800 object-cover border border-slate-700"
                          />
                          {user.isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white truncate">
                              {user.displayName}
                            </span>
                            {user.phoneNumber && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                {user.countryCode} {user.phoneNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {user.about || user.email || 'Available on ERROREN CHAT'}
                          </div>
                        </div>
                      </button>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 pl-2">
                        {onStartCall && (
                          <>
                            <button
                              title="Voice Call"
                              onClick={() => {
                                onClose();
                                onStartCall(user, 'voice');
                              }}
                              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 flex items-center justify-center transition"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Video Call"
                              onClick={() => {
                                onClose();
                                onStartCall(user, 'video');
                              }}
                              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 flex items-center justify-center transition"
                            >
                              <Video className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            onSelectUser(user);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-semibold text-xs transition flex items-center gap-1"
                        >
                          <span>Chat</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Unregistered Contact Empty State */}
              {savedContactUsers.length === 0 && searchResults.length === 0 && searchQuery ? (
                <div className="py-8 text-center px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-semibold text-slate-200">
                    This person isn't using ERROREN CHAT yet.
                  </div>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    No registered user found matching "{searchQuery}". You can save them as a contact or share an invite link.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => {
                        setNewContactName(searchQuery);
                        setActiveView('add_contact');
                      }}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-600 transition"
                    >
                      Save Contact Anyway
                    </button>
                    <button
                      onClick={handleShareInvite}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Invite to App</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* No users registered yet */
                <div className="py-10 text-center px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-slate-200">
                    No contacts found yet
                  </div>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Share your invite link with friends, add custom contacts, or create a group to start chatting.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    <button
                      onClick={handleShareInvite}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Invite Link</span>
                    </button>
                    <button
                      onClick={() => setActiveView('add_contact')}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                    >
                      Add Contact
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
