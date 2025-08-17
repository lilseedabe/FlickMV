import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Play,
  Home,
  Settings,
  User,
  Save,
  Undo2,
  Redo2,
  Crown,
  ChevronDown,
  Lock,
  Unlock,
  CreditCard,
  LogOut,
  HelpCircle,
  Bell,
  Sparkles,
  Star,
  Shield,
  Award
} from 'lucide-react';

// Context
import { useUser } from '../../contexts/UserContext';

// Components
import LoadingScreen from '../ui/LoadingScreen';

const planConfig = {
  free: { name: 'フリー', color: 'gray', icon: Star },
  basic: { name: 'ベーシック', color: 'blue', icon: Sparkles },
  pro: { name: 'プロ', color: 'purple', icon: Crown },
  premium: { name: 'プレミアム', color: 'yellow', icon: Award }
};

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isEditor = location.pathname.includes('/editor');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const { 
    user, 
    notifications, 
    loading, 
    logout,
    canRemoveWatermark,
    hasUnreadNotifications,
    markNotificationAsRead 
  } = useUser();

  // Don't render navbar on login page
  if (location.pathname === '/login') {
    return null;
  }

  // Show loading screen if user is loading
  if (loading) {
    return <LoadingScreen message="ユーザー情報を読み込んでいます..." />;
  }

  // Redirect to login if not authenticated
  if (!user && location.pathname !== '/login') {
    navigate('/login');
    return null;
  }

  const userPlan = user ? planConfig[user.plan] : planConfig.free;
  const unreadNotifications = notifications.filter(n => n.unread).length;

  const handleSave = () => {
    console.log('Saving project...');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (notification.unread) {
      await markNotificationAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    
    setShowNotifications(false);
  };

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="bg-dark-800/90 backdrop-blur-lg border-b border-dark-700 px-6 py-3 flex items-center justify-between relative z-50"
    >
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center space-x-3">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center"
        >
          <Play className="w-6 h-6 text-white" fill="currentColor" />
        </motion.div>
        <div>
          <h1 className="text-xl font-bold text-white">FlickMV</h1>
          <p className="text-xs text-gray-400">Music Video Creator</p>
        </div>
      </Link>

      {/* Editor Controls (Show only in editor) */}
      {isEditor && (
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-dark-700/50 rounded-lg p-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 hover:bg-dark-600 rounded-md transition-colors"
              title="元に戻す"
            >
              <Undo2 className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 hover:bg-dark-600 rounded-md transition-colors"
              title="やり直し"
            >
              <Redo2 className="w-4 h-4" />
            </motion.button>
            <div className="w-px h-6 bg-dark-600 mx-2" />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              className="flex items-center space-x-1 px-3 py-2 bg-dark-600 hover:bg-dark-500 rounded-md transition-colors text-sm"
              title="プロジェクトを保存"
            >
              <Save className="w-4 h-4" />
              <span>保存</span>
            </motion.button>
          </div>

          {/* Watermark Status */}
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium ${
            canRemoveWatermark 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {canRemoveWatermark ? (
              <>
                <Unlock className="w-3 h-3" />
                <span>透かしなし</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3" />
                <span>FlickMV透かし</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Right Side Actions */}
      <div className="flex items-center space-x-3">
        {/* Dashboard Link (Non-editor only) */}
        {!isEditor && (
          <Link 
            to="/dashboard"
            className="flex items-center space-x-2 px-3 py-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">ダッシュボード</span>
          </Link>
        )}

        {/* Plan Display & Upgrade */}
        {user && (
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg bg-${userPlan.color}-500/20 text-${userPlan.color}-400`}>
              {React.createElement(userPlan.icon, { className: "w-4 h-4" })}
              <span className="text-sm font-medium hidden sm:inline">{userPlan.name}</span>
            </div>
            
            {user.plan !== 'premium' && (
              <Link
                to="/pricing"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-1"
              >
                <Crown className="w-3 h-3" />
                <span className="hidden sm:inline">アップグレード</span>
              </Link>
            )}
          </div>
        )}

        {/* Export Counter */}
        {user && user.subscription.exportsLimit > 0 && (
          <div className="text-xs text-gray-400 hidden md:block">
            <span className="font-medium">残り{user.subscription.exportsRemaining}回</span>
            <span className="text-gray-500">/{user.subscription.exportsLimit}</span>
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {hasUnreadNotifications && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {unreadNotifications}
              </span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 top-full mt-2 w-80 bg-dark-800 border border-dark-700 rounded-xl shadow-xl overflow-hidden z-50"
              >
                <div className="p-4 border-b border-dark-700">
                  <h3 className="font-semibold">通知</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      新しい通知はありません
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className="p-4 border-b border-dark-700/50 hover:bg-dark-750 transition-colors cursor-pointer"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            notification.unread ? 'bg-purple-500' : 'bg-gray-500'
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{notification.title}</p>
                            <p className="text-sm text-gray-300 mt-1">{notification.message}</p>
                            {notification.actionText && (
                              <span className="text-xs text-purple-400 hover:text-purple-300 mt-2 inline-block">
                                {notification.actionText} →
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Menu */}
        {user && (
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </motion.button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-dark-800 border border-dark-700 rounded-xl shadow-xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-dark-700">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-gray-400">プラン</span>
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full bg-${userPlan.color}-500/20 text-${userPlan.color}-400`}>
                        {React.createElement(userPlan.icon, { className: "w-3 h-3" })}
                        <span className="text-xs font-medium">{userPlan.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <Link
                      to="/pricing"
                      className="flex items-center space-x-3 w-full px-3 py-2 hover:bg-dark-700 rounded-lg transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span>プラン・課金</span>
                    </Link>
                    <button className="flex items-center space-x-3 w-full px-3 py-2 hover:bg-dark-700 rounded-lg transition-colors">
                      <Settings className="w-4 h-4 text-gray-400" />
                      <span>設定</span>
                    </button>
                    <button className="flex items-center space-x-3 w-full px-3 py-2 hover:bg-dark-700 rounded-lg transition-colors">
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                      <span>ヘルプ・サポート</span>
                    </button>
                    <div className="border-t border-dark-700 my-2" />
                    <button 
                      onClick={handleLogout}
                      className="flex items-center space-x-3 w-full px-3 py-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors text-gray-400"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>ログアウト</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Click outside to close menus */}
      {(showUserMenu || showNotifications) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </motion.nav>
  );
};

export default Navbar;