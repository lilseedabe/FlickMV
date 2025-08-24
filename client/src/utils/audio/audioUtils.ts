import { BPMAnalysis, AudioAnalysis, FrequencyBand } from '../../types';

/**
 * 音声解析の補助ユーティリティ関数集
 * 初心者にも理解しやすいよう詳細なコメント付き
 */

/**
 * BPMから拍間隔を計算
 * @param bpm - Beats Per Minute
 * @returns 拍間隔（秒）
 */
export function calculateBeatInterval(bpm: number): number {
  return 60 / bpm;
}

/**
 * BPMから小節間隔を計算（4/4拍子を想定）
 * @param bpm - Beats Per Minute
 * @param timeSignature - 拍子記号の分子（デフォルト: 4）
 * @returns 小節間隔（秒）
 */
export function calculateBarInterval(bpm: number, timeSignature: number = 4): number {
  return (60 / bpm) * timeSignature;
}

/**
 * 指定した時間に最も近いビートタイムを取得
 * @param time - 基準時間（秒）
 * @param beatTimes - ビートタイムの配列
 * @returns 最も近いビートタイム
 */
export function getClosestBeatTime(time: number, beatTimes: number[]): number {
  if (beatTimes.length === 0) return time;

  return beatTimes.reduce((closest, current) => {
    return Math.abs(current - time) < Math.abs(closest - time) ? current : closest;
  });
}

/**
 * 指定した時間に最も近い小節開始時間を取得
 * @param time - 基準時間（秒）
 * @param barTimes - 小節開始時間の配列
 * @returns 最も近い小節開始時間
 */
export function getClosestBarTime(time: number, barTimes: number[]): number {
  if (barTimes.length === 0) return time;

  return barTimes.reduce((closest, current) => {
    return Math.abs(current - time) < Math.abs(closest - time) ? current : closest;
  });
}

/**
 * BPMの信頼度に基づく推奨事項を生成
 * @param analysis - BPM解析結果
 * @returns 推奨事項の配列
 */
export function generateBPMRecommendations(analysis: BPMAnalysis): string[] {
  const recommendations: string[] = [];

  if (analysis.confidence >= 0.9) {
    recommendations.push('BPM検出の精度が非常に高いです。ビート同期機能を積極的に活用できます。');
  } else if (analysis.confidence >= 0.7) {
    recommendations.push('BPM検出の精度は良好です。ビート同期機能が有効に働きます。');
  } else if (analysis.confidence >= 0.5) {
    recommendations.push('BPM検出の精度は中程度です。手動でビートマーカーを調整することをお勧めします。');
  } else {
    recommendations.push('BPM検出の精度が低いです。手動でのビート設定をお勧めします。');
  }

  // BPMに基づく推奨事項
  if (analysis.bpm < 80) {
    recommendations.push('スローテンポなので、ゆったりとしたトランジションやエフェクトが効果的です。');
  } else if (analysis.bpm > 140) {
    recommendations.push('ハイテンポなので、クイックカットや激しいエフェクトが映えます。');
  }

  // ビート数に基づく推奨事項
  if (analysis.beatTimes.length > 100) {
    recommendations.push('十分なビート数が検出されました。細かなビート同期編集が可能です。');
  }

  return recommendations;
}

/**
 * 周波数帯域の解析結果から推奨エフェクトを提案
 * @param bands - 周波数帯域の配列
 * @returns 推奨エフェクトの配列
 */
export function suggestEffectsFromFrequency(bands: FrequencyBand[]): string[] {
  const suggestions: string[] = [];

  bands.forEach(band => {
    if (band.triggered) {
      switch (band.name.toLowerCase()) {
        case 'bass':
        case 'sub_bass':
        case 'kick':
          suggestions.push('低音域でトリガー: 画面シェイクやフラッシュエフェクトが効果的');
          break;
        case 'highs':
        case 'brilliance':
        case 'presence':
          suggestions.push('高音域でトリガー: パーティクルやグロウエフェクトがお勧め');
          break;
        case 'vocals':
        case 'mids':
          suggestions.push('中音域でトリガー: カラーグレーディングや軽いズームが適しています');
          break;
        case 'snare':
          suggestions.push('スネア音でトリガー: 瞬間的なカットやフラッシュがリズム感を演出');
          break;
      }
    }
  });

  return Array.from(new Set(suggestions)); // 重複を除去
}

/**
 * 音楽ジャンルをBPMから推測
 * @param bpm - Beats Per Minute
 * @returns 推測されるジャンル
 */
export function guessGenreFromBPM(bpm: number): string {
  if (bpm < 70) return 'Ambient/Downtempo';
  if (bpm < 90) return 'Hip-Hop/Trap';
  if (bpm < 100) return 'Lo-fi/Chill';
  if (bpm < 120) return 'Pop/Rock';
  if (bpm < 130) return 'House/Dance';
  if (bpm < 140) return 'Techno/Trance';
  if (bpm < 160) return 'Drum & Bass';
  if (bpm < 180) return 'Hardcore/Gabber';
  return 'Speedcore';
}

/**
 * ビートタイムの配列から規則性を分析
 * @param beatTimes - ビートタイムの配列
 * @returns 規則性の分析結果
 */
export function analyzeBeatRegularity(beatTimes: number[]): {
  averageInterval: number;
  standardDeviation: number;
  regularity: 'very_regular' | 'regular' | 'irregular' | 'very_irregular';
} {
  if (beatTimes.length < 2) {
    return {
      averageInterval: 0,
      standardDeviation: 0,
      regularity: 'very_irregular'
    };
  }

  // 間隔の計算
  const intervals: number[] = [];
  for (let i = 1; i < beatTimes.length; i++) {
    intervals.push(beatTimes[i] - beatTimes[i - 1]);
  }

  // 平均間隔
  const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

  // 標準偏差
  const variance = intervals.reduce((sum, interval) => {
    return sum + Math.pow(interval - averageInterval, 2);
  }, 0) / intervals.length;
  const standardDeviation = Math.sqrt(variance);

  // 規則性の判定
  const coefficientOfVariation = standardDeviation / averageInterval;
  let regularity: 'very_regular' | 'regular' | 'irregular' | 'very_irregular';

  if (coefficientOfVariation < 0.05) {
    regularity = 'very_regular';
  } else if (coefficientOfVariation < 0.1) {
    regularity = 'regular';
  } else if (coefficientOfVariation < 0.2) {
    regularity = 'irregular';
  } else {
    regularity = 'very_irregular';
  }

  return {
    averageInterval,
    standardDeviation,
    regularity
  };
}

/**
 * オーディオファイルの再生時間から BPM を概算
 * @param duration - 音声ファイルの長さ（秒）
 * @param estimatedBeats - 推定されるビート数
 * @returns 概算 BPM
 */
export function estimateBPMFromDuration(duration: number, estimatedBeats: number): number {
  const beatsPerSecond = estimatedBeats / duration;
  return Math.round(beatsPerSecond * 60);
}

/**
 * BPM の変更に合わせてエフェクトパラメータを調整
 * @param originalBPM - 元の BPM
 * @param newBPM - 新しい BPM
 * @param effectDuration - エフェクトの継続時間（秒）
 * @returns 調整後のエフェクト継続時間
 */
export function adjustEffectForBPM(originalBPM: number, newBPM: number, effectDuration: number): number {
  const ratio = originalBPM / newBPM;
  return effectDuration * ratio;
}

/**
 * ビートグリッドのスナップ距離を計算
 * @param pixelsPerSecond - 1秒あたりのピクセル数
 * @param bpm - Beats Per Minute
 * @param subdivisions - サブディビジョン（1, 2, 4, 8, 16）
 * @returns スナップ距離（ピクセル）
 */
export function calculateSnapDistance(pixelsPerSecond: number, bpm: number, subdivisions: number): number {
  const beatInterval = 60 / bpm;
  const subdivisionInterval = beatInterval / subdivisions;
  return subdivisionInterval * pixelsPerSecond;
}

/**
 * 周波数解析結果から音楽の特徴を抽出
 * @param analysis - 音声解析結果
 * @returns 音楽の特徴
 */
export function extractMusicFeatures(analysis: AudioAnalysis): {
  bassHeavy: boolean;
  treblySound: boolean;
  dynamicRange: 'low' | 'medium' | 'high';
  brightness: number;
} {
  const bassEnergy = analysis.frequencyBands
    .filter(band => ['BASS', 'SUB_BASS', 'KICK'].includes(band.name))
    .reduce((sum, band) => sum + band.energy, 0) / 3;

  const trebleEnergy = analysis.frequencyBands
    .filter(band => ['HIGHS', 'BRILLIANCE', 'PRESENCE'].includes(band.name))
    .reduce((sum, band) => sum + band.energy, 0) / 3;

  const dynamicRange = analysis.peak - analysis.rms;
  let dynamicRangeCategory: 'low' | 'medium' | 'high';

  if (dynamicRange < 0.3) {
    dynamicRangeCategory = 'low';
  } else if (dynamicRange < 0.6) {
    dynamicRangeCategory = 'medium';
  } else {
    dynamicRangeCategory = 'high';
  }

  return {
    bassHeavy: bassEnergy > 0.6,
    treblySound: trebleEnergy > 0.6,
    dynamicRange: dynamicRangeCategory,
    brightness: analysis.spectralCentroid ?? trebleEnergy
  };
}

/**
 * デバッグ用：BPM解析結果を読みやすい形式で出力
 * @param analysis - BPM解析結果
 */
export function debugBPMAnalysis(analysis: BPMAnalysis): void {
  console.group('🎵 BPM解析結果');
  console.log(`BPM: ${analysis.bpm}`);
  console.log(`信頼度: ${(analysis.confidence * 100).toFixed(1)}%`);
  console.log(`ビート数: ${analysis.beatTimes.length}`);
  console.log(`小節数: ${analysis.bars.length}`);
  console.log(`拍子: ${analysis.timeSignature.numerator}/${analysis.timeSignature.denominator}`);

  const regularity = analyzeBeatRegularity(analysis.beatTimes);
  console.log(`ビートの規則性: ${regularity.regularity}`);
  console.log(`平均ビート間隔: ${regularity.averageInterval.toFixed(3)}秒`);

  const genre = guessGenreFromBPM(analysis.bpm);
  console.log(`推測ジャンル: ${genre}`);

  console.groupEnd();
}
