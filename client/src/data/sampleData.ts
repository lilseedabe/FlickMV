import { MusicPreset, PresetCategory, EditRecipe, SNSPreset, FrequencyTrigger } from '../types';

/**
 * 音楽プリセットのサンプルデータ
 * 初学者向けに説明付きでプリセットを定義
 */
export const SAMPLE_PRESETS: MusicPreset[] = [
  {
    id: 'summer_vibes',
    name: 'Summer Vibes',
    description: '明るく爽やかな夏のムードを演出。ダンスやポップミュージックに最適',
    genre: 'Pop',
    bpmRange: [120, 140],
    thumbnail: 'https://via.placeholder.com/200x150/ff6b6b/ffffff?text=Summer',
    difficulty: 'beginner',
    tags: ['summer', 'bright', 'energetic', 'pop'],
    effects: [
      {
        id: 'summer_brightness',
        type: 'color_grade',
        parameters: { brightness: 15, saturation: 20, warmth: 10 },
        enabled: true
      },
      {
        id: 'summer_zoom',
        type: 'pan_zoom',
        parameters: { zoom: 1.1, duration: 2.0 },
        enabled: true
      }
    ],
    transitions: [
      {
        type: 'crossfade',
        duration: 0.5,
        parameters: { easing: 'ease-out' }
      }
    ],
    colorGrading: {
      brightness: 15,
      contrast: 10,
      saturation: 25,
      temperature: 8,
      tint: 2
    },
    animationStyle: 'energetic',
    beatSync: true,
    uses: 15420,
    rating: 4.8,
    premium: false,
    createdAt: new Date('2024-01-01'),
    author: 'FlickMV Team'
  },
  {
    id: 'lo_fi_chill',
    name: 'Lo-fi Chill',
    description: '落ち着いたチルアウト系。ローファイ・ヒップホップに適したレトロ感',
    genre: 'Lo-fi',
    bpmRange: [70, 100],
    thumbnail: 'https://via.placeholder.com/200x150/8b5cf6/ffffff?text=Lo-fi',
    difficulty: 'beginner',
    tags: ['chill', 'vintage', 'relaxed', 'lofi'],
    effects: [
      {
        id: 'vintage_filter',
        type: 'color_grade',
        parameters: { vintage: true, grain: 0.3, vignette: 0.2 },
        enabled: true
      }
    ],
    transitions: [
      {
        type: 'slide',
        duration: 1.0,
        parameters: { direction: 'left' }
      }
    ],
    colorGrading: {
      brightness: -5,
      contrast: -10,
      saturation: -15,
      temperature: -3,
      tint: 5
    },
    animationStyle: 'smooth',
    beatSync: false,
    uses: 8932,
    rating: 4.6,
    premium: false,
    createdAt: new Date('2024-01-15'),
    author: 'RetroWave Studio'
  },
  {
    id: 'electronic_drop',
    name: 'Electronic Drop',
    description: 'EDM/エレクトロ向け。ドロップで強烈なビジュアルエフェクトを展開',
    genre: 'Electronic',
    bpmRange: [128, 150],
    thumbnail: 'https://via.placeholder.com/200x150/06b6d4/ffffff?text=Electronic',
    difficulty: 'advanced',
    tags: ['edm', 'drop', 'intense', 'electronic'],
    effects: [
      {
        id: 'strobe_flash',
        type: 'color_grade',
        parameters: { flashIntensity: 0.8, strobeRate: 8 },
        enabled: true
      },
      {
        id: 'zoom_blast',
        type: 'pan_zoom',
        parameters: { zoom: 1.5, speed: 0.2 },
        enabled: true
      }
    ],
    transitions: [
      {
        type: 'wipe',
        duration: 0.1,
        parameters: { direction: 'radial' }
      }
    ],
    colorGrading: {
      brightness: 20,
      contrast: 30,
      saturation: 40,
      temperature: 0,
      tint: -5
    },
    animationStyle: 'dramatic',
    beatSync: true,
    uses: 12045,
    rating: 4.9,
    premium: true,
    createdAt: new Date('2024-02-01'),
    author: 'BassDrop Pro'
  },
  {
    id: 'cinematic_epic',
    name: 'Cinematic Epic',
    description: '映画のように壮大な演出。オーケストラ系トレーラー音楽向け',
    genre: 'Cinematic',
    bpmRange: [80, 120],
    thumbnail: 'https://via.placeholder.com/200x150/f59e0b/ffffff?text=Cinematic',
    difficulty: 'intermediate',
    tags: ['cinematic', 'epic', 'dramatic', 'orchestral'],
    effects: [
      {
        id: 'epic_zoom',
        type: 'pan_zoom',
        parameters: { zoom: 1.3, duration: 4.0, easing: 'ease-in-out' },
        enabled: true
      }
    ],
    transitions: [
      {
        type: 'crossfade',
        duration: 1.5,
        parameters: { easing: 'ease-in-out' }
      }
    ],
    colorGrading: {
      brightness: 5,
      contrast: 25,
      saturation: 15,
      temperature: -2,
      tint: 3
    },
    animationStyle: 'dramatic',
    beatSync: false,
    uses: 6734,
    rating: 4.7,
    premium: true,
    createdAt: new Date('2024-01-20'),
    author: 'Epic Visuals'
  },
  {
    id: 'hip_hop_urban',
    name: 'Hip-Hop Urban',
    description: 'アーバンでクールな雰囲気。ヒップホップやトラップ向け',
    genre: 'Hip-Hop',
    bpmRange: [70, 90],
    thumbnail: 'https://via.placeholder.com/200x150/ef4444/ffffff?text=Hip-Hop',
    difficulty: 'intermediate',
    tags: ['hiphop', 'urban', 'cool', 'street'],
    effects: [
      {
        id: 'urban_grade',
        type: 'color_grade',
        parameters: { contrast: 20, shadows: -10, highlights: 5 },
        enabled: true
      }
    ],
    transitions: [
      {
        type: 'cut',
        duration: 0,
        parameters: {}
      }
    ],
    colorGrading: {
      brightness: -8,
      contrast: 20,
      saturation: 10,
      temperature: -5,
      tint: 0
    },
    animationStyle: 'minimal',
    beatSync: true,
    uses: 9876,
    rating: 4.5,
    premium: false,
    createdAt: new Date('2024-01-10'),
    author: 'Urban Beats'
  }
];

/**
 * プリセットカテゴリのサンプルデータ
 */
export const SAMPLE_CATEGORIES: PresetCategory[] = [
  {
    id: 'pop',
    name: 'Pop',
    description: 'ポップで明るいイメージ',
    icon: 'music',
    color: '#ff6b6b',
    presets: SAMPLE_PRESETS.filter(p => p.genre === 'Pop')
  },
  {
    id: 'lofi',
    name: 'Lo-fi',
    description: 'チルでリラックス',
    icon: 'headphones',
    color: '#8b5cf6',
    presets: SAMPLE_PRESETS.filter(p => p.genre === 'Lo-fi')
  },
  {
    id: 'electronic',
    name: 'Electronic',
    description: 'EDM・エレクトロニック',
    icon: 'zap',
    color: '#06b6d4',
    presets: SAMPLE_PRESETS.filter(p => p.genre === 'Electronic')
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: '映画的・ドラマティック',
    icon: 'film',
    color: '#f59e0b',
    presets: SAMPLE_PRESETS.filter(p => p.genre === 'Cinematic')
  },
  {
    id: 'hiphop',
    name: 'Hip-Hop',
    description: 'アーバン・ストリート',
    icon: 'mic',
    color: '#ef4444',
    presets: SAMPLE_PRESETS.filter(p => p.genre === 'Hip-Hop')
  }
];

/**
 * Edit Recipesのサンプルデータ
 */
export const SAMPLE_RECIPES: EditRecipe[] = [
  {
    id: 'beat_cut',
    name: 'ビートカット',
    description: '音楽のビートに合わせて映像を自動カット。リズム感のある編集を簡単に',
    icon: 'scissors',
    category: 'cutting',
    difficulty: 'beginner',
    trigger: 'beat',
    parameters: {
      cutInterval: 'every_beat',
      transitionType: 'cut',
      transitionDuration: 0.1
    },
    previewGif: '/assets/previews/beat-cut.gif'
  },
  {
    id: 'beat_zoom',
    name: 'ビートズーム',
    description: 'ビートに合わせて軽くズームイン/アウト。動きのあるシーンを演出',
    icon: 'zoom-in',
    category: 'animation',
    difficulty: 'beginner',
    trigger: 'beat',
    parameters: {
      zoomStrength: 0.1,
      zoomDirection: 'alternating',
      easing: 'ease-out'
    },
    previewGif: '/assets/previews/beat-zoom.gif'
  },
  {
    id: 'color_flash',
    name: 'カラーフラッシュ',
    description: 'ビートに合わせて色調を瞬間変化。エネルギッシュな印象を演出',
    icon: 'palette',
    category: 'color',
    difficulty: 'intermediate',
    trigger: 'beat',
    parameters: {
      flashIntensity: 0.3,
      colorShift: 20,
      duration: 0.15
    },
    previewGif: '/assets/previews/color-flash.gif'
  },
  {
    id: 'shake_effect',
    name: 'シェイクエフェクト',
    description: 'ドロップのタイミングで画面を揺らす。インパクトのある瞬間を強調',
    icon: 'zap',
    category: 'effects',
    difficulty: 'intermediate',
    trigger: 'beat',
    parameters: {
      intensity: 0.02,
      frequency: 20,
      duration: 0.2,
      direction: 'xy'
    },
    previewGif: '/assets/previews/shake-effect.gif'
  },
  {
    id: 'slide_transition',
    name: 'スライド遷移',
    description: '小節の変わり目でスライド切り替え。スムーズな場面転換',
    icon: 'arrow-right',
    category: 'cutting',
    difficulty: 'beginner',
    trigger: 'bar',
    parameters: {
      direction: 'left',
      duration: 0.5,
      easing: 'ease-in-out'
    },
    previewGif: '/assets/previews/slide-transition.gif'
  },
  {
    id: 'auto_ken_burns',
    name: 'オート・ケンバーンズ',
    description: 'BPMに同期したパン＆ズーム。静止画にも動きを追加',
    icon: 'move',
    category: 'animation',
    difficulty: 'advanced',
    trigger: 'bar',
    parameters: {
      panAmount: 0.1,
      zoomAmount: 0.15,
      duration: 'bar_length',
      randomDirection: true
    },
    previewGif: '/assets/previews/ken-burns.gif'
  },
  {
    id: 'beat_glow',
    name: 'ビートグロー',
    description: 'ビートで光の輪郭を追加。幻想的な雰囲気を演出',
    icon: 'sun',
    category: 'effects',
    difficulty: 'intermediate',
    trigger: 'beat',
    parameters: {
      glowColor: '#ffffff',
      glowIntensity: 0.5,
      glowSize: 20,
      fadeOut: 0.3
    },
    previewGif: '/assets/previews/beat-glow.gif'
  },
  {
    id: 'bass_drop_effect',
    name: 'ベースドロップ・エフェクト',
    description: '低音域の急激な変化に反応し、EDMのドロップで大きなインパクトを与える',
    icon: 'volume-x',
    category: 'effects',
    difficulty: 'advanced',
    trigger: 'frequency',
    parameters: {
      frequencyBand: 'bass',
      threshold: 0.8,
      effectType: 'explosion',
      duration: 1.0
    },
    previewGif: '/assets/previews/bass-drop.gif'
  }
];

/**
 * SNSプリセットのサンプルデータ
 */
export const SAMPLE_SNS_PRESETS: Record<string, SNSPreset> = {
  instagram_reel: {
    id: 'instagram_reel',
    platform: 'instagram',
    name: 'Instagram リール',
    aspectRatio: '9:16',
    resolution: { width: 1080, height: 1920 },
    maxDuration: 90,
    maxFileSize: 100,
    recommendedBitrate: 5000,
    audioCodec: 'aac',
    videoCodec: 'h264',
    frameRate: [24, 30],
    safeArea: { top: 15, bottom: 20, left: 5, right: 5 },
    requirements: {
      maxDuration: 90,
      audioRequired: true,
      captionsRecommended: true
    },
    optimization: {
      cropStrategy: 'smart',
      scaleStrategy: 'fill',
      compressionLevel: 'medium',
      motionBlur: true,
      deinterlace: true
    }
  },
  tiktok: {
    id: 'tiktok',
    platform: 'tiktok',
    name: 'TikTok',
    aspectRatio: '9:16',
    resolution: { width: 1080, height: 1920 },
    maxDuration: 180,
    maxFileSize: 150,
    recommendedBitrate: 6000,
    audioCodec: 'aac',
    videoCodec: 'h264',
    frameRate: [24, 30, 60],
    safeArea: { top: 12, bottom: 18, left: 3, right: 3 },
    requirements: {
      minDuration: 3,
      maxDuration: 180,
      audioRequired: true,
      captionsRecommended: true
    },
    optimization: {
      cropStrategy: 'smart',
      scaleStrategy: 'fill',
      compressionLevel: 'low',
      motionBlur: true,
      deinterlace: true
    }
  },
  youtube_shorts: {
    id: 'youtube_shorts',
    platform: 'youtube_shorts',
    name: 'YouTube Shorts',
    aspectRatio: '9:16',
    resolution: { width: 1080, height: 1920 },
    maxDuration: 60,
    maxFileSize: 200,
    recommendedBitrate: 8000,
    audioCodec: 'aac',
    videoCodec: 'h264',
    frameRate: [24, 30, 60],
    safeArea: { top: 10, bottom: 15, left: 5, right: 5 },
    requirements: {
      maxDuration: 60,
      audioRequired: false
    },
    optimization: {
      cropStrategy: 'smart',
      scaleStrategy: 'fill',
      compressionLevel: 'low',
      motionBlur: false,
      deinterlace: true
    }
  }
};

/**
 * 周波数トリガーのサンプルデータ
 */
export const SAMPLE_FREQUENCY_TRIGGERS: FrequencyTrigger[] = [
  {
    id: 'bass_trigger',
    name: '低音トリガー',
    band: 'bass',
    threshold: 0.7,
    effect: {
      id: 'bass_flash',
      type: 'color_grade',
      parameters: { flashIntensity: 0.5, color: '#ff0000' },
      enabled: true
    },
    enabled: true,
    sensitivity: 0.8,
    duration: 0.3,
    cooldown: 0.1
  },
  {
    id: 'high_trigger',
    name: '高音トリガー',
    band: 'highs',
    threshold: 0.6,
    effect: {
      id: 'high_sparkle',
      type: 'custom',
      parameters: { particleCount: 50, sparkleIntensity: 0.8 },
      enabled: true
    },
    enabled: true,
    sensitivity: 0.7,
    duration: 0.5,
    cooldown: 0.2
  }
];

/**
 * ユーティリティ関数：BPMに基づくプリセットフィルタリング
 */
export function getPresetsForBPM(bpm: number, tolerance: number = 10): MusicPreset[] {
  return SAMPLE_PRESETS.filter(preset => {
    const [min, max] = preset.bpmRange;
    return bpm >= (min - tolerance) && bpm <= (max + tolerance);
  });
}

/**
 * ユーティリティ関数：ジャンルに基づくプリセット取得
 */
export function getPresetsByGenre(genre: string): MusicPreset[] {
  return SAMPLE_PRESETS.filter(preset => preset.genre === genre);
}

/**
 * ユーティリティ関数：難易度に基づくレシピフィルタリング
 */
export function getRecipesByDifficulty(difficulty: string): EditRecipe[] {
  return SAMPLE_RECIPES.filter(recipe => recipe.difficulty === difficulty);
}

/**
 * ユーティリティ関数：カテゴリに基づくレシピフィルタリング
 */
export function getRecipesByCategory(category: string): EditRecipe[] {
  return SAMPLE_RECIPES.filter(recipe => recipe.category === category);
}
