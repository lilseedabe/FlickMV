import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Heart,
  Star,
  Download,
  Crown,
  Sparkles,
  Music,
  Eye,
  ChevronDown,
  Info,
  TrendingUp
} from 'lucide-react';

import {
  PresetLibraryProps,
  MusicPreset
} from '../../types';

/**
 * BPM対応プリセットライブラリ
 * 楽曲のBPMに基づいて最適なプリセットを推奨
 */
const PresetLibrary: React.FC<PresetLibraryProps> = ({
  presets,
  categories,
  selectedGenre,
  selectedBPMRange,
  onPresetSelect,
  onPresetFavorite,
  onGenreFilter,
  onBPMFilter
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'recent' | 'bpm'>('popular');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [previewingPreset, setPreviewingPreset] = useState<string | null>(null);
  const [favoritedPresets, setFavoritedPresets] = useState<Set<string>>(new Set());
  const [currentBPM, setCurrentBPM] = useState<number | null>(null);

  // BPMレンジのプリセット定義
  const bpmRanges: { label: string; range: [number, number] | null }[] = [
    { label: '全て', range: null },
    { label: 'スロー (60-90)', range: [60, 90] },
    { label: 'ミディアム (90-120)', range: [90, 120] },
    { label: 'アップテンポ (120-140)', range: [120, 140] },
    { label: 'ファスト (140+)', range: [140, 200] }
  ];

  // フィルタリングされたプリセット
  const filteredPresets = useMemo(() => {
    let filtered = presets;

    // テキスト検索
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((preset) =>
        preset.name.toLowerCase().includes(q) ||
        preset.description.toLowerCase().includes(q) ||
        preset.genre.toLowerCase().includes(q) ||
        preset.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    // ジャンルフィルター
    if (selectedGenre) {
      filtered = filtered.filter((preset) => preset.genre === selectedGenre);
    }

    // BPMフィルター
    if (selectedBPMRange) {
      filtered = filtered.filter((preset) => {
        const [presetMin, presetMax] = preset.bpmRange;
        const [filterMin, filterMax] = selectedBPMRange;
        return presetMin <= filterMax && presetMax >= filterMin;
      });
    }

    // 難易度フィルター
    if (selectedDifficulty) {
      filtered = filtered.filter((preset) => preset.difficulty === selectedDifficulty);
    }

    // ソート
    const sorted = [...filtered];
    switch (sortBy) {
      case 'popular':
        sorted.sort((a, b) => b.uses - a.uses);
        break;
      case 'rating':
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'recent':
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime()
        );
        break;
      case 'bpm':
        if (currentBPM) {
          sorted.sort((a, b) => {
            const aDist = Math.min(Math.abs(a.bpmRange[0] - currentBPM), Math.abs(a.bpmRange[1] - currentBPM));
            const bDist = Math.min(Math.abs(b.bpmRange[0] - currentBPM), Math.abs(b.bpmRange[1] - currentBPM));
            return aDist - bDist;
          });
        }
        break;
      default:
        break;
    }

    return sorted;
  }, [presets, searchQuery, selectedGenre, selectedBPMRange, selectedDifficulty, sortBy, currentBPM]);

  // BPMに基づく推奨プリセット
  const recommendedPresets = useMemo(() => {
    if (!currentBPM) return [];
    return presets
      .filter((preset) => {
        const [min, max] = preset.bpmRange;
        return currentBPM >= min && currentBPM <= max;
      })
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);
  }, [presets, currentBPM]);

  // BPM の設定（エディターから受け取る想定、現状はサンプル値）
  useEffect(() => {
    setCurrentBPM(128);
  }, []);

  // UI ハンドラ
  const handlePresetPreview = (presetId: string) => {
    setPreviewingPreset(previewingPreset === presetId ? null : presetId);
  };

  const handleFavoriteToggle = (presetId: string) => {
    const next = new Set(favoritedPresets);
    if (next.has(presetId)) next.delete(presetId);
    else next.add(presetId);
    setFavoritedPresets(next);
    onPresetFavorite(presetId);
  };

  const handlePresetApply = (preset: MusicPreset) => {
    onPresetSelect(preset);
  };

  return (
    <div className="h-full flex flex-col bg-dark-900">
      {/* ヘッダー */}
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">プリセットライブラリ</h2>
              <p className="text-sm text-gray-400">楽曲に最適なエフェクトを選択</p>
            </div>
          </div>

          {currentBPM && (
            <div className="flex items-center space-x-2 bg-purple-500/20 px-3 py-2 rounded-lg">
              <Music className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">{currentBPM} BPM</span>
            </div>
          )}
        </div>

        {/* 検索バー */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="プリセットを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* フィルター行 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
              showFilters ? 'bg-purple-500 text-white' : 'bg-dark-700 text-gray-400 hover:text-white'
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>フィルター</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1.5 text-sm text-white"
          >
            <option value="popular">人気順</option>
            <option value="rating">評価順</option>
            <option value="recent">新着順</option>
            {currentBPM && <option value="bpm">BPM適合度</option>}
          </select>

          <div className="text-xs text-gray-400">{filteredPresets.length}件表示</div>
        </div>

        {/* フィルターパネル */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-dark-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ジャンルフィルター */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">ジャンル</label>
                  <select
                    value={selectedGenre || ''}
                    onChange={(e) => onGenreFilter(e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="">全てのジャンル</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* BPMフィルター */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">BPM範囲</label>
                  <select
                    value={selectedBPMRange ? `${selectedBPMRange[0]}-${selectedBPMRange[1]}` : ''}
                    onChange={(e) => {
                      const range = bpmRanges.find((r) => r.range && `${r.range[0]}-${r.range[1]}` === e.target.value);
                      onBPMFilter(range?.range || [0, 200]);
                    }}
                    className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-sm text-white"
                  >
                    {bpmRanges.map((range, idx) => (
                      <option key={idx} value={range.range ? `${range.range[0]}-${range.range[1]}` : ''}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 難易度フィルター */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">難易度</label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="">全ての難易度</option>
                    <option value="beginner">初心者</option>
                    <option value="intermediate">中級者</option>
                    <option value="advanced">上級者</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 推奨プリセット */}
      {recommendedPresets.length > 0 && (
        <div className="p-4 border-b border-dark-700">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-medium text-white">あなたの楽曲にオススメ</h3>
            <span className="text-xs text-gray-400">({currentBPM} BPMに最適)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recommendedPresets.map((preset) => (
              <div
                key={preset.id}
                className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 cursor-pointer hover:bg-green-500/20 transition-all"
                onClick={() => handlePresetApply(preset)}
              >
                <div className="text-sm font-medium text-white truncate">{preset.name}</div>
                <div className="text-xs text-gray-400">
                  {preset.bpmRange[0]}-{preset.bpmRange[1]} BPM
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  <Star className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs text-gray-300">{(preset.rating || 0).toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* プリセット一覧 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 gap-4">
          {filteredPresets.map((preset) => (
            <motion.div
              key={preset.id}
              className="bg-dark-800 border border-dark-700 rounded-lg overflow-hidden hover:border-purple-500/50 transition-all"
              whileHover={{ scale: 1.01 }}
              layout
            >
              <div className="p-4">
                {/* プリセットヘッダー */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-lg font-semibold text-white">{preset.name}</h4>
                      {preset.premium && <Crown className="w-4 h-4 text-yellow-400" />}
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{preset.description}</p>

                    {/* タグ */}
                    <div className="flex flex-wrap gap-1">
                      <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-xs">
                        {preset.genre}
                      </span>
                      <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">
                        {preset.bpmRange[0]}-{preset.bpmRange[1]} BPM
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          preset.difficulty === 'beginner'
                            ? 'bg-green-500/20 text-green-300'
                            : preset.difficulty === 'intermediate'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {preset.difficulty === 'beginner'
                          ? '初心者'
                          : preset.difficulty === 'intermediate'
                          ? '中級者'
                          : '上級者'}
                      </span>
                    </div>
                  </div>

                  {/* 評価とお気に入り */}
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-white">{(preset.rating || 0).toFixed(1)}</span>
                    </div>
                    <button
                      onClick={() => handleFavoriteToggle(preset.id)}
                      className={`p-1 rounded transition-all ${
                        favoritedPresets.has(preset.id)
                          ? 'text-red-400 hover:text-red-300'
                          : 'text-gray-400 hover:text-red-400'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${favoritedPresets.has(preset.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* プリセット詳細 */}
                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span>{preset.uses.toLocaleString()}回使用</span>
                  <span>{preset.effects.length}個のエフェクト</span>
                  {preset.author && <span>by {preset.author}</span>}
                </div>

                {/* アクションボタン */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePresetPreview(preset.id)}
                    className="flex items-center space-x-1 bg-dark-700 hover:bg-dark-600 text-white px-3 py-2 rounded-lg text-sm transition-all"
                  >
                    <Eye className="w-3 h-3" />
                    <span>プレビュー</span>
                  </button>

                  <button
                    onClick={() => handlePresetApply(preset)}
                    className="flex items-center space-x-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm transition-all flex-1 justify-center"
                  >
                    <Download className="w-3 h-3" />
                    <span>適用</span>
                  </button>
                </div>

                {/* プレビュー展開 */}
                <AnimatePresence>
                  {previewingPreset === preset.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-dark-700"
                    >
                      <div className="text-sm text-gray-300">
                        <div className="mb-2">
                          <span className="text-gray-400">エフェクト:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {preset.effects.map((effect, index) => (
                              <span key={index} className="bg-dark-700 px-2 py-1 rounded text-xs">
                                {effect.type}
                              </span>
                            ))}
                          </div>
                        </div>

                        {preset.colorGrading && (
                          <div className="mb-2">
                            <span className="text-gray-400">カラーグレーディング:</span>
                            <div className="mt-1 text-xs space-y-1">
                              <div>明度: {preset.colorGrading.brightness}</div>
                              <div>コントラスト: {preset.colorGrading.contrast}</div>
                              <div>彩度: {preset.colorGrading.saturation}</div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center space-x-4 text-xs">
                          <span>アニメーション: {preset.animationStyle}</span>
                          <span>ビート同期: {preset.beatSync ? '有効' : '無効'}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 検索結果なし */}
        {filteredPresets.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">プリセットが見つかりません</h3>
            <p className="text-sm text-gray-500">検索条件を変更してお試しください</p>
          </div>
        )}
      </div>

      {/* ヘルプフッター */}
      <div className="p-4 border-t border-dark-700">
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <Info className="w-3 h-3" />
          <span>
            プリセットは楽曲のBPMに基づいて自動的に最適化されます。
            {currentBPM && ` 現在のBPM (${currentBPM}) に最も適したプリセットが上部に表示されます。`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PresetLibrary;