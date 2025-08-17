import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Edit, Save, X } from 'lucide-react';
import apiService from '../../services/apiService';

interface AudioAnalysisProps {
  mediaFile: {
    id: string;
    name: string;
    type: string;
    url: string;
    analysis?: any;
    processing?: {
      status: string;
      progress: number;
    };
  };
  onClose: () => void;
}

interface Scene {
  startTime: number;
  endTime: number;
  lyrics: string;
  visualPrompt: string;
  mood: string;
  colors: string[];
  keywords: string[];
}

interface AnalysisOptions {
  genre: string;
  mood: string;
  style: string;
}

const AudioAnalysis: React.FC<AudioAnalysisProps> = ({ mediaFile, onClose }) => {
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [editingScene, setEditingScene] = useState<number | null>(null);
  const [editedScenes, setEditedScenes] = useState<Scene[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const [options, setOptions] = useState<AnalysisOptions>({
    genre: '',
    mood: '',
    style: 'モダン'
  });

  // 音声要素の初期化
  useEffect(() => {
    const audio = new Audio(mediaFile.url);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    setAudioElement(audio);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
    };
  }, [mediaFile.url]);

  // 既存の解析結果をロード
  useEffect(() => {
    loadAnalysisData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaFile.id]);

  const loadAnalysisData = async () => {
    try {
      const response = await apiService.getAudioAnalysis(mediaFile.id);
      if (response.success && response.data.hasAnalysis) {
        setAnalysisData(response.data.mediaFile.analysis);
        setEditedScenes(response.data.mediaFile.analysis.mvPrompts.scenes || []);
      }
    } catch (err) {
      console.error('Failed to load analysis data:', err);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // 解析開始
      // 存在しない場合はサーバ側のAPIに合わせてapiService側の実装が必要
      // @ts-ignore
      await apiService.analyzeAudio(mediaFile.id, options);

      // ポーリングで進捗を監視
      const pollProgress = setInterval(async () => {
        try {
          const response = await apiService.getAudioAnalysis(mediaFile.id);
          const status = response.data.analysisStatus;
          const fileData = response.data.mediaFile;

          if (fileData?.processing?.progress != null) {
            setProgress(fileData.processing.progress);
          }

          if (status === 'completed') {
            clearInterval(pollProgress);
            setAnalysisData(fileData.analysis);
            setEditedScenes(fileData.analysis.mvPrompts.scenes || []);
            setLoading(false);
          } else if (status === 'failed') {
            clearInterval(pollProgress);
            setError('解析に失敗しました');
            setLoading(false);
          }
        } catch (err) {
          console.error('Failed to poll progress:', err);
        }
      }, 2000);

      // 5分でタイムアウト
      setTimeout(() => {
        clearInterval(pollProgress);
        if (loading) {
          setLoading(false);
          setError('解析がタイムアウトしました');
        }
      }, 300000);
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || '解析に失敗しました');
    }
  };

  const handleRegeneratePrompts = async () => {
    setLoading(true);
    setError(null);

    try {
      // @ts-ignore
      const response = await apiService.regeneratePrompts(mediaFile.id, options);
      if (response.success) {
        setAnalysisData((prev: any) => ({
          ...prev,
          mvPrompts: response.data.mvPrompts
        }));
        setEditedScenes(response.data.mvPrompts.scenes || []);
      }
    } catch (err: any) {
      setError(err?.message || 'プロンプト再生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScenes = async () => {
    try {
      // @ts-ignore
      await apiService.updateScenePrompts(mediaFile.id, editedScenes);
      setEditingScene(null);
      // TODO: 成功メッセージ表示
    } catch (err: any) {
      setError(err?.message || 'シーンの保存に失敗しました');
    }
  };

  const handlePlayPause = () => {
    if (!audioElement) return;

    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeekToScene = (startTime: number) => {
    if (audioElement) {
      audioElement.currentTime = startTime;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateScenePrompt = (index: number, field: keyof Scene, value: string) => {
    const updated = [...editedScenes];
    updated[index] = { ...updated[index], [field]: value } as Scene;
    setEditedScenes(updated);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">音声解析・MV プロンプト生成</h2>
            <p className="text-gray-600">{mediaFile.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* 音声プレイヤー */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={handlePlayPause}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? '一時停止' : '再生'}</span>
              </button>
              <span className="text-sm text-gray-600">{formatTime(currentTime)}</span>
            </div>

            {/* 音声進行バー */}
            {audioElement && (
              <div className="relative w-full h-2 bg-gray-200 rounded-full">
                <div
                  className="absolute top-0 left-0 h-full bg-blue-600 rounded-full"
                  style={{
                    width: `${audioElement.duration ? (currentTime / audioElement.duration) * 100 : 0}%`
                  }}
                />
              </div>
            )}
          </div>

          {/* 解析オプション */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">解析オプション</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">音楽ジャンル</label>
                <select
                  value={options.genre}
                  onChange={(e) => setOptions({ ...options, genre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">自動判定</option>
                  <option value="ポップス">ポップス</option>
                  <option value="ロック">ロック</option>
                  <option value="バラード">バラード</option>
                  <option value="ヒップホップ">ヒップホップ</option>
                  <option value="エレクトロニック">エレクトロニック</option>
                  <option value="ジャズ">ジャズ</option>
                  <option value="クラシック">クラシック</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">雰囲気</label>
                <select
                  value={options.mood}
                  onChange={(e) => setOptions({ ...options, mood: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">自動判定</option>
                  <option value="明るい">明るい</option>
                  <option value="感動的">感動的</option>
                  <option value="力強い">力強い</option>
                  <option value="穏やか">穏やか</option>
                  <option value="ドラマチック">ドラマチック</option>
                  <option value="ノスタルジック">ノスタルジック</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">映像スタイル</label>
                <select
                  value={options.style}
                  onChange={(e) => setOptions({ ...options, style: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="モダン">モダン</option>
                  <option value="シネマティック">シネマティック</option>
                  <option value="アニメ風">アニメ風</option>
                  <option value="リアリスティック">リアリスティック</option>
                  <option value="アート">アート</option>
                  <option value="レトロ">レトロ</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex space-x-4">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '解析中...' : '音声解析開始'}
              </button>

              {analysisData && (
                <button
                  onClick={handleRegeneratePrompts}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>プロンプト再生成</span>
                </button>
              )}
            </div>
          </div>

          {/* 進捗表示 */}
          {loading && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">解析進捗</span>
                <span className="text-sm text-gray-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* 解析結果 */}
          {analysisData && (
            <div className="space-y-6">
              {/* テキスト化結果 */}
              <div>
                <h3 className="text-lg font-medium mb-4">音声テキスト化結果</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {analysisData.transcription?.text}
                  </p>
                </div>
              </div>

              {/* 全体テーマ */}
              <div>
                <h3 className="text-lg font-medium mb-4">全体テーマ</h3>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800">{analysisData.mvPrompts?.overallTheme}</p>
                </div>
              </div>

              {/* シーン別プロンプト */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">シーン別 MV プロンプト</h3>
                  <button
                    onClick={handleSaveScenes}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>変更を保存</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {editedScenes.map((scene, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-medium text-gray-600">
                            {formatTime(scene.startTime)} - {formatTime(scene.endTime)}
                          </span>
                          <button
                            onClick={() => handleSeekToScene(scene.startTime)}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            再生
                          </button>
                        </div>
                        <button
                          onClick={() => setEditingScene(editingScene === index ? null : index)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">歌詞</label>
                          <p className="text-sm bg-gray-50 p-2 rounded italic">"{scene.lyrics}"</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            映像プロンプト
                          </label>
                          {editingScene === index ? (
                            <textarea
                              value={scene.visualPrompt}
                              onChange={(e) => updateScenePrompt(index, 'visualPrompt', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={3}
                            />
                          ) : (
                            <p className="text-sm p-2 bg-white border rounded">{scene.visualPrompt}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                            {scene.mood}
                          </span>
                          {scene.colors?.map((color, colorIndex) => (
                            <span
                              key={colorIndex}
                              className="text-xs px-2 py-1 rounded text-white"
                              style={{ backgroundColor: color }}
                            >
                              {color}
                            </span>
                          ))}
                          {scene.keywords?.map((keyword, keywordIndex) => (
                            <span
                              key={keywordIndex}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 提案事項 */}
              {analysisData.mvPrompts?.suggestions && (
                <div>
                  <h3 className="text-lg font-medium mb-4">制作提案</h3>
                  <div className="space-y-3">
                    {analysisData.mvPrompts.suggestions.map((suggestion: any, index: number) => (
                      <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="font-medium text-yellow-800 mb-1">{suggestion.type}</div>
                        <p className="text-sm text-yellow-700">{suggestion.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioAnalysis;