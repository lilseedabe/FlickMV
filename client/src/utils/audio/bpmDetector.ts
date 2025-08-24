import { BPMAnalysis, AudioAnalysis, FrequencyBand, FREQUENCY_BANDS } from '../../types';

/**
 * 軽量版BPM検出クラス - ブラウザ環境向けに最適化
 * 実用的な精度と高速処理のバランスを重視
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
    this.analyser.fftSize = 1024; // 軽量化のため小さいサイズに
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.sampleRate = this.audioContext.sampleRate;
  }

  /**
   * 軽量版BPM検出 - 高速で実用的
   * @param audioBuffer - Web Audio APIのAudioBuffer
   * @returns BPM解析結果
   */
  async detectBPM(audioBuffer: AudioBuffer): Promise<BPMAnalysis> {
    try {
      console.log('🎵 軽量版BPM検出を開始します');
      
      // オーディオデータの取得（軽量化）
      const channelData = audioBuffer.getChannelData(0);
      const duration = audioBuffer.duration;
      
      console.log(`📊 音声データ: ${duration.toFixed(1)}秒, ${channelData.length}サンプル`);
      
      // ステップ1: 高速ビート検出（エネルギーベース）
      const beats = this.detectBeatsLightweight(channelData, this.sampleRate);
      console.log(`🥁 ビート検出: ${beats.length}個`);
      
      // ステップ2: BPM計算（シンプルな統計手法）
      const bpm = this.calculateBPMFast(beats, duration);
      console.log(`🎶 BPM算出: ${bpm}`);
      
      // ステップ3: 信頼度計算（軽量版）
      const confidence = this.calculateConfidenceFast(beats, bpm);
      console.log(`✨ 信頼度: ${(confidence * 100).toFixed(1)}%`);
      
      // ステップ4: 小節計算
      const bars = this.calculateBarsSimple(beats, bpm);
      
      const result: BPMAnalysis = {
        bpm: Math.round(bpm),
        confidence: confidence,
        beatTimes: beats,
        bars: bars,
        timeSignature: {
          numerator: 4,
          denominator: 4
        }
      };
      
      console.log(`✅ 軽量版BPM検出完了: ${result.bpm} BPM (信頼度: ${(confidence * 100).toFixed(1)}%)`);
      
      return result;
    } catch (error) {
      console.error('❌ BPM検出エラー:', error);
      throw error;
    }
  }

  /**
   * 軽量版ビート検出 - エネルギーベース
   * @param channelData - 音声データ
   * @param sampleRate - サンプリングレート
   * @returns ビートタイムスタンプ配列
   */
  private detectBeatsLightweight(channelData: Float32Array, sampleRate: number): number[] {
    const beats: number[] = [];
    const windowSize = 2048; // 軽量化
    const hopSize = 1024;
    const threshold = 0.7; // 適度な閾値
    
    console.log('📈 エネルギーベースビート検出を開始');
    
    // エネルギー計算（ダウンサンプリング）
    const energies: number[] = [];
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      let energy = 0;
      for (let j = i; j < i + windowSize && j < channelData.length; j++) {
        energy += channelData[j] * channelData[j];
      }
      energies.push(energy / windowSize);
    }
    
    // 適応的閾値でピーク検出
    const windowLength = Math.min(20, energies.length); // 適応ウィンドウ
    
    for (let i = windowLength; i < energies.length - windowLength; i++) {
      const current = energies[i];
      
      // ローカル平均計算
      let localAvg = 0;
      for (let j = i - windowLength; j < i + windowLength; j++) {
        localAvg += energies[j];
      }
      localAvg /= (windowLength * 2);
      
      // ピーク検出
      const isLocalMax = current > energies[i - 1] && current > energies[i + 1];
      const isAboveThreshold = current > localAvg * threshold;
      
      if (isLocalMax && isAboveThreshold) {
        const timeStamp = (i * hopSize) / sampleRate;
        beats.push(timeStamp);
      }
    }
    
    // 近接ビートの統合（最小間隔 0.1秒）
    return this.mergeCloseBeats(beats, 0.1);
  }

  /**
   * 高速BPM計算
   * @param beats - ビート配列
   * @param duration - 楽曲長
   * @returns BPM値
   */
  private calculateBPMFast(beats: number[], duration: number): number {
    if (beats.length < 4) {
      return 120; // デフォルト値
    }
    
    // 間隔計算
    const intervals: number[] = [];
    for (let i = 1; i < beats.length; i++) {
      const interval = beats[i] - beats[i - 1];
      if (interval > 0.3 && interval < 2.0) { // 30-200 BPMの範囲
        intervals.push(interval);
      }
    }
    
    if (intervals.length === 0) {
      return 120;
    }
    
    // 中央値を使用（外れ値に強い）
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];
    
    // BPMに変換
    let bpm = 60 / medianInterval;
    
    // 一般的な範囲に正規化
    while (bpm < 70) bpm *= 2;
    while (bpm > 180) bpm /= 2;
    
    return bpm;
  }

  /**
   * 高速信頼度計算
   * @param beats - ビート配列
   * @param bpm - 検出BPM
   * @returns 信頼度 (0-1)
   */
  private calculateConfidenceFast(beats: number[], bpm: number): number {
    if (beats.length < 4) {
      return 0.3;
    }
    
    const expectedInterval = 60 / bpm;
    let consistentBeats = 0;
    const tolerance = expectedInterval * 0.15; // 15%の許容誤差
    
    for (let i = 1; i < beats.length; i++) {
      const actualInterval = beats[i] - beats[i - 1];
      if (Math.abs(actualInterval - expectedInterval) <= tolerance) {
        consistentBeats++;
      }
    }
    
    const consistency = consistentBeats / (beats.length - 1);
    
    // ビート数と一貫性から信頼度を計算
    const beatDensity = Math.min(beats.length / 20, 1); // 20ビート以上で最大
    const confidence = (consistency * 0.7) + (beatDensity * 0.3);
    
    return Math.min(Math.max(confidence, 0.1), 0.95); // 0.1-0.95の範囲
  }

  /**
   * シンプル小節計算
   * @param beats - ビート配列
   * @param bpm - BPM
   * @returns 小節配列
   */
  private calculateBarsSimple(beats: number[], bpm: number): number[] {
    const bars: number[] = [];
    const beatInterval = 60 / bpm;
    const beatsPerBar = 4; // 4/4拍子
    
    if (beats.length === 0) {
      return bars;
    }
    
    // 最初のビートから開始
    let currentBar = beats[0];
    bars.push(currentBar);
    
    // 4拍ごとに小節を追加
    while (currentBar < beats[beats.length - 1]) {
      currentBar += beatInterval * beatsPerBar;
      bars.push(currentBar);
    }
    
    return bars;
  }

  /**
   * 近接ビートの統合
   * @param beats - 元のビート配列
   * @param minInterval - 最小間隔
   * @returns 統合されたビート配列
   */
  private mergeCloseBeats(beats: number[], minInterval: number): number[] {
    if (beats.length <= 1) return beats;
    
    const merged: number[] = [beats[0]];
    
    for (let i = 1; i < beats.length; i++) {
      const lastBeat = merged[merged.length - 1];
      if (beats[i] - lastBeat >= minInterval) {
        merged.push(beats[i]);
      }
    }
    
    return merged;
  }

  /**
   * 周波数解析（軽量版）
   * @param audioBuffer - 音声バッファ
   * @param currentTime - 現在時刻
   * @returns 音声解析結果
   */
  analyzeFrequencies(audioBuffer: AudioBuffer, currentTime: number): AudioAnalysis {
    const sampleIndex = Math.floor(currentTime * this.sampleRate);
    const windowSize = 512; // 軽量化
    const channelData = audioBuffer.getChannelData(0);
    
    const windowData = channelData.slice(sampleIndex, sampleIndex + windowSize);
    
    // 簡易FFT（軽量版）
    const fftData = this.simpleFFT(windowData);
    const frequencyBands = this.analyzeFrequencyBands(fftData);
    
    // RMS計算
    let rms = 0;
    let peak = 0;
    for (let i = 0; i < windowData.length; i++) {
      const sample = Math.abs(windowData[i]);
      rms += sample * sample;
      if (sample > peak) peak = sample;
    }
    rms = Math.sqrt(rms / windowData.length);
    
    // スペクトラル重心（簡易版）
    let centroid = 0;
    let totalMagnitude = 0;
    for (let i = 0; i < fftData.length; i++) {
      const frequency = (i * this.sampleRate) / (2 * fftData.length);
      centroid += frequency * fftData[i];
      totalMagnitude += fftData[i];
    }
    centroid = totalMagnitude > 0 ? centroid / totalMagnitude : 0;
    
    // ゼロクロッシング率
    let crossings = 0;
    for (let i = 1; i < windowData.length; i++) {
      if ((windowData[i] >= 0) !== (windowData[i - 1] >= 0)) {
        crossings++;
      }
    }
    const zcr = crossings / windowData.length;
    
    return {
      frequencyBands,
      rms,
      peak,
      spectralCentroid: centroid,
      zcr
    };
  }

  /**
   * 簡易FFT（軽量版）
   * @param data - 入力データ
   * @returns 周波数ドメインデータ
   */
  private simpleFFT(data: Float32Array): Float32Array {
    const N = Math.min(data.length, 256); // 軽量化
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
   * 周波数帯域解析（軽量版）
   * @param fftData - FFT結果
   * @returns 周波数帯域配列
   */
  private analyzeFrequencyBands(fftData: Float32Array): FrequencyBand[] {
    const nyquist = this.sampleRate / 2;
    const binSize = nyquist / fftData.length;
    
    const bands: FrequencyBand[] = [];
    
    // 主要な帯域のみ解析
    const simpleBands = {
      'Bass': [20, 250],
      'Mids': [250, 4000],
      'Highs': [4000, 20000]
    };
    
    Object.entries(simpleBands).forEach(([name, range]) => {
      const [lowHz, highHz] = range;
      const lowBin = Math.floor(lowHz / binSize);
      const highBin = Math.min(Math.floor(highHz / binSize), fftData.length - 1);
      
      let energy = 0;
      for (let i = lowBin; i <= highBin; i++) {
        energy += fftData[i];
      }
      energy /= (highBin - lowBin + 1);
      
      const normalizedEnergy = Math.min(energy / 50, 1); // 軽量化
      
      bands.push({
        name,
        range: [lowHz, highHz],
        energy: normalizedEnergy,
        threshold: 0.6,
        triggered: normalizedEnergy > 0.6
      });
    });
    
    return bands;
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
 * 軽量版: 音声ファイルをAudioBufferに変換
 * @param audioFile - File または Blob オブジェクト
 * @returns AudioBuffer
 */
export async function loadAudioFile(audioFile: File | Blob): Promise<AudioBuffer> {
  try {
    console.log('📁 音声ファイルを高速読み込み中...');
    
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
