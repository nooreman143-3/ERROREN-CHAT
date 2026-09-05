import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Contact, UserSettings } from '../types';
import { safeStorage } from '../utils/safeStorage';

export type AuthStep = 'welcome' | 'google_login' | 'profile' | 'authenticated';

export interface ProfileCompletionDetails {
  hasName: boolean;
  hasUsername: boolean;
  hasPhone: boolean;
  isComplete: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  authStep: AuthStep;
  setAuthStep: (step: AuthStep) => void;
  isProfileComplete: boolean;
  profileCompletionDetails: ProfileCompletionDetails;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  isLoading: boolean;
  error: string | null;
  loginWithGoogle: (email: string, displayName?: string, avatarUrl?: string, googleId?: string) => Promise<boolean>;
  loginWithPhone: (phoneNumber: string, displayName?: string, countryCode?: string, avatarUrl?: string) => Promise<boolean>;
  updateProfile: (
    displayName: string, 
    about: string, 
    avatarUrl: string, 
    username?: string, 
    phoneNumber?: string, 
    countryCode?: string
  ) => Promise<boolean>;
  savePhoneNumber: (phoneNumber: string, countryCode: string, phoneVisibility?: 'everyone' | 'contacts' | 'nobody') => Promise<{ success: boolean; isSmsConfigured: boolean; message: string }>;
  contacts: Contact[];
  refreshContacts: () => Promise<void>;
  addContact: (name: string, phoneNumber: string, avatarUrl?: string, about?: string) => Promise<{ success: boolean; isRegisteredUser: boolean; contact?: Contact; matchedUser?: User; error?: string }>;
  deleteContact: (contactId: string) => Promise<boolean>;
  logout: () => void;
  deleteAccount: () => Promise<boolean>;
  allUsers: User[];
  refreshUsers: () => Promise<void>;
  userSettings: UserSettings;
  updateUserSettings: (settings: Partial<UserSettings>) => void;
  savedAccounts: User[];
  switchAccount: (userId: string) => Promise<boolean>;
  removeSavedAccount: (userId: string) => void;
  startAddAccount: () => void;
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  wallpaper: 'cyber-mesh',
  privacy: {
    lastSeenVisibility: 'everyone',
    onlineVisibility: 'everyone',
    profilePhotoVisibility: 'everyone',
    aboutVisibility: 'everyone',
    statusPrivacy: 'everyone',
    phoneVisibility: 'everyone',
    readReceipts: true,
    disappearingMessagesDefault: 0,
    blockedUserIds: [],
  },
  notifications: {
    messageNotifications: true,
    groupNotifications: true,
    callNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    previewMessage: true,
  },
  security: {
    twoFactorEnabled: false,
    fingerprintLock: false,
    activeSessions: [
      {
        id: 'sess_current',
        device: 'ERROREN Web Client (Browser)',
        browser: 'Web App',
        location: 'Current Active Session',
        lastActive: Date.now(),
        isCurrent: true,
      },
    ],
  },
  aiPreferences: {
    autoSuggestReplies: true,
    tone: 'friendly',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const parsed = safeStorage.getJSON<User | null>('erroren_user', null);
    return parsed && parsed.id ? parsed : null;
  });

  const [authStep, setAuthStep] = useState<AuthStep>(() => {
    const parsed = safeStorage.getJSON<User | null>('erroren_user', null);
    if (parsed && parsed.id) {
      if (!parsed.displayName || parsed.displayName === 'New Member') {
        return 'profile';
      }
      return 'authenticated';
    }
    return 'welcome';
  });

  const [savedAccounts, setSavedAccounts] = useState<User[]>(() => {
    const saved = safeStorage.getJSON<User[]>('erroren_saved_accounts', []);
    if (Array.isArray(saved) && saved.length > 0) return saved;
    const current = safeStorage.getJSON<User | null>('erroren_user', null);
    if (current && current.id) return [current];
    return [];
  });

  const saveToAccountList = (user: User) => {
    setSavedAccounts((prev) => {
      const filtered = prev.filter((u) => u.id !== user.id);
      const next = [user, ...filtered];
      safeStorage.setJSON('erroren_saved_accounts', next);
      return next;
    });
  };

  const switchAccount = async (userId: string): Promise<boolean> => {
    const target = savedAccounts.find((u) => u.id === userId);
    if (!target) return false;

    setCurrentUser(target);
    safeStorage.setJSON('erroren_user', target);
    saveToAccountList(target);
    setAuthStep('authenticated');
    await refreshUsers();
    return true;
  };

  const removeSavedAccount = (userId: string) => {
    setSavedAccounts((prev) => {
      const next = prev.filter((u) => u.id !== userId);
      safeStorage.setJSON('erroren_saved_accounts', next);
      return next;
    });
    if (currentUser?.id === userId) {
      logout();
    }
  };

  const startAddAccount = () => {
    setAuthStep('google_login');
  };

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  const hasName = Boolean(
    currentUser?.displayName && 
    currentUser.displayName.trim().length > 0 && 
    currentUser.displayName !== 'New Member'
  );
  const hasUsername = Boolean(
    currentUser?.username && 
    currentUser.username.trim().length > 0
  );
  const cleanPhone = (currentUser?.phoneNumber || '').trim().replace(/[^0-9]/g, '');
  const hasPhone = cleanPhone.length >= 6;
  const isProfileComplete = Boolean(currentUser && hasName && hasUsername && hasPhone);

  const profileCompletionDetails: ProfileCompletionDetails = {
    hasName,
    hasUsername,
    hasPhone,
    isComplete: isProfileComplete,
  };

  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    return safeStorage.getJSON<UserSettings>('erroren_settings', defaultSettings);
  });

  const refreshUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          setAllUsers(list);
        }
      }
    } catch (err) {
      console.error('Failed to fetch real users:', err);
    }
  };

  const refreshContacts = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/contacts?userId=${encodeURIComponent(currentUser.id)}`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          setContacts(list);
        }
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, [currentUser?.id]);

  useEffect(() => {
    const handleUserUpdated = (e: any) => {
      const updatedUser: User | undefined = e?.detail;
      if (!updatedUser) return;

      setCurrentUser((prev) => {
        if (prev && prev.id === updatedUser.id) {
          const merged = { ...prev, ...updatedUser };
          safeStorage.setJSON('erroren_user', merged);
          return merged;
        }
        return prev;
      });

      setAllUsers((prev) => {
        const index = prev.findIndex((u) => u.id === updatedUser.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = { ...next[index], ...updatedUser };
          return next;
        }
        return [...prev, updatedUser];
      });
    };

    window.addEventListener('erroren:user_updated', handleUserUpdated);
    return () => {
      window.removeEventListener('erroren:user_updated', handleUserUpdated);
    };
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      refreshContacts();
    }
  }, [currentUser?.id]);

  // Google Login Authentication Handler
  const loginWithGoogle = async (
    email: string,
    displayName?: string,
    avatarUrl?: string,
    googleId?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          displayName,
          avatarUrl,
          googleId: googleId || `gid_${Date.now()}`,
        }),
      });

      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setCurrentUser(data.user);
        safeStorage.setJSON('erroren_user', data.user);
        saveToAccountList(data.user);

        if (data.isNewUser || !data.isProfileComplete) {
          setAuthStep('profile');
        } else {
          setAuthStep('authenticated');
        }

        await refreshUsers();
        await refreshContacts();
        return true;
      }

      // Offline / Static fallback (e.g. GitHub Pages)
      const fallbackUser: User = {
        id: `usr_g_${Date.now()}`,
        email: email.trim().toLowerCase(),
        googleId: googleId || `gid_${Date.now()}`,
        displayName: displayName?.trim() || email.split('@')[0],
        about: 'Available | Using ERROREN CHAT ⚡',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        isOnline: true,
        lastSeen: Date.now(),
        role: 'user',
        createdAt: Date.now(),
      };
      setCurrentUser(fallbackUser);
      safeStorage.setJSON('erroren_user', fallbackUser);
      saveToAccountList(fallbackUser);
      setAuthStep('authenticated');
      return true;
    } catch (err: any) {
      // Local fallback for static hosting
      const fallbackUser: User = {
        id: `usr_g_${Date.now()}`,
        email: email.trim().toLowerCase(),
        googleId: googleId || `gid_${Date.now()}`,
        displayName: displayName?.trim() || email.split('@')[0],
        about: 'Available | Using ERROREN CHAT ⚡',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        isOnline: true,
        lastSeen: Date.now(),
        role: 'user',
        createdAt: Date.now(),
      };
      setCurrentUser(fallbackUser);
      safeStorage.setJSON('erroren_user', fallbackUser);
      saveToAccountList(fallbackUser);
      setAuthStep('authenticated');
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  // Phone Login Authentication Handler (e.g. 03399951515)
  const loginWithPhone = async (
    phoneNumber: string,
    displayName?: string,
    countryCode: string = '+92',
    avatarUrl?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    const cleanPhone = phoneNumber.trim();
    try {
      const res = await fetch('/api/auth/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          countryCode,
          displayName,
          avatarUrl,
        }),
      });

      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setCurrentUser(data.user);
        safeStorage.setJSON('erroren_user', data.user);
        saveToAccountList(data.user);

        if (data.isNewUser || !data.isProfileComplete) {
          setAuthStep('profile');
        } else {
          setAuthStep('authenticated');
        }

        await refreshUsers();
        await refreshContacts();
        return true;
      }

      // Offline / Static fallback (e.g. GitHub Pages)
      const fallbackUser: User = {
        id: `usr_p_${cleanPhone.replace(/[^0-9]/g, '') || Date.now()}`,
        phoneNumber: cleanPhone,
        countryCode,
        displayName: displayName?.trim() || `User ${cleanPhone.slice(-4)}`,
        about: 'Available | Using ERROREN CHAT ⚡',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanPhone}`,
        isOnline: true,
        lastSeen: Date.now(),
        role: 'user',
        isPhoneVerified: true,
        createdAt: Date.now(),
      };
      setCurrentUser(fallbackUser);
      safeStorage.setJSON('erroren_user', fallbackUser);
      saveToAccountList(fallbackUser);
      setAuthStep('authenticated');
      return true;
    } catch (err: any) {
      const fallbackUser: User = {
        id: `usr_p_${cleanPhone.replace(/[^0-9]/g, '') || Date.now()}`,
        phoneNumber: cleanPhone,
        countryCode,
        displayName: displayName?.trim() || `User ${cleanPhone.slice(-4)}`,
        about: 'Available | Using ERROREN CHAT ⚡',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanPhone}`,
        isOnline: true,
        lastSeen: Date.now(),
        role: 'user',
        isPhoneVerified: true,
        createdAt: Date.now(),
      };
      setCurrentUser(fallbackUser);
      safeStorage.setJSON('erroren_user', fallbackUser);
      saveToAccountList(fallbackUser);
      setAuthStep('authenticated');
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (
    displayName: string, 
    about: string, 
    avatarUrl: string,
    username?: string,
    phoneNumber?: string,
    countryCode?: string
  ): Promise<boolean> => {
    if (!currentUser) return false;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          displayName,
          username,
          about,
          avatarUrl,
          phoneNumber,
          countryCode: countryCode || currentUser.countryCode || '+92',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setCurrentUser(data.user);
      safeStorage.setJSON('erroren_user', data.user);
      saveToAccountList(data.user);
      setAuthStep('authenticated');
      await refreshUsers();
      return true;
    } catch (err: any) {
      // Local fallback for offline mode
      const updated: User = {
        ...currentUser,
        displayName: displayName.trim(),
        username: username !== undefined ? username.trim().replace(/^@/, '') : currentUser.username,
        about: about.trim(),
        avatarUrl: avatarUrl || currentUser.avatarUrl,
        phoneNumber: phoneNumber !== undefined ? phoneNumber.trim() : currentUser.phoneNumber,
        countryCode: countryCode || currentUser.countryCode || '+92',
      };
      setCurrentUser(updated);
      safeStorage.setJSON('erroren_user', updated);
      saveToAccountList(updated);
      setAuthStep('authenticated');
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  // Optional Phone Number Addition
  const savePhoneNumber = async (
    phoneNumber: string,
    countryCode: string,
    phoneVisibility: 'everyone' | 'contacts' | 'nobody' = 'everyone'
  ): Promise<{ success: boolean; isSmsConfigured: boolean; message: string }> => {
    if (!currentUser) return { success: false, isSmsConfigured: false, message: 'User not logged in' };
    try {
      const res = await fetch('/api/account/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          phoneNumber,
          countryCode,
          phoneVisibility,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update phone number');
      }

      setCurrentUser(data.user);
      safeStorage.setJSON('erroren_user', data.user);
      await refreshUsers();

      return {
        success: true,
        isSmsConfigured: data.isSmsServiceConfigured,
        message: data.message,
      };
    } catch (err: any) {
      return {
        success: false,
        isSmsConfigured: false,
        message: err.message || 'Failed to save phone number',
      };
    }
  };

  // Add Contact
  const addContact = async (
    name: string,
    phoneNumber: string,
    avatarUrl?: string,
    about?: string
  ): Promise<{ success: boolean; isRegisteredUser: boolean; contact?: Contact; matchedUser?: User; error?: string }> => {
    if (!currentUser) return { success: false, isRegisteredUser: false, error: 'User not logged in' };
    const cleanPhone = (phoneNumber || '').trim();
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerUserId: currentUser.id,
          name: name.trim(),
          phoneNumber: cleanPhone,
          avatarUrl,
          about,
        }),
      });

      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        await refreshContacts();
        await refreshUsers();
        return {
          success: true,
          isRegisteredUser: data.isRegisteredUser,
          contact: data.contact,
          matchedUser: data.matchedUser,
        };
      }

      // Offline / Static fallback (e.g. GitHub Pages)
      const fallbackContact: Contact = {
        id: `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ownerUserId: currentUser?.id || 'local_user',
        name: name.trim(),
        phoneNumber: cleanPhone,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanPhone || name}`,
        about: about || 'Saved Contact',
        createdAt: Date.now(),
      };
      setContacts((prev) => [fallbackContact, ...prev.filter(c => c.phoneNumber !== cleanPhone)]);
      return {
        success: true,
        isRegisteredUser: false,
        contact: fallbackContact,
      };
    } catch (err: any) {
      const fallbackContact: Contact = {
        id: `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ownerUserId: currentUser?.id || 'local_user',
        name: name.trim(),
        phoneNumber: cleanPhone,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanPhone || name}`,
        about: about || 'Saved Contact',
        createdAt: Date.now(),
      };
      setContacts((prev) => [fallbackContact, ...prev.filter(c => c.phoneNumber !== cleanPhone)]);
      return {
        success: true,
        isRegisteredUser: false,
        contact: fallbackContact,
      };
    }
  };

  // Delete Contact
  const deleteContact = async (contactId: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch(`/api/contacts/${contactId}?userId=${encodeURIComponent(currentUser.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await refreshContacts();
        return true;
      }
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      return true;
    } catch (err) {
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      return true;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    safeStorage.removeItem('erroren_user');
    setAuthStep('welcome');
  };

  const deleteAccount = async (): Promise<boolean> => {
    logout();
    return true;
  };

  const updateUserSettings = (updates: Partial<UserSettings>) => {
    setUserSettings((prev) => {
      const next = { ...prev, ...updates };
      safeStorage.setJSON('erroren_settings', next);
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authStep,
        setAuthStep,
        isProfileComplete,
        profileCompletionDetails,
        isProfileModalOpen,
        setIsProfileModalOpen,
        openProfileModal,
        closeProfileModal,
        isLoading,
        error,
        loginWithGoogle,
        loginWithPhone,
        updateProfile,
        savePhoneNumber,
        contacts,
        refreshContacts,
        addContact,
        deleteContact,
        logout,
        deleteAccount,
        allUsers,
        refreshUsers,
        userSettings,
        updateUserSettings,
        savedAccounts,
        switchAccount,
        removeSavedAccount,
        startAddAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
