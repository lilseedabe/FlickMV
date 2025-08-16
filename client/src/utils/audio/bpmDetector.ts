import { BPMAnalysis, AudioAnalysis, FrequencyBand, FREQUENCY_BANDS } from '../../types';

/**
 * BPM検出とオーディオ解析のユーティリティクラス
 * 初心者にもわかりやすいようにコメントを充実
 */
export class BPMDetector {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private sampleRate: number;
  
  constructor() {
    // Web Audio APIの初期化
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048; // 解析の精度を設定
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.sampleRate = this.audioContext.sampleRate;
  }

  /**
   * 音声ファイルからBPMを検出
   * @param audioBuffer - Web Audio APIのAudioBuffer
   * @returns BPM解析結果
   */
  async detectBPM(audioBuffer: AudioBuffer): Promise<BPMAnalysis> {
    try {
      console.log('🎵 BPM検出を開始します...');
      
      // オーディオデータの取得
      const channelData = audioBuffer.getChannelData(0); // モノラルまたは左チャンネル
      const duration = audioBuffer.duration;
      
      // テンポ検出のための前処理
      const beats = this.detectBeats(channelData, this.sampleRate);
      const bpm = this.calculateBPM(beats, duration);
      const bars = this.calculateBars(beats, bpm);
      
      console.log(`✅ BPM検出完了: ${bpm} BPM`);
      
      return {
        bpm: Math.round(bpm),
        confidence: this.calculateConfidence(beats, bpm),
        beatTimes: beats,
        bars: bars,
        timeSignature: {
          numerator: 4, // 4/4拍子を仮定（将来的には自動検出可能）
          denominator: 4
        }
      };
    } catch (error) {
      console.error('❌ BPM検出エラー:', error);
      throw error;
    }
  }

  /**
   * リアルタイム周波数解析
   * @param audioBuffer - 解析対象のオーディオバッファ
   * @param currentTime - 現在の再生時間
   * @returns 周波数帯域の解析結果
   */
  analyzeFrequencies(audioBuffer: AudioBuffer, currentTime: number): AudioAnalysis {
    // 現在時刻のオーディオデータを取得
    const sampleIndex = Math.floor(currentTime * this.sampleRate);
    const windowSize = 1024;
    const channelData = audioBuffer.getChannelData(0);
    
    // ウィンドウ範囲のデータを取得
    const windowData = channelData.slice(sampleIndex, sampleIndex + windowSize);
    
    // FFT解析
    const fftData = this.performFFT(windowData);
    const frequencyBands = this.analyzeFrequencyBands(fftData);
    
    // RMS（音量レベル）計算
    const rms = this.calculateRMS(windowData);
    // ES5 ターゲットでも動作するようにスプレッド/TypedArray.map を避ける
    let peak = 0;
    for (let i = 0; i < windowData.length; i++) {
      const v = Math.abs(windowData[i]);
      if (v > peak) peak = v;
    }
    
    // スペクトラル重心（音の明るさ）計算
    const spectralCentroid = this.calculateSpectralCentroid(fftData);
    
    // ゼロクロッシング率計算
    const zcr = this.calculateZeroCrossingRate(windowData);
    
    return {
      frequencyBands,
      rms,
      peak,
      spectralCentroid,
      zcr
    };
  }

  /**
   * ビート検出アルゴリズム
   * @param channelData - オーディオの波形データ
   * @param sampleRate - サンプリングレート
   * @returns ビートのタイムスタンプ配列
   */
  private detectBeats(channelData: Float32Array, sampleRate: number): number[] {
    const beats: number[] = [];
    const windowSize = 1024;
    const hopSize = 512;
    const threshold = 0.3; // ビート検出の閾値
    
    // 高域フィルターを適用（ドラムなどのアタック音を強調）
    const filteredData = this.applyHighPassFilter(channelData, sampleRate);
    
    // エネルギー値の計算
    const energyValues: number[] = [];
    for (let i = 0; i < filteredData.length - windowSize; i += hopSize) {
      const window = filteredData.slice(i, i + windowSize);
      const energy = window.reduce((sum, sample) => sum + sample * sample, 0) / windowSize;
      energyValues.push(energy);
    }
    
    // ピーク検出
    for (let i = 1; i < energyValues.length - 1; i++) {
      const current = energyValues[i];
      const prev = energyValues[i - 1];
      const next = energyValues[i + 1];
      
      // ローカルピークかつ閾値を超える場合はビートとして検出
      if (current > prev && current > next && current > threshold) {
        const timeStamp = (i * hopSize) / sampleRate;
        beats.push(timeStamp);
      }
    }
    
    // ビート間隔の正規化（異常に近いビートを除去）
    return this.normalizeBeats(beats);
  }

  /**
   * BPM計算
   * @param beats - ビートのタイムスタンプ配列
   * @param duration - 楽曲の総時間
   * @returns 計算されたBPM
   */
  private calculateBPM(beats: number[], duration: number): number {
    if (beats.length < 2) return 120; // デフォルト値
    
    // ビート間隔の配列を作成
    const intervals: number[] = [];
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i] - beats[i - 1]);
    }
    
    // 中央値を使用してより安定したBPMを計算
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];
    
    // BPMに変換（60秒 ÷ 間隔）
    return 60 / medianInterval;
  }

  /**
   * 小節の開始位置を計算
   * @param beats - ビートのタイムスタンプ配列
   * @param bpm - 検出されたBPM
   * @returns 小節の開始タイムスタンプ配列
   */
  private calculateBars(beats: number[], bpm: number): number[] {
    const bars: number[] = [];
    const beatInterval = 60 / bpm;
    const beatsPerBar = 4; // 4/4拍子を仮定
    
    // 最初の小節は曲の開始から
    let currentBar = 0;
    bars.push(currentBar);
    
    // 4拍ごとに小節線を追加
    while (currentBar < beats[beats.length - 1]) {
      currentBar += beatInterval * beatsPerBar;
      bars.push(currentBar);
    }
    
    return bars;
  }

  /**
   * BPM検出の信頼度を計算
   * @param beats - ビートのタイムスタンプ配列
   * @param bpm - 検出されたBPM
   * @returns 0-1の信頼度
   */
  private calculateConfidence(beats: number[], bpm: number): number {
    if (beats.length < 4) return 0.1; // ビートが少ない場合は低信頼度
    
    const expectedInterval = 60 / bpm;
    let totalError = 0;
    
    // 期待値との誤差を計算
    for (let i = 1; i < beats.length; i++) {
      const actualInterval = beats[i] - beats[i - 1];
      const error = Math.abs(actualInterval - expectedInterval) / expectedInterval;
      totalError += error;
    }
    
    const averageError = totalError / (beats.length - 1);
    
    // エラーが少ないほど高い信頼度
    return Math.max(0, 1 - averageError * 2);
  }

  /**
   * 高域通過フィルター
   * @param data - 入力データ
   * @param sampleRate - サンプリングレート
   * @returns フィルター済みデータ
   */
  private applyHighPassFilter(data: Float32Array, sampleRate: number): Float32Array {
    // 簡単な1次高域通過フィルター
    const cutoff = 100; // 100Hz以下をカット
    const RC = 1 / (2 * Math.PI * cutoff);
    const dt = 1 / sampleRate;
    const alpha = RC / (RC + dt);
    
    const filtered = new Float32Array(data.length);
    filtered[0] = data[0];
    
    for (let i = 1; i < data.length; i++) {
      filtered[i] = alpha * (filtered[i - 1] + data[i] - data[i - 1]);
    }
    
    return filtered;
  }

  /**
   * ビートの正規化（異常に近いビートを除去）
   * @param beats - 元のビート配列
   * @returns 正規化されたビート配列
   */
  private normalizeBeats(beats: number[]): number[] {
    if (beats.length < 2) return beats;
    
    const minInterval = 0.1; // 最小ビート間隔（秒）
    const normalized: number[] = [beats[0]];
    
    for (let i = 1; i < beats.length; i++) {
      const interval = beats[i] - normalized[normalized.length - 1];
      if (interval >= minInterval) {
        normalized.push(beats[i]);
      }
    }
    
    return normalized;
  }

  /**
   * 簡易FFT実装
   * @param data - 入力データ
   * @returns 周波数ドメインデータ
   */
  private performFFT(data: Float32Array): Float32Array {
    // 実際の実装では、より効率的なFFTライブラリを使用することを推奨
    // ここでは教育目的で簡略化
    const N = data.length;
    const result = new Float32Array(N / 2);
    
    for (let k = 0; k < N / 2; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += data[n] * Math.cos(angle);
        imag += data[n] * Math.sin(angle);
      }
      
      result[k] = Math.sqrt(real * real + imag * imag);
    }
    
    return result;
  }

  /**
   * 周波数帯域解析
   * @param fftData - FFT結果
   * @returns 周波数帯域ごとの解析結果
   */
  private analyzeFrequencyBands(fftData: Float32Array): FrequencyBand[] {
    const nyquist = this.sampleRate / 2;
    const binSize = nyquist / fftData.length;
    
    const bands: FrequencyBand[] = [];
    
    Object.entries(FREQUENCY_BANDS).forEach(([name, range]) => {
      const [lowHz, highHz] = range;
      const lowBin = Math.floor(lowHz / binSize);
      const highBin = Math.floor(highHz / binSize);
      
      // 指定範囲の平均エネルギーを計算
      let energy = 0;
      for (let i = lowBin; i <= highBin && i < fftData.length; i++) {
        energy += fftData[i];
      }
      energy /= (highBin - lowBin + 1);
      
      // 正規化（0-1範囲）
      const normalizedEnergy = Math.min(energy / 100, 1);
      
      bands.push({
        name,
        range: [lowHz, highHz],
        energy: normalizedEnergy,
        threshold: 0.7, // デフォルト閾値
        triggered: normalizedEnergy > 0.7
      });
    });
    
    return bands;
  }

  /**
   * RMS（Root Mean Square）計算
   * @param data - 音声データ
   * @returns RMS値
   */
  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  /**
   * スペクトラル重心計算（音の明るさの指標）
   * @param fftData - FFT結果
   * @returns スペクトラル重心
   */
  private calculateSpectralCentroid(fftData: Float32Array): number {
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < fftData.length; i++) {
      const frequency = (i * this.sampleRate) / (2 * fftData.length);
      weightedSum += frequency * fftData[i];
      magnitudeSum += fftData[i];
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  /**
   * ゼロクロッシング率計算
   * @param data - 音声データ
   * @returns ゼロクロッシング率
   */
  private calculateZeroCrossingRate(data: Float32Array): number {
    let crossings = 0;
    
    for (let i = 1; i < data.length; i++) {
      if ((data[i] >= 0) !== (data[i - 1] >= 0)) {
        crossings++;
      }
    }
    
    return crossings / data.length;
  }

  /**
   * リソースのクリーンアップ
   */
  dispose(): void {
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

/**
 * 初心者向けヘルパー関数：音声ファイルをAudioBufferに変換
 * @param audioFile - File または Blob オブジェクト
 * @returns AudioBuffer
 */
export async function loadAudioFile(audioFile: File | Blob): Promise<AudioBuffer> {
  try {
    console.log('📁 音声ファイルを読み込み中...');
    
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    console.log('✅ 音声ファイル読み込み完了');
    console.log(`   - 長さ: ${audioBuffer.duration.toFixed(2)}秒`);
    console.log(`   - サンプルレート: ${audioBuffer.sampleRate}Hz`);
    console.log(`   - チャンネル数: ${audioBuffer.numberOfChannels}`);
    
    return audioBuffer;
  } catch (error) {
    console.error('❌ 音声ファイル読み込みエラー:', error);
    throw new Error('音声ファイルの読み込みに失敗しました。対応しているフォーマットかご確認ください。');
  }
}