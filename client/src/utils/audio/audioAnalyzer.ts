import type { AudioTrackEnhanced, BPMAnalysis } from '@/types';

/**
 * 音声ファイルの解析とBPM検出を行うユーティリティクラス
 */
export class AudioAnalyzer {
  private audioContext: AudioContext;
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  /**
   * 音声ファイルを読み込んでAudioBufferに変換
   */
  async loadAudioFile(file: File | string): Promise<AudioBuffer> {
    let arrayBuffer: ArrayBuffer;
    
    if (typeof file === 'string') {
      // URLから読み込み
      const response = await fetch(file);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio file: ${response.statusText}`);
      }
      arrayBuffer = await response.arrayBuffer();
    } else {
      // Fileオブジェクトから読み込み
      arrayBuffer = await file.arrayBuffer();
    }
    
    try {
      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      throw new Error('Failed to decode audio data');
    }
  }

  /**
   * BPMを検出する
   */
  async detectBPM(audioBuffer: AudioBuffer): Promise<BPMAnalysis> {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // 低域フィルターを適用してビートを抽出
    const filteredData = this.lowPassFilter(channelData, sampleRate, 200);
    
    // エネルギーベースのオンセット検出
    const onsets = this.detectOnsets(filteredData, sampleRate);
    
    // BPMを計算
    const bpm = this.calculateBPM(onsets);
    
    // ビートタイムを生成
    const beatTimes = this.generateBeatTimes(bpm, audioBuffer.duration);
    
    // 小節を計算（4/4拍子と仮定）
    const bars = this.generateBars(beatTimes, 4);
    
    return {
      bpm,
      confidence: Math.min(0.95, Math.max(0.3, onsets.length / (audioBuffer.duration * 2))),
      beatTimes,
      bars,
      timeSignature: { numerator: 4, denominator: 4 }
    };
  }

  /**
   * 音声波形データを生成
   */
  generateWaveformData(audioBuffer: AudioBuffer, width: number): {
    peaks: Float32Array;
    duration: number;
    sampleRate: number;
  } {
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / (width * 2));
    const peaks = new Float32Array(width * 2);
    
    for (let i = 0; i < width * 2; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, channelData.length);
      
      let min = 0;
      let max = 0;
      
      for (let j = start; j < end; j++) {
        const sample = channelData[j];
        if (sample > max) max = sample;
        if (sample < min) min = sample;
      }
      
      peaks[i] = i % 2 === 0 ? max : min;
    }
    
    return {
      peaks,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate
    };
  }

  /**
   * AudioTrackオブジェクトを生成
   */
  async createAudioTrack(
    file: File, 
    name?: string,
    startTime: number = 0
  ): Promise<AudioTrackEnhanced> {
    const audioBuffer = await this.loadAudioFile(file);
    const bpmAnalysis = await this.detectBPM(audioBuffer);
    
    // ファイルをBlobURLに変換
    const url = URL.createObjectURL(file);
    
    return {
      id: `audio-${Date.now()}`,
      name: name || file.name,
      url,
      startTime,
      duration: audioBuffer.duration,
      volume: 1.0,
      muted: false,
      bpm: bpmAnalysis.bpm,
      beats: bpmAnalysis.beatTimes,
      bars: bpmAnalysis.bars,
      bpmAnalysis,
      waveformData: this.generateWaveformData(audioBuffer, 1000).peaks, // Float32Array型に変更
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * 低域通過フィルター
   */
  private lowPassFilter(data: Float32Array, sampleRate: number, cutoff: number): Float32Array {
    const rc = 1.0 / (cutoff * 2 * Math.PI);
    const dt = 1.0 / sampleRate;
    const alpha = dt / (rc + dt);
    
    const filtered = new Float32Array(data.length);
    filtered[0] = data[0];
    
    for (let i = 1; i < data.length; i++) {
      filtered[i] = filtered[i - 1] + alpha * (data[i] - filtered[i - 1]);
    }
    
    return filtered;
  }

  /**
   * オンセット検出
   */
  private detectOnsets(data: Float32Array, sampleRate: number): number[] {
    const hopSize = Math.floor(sampleRate * 0.01); // 10ms のホップサイズ
    const windowSize = hopSize * 4;
    const onsets: number[] = [];
    
    let prevEnergy = 0;
    
    for (let i = windowSize; i < data.length - windowSize; i += hopSize) {
      // 現在のウィンドウのエネルギーを計算
      let energy = 0;
      for (let j = i - windowSize / 2; j < i + windowSize / 2; j++) {
        energy += data[j] * data[j];
      }
      energy /= windowSize;
      
      // エネルギーの急激な増加を検出
      const energyDiff = energy - prevEnergy;
      const threshold = prevEnergy * 0.3; // 30%の増加をオンセットとする
      
      if (energyDiff > threshold && energy > 0.01) {
        const time = i / sampleRate;
        onsets.push(time);
      }
      
      prevEnergy = energy;
    }
    
    return onsets;
  }

  /**
   * BPMを計算
   */
  private calculateBPM(onsets: number[]): number {
    if (onsets.length < 4) {
      return 120; // デフォルトBPM
    }
    
    // オンセット間の間隔を計算
    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i] - onsets[i - 1]);
    }
    
    // 最も一般的な間隔を見つける（簡易実装）
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];
    
    // BPMに変換
    const bpm = Math.round(60 / medianInterval);
    
    // 現実的な範囲に制限
    return Math.max(60, Math.min(200, bpm));
  }

  /**
   * ビートタイムを生成
   */
  private generateBeatTimes(bpm: number, duration: number): number[] {
    const beatInterval = 60 / bpm;
    const beatTimes: number[] = [];
    
    for (let time = 0; time < duration; time += beatInterval) {
      beatTimes.push(time);
    }
    
    return beatTimes;
  }

  /**
   * 小節を生成
   */
  private generateBars(beatTimes: number[], beatsPerBar: number): number[] {
    const bars: number[] = [];
    
    for (let i = 0; i < beatTimes.length; i += beatsPerBar) {
      if (beatTimes[i] !== undefined) {
        bars.push(beatTimes[i]);
      }
    }
    
    return bars;
  }

  /**
   * エネルギーレベルを計算
   */
  private calculateEnergy(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

/**
 * 音声ファイルからAudioTrackを作成するヘルパー関数
 */
export async function createAudioTrackFromFile(
  file: File,
  name?: string,
  startTime?: number
): Promise<AudioTrackEnhanced> {
  const analyzer = new AudioAnalyzer();
  try {
    return await analyzer.createAudioTrack(file, name, startTime);
  } finally {
    analyzer.dispose();
  }
}

/**
 * 音声ファイルのBPMのみを検出するヘルパー関数
 */
export async function detectAudioBPM(file: File | string): Promise<BPMAnalysis> {
  const analyzer = new AudioAnalyzer();
  try {
    const audioBuffer = await analyzer.loadAudioFile(file);
    return await analyzer.detectBPM(audioBuffer);
  } finally {
    analyzer.dispose();
  }
}

// デフォルトエクスポート
export default AudioAnalyzer;
