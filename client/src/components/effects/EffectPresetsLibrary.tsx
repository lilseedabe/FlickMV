import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Search,
  Filter,
  Play,
  Eye,
  EyeOff,
  Star,
  Zap,
  Palette,
  Film,
  RotateCw,
  ArrowRight,
  Plus,
  Check,
  X
} from 'lucide-react';
import type { TimelineClip } from '@/types';
import {
  EFFECT_PRESETS,
  PRESET_CATEGORIES,
  EffectPreset,
  effectPresetManager,
  applyPreset
} from '../../utils/effects/effectPresets';

interface EffectPresetsLibraryProps {
  selectedClip?: TimelineClip;
  onApplyPreset: (clip: TimelineClip) => void;
  onPreviewPreset?: (preset: EffectPreset) => void;
  className?: string;
}

const EffectPresetsLibrary: React.FC<EffectPresetsLibraryProps> = ({
  selectedClip,
  onApplyPreset,
  onPreviewPreset,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [previewingPreset, setPreviewingPreset] = useState<string | null>(null);
  const [appliedPresets, setAppliedPresets] = useState<Set<string>>(new Set());

  // フィルタリングされたプリセット
  const filteredPresets = useMemo(() => {
    let presets = EFFECT_PRESETS;

    // カテゴリフィルター
    if (selectedCategory !== 'all') {
      presets = presets.filter(preset => preset.category === selectedCategory);
    }

    // 難易度フィルター
    if (selectedDifficulty !== 'all') {
      presets = presets.filter(preset => preset.difficulty === selectedDifficulty);
    }

    // 検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      presets = presets.filter(preset => 
        preset.name.toLowerCase().includes(query) ||
        preset.description.toLowerCase().includes(query) ||
        preset.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return presets;
  }, [selectedCategory, selectedDifficulty, searchQuery]);

  // プリセットを適用
  const handleApplyPreset = (preset: EffectPreset) => {
    if (!selectedClip) {
      alert('クリップを選択してください');
      return;
    }

    try {
      const updatedClip = applyPreset(selectedClip, preset.id);
      onApplyPreset(updatedClip);
      setAppliedPresets(prev => {
        const newSet = new Set(prev);
        newSet.add(preset.id);
        return newSet;
      });
      
      console.log(`✨ Preset applied: ${preset.name}`);
    } catch (error) {
      console.error('Failed to apply preset:', error);
      alert('プリセットの適用に失敗しました');
    }
  };

  // プリセットをプレビュー
  const handlePreviewPreset = (preset: EffectPreset) => {
    setPreviewingPreset(preset.id);
    onPreviewPreset?.(preset);
    
    // 3秒後にプレビューを停止
    setTimeout(() => {
      setPreviewingPreset(null);
    }, 3000);
  };

  // カテゴリアイコンを取得
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      basic: <Sparkles className="w-4 h-4" />,
      cinematic: <Film className="w-4 h-4" />,
      stylized: <Palette className="w-4 h-4" />,
      motion: <RotateCw className="w-4 h-4" />,
      color: <Star className="w-4 h-4" />,
      transitions: <ArrowRight className="w-4 h-4" />
    };
    return icons[category] || <Sparkles className="w-4 h-4" />;
  };

  // 難易度バッジの色を取得
  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
      intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      advanced: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[difficulty] || colors.beginner;
  };

  return (
    <div className={`bg-dark-800 rounded-lg border border-dark-600 ${className}`}>
      {/* ヘッダー */}
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">エフェクト プリセット</h3>
              <p className="text-sm text-gray-400">
                {filteredPresets.length} 個のプリセット
                {selectedClip ? ` • ${selectedClip.id.slice(-4)} に適用` : ' • クリップを選択'}
              </p>
            </div>
          </div>
          
          {!selectedClip && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">
              <p className="text-sm text-orange-400 flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>タイムラインでクリップを選択してください</span>
              </p>
            </div>
          )}
        </div>

        {/* 検索バー */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="プリセットを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* フィルター */}
        <div className="flex flex-wrap gap-2">
          {/* カテゴリフィルター */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="all">すべてのカテゴリ</option>
            {Object.entries(PRESET_CATEGORIES).map(([key, category]) => (
              <option key={key} value={key}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>

          {/* 難易度フィルター */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="all">すべての難易度</option>
            <option value="beginner">初級</option>
            <option value="intermediate">中級</option>
            <option value="advanced">上級</option>
          </select>
        </div>
      </div>

      {/* プリセット一覧 */}
      <div className="p-4">
        {filteredPresets.length === 0 ? (
          <div className="text-center py-8">
            <Filter className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">条件に一致するプリセットが見つかりません</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedDifficulty('all');
              }}
              className="mt-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              フィルターをリセット
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredPresets.map((preset) => {
              const isApplied = appliedPresets.has(preset.id);
              const isPreviewing = previewingPreset === preset.id;
              const categoryInfo = PRESET_CATEGORIES[preset.category];

              return (
                <motion.div
                  key={preset.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-dark-700 rounded-lg border transition-all ${
                    isPreviewing
                      ? 'border-purple-400 bg-purple-500/10'
                      : isApplied
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-dark-600 hover:border-dark-500'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ 
                            backgroundColor: `${categoryInfo.color}20`, 
                            color: categoryInfo.color 
                          }}
                        >
                          {getCategoryIcon(preset.category)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-sm font-medium text-white truncate">
                              {preset.name}
                            </h4>
                            {isApplied && (
                              <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                            {preset.description}
                          </p>
                          
                          <div className="flex items-center space-x-2">
                            <span 
                              className={`text-xs px-2 py-1 rounded border ${getDifficultyColor(preset.difficulty)}`}
                            >
                              {preset.difficulty === 'beginner' ? '初級' : 
                               preset.difficulty === 'intermediate' ? '中級' : '上級'}
                            </span>
                            
                            <span className="text-xs text-gray-500">
                              {preset.effects.length} エフェクト
                            </span>
                            
                            {preset.duration && (
                              <span className="text-xs text-gray-500">
                                {preset.duration}秒
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* タグ */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {preset.tags.slice(0, 3).map((tag, index) => (
                        <span 
                          key={index}
                          className="text-xs bg-dark-600 text-gray-300 px-2 py-1 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                      {preset.tags.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{preset.tags.length - 3}
                        </span>
                      )}
                    </div>

                    {/* アクションボタン */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePreviewPreset(preset)}
                        disabled={!selectedClip || isPreviewing}
                        className="flex items-center space-x-1 flex-1 bg-dark-600 hover:bg-dark-500 disabled:bg-dark-800 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm transition-all"
                      >
                        {isPreviewing ? (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>プレビュー中...</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>プレビュー</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleApplyPreset(preset)}
                        disabled={!selectedClip || isApplied}
                        className={`flex items-center space-x-1 flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
                          isApplied
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed'
                            : 'bg-purple-500 hover:bg-purple-600 disabled:bg-dark-800 disabled:cursor-not-allowed text-white'
                        }`}
                      >
                        {isApplied ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>適用済み</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>適用</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* フッター統計 */}
      <div className="border-t border-dark-700 p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-white">{EFFECT_PRESETS.length}</div>
            <div className="text-xs text-gray-400">総プリセット数</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-400">{appliedPresets.size}</div>
            <div className="text-xs text-gray-400">適用済み</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-400">{filteredPresets.length}</div>
            <div className="text-xs text-gray-400">表示中</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EffectPresetsLibrary;
