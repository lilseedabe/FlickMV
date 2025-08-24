import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Play, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Sparkles,
  Star,
  Crown,
  Check,
  AlertCircle,
  Loader
} from 'lucide-react';

// Context
import { useUser } from '../contexts/UserContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user, login, register, loading, error } = useUser();
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (formError) setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (isLoginMode) {
        await login(formData.email, formData.password);
      } else {
        // Validation for registration
        if (formData.password !== formData.confirmPassword) {
          throw new Error('パスワードが一致しません');
        }
        if (formData.password.length < 6) {
          throw new Error('パスワードは6文字以上で入力してください');
        }
        await register(formData.name, formData.email, formData.password);
      }
      // Navigation will happen automatically via useEffect when user is set
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 
        (isLoginMode ? 'ログインに失敗しました' : 'アカウント作成に失敗しました');
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setFormData({
      name: '',
      email: 'demo@flickmv.com',
      password: 'demo123',
      confirmPassword: ''
    });
    
    setIsSubmitting(true);
    try {
      await login('demo@flickmv.com', 'demo123');
    } catch (err) {
      setFormError('デモログインに失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-dark-900 via-dark-900 to-purple-900/20 min-h-full flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-dark-900 via-dark-900 to-purple-900/20 min-h-full flex">
      {/* Left Side - Branding */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12"
      >
        <div className="text-center max-w-md">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-8"
          >
            <Play className="w-10 h-10 text-white" fill="currentColor" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4"
          >
            FlickMV
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-300 mb-8"
          >
            AIの力で誰でも簡単に
            <br />
            プロレベルのミュージックビデオを
          </motion.p>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            {[
              { icon: Sparkles, text: 'AI自動編集機能' },
              { icon: Star, text: '豊富なテンプレート' },
              { icon: Crown, text: 'プロ品質の出力' }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-center space-x-3 text-gray-300"
              >
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-4 h-4 text-purple-400" />
                </div>
                <span>{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Login Form */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex flex-col justify-center items-center p-8"
      >
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-white" fill="currentColor" />
            </div>
            <h1 className="text-3xl font-bold text-white">FlickMV</h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-dark-800/50 backdrop-blur-sm rounded-2xl p-8 border border-dark-700/50"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                {isLoginMode ? 'ログイン' : '新規登録'}
              </h2>
              <p className="text-gray-400">
                {isLoginMode 
                  ? 'アカウントにサインインしてください' 
                  : '新しいアカウントを作成しましょう'
                }
              </p>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {(formError || error) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-6 flex items-center space-x-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{formError || error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field - Only for registration */}
              {!isLoginMode && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    お名前
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
                      placeholder="山田太郎"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  メールアドレス
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  パスワード
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field - Only for registration */}
              {!isLoginMode && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    パスワード確認
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-purple-600 bg-dark-700 border-dark-600 rounded focus:ring-purple-500 focus:ring-2"
                  />
                  <span className="ml-2 text-sm text-gray-300">ログイン状態を保持</span>
                </label>
                <a href="#" className="text-sm text-purple-400 hover:text-purple-300">
                  パスワードを忘れた場合
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>{isLoginMode ? 'ログイン' : 'アカウント作成'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Demo Login */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-dark-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-dark-800 text-gray-400">または</span>
                </div>
              </div>

              <button
                onClick={handleDemoLogin}
                disabled={isSubmitting}
                className="w-full mt-4 bg-dark-700 hover:bg-dark-600 text-white py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>デモアカウントでお試し</span>
              </button>
            </div>

            {/* Mode Switch Link */}
            <p className="mt-8 text-center text-sm text-gray-400">
              {isLoginMode ? (
                <>
                  アカウントをお持ちでない場合{' '}
                  <button 
                    type="button"
                    onClick={() => {
                      setIsLoginMode(false);
                      setFormError(null);
                      setFormData({ name: '', email: '', password: '', confirmPassword: '' });
                    }}
                    className="text-purple-400 hover:text-purple-300 font-medium underline"
                  >
                    新規登録
                  </button>
                </>
              ) : (
                <>
                  既にアカウントをお持ちですか？{' '}
                  <button 
                    type="button"
                    onClick={() => {
                      setIsLoginMode(true);
                      setFormError(null);
                      setFormData({ name: '', email: '', password: '', confirmPassword: '' });
                    }}
                    className="text-purple-400 hover:text-purple-300 font-medium underline"
                  >
                    ログイン
                  </button>
                </>
              )}
            </p>
          </motion.div>

          {/* Demo Credentials Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 bg-dark-800/30 rounded-lg p-4 border border-dark-700/30"
          >
            <h3 className="text-sm font-medium text-gray-300 mb-2">デモアカウント情報</h3>
            <div className="text-xs text-gray-400 space-y-1">
              <p>メール: demo@flickmv.com</p>
              <p>パスワード: demo123</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;