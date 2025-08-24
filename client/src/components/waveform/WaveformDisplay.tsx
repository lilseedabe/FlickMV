import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { AudioTrack } from '@/types';

interface WaveformDisplayProps {
  audioTrack: AudioTrack;
  width: number;
  height: number;
  startTime: number;
  duration: number;
  zoom: number;
  color?: string;
  onWaveformClick?: (time: number) => void;
  showBeats?: boolean;
  className?: string;
}

interface WaveformData {
  peaks: Float32Array;
  length: number;
  sampleRate: number;
}

const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  audioTrack,
  width,
  height,
  startTime,
  duration,
  zoom,
  color = '#3b82f6',
  onWaveformClick,
  showBeats = true,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 波形データを生成 - 改良版（キャッシュ付き）
  const generateWaveformData = useCallback(async (audioUrl: string): Promise<WaveformData | null> => {
    // 既に波形データがある場合はスキップ
    if (waveformData) {
      return waveformData;
    }
    
    try {
      setIsLoading(true);
      setError(null);

      let arrayBuffer: ArrayBuffer;
      
      // AudioTrackにoriginalFileがあるかチェック
      if (audioTrack.originalFile) {
        try {
          arrayBuffer = await audioTrack.originalFile.arrayBuffer();
        } catch (fileError) {
          console.warn('Original file processing failed, falling back to URL', fileError);
          // フォールバック: URLを使用
          const response = await fetch(audioUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          arrayBuffer = await response.arrayBuffer();
        }
      } else {
        // フォールバック: URLを使用
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        arrayBuffer = await response.arrayBuffer();
      }
      
      // AudioContextで音声データをデコード
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // ピークデータを抽出（ダウンサンプリング）
      const rawData = audioBuffer.getChannelData(0); // モノラルまたは左チャンネル
      const blockSize = Math.floor(rawData.length / (width * 2)); // 1ピクセルあたりのサンプル数
      const peaks = new Float32Array(width * 2);
      
      for (let i = 0; i < width * 2; i++) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, rawData.length);
        
        let min = 0;
        let max = 0;
        
        for (let j = start; j < end; j++) {
          const sample = rawData[j];
          if (sample > max) max = sample;
          if (sample < min) min = sample;
        }
        
        peaks[i] = i % 2 === 0 ? max : min;
      }
      
      const result = {
        peaks,
        length: audioBuffer.length,
        sampleRate: audioBuffer.sampleRate
      };
      
      // AudioContextをクローズ
      audioContext.close();
      
      return result;
    } catch (err) {
      console.error('波形データ生成エラー:', err);
      setError('波形の読み込みに失敗しました');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [width, audioTrack, waveformData]);

  // 音声ファイルが変更された時に波形データを生成（最適化版）
  useEffect(() => {
    let isMounted = true;
    
    const loadWaveformData = async () => {
      if (audioTrack.url && !waveformData) {
        console.log('📁 波形生成: 原始Fileオブジェクトを使用');
        try {
          const data = await generateWaveformData(audioTrack.url);
          if (isMounted) {
            setWaveformData(data);
          }
        } catch (error) {
          console.error('Waveform data loading failed:', error);
          if (isMounted) {
            setError('波形データの読み込みに失敗しました');
          }
        }
      }
    };
    
    loadWaveformData();
    
    return () => {
      isMounted = false;
    };
  }, [audioTrack.url, audioTrack.id, generateWaveformData]);

  // 波形を描画
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスをクリア
    ctx.clearRect(0, 0, width, height);
    
    // 背景を描画
    ctx.fillStyle = 'rgba(15, 23, 42, 0.3)'; // dark-900 with opacity
    ctx.fillRect(0, 0, width, height);
    
    // 中央線を描画
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)'; // slate-400 with opacity
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // 波形を描画
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    const centerY = height / 2;
    const scale = (height / 2) * 0.9; // 90%の高さを使用

    for (let i = 0; i < width * 2; i += 2) {
      const x = i / 2;
      const maxPeak = waveformData.peaks[i] * scale;
      const minPeak = waveformData.peaks[i + 1] * scale;
      
      // 正の波形（上半分）
      if (maxPeak > 0) {
        ctx.fillRect(x, centerY - maxPeak, 1, maxPeak);
      }
      
      // 負の波形（下半分）
      if (minPeak < 0) {
        ctx.fillRect(x, centerY, 1, Math.abs(minPeak));
      }
    }

    // ビートマーカーを描画
    if (showBeats && audioTrack.beats && audioTrack.beats.length > 0) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)'; // amber-400 with opacity
      ctx.lineWidth = 1;
      
      audioTrack.beats.forEach(beatTime => {
        // ビート時間がこの表示範囲内にあるかチェック
        if (beatTime >= startTime && beatTime <= startTime + duration) {
          const x = ((beatTime - startTime) / duration) * width;
          
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      });
    }

    // BPMマーカーを描画（4/4拍子想定）
    if (audioTrack.bpm && audioTrack.bpm > 0) {
      const beatsPerSecond = audioTrack.bpm / 60;
      const beatInterval = 1 / beatsPerSecond;
      
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; // red-500 with opacity
      ctx.lineWidth = 2;
      
      // 小節線（4拍子ごと）
      for (let i = 0; i * beatInterval * 4 < duration; i++) {
        const measureTime = startTime + (i * beatInterval * 4);
        if (measureTime >= startTime && measureTime <= startTime + duration) {
          const x = ((measureTime - startTime) / duration) * width;
          
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }
    }

    // 現在時間のインジケーター（オプション）
    // これは親コンポーネントから渡される場合に描画される
  }, [waveformData, width, height, color, showBeats, audioTrack.beats, audioTrack.bpm, startTime, duration]);

  // 波形データまたはサイズが変更された時に再描画
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // クリックハンドラー
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onWaveformClick) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = startTime + (x / width) * duration;
    
    onWaveformClick(clickTime);
  }, [onWaveformClick, startTime, duration, width]);

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-red-500/10 border border-red-500/30 ${className}`}
        style={{ width, height }}
      >
        <span className="text-xs text-red-400">{error}</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-dark-800/50"
          style={{ width, height }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
          />
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleClick}
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          display: 'block'
        }}
      />
      
      {/* BPM情報の表示 */}
      {audioTrack.bpm && (
        <div className="absolute top-1 right-1 bg-dark-900/80 text-xs text-amber-400 px-2 py-1 rounded">
          {audioTrack.bpm} BPM
        </div>
      )}
      
      {/* 音声情報のツールチップ */}
      <div className="absolute bottom-1 left-1 bg-dark-900/80 text-xs text-slate-400 px-2 py-1 rounded">
        {audioTrack.name || 'Audio Track'}
      </div>
    </div>
  );
};

export default WaveformDisplay;
