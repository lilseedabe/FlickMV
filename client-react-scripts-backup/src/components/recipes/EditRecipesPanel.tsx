import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scissors, 
  Sparkles, 
  Palette, 
  RotateCw, 
  Zap, 
  Play, 
  Eye, 
  Star,
  Clock,
  TrendingUp,
  Filter,
  Search,
  Info,
  ChevronDown,
  Download,
  Wand2,
  Music,
  Volume2,
  Hash
} from 'lucide-react';

import { 
  EditRecipesPanelProps,
  EditRecipe,
  TimelineClip,
  BPMAnalysis
} from '../../types';

// プリセットレシピの定義
const PRESET_RECIPES: EditRecipe[] = [
  {
    id: 'beat_cut',
    name: 'ビートカット',
    description: '音楽のビートに合わせて映像を自動カット',
    icon: 'scissors',
    category: 'cutting',
    difficulty: 'beginner',
    trigger: 'beat',
    parameters: {
      cutInterval: 'every_beat', // every_beat, every_2_beats, every_bar
      transitionType: 'cut', // cut, crossfade, slide
      transitionDuration: 0.1
    }
  },
  {
    id: 'beat_zoom',
    name: 'ビートズーム',
    description: 'ビートに合わせてズームイン/アウト',
    icon: 'zoom-in',
    category: 'animation',
    difficulty: 'beginner',
    trigger: 'beat',
    parameters: {
      zoomStrength: 0.1, // 0.05-0.3
      zoomDirection: 'alternating', // in, out, alternating
      easing: 'ease-out'
    }
  },
  {
    id: 'color_flash',
    name: 'カラーフラッシュ',
    description: 'ビートに合わせて色調を変化',
    icon: 'palette',
    category: 'color',
    difficulty: 'intermediate',
    trigger: 'beat',
    parameters: {
      flashIntensity: 0.3,
      colorShift: 20, // hue shift in degrees
      duration: 0.15
    }
  },
  {
    id: 'shake_effect',
    name: 'シェイクエフェクト',
    description: 'ドロップやビートで画面を揺らす',
    icon: 'zap',
    category: 'effects',
    difficulty: 'intermediate',
    trigger: 'beat',
    parameters: {
      intensity: 0.02, // 0.01-0.05
      frequency: 20, // Hz
      duration: 0.2,
      direction: 'xy' // x, y, xy
    }
  },
  {
    id: 'slide_transition',
    name: 'スライド遷移',
    description: '小節の変わり目でスライド切り替え',
    icon: 'arrow-right',
    category: 'cutting',
    difficulty: 'beginner',
    trigger: 'bar',
    parameters: {
      direction: 'left', // left, right, up, down
      duration: 0.5,
      easing: 'ease-in-out'
    }
  },
  {
    id: 'blur_pulse',
    name: 'ブラーパルス',
    description: 'ビートに合わせてぼかしエフェクト',
    icon: 'circle',
    category: 'effects',
    difficulty: 'advanced',
    trigger: 'beat',
    parameters: {
      blurAmount: 3, // 1-10 pixels
      pulseSpeed: 1.0,
      fadeTime: 0.1
    }
  },
  {
    id: 'auto_ken_burns',
    name: 'オートケンバーンズ',
    description: 'BPMに同期したパン&ズーム',
    icon: 'move',
    category: 'animation',
    difficulty: 'advanced',
    trigger: 'bar',
    parameters: {
      panAmount: 0.1, // 0.05-0.2
      zoomAmount: 0.15, // 0.1-0.3
      duration: 'bar_length', // bar_length, 2_bars, 4_bars
      randomDirection: true
    }
  },
  {
    id: 'beat_glow',
    name: 'ビートグロー',
    description: 'ビートで光の輪郭を追加',
    icon: 'sun',
    category: 'effects',
    difficulty: 'intermediate',
    trigger: 'beat',
    parameters: {
      glowColor: '#ffffff',
      glowIntensity: 0.5,
      glowSize: 20, // pixels
      fadeOut: 0.3
    }
  }
];

/**
 * Edit Recipesパネル
 * ビート同期の自動編集機能を提供
 */
const EditRecipesPanel: React.FC<EditRecipesPanelProps> = ({
  recipes = PRESET_RECIPES,
  selectedClip,
  bpmAnalysis,
  onRecipeApply,
  onRecipePreview
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [previewingRecipe, setPreviewingRecipe] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customParameters, setCustomParameters] = useState<Record<string, any>>({});

  // カテゴリの一覧
  const categories = [
    { id: 'all', name: '全て', icon: Hash },
    { id: 'cutting', name: 'カット', icon: Scissors },
    { id: 'animation', name: 'アニメーション', icon: RotateCw },
    { id: 'effects', name: 'エフェクト', icon: Sparkles },
    { id: 'color', name: 'カラー', icon: Palette }
  ];

  // フィルタリングされたレシピ
  const filteredRecipes = useMemo(() => {
    let filtered = recipes;

    // テキスト検索
    if (searchQuery) {
      filtered = filtered.filter(recipe => 
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // カテゴリフィルター
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(recipe => recipe.category === selectedCategory);
    }

    // 難易度フィルター
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(recipe => recipe.difficulty === selectedDifficulty);
    }

    return filtered;
  }, [recipes, searchQuery, selectedCategory, selectedDifficulty]);

  // レシピアイコンの取得
  const getRecipeIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'scissors': Scissors,
      'sparkles': Sparkles,
      'palette': Palette,
      'rotate-cw': RotateCw,
      'zap': Zap,
      'zoom-in': Zap, // 適当なアイコンで代用
      'arrow-right': RotateCw,
      'circle': Sparkles,
      'move': RotateCw,
      'sun': Sparkles
    };
    return iconMap[iconName] || Sparkles;
  };

  // 難易度の色取得
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400';
      case 'intermediate': return 'text-yellow-400';
      case 'advanced': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // レシピプレビュー
  const handlePreview = (recipe: EditRecipe) => {
    setPreviewingRecipe(previewingRecipe === recipe.id ? null : recipe.id);
    onRecipePreview(recipe);
  };

  // レシピ適用
  const handleApply = (recipe: EditRecipe) => {
    if (!selectedClip) {
      alert('クリップを選択してください');
      return;
    }

    // カスタムパラメータがあれば適用
    const finalRecipe = {
      ...recipe,
      parameters: {
        ...recipe.parameters,
        ...customParameters[recipe.id]
      }
    };

    onRecipeApply(finalRecipe, selectedClip);
  };

  // パラメータの更新
  const updateParameter = (recipeId: string, paramName: string, value: any) => {
    setCustomParameters(prev => ({
      ...prev,
      [recipeId]: {
        ...prev[recipeId],
        [paramName]: value
      }
    }));
  };

  // BPM情報の表示
  const bpmInfo = bpmAnalysis ? {
    bpm: bpmAnalysis.bpm,
    beatInterval: 60 / bpmAnalysis.bpm,
    barInterval: (60 / bpmAnalysis.bpm) * 4,
    totalBeats: bpmAnalysis.beatTimes.length,
    totalBars: bpmAnalysis.bars.length
  } : null;

  return (
    <div className="h-full bg-dark-900 flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Edit Recipes</h2>
            <p className="text-sm text-gray-400">ビート同期の自動編集</p>
          </div>
        </div>

        {/* BPM情報 */}
        {bpmInfo && (
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Music className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">楽曲情報</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">BPM:</span>
                <span className="text-white font-medium">{bpmInfo.bpm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ビート間隔:</span>
                <span className="text-white">{bpmInfo.beatInterval.toFixed(2)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">小節間隔:</span>
                <span className="text-white">{bpmInfo.barInterval.toFixed(1)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">総ビート数:</span>
                <span className="text-white">{bpmInfo.totalBeats}</span>
              </div>
            </div>
          </div>
        )}

        {/* 検索バー */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="レシピを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* カテゴリフィルター */}
        <div className="flex space-x-1 mb-3 overflow-x-auto">
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                  selectedCategory === category.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-dark-700 text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{category.name}</span>
              </button>
            );
          })}
        </div>

        {/* 難易度フィルター */}
        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white mb-3"
        >
          <option value="all">全ての難易度</option>
          <option value="beginner">初心者</option>
          <option value="intermediate">中級者</option>
          <option value="advanced">上級者</option>
        </select>

        {/* 選択中のクリップ情報 */}
        {selectedClip ? (
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="w-3 h-3 text-blue-400" />
              <span className="text-xs font-medium text-blue-400">選択中のクリップ</span>
            </div>
            <div className="text-xs text-gray-300">
              開始: {selectedClip.startTime.toFixed(1)}s • 
              長さ: {selectedClip.duration.toFixed(1)}s • 
              レイヤー: {selectedClip.layer + 1}
            </div>
          </div>
        ) : (
          <div className="bg-gray-500/20 border border-gray-500/30 rounded-lg p-3">
            <div className="text-xs text-gray-400 text-center">
              クリップを選択してレシピを適用
            </div>
          </div>
        )}
      </div>

      {/* レシピ一覧 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {filteredRecipes.map(recipe => {
            const Icon = getRecipeIcon(recipe.icon);
            const isPreviewMode = previewingRecipe === recipe.id;
            
            return (
              <motion.div
                key={recipe.id}
                className="bg-dark-800 border border-dark-700 rounded-lg overflow-hidden hover:border-orange-500/50 transition-all"
                whileHover={{ scale: 1.01 }}
                layout
              >
                <div className="p-4">
                  {/* レシピヘッダー */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-white mb-1">{recipe.name}</h4>
                        <p className="text-sm text-gray-400 mb-2">{recipe.description}</p>
                        
                        {/* タグ */}
                        <div className="flex space-x-2">
                          <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded text-xs">
                            {recipe.trigger === 'beat' ? 'ビート' : 
                             recipe.trigger === 'bar' ? '小節' : 
                             recipe.trigger === 'phrase' ? 'フレーズ' : 'マニュアル'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            recipe.difficulty === 'beginner' 
                              ? 'bg-green-500/20 text-green-300'
                              : recipe.difficulty === 'intermediate'
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}>
                            {recipe.difficulty === 'beginner' ? '初心者' : 
                             recipe.difficulty === 'intermediate' ? '中級者' : '上級者'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* パラメータ設定 */}
                  <AnimatePresence>
                    {isPreviewMode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 pt-3 border-t border-dark-700"
                      >
                        <h5 className="text-sm font-medium text-white mb-2">パラメータ</h5>
                        <div className="space-y-2">
                          {Object.entries(recipe.parameters).map(([key, defaultValue]) => (
                            <div key={key} className="flex items-center justify-between">
                              <label className="text-xs text-gray-400 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                              </label>
                              {typeof defaultValue === 'number' ? (
                                <input
                                  type="number"
                                  step={defaultValue < 1 ? "0.01" : "1"}
                                  value={customParameters[recipe.id]?.[key] ?? defaultValue}
                                  onChange={(e) => updateParameter(recipe.id, key, Number(e.target.value))}
                                  className="w-20 bg-dark-700 border border-dark-600 rounded px-2 py-1 text-xs text-white"
                                />
                              ) : typeof defaultValue === 'boolean' ? (
                                <input
                                  type="checkbox"
                                  checked={customParameters[recipe.id]?.[key] ?? defaultValue}
                                  onChange={(e) => updateParameter(recipe.id, key, e.target.checked)}
                                  className="w-4 h-4 text-orange-500 bg-dark-700 border-dark-600 rounded"
                                />
                              ) : (
                                <select
                                  value={customParameters[recipe.id]?.[key] ?? defaultValue}
                                  onChange={(e) => updateParameter(recipe.id, key, e.target.value)}
                                  className="bg-dark-700 border border-dark-600 rounded px-2 py-1 text-xs text-white"
                                >
                                  <option value={defaultValue}>{defaultValue}</option>
                                </select>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* アクションボタン */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePreview(recipe)}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm transition-all ${
                        isPreviewMode
                          ? 'bg-blue-500 text-white'
                          : 'bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>{isPreviewMode ? '設定中' : 'プレビュー'}</span>
                    </button>
                    
                    <button
                      onClick={() => handleApply(recipe)}
                      disabled={!selectedClip}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm transition-all flex-1 justify-center ${
                        !selectedClip
                          ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      <Download className="w-3 h-3" />
                      <span>適用</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 検索結果なし */}
        {filteredRecipes.length === 0 && (
          <div className="text-center py-8">
            <Wand2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">レシピが見つかりません</h3>
            <p className="text-sm text-gray-500">検索条件を変更してお試しください</p>
          </div>
        )}
      </div>

      {/* ヘルプフッター */}
      <div className="p-4 border-t border-dark-700">
        <div className="flex items-start space-x-2 text-xs text-gray-400">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="mb-1">
              Edit Recipesは楽曲のビートや小節に同期した自動編集を提供します。
            </p>
            <p>
              {selectedClip ? 'レシピを選択して選択中のクリップに適用してください。' : 'まずタイムラインでクリップを選択してください。'}
              {bpmInfo && ` 現在のBPM: ${bpmInfo.bpm}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditRecipesPanel;