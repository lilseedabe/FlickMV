import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter,
  Calendar,
  Clock,
  Play,
  MoreHorizontal,
  Folder,
  Image,
  Video,
  Music,
  HelpCircle,
  Star,
  TrendingUp,
  Zap,
  BookOpen,
  PlayCircle,
  Award,
  Target,
  Users,
  Heart
} from 'lucide-react';

// Context
import { useUser } from '../contexts/UserContext';

// Mock data for projects
const mockProjects = [
  {
    id: '1',
    name: 'Summer Vibes MV',
    description: 'A vibrant music video with summer themes',
    thumbnail: 'https://via.placeholder.com/300x200/6366f1/ffffff?text=Summer+Vibes',
    duration: 45,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    mediaCount: 12,
    status: 'completed',
    difficulty: 'beginner'
  },
  {
    id: '2',
    name: 'Neon Nights',
    description: 'Cyberpunk-inspired music video',
    thumbnail: 'https://via.placeholder.com/300x200/d946ef/ffffff?text=Neon+Nights',
    duration: 32,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18'),
    mediaCount: 8,
    status: 'in-progress',
    difficulty: 'intermediate'
  },
  {
    id: '3',
    name: 'Acoustic Dreams',
    description: 'Peaceful acoustic music video',
    thumbnail: 'https://via.placeholder.com/300x200/10b981/ffffff?text=Acoustic+Dreams',
    duration: 28,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-15'),
    mediaCount: 6,
    status: 'draft',
    difficulty: 'beginner'
  },
];

const tutorials = [
  {
    id: 'getting-started',
    title: '初めてのMV作成',
    description: '基本的な操作を学んで最初のミュージックビデオを作成しましょう',
    duration: '5分',
    difficulty: 'beginner',
    icon: PlayCircle,
    color: 'bg-green-500'
  },
  {
    id: 'audio-sync',
    title: '音楽に合わせた編集',
    description: 'BPMを使って音楽に合わせた魅力的な映像を作る方法',
    duration: '8分',
    difficulty: 'intermediate',
    icon: Music,
    color: 'bg-blue-500'
  },
  {
    id: 'effects-mastery',
    title: 'エフェクトの活用',
    description: 'トランジションやエフェクトを使ってプロレベルの仕上がりに',
    duration: '12分',
    difficulty: 'advanced',
    icon: Zap,
    color: 'bg-purple-500'
  }
];

const templates = [
  {
    id: 'template1',
    name: 'ポップミュージック',
    description: '明るくエネルギッシュなポップソング向けテンプレート',
    thumbnail: 'https://via.placeholder.com/200x120/ff6b6b/ffffff?text=Pop+Music',
    genre: 'pop',
    difficulty: 'beginner',
    uses: 1247
  },
  {
    id: 'template2',
    name: 'アコースティック',
    description: '落ち着いたアコースティック楽曲向けテンプレート',
    thumbnail: 'https://via.placeholder.com/200x120/4ecdc4/ffffff?text=Acoustic',
    genre: 'acoustic',
    difficulty: 'beginner',
    uses: 892
  },
  {
    id: 'template3',
    name: 'ロックバンド',
    description: 'パワフルなロック楽曲向けテンプレート',
    thumbnail: 'https://via.placeholder.com/200x120/45b7d1/ffffff?text=Rock+Band',
    genre: 'rock',
    difficulty: 'intermediate',
    uses: 634
  }
];

const Dashboard: React.FC = () => {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [showWelcome, setShowWelcome] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  const [isFirstTime, setIsFirstTime] = useState(false);

  // Determine if user should see mock data (demo account) or real data
  const isDemo = user?.email === 'demo@flickmv.com';
  const userProjects = isDemo ? mockProjects : [];
  const userStats = isDemo ? {
    projectCount: mockProjects.length,
    mediaFiles: '127',
    createdVideos: '18',
    totalTime: '5h 23m'
  } : {
    projectCount: 0,
    mediaFiles: '0',
    createdVideos: '0',
    totalTime: '0m'
  };

  useEffect(() => {
    // Check if this is user's first time OR if they're a new registered user
    const hasVisited = localStorage.getItem(`hasVisited_${user?.email}`);
    if (!hasVisited && user) {
      setIsFirstTime(true);
      setShowWelcome(true);
      localStorage.setItem(`hasVisited_${user.email}`, 'true');
    }
  }, [user]);

  const filteredProjects = userProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterBy === 'all' || project.status === filterBy;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-400/20';
      case 'in-progress':
        return 'text-yellow-400 bg-yellow-400/20';
      case 'draft':
        return 'text-gray-400 bg-gray-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-400 bg-green-400/20';
      case 'intermediate':
        return 'text-yellow-400 bg-yellow-400/20';
      case 'advanced':
        return 'text-red-400 bg-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  return (
    <div className="bg-gradient-to-br from-dark-900 via-dark-900 to-purple-900/20 min-h-full">
      {/* Welcome Modal for First Time Users */}
      <AnimatePresence>
        {isFirstTime && showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 rounded-2xl p-8 max-w-lg w-full border border-purple-500/30"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  FlickMVへようこそ！🎬
                </h2>
                <p className="text-gray-300 mb-6">
                  AIの力でプロレベルのミュージックビデオを作成できます。
                  初心者の方でも簡単に始められるよう、ガイドをご用意しました。
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-left">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Target className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-gray-300">チュートリアルで基本操作を学習</span>
                  </div>
                  <div className="flex items-center text-left">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Star className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-gray-300">テンプレートで簡単スタート</span>
                  </div>
                  <div className="flex items-center text-left">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Zap className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-gray-300">AIが自動で最適化</span>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {setShowWelcome(false); setActiveTab('tutorials');}}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
                  >
                    チュートリアルを見る
                  </button>
                  <button
                    onClick={() => setShowWelcome(false)}
                    className="flex-1 bg-dark-700 text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-dark-600 transition-all"
                  >
                    後で見る
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-2">
                {user?.name ? `おかえりなさい、${user.name}さん！` : 'おかえりなさい！'} 👋
              </h1>
              <p className="text-dark-400 text-lg">
                AIの力で素晴らしいミュージックビデオを作成しましょう
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowWelcome(true)}
                className="flex items-center space-x-2 bg-dark-800 hover:bg-dark-700 text-gray-300 px-4 py-2 rounded-lg transition-all"
              >
                <HelpCircle className="w-4 h-4" />
                <span>ヘルプ</span>
              </button>
              <Link 
                to="/editor" 
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span>新しいプロジェクト</span>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex space-x-1 mb-8 bg-dark-800/50 rounded-lg p-1"
        >
          {[
            { id: 'projects', label: 'マイプロジェクト', icon: Folder },
            { id: 'templates', label: 'テンプレート', icon: Star },
            { id: 'tutorials', label: 'チュートリアル', icon: BookOpen }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </motion.div>

        {/* Content based on active tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'projects' && (
            <motion.div
              key="projects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                  { label: 'プロジェクト数', value: userStats.projectCount, icon: Folder, color: 'purple' },
                  { label: 'メディアファイル', value: userStats.mediaFiles, icon: Image, color: 'blue' },
                  { label: '作成した動画', value: userStats.createdVideos, icon: Video, color: 'green' },
                  { label: '総再生時間', value: userStats.totalTime, icon: Clock, color: 'orange' }
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.1 }}
                      className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-6 border border-dark-700/50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-dark-400 text-sm mb-1">{stat.label}</p>
                          <p className="text-2xl font-bold text-white">{stat.value}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-lg bg-${stat.color}-500/20 flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 text-${stat.color}-400`} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="プロジェクトを検索..."
                      className="w-full bg-dark-800/50 border border-dark-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <select 
                    className="bg-dark-800/50 border border-dark-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all"
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                  >
                    <option value="all">すべてのステータス</option>
                    <option value="completed">完成</option>
                    <option value="in-progress">制作中</option>
                    <option value="draft">下書き</option>
                  </select>
                </div>
              </div>

              {/* Projects Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="bg-dark-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-dark-700/50 hover:border-purple-500/50 transition-all duration-300 group cursor-pointer"
                  >
                    <Link to={`/editor/${project.id}`}>
                      {/* Thumbnail */}
                      <div className="relative">
                        <img 
                          src={project.thumbnail} 
                          alt={project.name}
                          className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <Play className="w-12 h-12 text-white" fill="currentColor" />
                        </div>
                        <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {project.status === 'completed' ? '完成' : project.status === 'in-progress' ? '制作中' : '下書き'}
                        </div>
                        <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(project.difficulty)}`}>
                          {project.difficulty === 'beginner' ? '初級' : project.difficulty === 'intermediate' ? '中級' : '上級'}
                        </div>
                      </div>

                      {/* Project Info */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
                            {project.name}
                          </h3>
                          <button className="p-1 hover:bg-dark-700 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4 text-dark-400" />
                          </button>
                        </div>

                        <p className="text-dark-400 text-sm line-clamp-2">
                          {project.description}
                        </p>

                        <div className="flex items-center justify-between text-xs text-dark-500">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{project.duration}秒</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Image className="w-3 h-3" />
                              <span>{project.mediaCount}ファイル</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(project.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Empty State for Projects */}
              {filteredProjects.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-24 h-24 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-12 h-12 text-dark-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">プロジェクトが見つかりません</h3>
                  <p className="text-dark-400 mb-6">
                    {searchTerm ? '検索条件を調整してみてください' : '最初のプロジェクトを作成して始めましょう'}
                  </p>
                  <Link to="/editor" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 px-6 rounded-lg font-medium transition-all inline-flex items-center space-x-2">
                    <Plus className="w-5 h-5" />
                    <span>新しいプロジェクト</span>
                  </Link>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'templates' && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">テンプレートライブラリ</h2>
                <p className="text-dark-400">プロがデザインしたテンプレートで素早くスタート</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ y: -5 }}
                    className="bg-dark-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-dark-700/50 hover:border-purple-500/50 transition-all duration-300 group cursor-pointer"
                  >
                    <div className="relative">
                      <img 
                        src={template.thumbnail} 
                        alt={template.name}
                        className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                        {template.difficulty === 'beginner' ? '初級' : template.difficulty === 'intermediate' ? '中級' : '上級'}
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
                          {template.name}
                        </h3>
                        <div className="flex items-center space-x-1 text-dark-400">
                          <Users className="w-3 h-3" />
                          <span className="text-xs">{template.uses}</span>
                        </div>
                      </div>
                      
                      <p className="text-dark-400 text-sm">
                        {template.description}
                      </p>
                      
                      <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-2 px-4 rounded-lg font-medium transition-all">
                        このテンプレートを使用
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'tutorials' && (
            <motion.div
              key="tutorials"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">学習センター</h2>
                <p className="text-dark-400">ステップバイステップで学んでプロレベルのスキルを身につけましょう</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tutorials.map((tutorial, index) => {
                  const Icon = tutorial.icon;
                  return (
                    <motion.div
                      key={tutorial.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      whileHover={{ y: -5 }}
                      className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-6 border border-dark-700/50 hover:border-purple-500/50 transition-all duration-300 group cursor-pointer"
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 ${tutorial.color}/20 rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 ${tutorial.color.replace('bg-', 'text-')}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
                              {tutorial.title}
                            </h3>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(tutorial.difficulty)}`}>
                              {tutorial.difficulty === 'beginner' ? '初級' : tutorial.difficulty === 'intermediate' ? '中級' : '上級'}
                            </div>
                          </div>
                          
                          <p className="text-dark-400 text-sm mb-4">
                            {tutorial.description}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1 text-dark-500 text-xs">
                              <Clock className="w-3 h-3" />
                              <span>{tutorial.duration}</span>
                            </div>
                            <button className="bg-purple-500 hover:bg-purple-600 text-white py-1 px-3 rounded-lg text-sm font-medium transition-all">
                              開始
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Dashboard;