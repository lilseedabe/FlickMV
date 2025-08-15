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
    exportsLimit: 5
  },
  usage: {
    exportsThisMonth: 2,
    totalExports: 15,
    storageUsed: 1.2,
    storageLimit: 1,
    lastExportDate: new Date('2024-01-20')
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
    title: 'プロプランで透かしを削除',
    message: 'プロプランにアップグレードして、動画から透かしを削除しましょう',
    unread: true,
    createdAt: new Date('2024-01-21'),
    actionUrl: '/pricing',
    actionText: 'プランを見る'
  },
  {
    id: 'notif_2',
    type: 'warning',
    title: '出力制限間近',
    message: 'フリープランの月間出力制限まで残り3回です',
    unread: true,
    createdAt: new Date('2024-01-20'),
    actionUrl: '/pricing',
    actionText: 'アップグレード'
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

  // Initialize user data
  useEffect(() => {
    const initializeUser = async () => {
      try {
        setLoading(true);
        
        // Check if user is logged in (check localStorage, token, etc.)
        const token = localStorage.getItem('authToken');
        if (token) {
          // In real app, validate token and fetch user data
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
          setUser(mockUser);
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
      
      // Mock validation
      if (email === 'demo@flickmv.com' && password === 'demo123') {
        localStorage.setItem('authToken', 'mock_token_123');
        setUser(mockUser);
        setNotifications(mockNotifications);
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
        free: { exportsLimit: 5, storageLimit: 1 },
        basic: { exportsLimit: 25, storageLimit: 10 },
        pro: { exportsLimit: 100, storageLimit: 100 },
        premium: { exportsLimit: -1, storageLimit: -1 }
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
  const canRemoveWatermark = user?.plan === 'pro' || user?.plan === 'premium';
  const hasUnreadNotifications = notifications.some(n => n.unread);
  const isUpgradeNeeded = user?.plan === 'free' && user?.subscription.exportsRemaining <= 1;

  const value: UserContextType = {
    user,
    notifications,
    loading,
    error,
    
    login,
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