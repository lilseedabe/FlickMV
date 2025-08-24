import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Notification, UserContextType, PLAN_TYPES } from '@/types';

const UserContext = createContext<UserContextType | undefined>(undefined);

// Mock user data - in real app this would come from API
const mockUser: User = {
  id: 'user_123',
  name: 'ユーザー太郎',
  email: 'user@example.com',
  avatar: null,
  plan: 'free',
  subscription: {
    status: 'active',
    exportsRemaining: 3,
    exportsLimit: 3
  },
  usage: {
    exportsThisMonth: 0,
    totalExports: 0,
    storageUsed: 0,
    storageLimit: 1,
    lastExportDate: undefined
  },
  preferences: {
    theme: 'dark',
    language: 'ja',
    notifications: {
      email: true,
      push: true,
      marketing: false
    }
  },
  createdAt: new Date('2024-01-01'),
  lastLoginAt: new Date()
};

const mockNotifications: Notification[] = [
  {
    id: 'notif_1',
    type: 'upgrade',
    title: 'スタンダードプランで透かしを削除',
    message: 'スタンダードプラン以上にアップグレードして、動画から透かしを削除しましょう',
    unread: true,
    createdAt: new Date('2024-01-21'),
    actionUrl: '/pricing',
    actionText: 'プランを見る'
  },
  {
    id: 'notif_2',
    type: 'info',
    title: 'FlickMVへようこそ！',
    message: 'フリープランでは月3回まで動画をエクスポートできます',
    unread: true,
    createdAt: new Date('2024-01-20')
  },
  {
    id: 'notif_3',
    type: 'info',
    title: '新機能のお知らせ',
    message: 'AIアシスト機能がリリースされました！',
    unread: false,
    createdAt: new Date('2024-01-18')
  }
];

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<Array<{email: string, password: string, userData: User}>>([]);

  // Initialize user data
  useEffect(() => {
    const initializeUser = async () => {
      try {
        setLoading(true);
        
        // Load registered users from localStorage
        const savedUsers = localStorage.getItem('flickmv_registered_users');
        if (savedUsers) {
          setRegisteredUsers(JSON.parse(savedUsers));
        }
        
        // Check if user is logged in (check localStorage, token, etc.)
        const token = localStorage.getItem('authToken');
        if (token) {
          // In real app, validate token and fetch user data
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
          
          // Try to load current user from localStorage
          const currentUserData = localStorage.getItem('flickmv_current_user');
          if (currentUserData) {
            setUser(JSON.parse(currentUserData));
          } else {
            setUser(mockUser);
          }
          setNotifications(mockNotifications);
        }
      } catch (err) {
        setError('Failed to initialize user data');
        console.error('User initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  // Actions
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check demo account
      if (email === 'demo@flickmv.com' && password === 'demo123') {
        localStorage.setItem('authToken', 'mock_token_123');
        localStorage.setItem('flickmv_current_user', JSON.stringify(mockUser));
        setUser(mockUser);
        setNotifications(mockNotifications);
        return;
      }
      
      // Check registered users
      const registeredUser = registeredUsers.find(
        user => user.email === email && user.password === password
      );
      
      if (registeredUser) {
        localStorage.setItem('authToken', 'mock_token_123');
        localStorage.setItem('flickmv_current_user', JSON.stringify(registeredUser.userData));
        setUser(registeredUser.userData);
        setNotifications(mockNotifications);
      } else {
        throw new Error('メールアドレスまたはパスワードが間違っています');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if email already exists
      const existingUser = registeredUsers.find(user => user.email === email);
      if (existingUser) {
        throw new Error('このメールアドレスは既に登録されています');
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, create a new user with provided data
      const newUser: User = {
        ...mockUser,
        id: `user_${Date.now()}`,
        name,
        email,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        usage: {
          exportsThisMonth: 0,
          totalExports: 0,
          storageUsed: 0,
          storageLimit: 1,
          lastExportDate: undefined
        },
        subscription: {
          status: 'active',
          exportsRemaining: 3,
          exportsLimit: 3
        }
      };
      
      // Add to registered users list
      const newRegisteredUser = {
        email,
        password,
        userData: newUser
      };
      
      const updatedUsers = [...registeredUsers, newRegisteredUser];
      setRegisteredUsers(updatedUsers);
      
      // Save to localStorage
      localStorage.setItem('flickmv_registered_users', JSON.stringify(updatedUsers));
      localStorage.setItem('authToken', 'mock_token_123');
      localStorage.setItem('flickmv_current_user', JSON.stringify(newUser));
      
      setUser(newUser);
      
      // Add only welcome notification for new users (not mock notifications)
      const welcomeNotification: Notification = {
        id: `notif_welcome_${Date.now()}`,
        type: 'success',
        title: 'アカウント作成完了',
        message: `${name}さん、FlickMVへようこそ！`,
        unread: true,
        createdAt: new Date()
      };
      
      setNotifications([welcomeNotification]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('flickmv_current_user');
      
      // Clear state
      setUser(null);
      setNotifications([]);
      setError(null);
    } catch (err) {
      setError('Logout failed');
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    try {
      if (!user) throw new Error('User not logged in');
      
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
    } catch (err) {
      setError('Failed to update user');
      console.error('Update user error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const upgradePlan = async (plan: string) => {
    try {
      if (!user) throw new Error('User not logged in');
      
      setLoading(true);
      
      // Simulate API call for plan upgrade
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update user plan and subscription details
      const planLimits = {
        free: { exportsLimit: 3, storageLimit: 1 },
        light: { exportsLimit: 10, storageLimit: 10 },
        standard: { exportsLimit: 25, storageLimit: 50 },
        pro: { exportsLimit: 40, storageLimit: 100 }
      };
      
      const limits = planLimits[plan as keyof typeof planLimits] || planLimits.free;
      
      const updatedUser: User = {
        ...user,
        plan: plan as typeof PLAN_TYPES[number],
        subscription: {
          ...user.subscription,
          exportsLimit: limits.exportsLimit,
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        },
        usage: {
          ...user.usage,
          storageLimit: limits.storageLimit
        }
      };
      
      setUser(updatedUser);
      
      // Add success notification
      const successNotification: Notification = {
        id: `notif_upgrade_${Date.now()}`,
        type: 'success',
        title: 'プランのアップグレード完了',
        message: `${plan}プランにアップグレードされました`,
        unread: true,
        createdAt: new Date()
      };
      
      setNotifications(prev => [successNotification, ...prev]);
      
    } catch (err) {
      setError('Failed to upgrade plan');
      console.error('Upgrade plan error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, unread: false }
            : notif
        )
      );
      
      // In real app, also update on server
      // await api.markNotificationAsRead(notificationId);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      setNotifications([]);
      
      // In real app, also clear on server
      // await api.clearAllNotifications();
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const refreshUserData = async () => {
    try {
      setLoading(true);
      
      // Simulate API call to refresh user data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real app, fetch fresh data from API
      // const freshUserData = await api.getCurrentUser();
      // setUser(freshUserData);
      
    } catch (err) {
      setError('Failed to refresh user data');
      console.error('Refresh user data error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Computed properties
  const canRemoveWatermark = user?.plan === 'standard' || user?.plan === 'pro';
  const hasUnreadNotifications = notifications.some(n => n.unread);
  const isUpgradeNeeded = user?.plan === 'free' && user?.subscription.exportsRemaining <= 1;

  const value: UserContextType = {
    user,
    notifications,
    loading,
    error,
    
    login,
    register,
    logout,
    updateUser,
    upgradePlan,
    markNotificationAsRead,
    clearAllNotifications,
    refreshUserData,
    
    canRemoveWatermark,
    hasUnreadNotifications,
    isUpgradeNeeded
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;