import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Volume2,
  Zap,
  Settings,
  Play,
  Pause,
  Activity,
  Eye,
  Info
} from 'lucide-react';

import {
  FrequencyAnalyzerProps,
  AudioAnalysis,
  FrequencyTrigger,
  FrequencyBand,
  FREQUENCY_BANDS
} from '../../types';

/**
 * リアルタイム周波数解析コンポーネント
 * 低域・高域トリガーでエフェクトを自動発動
 */
const FrequencyAnalyzer: React.FC<FrequencyAnalyzerProps> = ({
  audioContext,
  audioBuffer,
  onAnalysisUpdate,
  triggers,
  onTriggerFired,
  realTime = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<AudioAnalysis | null>(null);
  const [activeTriggers, setActiveTriggers] = useState<Set<string>>(new Set());
  const [triggerHistory, setTriggerHistory] = useState<Array<{ triggerId: string; timestamp: number; intensity: number }>>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [sensitivity, setSensitivity] = useState(0.7);
  const [visualizationMode, setVisualizationMode] = useState<'spectrum' | 'bands'>('spectrum');

  // スペクトラムビジュアライザーの描画
  const drawSpectrum = useCallback((dataArray: Uint8Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // キャンバスをクリア
    ctx.fillStyle = 'rgb(15, 23, 42)'; // dark-900
    ctx.fillRect(0, 0, width, height);

    if (visualizationMode === 'spectrum') {
      // スペクトラム表示
      const barWidth = Math.max(1, Math.floor(width / dataArray.length));
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * height;

        // 周波数に応じた色分け
        const hue = (i / dataArray.length) * 240; // 0-240度（赤→青）
        ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;

        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    } else if (visualizationMode === 'bands') {
      // 周波数帯域表示
      const bandNames = Object.keys(FREQUENCY_BANDS);
      const barWidth = width / bandNames.length;

      bandNames.forEach((name, index) => {
        const [lowHz, highHz] = FREQUENCY_BANDS[name as keyof typeof FREQUENCY_BANDS];
        const sampleRate = audioContext.sampleRate;
        const nyquist = sampleRate / 2;
        const binSize = nyquist / dataArray.length;

        const lowBin = Math.floor(lowHz / binSize);
        const highBin = Math.floor(highHz / binSize);

        // 該当範囲の平均値を計算
        let sum = 0;
        let count = 0;
        for (let i = lowBin; i <= highBin && i < dataArray.length; i++) {
          sum += dataArray[i];
          count++;
        }
        const average = count > 0 ? sum / count : 0;
        const barHeight = (average / 255) * height;

        // 帯域に応じた色
        const colors: Record<string, string> = {
          BASS: '#ef4444',
          MIDS: '#eab308',
          HIGHS: '#3b82f6',
          SUB_BASS: '#dc2626',
          KICK: '#f97316',
          SNARE: '#84cc16',
          VOCALS: '#06b6d4',
          PRESENCE: '#8b5cf6',
          BRILLIANCE: '#ec4899'
        };

        ctx.fillStyle = colors[name] || '#6b7280';
        ctx.fillRect(index * barWidth, height - barHeight, barWidth - 2, barHeight);

        // ラベル表示
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          name.slice(0, 4),
          index * barWidth + barWidth / 2,
          height - 5
        );
      });
    }

    // トリガーインジケーター
    if (activeTriggers.size > 0) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ef4444';
      ctx.font = '14px bold';
      ctx.textAlign = 'center';
      ctx.fillText('TRIGGER!', width / 2, 30);
    }
  }, [audioContext.sampleRate, visualizationMode, activeTriggers]);

  // リアルタイム解析ループ
  const analyzeLoop = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // 周波数帯域の解析
    const frequencyBands: FrequencyBand[] = [];
    const sampleRate = audioContext.sampleRate;
    const nyquist = sampleRate / 2;
    const binSize = nyquist / dataArray.length;

    Object.entries(FREQUENCY_BANDS).forEach(([name, range]) => {
      const [lowHz, highHz] = range;
      const lowBin = Math.floor(lowHz / binSize);
      const highBin = Math.floor(highHz / binSize);

      let energy = 0;
      let count = 0;
      for (let i = lowBin; i <= highBin && i < dataArray.length; i++) {
        energy += dataArray[i];
        count++;
      }
      energy = count > 0 ? energy / count : 0;

      const normalizedEnergy = energy / 255;
      const threshold = sensitivity;
      const triggered = normalizedEnergy > threshold;

      frequencyBands.push({
        name,
        range: [lowHz, highHz],
        energy: normalizedEnergy,
        threshold,
        triggered
      });

      // トリガー処理
      if (triggered) {
        const matchingTriggers = triggers.filter((trigger: FrequencyTrigger) => {
          if (trigger.band === 'custom' && trigger.customRange) {
            const [customLow, customHigh] = trigger.customRange;
            return lowHz >= customLow && highHz <= customHigh;
          }
          return trigger.band === name.toLowerCase();
        });

        matchingTriggers.forEach(trigger => {
          if (trigger.enabled && !activeTriggers.has(trigger.id)) {
            // Set の更新（ES5 互換）
            setActiveTriggers(prev => {
              const arr = Array.from(prev);
              arr.push(trigger.id);
              return new Set(arr);
            });

            onTriggerFired(trigger.id, normalizedEnergy);

            // トリガー履歴に追加（最新10件保持）
            setTriggerHistory(prev => [
              ...prev.slice(-9),
              {
                triggerId: trigger.id,
                timestamp: Date.now(),
                intensity: normalizedEnergy
              }
            ]);

            // クールダウン処理
            setTimeout(() => {
              setActiveTriggers(prev => {
                const newSet = new Set(prev);
                newSet.delete(trigger.id);
                return newSet;
              });
            }, trigger.duration * 1000);
          }
        });
      }
    });

    // dataArray の最大値を手動で計算（ES5 互換）
    let maxVal = 0;
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > maxVal) maxVal = dataArray[i];
    }

    // 解析結果の更新
    const analysis: AudioAnalysis = {
      frequencyBands,
      rms: Math.sqrt(dataArray.reduce((sum, val) => sum + val * val, 0) / dataArray.length) / 255,
      peak: maxVal / 255
    };

    setCurrentAnalysis(analysis);
    onAnalysisUpdate(analysis);

    // スペクトラム描画
    drawSpectrum(dataArray);

    if (isAnalyzing) {
      animationRef.current = requestAnimationFrame(analyzeLoop);
    }
  }, [audioContext.sampleRate, sensitivity, triggers, activeTriggers, onTriggerFired, onAnalysisUpdate, drawSpectrum, isAnalyzing]);

  // 解析開始
  const startAnalysis = useCallback(async () => {
    try {
      // アナライザーの設定
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      if (realTime) {
        // リアルタイム解析（マイク入力など）
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
      } else {
        // オーディオバッファーからの解析
        if (!audioBuffer) {
          console.warn('audioBuffer がありません');
          return;
        }
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyser);
        source.connect(audioContext.destination);
        source.start();
        sourceRef.current = source;
      }

      setIsAnalyzing(true);
      analyzeLoop();
    } catch (error) {
      console.error('周波数解析開始エラー:', error);
    }
  }, [audioContext, audioBuffer, realTime, analyzeLoop]);

  // 解析停止
  const stopAnalysis = useCallback(() => {
    setIsAnalyzing(false);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // ignore
      }
      sourceRef.current = null;
    }

    setActiveTriggers(new Set());
  }, []);

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      stopAnalysis();
    };
  }, [stopAnalysis]);

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      {/* ヘッダー */}
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">周波数解析</h3>
              <p className="text-sm text-gray-400">リアルタイム音響トリガー</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white rounded-lg transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={isAnalyzing ? stopAnalysis : startAnalysis}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isAnalyzing
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {isAnalyzing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isAnalyzing ? '停止' : '開始'}</span>
            </button>
          </div>
        </div>

        {/* 設定パネル */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-3 border-t border-dark-700"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    感度: {Math.round(sensitivity * 100)}%
                  </label>
                  <input
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    value={sensitivity}
                    onChange={(e) => setSensitivity(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    表示モード
                  </label>
                  <select
                    value={visualizationMode}
                    onChange={(e) => setVisualizationMode(e.target.value as any)}
                    className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="spectrum">スペクトラム</option>
                    <option value="bands">周波数帯域</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* スペクトラムビジュアライザー */}
      <div className="p-4">
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className="w-full h-48 bg-dark-900 rounded-lg border border-dark-600"
        />
      </div>

      {/* 現在の解析値 */}
      {currentAnalysis && (
        <div className="p-4 border-t border-dark-700">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {Math.round(currentAnalysis.rms * 100)}%
              </div>
              <div className="text-xs text-gray-400">RMS レベル</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {Math.round(currentAnalysis.peak * 100)}%
              </div>
              <div className="text-xs text-gray-400">ピーク</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {activeTriggers.size}
              </div>
              <div className="text-xs text-gray-400">アクティブ</div>
            </div>
          </div>

          {/* 周波数帯域の詳細 */}
          <div className="space-y-2">
            {currentAnalysis.frequencyBands.map((band, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-16 text-xs text-gray-400 font-mono">
                  {band.name.slice(0, 6)}
                </div>
                <div className="flex-1 bg-dark-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      band.triggered ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${band.energy * 100}%` }}
                  />
                </div>
                <div className="w-12 text-xs text-gray-400 text-right">
                  {Math.round(band.energy * 100)}%
                </div>
                {band.triggered && (
                  <Zap className="w-3 h-3 text-red-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* トリガー履歴 */}
      {triggerHistory.length > 0 && (
        <div className="p-4 border-t border-dark-700">
          <h4 className="text-sm font-medium text-white mb-3 flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>最近のトリガー</span>
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {triggerHistory.slice(-5).reverse().map((trigger, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {new Date(trigger.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-white">{trigger.triggerId}</span>
                <span className="text-orange-400">
                  {Math.round(trigger.intensity * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ヘルプ */}
      <div className="p-4 border-t border-dark-700">
        <div className="flex items-start space-x-2 text-xs text-gray-400">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="mb-1">
              周波数解析により音楽の特定の帯域（低音、高音など）に反応してエフェクトを自動発動します。
            </p>
            <p>
              感度を調整して、トリガーする閾値を変更できます。
              {isAnalyzing ? '解析中です。' : '「開始」ボタンを押して解析を始めてください。'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrequencyAnalyzer;