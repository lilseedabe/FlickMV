import type { ClipEffect, EffectType, Transition, TimelineClip } from '@/types';

/**
 * エフェクトプリセット定義
 */
export interface EffectPreset {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'cinematic' | 'stylized' | 'motion' | 'color' | 'transitions';
  thumbnail?: string;
  effects: Omit<ClipEffect, 'id'>[];
  transitions?: {
    in?: Omit<Transition, 'id'>;
    out?: Omit<Transition, 'id'>;
  };
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration?: number; // エフェクトの推奨時間（秒）
}

/**
 * プリセットカテゴリ定義
 */
export const PRESET_CATEGORIES = {
  basic: {
    name: '基本',
    description: '基本的なエフェクト',
    icon: '✨',
    color: '#3b82f6'
  },
  cinematic: {
    name: 'シネマティック',
    description: '映画のようなエフェクト',
    icon: '🎬',
    color: '#8b5cf6'
  },
  stylized: {
    name: 'スタイライズ',
    description: 'スタイリッシュなエフェクト',
    icon: '🎨',
    color: '#06b6d4'
  },
  motion: {
    name: 'モーション',
    description: '動きのあるエフェクト',
    icon: '🌀',
    color: '#10b981'
  },
  color: {
    name: 'カラー',
    description: '色調補正エフェクト',
    icon: '🌈',
    color: '#f59e0b'
  },
  transitions: {
    name: 'トランジション',
    description: '場面転換エフェクト',
    icon: '↔️',
    color: '#ef4444'
  }
} as const;

/**
 * エフェクトプリセットライブラリ
 */
export const EFFECT_PRESETS: EffectPreset[] = [
  // 基本エフェクト
  {
    id: 'fade_in_out',
    name: 'フェードイン・アウト',
    description: '滑らかにフェードイン・アウトする基本エフェクト',
    category: 'basic',
    difficulty: 'beginner',
    tags: ['fade', 'basic', 'smooth'],
    effects: [
      {
        type: 'fade',
        parameters: { type: 'in', duration: 0.5 },
        enabled: true
      },
      {
        type: 'fade',
        parameters: { type: 'out', duration: 0.5 },
        enabled: true
      }
    ]
  },
  
  {
    id: 'brightness_boost',
    name: 'ブライトネス ブースト',
    description: '明るさを上げて鮮やかな印象に',
    category: 'basic',
    difficulty: 'beginner',
    tags: ['brightness', 'basic', 'vibrant'],
    effects: [
      {
        type: 'brightness',
        parameters: { value: 20 },
        enabled: true
      },
      {
        type: 'contrast',
        parameters: { value: 10 },
        enabled: true
      }
    ]
  },

  // シネマティックエフェクト
  {
    id: 'cinematic_look',
    name: 'シネマティック ルック',
    description: '映画のような色調とコントラスト',
    category: 'cinematic',
    difficulty: 'intermediate',
    tags: ['cinematic', 'film', 'dramatic'],
    effects: [
      {
        type: 'contrast',
        parameters: { value: 25 },
        enabled: true
      },
      {
        type: 'saturation',
        parameters: { value: -15 },
        enabled: true
      },
      {
        type: 'brightness',
        parameters: { value: -5 },
        enabled: true
      }
    ],
    transitions: {
      in: {
        type: 'crossfade',
        duration: 1.0,
        parameters: { curve: 'ease-in-out' }
      }
    }
  },

  {
    id: 'dramatic_zoom',
    name: 'ドラマティック ズーム',
    description: 'ゆっくりとズームインして緊張感を演出',
    category: 'cinematic',
    difficulty: 'intermediate',
    tags: ['zoom', 'dramatic', 'cinematic'],
    effects: [
      {
        type: 'pan_zoom',
        parameters: { zoom: 1.3, panX: 0, panY: 0 },
        enabled: true
      },
      {
        type: 'brightness',
        parameters: { value: -10 },
        enabled: true
      },
      {
        type: 'contrast',
        parameters: { value: 20 },
        enabled: true
      }
    ]
  },

  // スタイライズエフェクト
  {
    id: 'vibrant_pop',
    name: 'ビビッド ポップ',
    description: 'ポップで鮮やかな色彩強調',
    category: 'stylized',
    difficulty: 'beginner',
    tags: ['vibrant', 'pop', 'colorful'],
    effects: [
      {
        type: 'saturation',
        parameters: { value: 40 },
        enabled: true
      },
      {
        type: 'brightness',
        parameters: { value: 15 },
        enabled: true
      },
      {
        type: 'contrast',
        parameters: { value: 15 },
        enabled: true
      }
    ]
  },

  {
    id: 'vintage_film',
    name: 'ヴィンテージ フィルム',
    description: '古い映画のような雰囲気',
    category: 'stylized',
    difficulty: 'intermediate',
    tags: ['vintage', 'retro', 'film'],
    effects: [
      {
        type: 'saturation',
        parameters: { value: -25 },
        enabled: true
      },
      {
        type: 'brightness',
        parameters: { value: -15 },
        enabled: true
      },
      {
        type: 'contrast',
        parameters: { value: -10 },
        enabled: true
      }
    ]
  },

  // モーションエフェクト
  {
    id: 'smooth_pan_zoom',
    name: 'スムーズ パン&ズーム',
    description: '滑らかなカメラワーク風エフェクト',
    category: 'motion',
    difficulty: 'intermediate',
    tags: ['pan', 'zoom', 'smooth', 'camera'],
    effects: [
      {
        type: 'pan_zoom',
        parameters: { zoom: 1.2, panX: 0.1, panY: -0.1 },
        enabled: true
      }
    ],
    duration: 8
  },

  {
    id: 'speed_ramp',
    name: 'スピードランプ',
    description: '動きにメリハリをつけるスピード調整',
    category: 'motion',
    difficulty: 'advanced',
    tags: ['speed', 'dynamic', 'ramp'],
    effects: [
      {
        type: 'speed',
        parameters: { value: 0.7 },
        enabled: true
      }
    ]
  },

  // カラーエフェクト
  {
    id: 'warm_tone',
    name: 'ウォーム トーン',
    description: '暖かみのある色調補正',
    category: 'color',
    difficulty: 'beginner',
    tags: ['warm', 'tone', 'cozy'],
    effects: [
      {
        type: 'brightness',
        parameters: { value: 10 },
        enabled: true
      },
      {
        type: 'saturation',
        parameters: { value: 15 },
        enabled: true
      }
    ]
  },

  {
    id: 'cool_tone',
    name: 'クール トーン',
    description: 'クールで現代的な色調補正',
    category: 'color',
    difficulty: 'beginner',
    tags: ['cool', 'modern', 'blue'],
    effects: [
      {
        type: 'brightness',
        parameters: { value: 5 },
        enabled: true
      },
      {
        type: 'contrast',
        parameters: { value: 20 },
        enabled: true
      },
      {
        type: 'saturation',
        parameters: { value: -10 },
        enabled: true
      }
    ]
  },

  // トランジションエフェクト
  {
    id: 'smooth_crossfade',
    name: 'スムーズ クロスフェード',
    description: '滑らかな場面転換',
    category: 'transitions',
    difficulty: 'beginner',
    tags: ['crossfade', 'smooth', 'transition'],
    effects: [],
    transitions: {
      in: {
        type: 'crossfade',
        duration: 0.8,
        parameters: { curve: 'ease-in-out' }
      },
      out: {
        type: 'crossfade',
        duration: 0.8,
        parameters: { curve: 'ease-in-out' }
      }
    }
  },

  {
    id: 'dynamic_slide',
    name: 'ダイナミック スライド',
    description: 'エネルギッシュなスライド転換',
    category: 'transitions',
    difficulty: 'intermediate',
    tags: ['slide', 'dynamic', 'energy'],
    effects: [],
    transitions: {
      in: {
        type: 'slide',
        duration: 0.6,
        parameters: { direction: 'left', easing: 'ease-out' }
      },
      out: {
        type: 'slide',
        duration: 0.6,
        parameters: { direction: 'right', easing: 'ease-in' }
      }
    }
  }
];

/**
 * エフェクトプリセット管理クラス
 */
export class EffectPresetManager {
  private static instance: EffectPresetManager;
  
  public static getInstance(): EffectPresetManager {
    if (!EffectPresetManager.instance) {
      EffectPresetManager.instance = new EffectPresetManager();
    }
    return EffectPresetManager.instance;
  }

  /**
   * プリセットをクリップに適用
   */
  applyPresetToClip(clip: TimelineClip, presetId: string): TimelineClip {
    const preset = EFFECT_PRESETS.find(p => p.id === presetId);
    if (!preset) {
      throw new Error(`Preset not found: ${presetId}`);
    }

    // エフェクトを追加
    const newEffects: ClipEffect[] = preset.effects.map(effect => ({
      id: `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...effect
    }));

    // 既存のエフェクトとマージ
    const updatedClip: TimelineClip = {
      ...clip,
      effects: [...(clip.effects || []), ...newEffects]
    };

    // トランジションを適用
    if (preset.transitions) {
      updatedClip.transitions = {
        ...clip.transitions,
        ...preset.transitions
      };
    }

    // 推奨時間があれば適用
    if (preset.duration && clip.duration !== preset.duration) {
      updatedClip.duration = preset.duration;
      updatedClip.trimEnd = clip.trimStart + preset.duration;
    }

    return updatedClip;
  }

  /**
   * カテゴリ別にプリセットを取得
   */
  getPresetsByCategory(category: string): EffectPreset[] {
    return EFFECT_PRESETS.filter(preset => preset.category === category);
  }

  /**
   * 難易度別にプリセットを取得
   */
  getPresetsByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): EffectPreset[] {
    return EFFECT_PRESETS.filter(preset => preset.difficulty === difficulty);
  }

  /**
   * タグで検索
   */
  searchPresetsByTag(tag: string): EffectPreset[] {
    return EFFECT_PRESETS.filter(preset => 
      preset.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
    );
  }

  /**
   * 名前で検索
   */
  searchPresetsByName(query: string): EffectPreset[] {
    const lowercaseQuery = query.toLowerCase();
    return EFFECT_PRESETS.filter(preset => 
      preset.name.toLowerCase().includes(lowercaseQuery) ||
      preset.description.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * すべてのプリセットを取得
   */
  getAllPresets(): EffectPreset[] {
    return EFFECT_PRESETS;
  }

  /**
   * プリセットの詳細情報を取得
   */
  getPresetById(id: string): EffectPreset | undefined {
    return EFFECT_PRESETS.find(preset => preset.id === id);
  }

  /**
   * カスタムプリセットを作成
   */
  createCustomPreset(
    name: string,
    description: string,
    effects: Omit<ClipEffect, 'id'>[],
    category: EffectPreset['category'] = 'basic',
    tags: string[] = []
  ): EffectPreset {
    return {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      category,
      difficulty: 'intermediate',
      tags: [...tags, 'custom'],
      effects
    };
  }

  /**
   * プリセットの組み合わせを作成
   */
  combinePresets(presetIds: string[]): EffectPreset | null {
    const presets = presetIds.map(id => this.getPresetById(id)).filter(Boolean) as EffectPreset[];
    
    if (presets.length === 0) {
      return null;
    }

    // 全エフェクトを結合
    const combinedEffects = presets.flatMap(preset => preset.effects);
    const combinedTags = Array.from(new Set(presets.flatMap(preset => preset.tags)));
    
    return {
      id: `combined_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Combined: ${presets.map(p => p.name).join(' + ')}`,
      description: `複数のプリセットを組み合わせたエフェクト: ${presets.map(p => p.name).join(', ')}`,
      category: 'stylized',
      difficulty: 'advanced',
      tags: [...combinedTags, 'combined'],
      effects: combinedEffects
    };
  }
}

// シングルトンインスタンスをエクスポート
export const effectPresetManager = EffectPresetManager.getInstance();

// ヘルパー関数をエクスポート
export function applyPreset(clip: TimelineClip, presetId: string): TimelineClip {
  return effectPresetManager.applyPresetToClip(clip, presetId);
}

export function getPresetsByCategory(category: string): EffectPreset[] {
  return effectPresetManager.getPresetsByCategory(category);
}

export function searchPresets(query: string): EffectPreset[] {
  return effectPresetManager.searchPresetsByName(query);
}
