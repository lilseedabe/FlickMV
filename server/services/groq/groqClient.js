const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class GroqClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.groq.com/openai/v1';
  }

  /**
   * 音声ファイルをテキストに変換（Whisper-large-v3使用）
   * @param {string} audioFilePath - 音声ファイルのパス
   * @param {string} language - 言語コード（デフォルト: 'ja'）
   * @returns {Promise<{text: string, segments: Array}>} - 変換されたテキストと詳細セグメント
   */
  async transcribeAudio(audioFilePath, language = 'ja') {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioFilePath));
      formData.append('model', 'whisper-large-v3');
      formData.append('language', language);
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'segment');

      const response = await axios.post(`${this.baseURL}/audio/transcriptions`, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      return {
        text: response.data.text,
        segments: response.data.segments || [],
        language: response.data.language,
        duration: response.data.duration
      };
    } catch (error) {
      console.error('Groq transcription error:', error.response?.data || error.message);
      throw new Error(`音声テキスト化に失敗しました: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

class MoonshotAIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.moonshot.cn/v1';
  }

  /**
   * テキストからMV生成プロンプトを作成（Kimi-K2-Instruct使用）
   * @param {string} lyrics - 歌詞テキスト
   * @param {Array} segments - 音声セグメント（タイムスタンプ付き）
   * @param {Object} options - 追加オプション
   * @returns {Promise<{scenes: Array, overallTheme: string, suggestions: Array}>}
   */
  async generateMVPrompts(lyrics, segments = [], options = {}) {
    try {
      const { genre = '不明', mood = '自動判定', style = 'モダン' } = options;
      
      const prompt = `あなたは音楽ビデオの制作プロデューサーです。以下の歌詞を分析して、魅力的なミュージックビデオのシーン別プロンプトを提案してください。

歌詞:
"""
${lyrics}
"""

${segments.length > 0 ? `
セグメント情報:
${segments.map(seg => `${seg.start}s-${seg.end}s: "${seg.text}"`).join('\n')}
` : ''}

音楽ジャンル: ${genre}
雰囲気: ${mood}
映像スタイル: ${style}

以下の形式でJSON形式で回答してください:

{
  "overallTheme": "全体のテーマとコンセプト",
  "scenes": [
    {
      "startTime": 0,
      "endTime": 15,
      "lyrics": "該当する歌詞部分",
      "visualPrompt": "この部分の映像生成プロンプト（詳細で具体的に）",
      "mood": "シーンの雰囲気",
      "colors": ["主要な色1", "主要な色2"],
      "keywords": ["キーワード1", "キーワード2", "キーワード3"]
    }
  ],
  "suggestions": [
    {
      "type": "カメラワーク" | "エフェクト" | "トランジション" | "全体構成",
      "description": "具体的な提案内容"
    }
  ]
}

重要な指示:
1. 歌詞の感情や内容に合った映像を提案する
2. 各シーンは10-30秒程度に区切る
3. 映像プロンプトは画像生成AIで使えるよう具体的で詳細に
4. 日本語で自然な表現を使う
5. 実現可能で魅力的なアイデアを提案する
6. JSONフォーマットを厳密に守る`;

      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: 'moonshot-v1-8k',
        messages: [
          {
            role: 'system',
            content: 'あなたは経験豊富な音楽ビデオ制作のプロデューサーです。創造的で実現可能なアイデアを提案してください。必ずJSON形式で回答してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const result = response.data.choices[0]?.message?.content;
      
      try {
        // JSONを抽出
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('JSONレスポンスが見つかりません');
        }
        
        const parsedResult = JSON.parse(jsonMatch[0]);
        
        // セグメント情報があれば、より正確なタイムスタンプを設定
        if (segments.length > 0) {
          parsedResult.scenes = parsedResult.scenes.map((scene, index) => {
            const segment = segments[index];
            if (segment) {
              return {
                ...scene,
                startTime: segment.start,
                endTime: segment.end,
                lyrics: segment.text
              };
            }
            return scene;
          });
        }
        
        return parsedResult;
      } catch (parseError) {
        console.error('MoonshotAI プロンプト解析エラー:', parseError);
        console.log('Raw response:', result);
        // フォールバック: シンプルなプロンプト生成
        return this.generateFallbackPrompts(lyrics, segments);
      }
    } catch (error) {
      console.error('MoonshotAI prompt generation error:', error.response?.data || error.message);
      
      // Groqでフォールバック（利用可能な場合）
      if (process.env.GROQ_API_KEY) {
        console.log('MoonshotAI failed, trying Groq fallback...');
        return this.generateGroqFallback(lyrics, segments, options);
      }
      
      // 最終フォールバック
      return this.generateFallbackPrompts(lyrics, segments);
    }
  }

  /**
   * Groqでのフォールバック処理
   */
  async generateGroqFallback(lyrics, segments, options) {
    try {
      const { genre = '不明', mood = '自動判定', style = 'モダン' } = options;
      
      const prompt = `Create MV scene prompts for these lyrics:
${lyrics}

Genre: ${genre}
Mood: ${mood}
Style: ${style}

Return JSON with scenes array containing startTime, endTime, lyrics, visualPrompt, mood, colors, keywords.`;

      const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a creative music video producer. Generate detailed scene prompts in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const result = response.data.choices[0]?.message?.content;
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Groq fallback failed');
    } catch (error) {
      console.error('Groq fallback error:', error);
      return this.generateFallbackPrompts(lyrics, segments);
    }
  }

  /**
   * フォールバック用のシンプルなプロンプト生成
   */
  generateFallbackPrompts(lyrics, segments = []) {
    const scenes = [];
    const lines = lyrics.split('\n').filter(line => line.trim());
    const timePerLine = segments.length > 0 ? 
      (segments[segments.length - 1]?.end || 30) / lines.length : 
      30 / lines.length;

    lines.forEach((line, index) => {
      const startTime = index * timePerLine;
      const endTime = (index + 1) * timePerLine;
      
      scenes.push({
        startTime: Math.round(startTime * 10) / 10,
        endTime: Math.round(endTime * 10) / 10,
        lyrics: line.trim(),
        visualPrompt: `"${line.trim()}"の歌詞に合わせた美しい映像。感情豊かで印象的なシーン。`,
        mood: '感情的',
        colors: ['#FF6B6B', '#4ECDC4'],
        keywords: ['音楽', '感情', '美しい']
      });
    });

    return {
      overallTheme: '歌詞の内容に基づいた感情豊かなミュージックビデオ',
      scenes,
      suggestions: [
        {
          type: 'カメラワーク',
          description: '歌詞の感情に合わせて緩やかなカメラムーブメントを使用'
        },
        {
          type: 'エフェクト',
          description: '歌詞のリズムに合わせたトランジション効果'
        }
      ]
    };
  }
}

// 複合クライアント：GroqとMoonshotAIを組み合わせ
class HybridAIClient {
  constructor(groqApiKey, moonshotApiKey) {
    this.groqClient = new GroqClient(groqApiKey);
    this.moonshotClient = new MoonshotAIClient(moonshotApiKey);
  }

  /**
   * 音声をテキスト化（Groq Whisper使用）
   */
  async transcribeAudio(audioFilePath, language = 'ja') {
    return this.groqClient.transcribeAudio(audioFilePath, language);
  }

  /**
   * プロンプト生成（MoonshotAI Kimi使用、フォールバックあり）
   */
  async generateMVPrompts(lyrics, segments = [], options = {}) {
    return this.moonshotClient.generateMVPrompts(lyrics, segments, options);
  }
}

module.exports = { GroqClient, MoonshotAIClient, HybridAIClient };
