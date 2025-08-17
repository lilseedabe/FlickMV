const { HybridAIClient } = require('./groq/groqClient');
const prisma = require('../prisma/client');
const path = require('path');

class AudioAnalysisService {
  constructor() {
    this.aiClient = new HybridAIClient(
      process.env.GROQ_API_KEY,
      process.env.MOONSHOT_API_KEY
    );
  }

  /**
   * 音声ファイルの完全な解析（テキスト化 + プロンプト生成）
   * @param {string} mediaFileId - MediaFileのID
   * @param {Object} options - 解析オプション
   * @returns {Promise<Object>} - 解析結果
   */
  async analyzeAudioFile(mediaFileId, options = {}) {
    try {
      // MediaFileを取得
      const mediaFile = await prisma.mediaFile.findUnique({
        where: { id: mediaFileId }
      });

      if (!mediaFile || mediaFile.type !== 'audio') {
        throw new Error('音声ファイルが見つかりません');
      }

      // 解析状態を更新
      await this.updateAnalysisStatus(mediaFileId, 'processing', 10);

      // ファイルパスを構築
      const filePath = path.join(__dirname, '../uploads', mediaFile.ownerId.toString(), mediaFile.storage?.key || '');

      // 1. 音声をテキスト化
      await this.updateAnalysisStatus(mediaFileId, 'processing', 30);
      const transcription = await this.aiClient.transcribeAudio(filePath, 'ja');
      
      // 2. テキストからMVプロンプトを生成
      await this.updateAnalysisStatus(mediaFileId, 'processing', 70);
      const mvPrompts = await this.aiClient.generateMVPrompts(
        transcription.text,
        transcription.segments,
        options
      );

      // 3. 結果をデータベースに保存
      const analysisResult = {
        transcription: {
          text: transcription.text,
          segments: transcription.segments,
          language: transcription.language,
          duration: transcription.duration
        },
        mvPrompts: mvPrompts,
        generatedAt: new Date().toISOString(),
        options: options
      };

      await prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: {
          analysis: analysisResult,
          processing: {
            status: 'completed',
            progress: 100,
            completedAt: new Date()
          }
        }
      });

      await this.updateAnalysisStatus(mediaFileId, 'completed', 100);

      return {
        success: true,
        data: analysisResult
      };

    } catch (error) {
      console.error('Audio analysis error:', error);
      
      // エラー状態を更新
      await this.updateAnalysisStatus(mediaFileId, 'failed', 0, error.message);
      
      throw error;
    }
  }

  /**
   * 解析状態を更新
   */
  async updateAnalysisStatus(mediaFileId, status, progress, error = null) {
    try {
      await prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: {
          processing: {
            status,
            progress,
            ...(error && { error }),
            updatedAt: new Date()
          }
        }
      });
    } catch (updateError) {
      console.error('Failed to update analysis status:', updateError);
    }
  }

  /**
   * 既存の解析結果を取得
   */
  async getAnalysisResult(mediaFileId) {
    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: mediaFileId },
      select: {
        id: true,
        name: true,
        type: true,
        analysis: true,
        processing: true
      }
    });

    if (!mediaFile) {
      throw new Error('メディアファイルが見つかりません');
    }

    return {
      success: true,
      data: {
        mediaFile: mediaFile,
        hasAnalysis: !!mediaFile.analysis,
        analysisStatus: mediaFile.processing?.status || 'not_started'
      }
    };
  }

  /**
   * プロンプトを再生成（既存のテキストから）
   */
  async regeneratePrompts(mediaFileId, options = {}) {
    try {
      const mediaFile = await prisma.mediaFile.findUnique({
        where: { id: mediaFileId }
      });

      if (!mediaFile?.analysis?.transcription?.text) {
        throw new Error('テキスト化されていない音声ファイルです');
      }

      const transcription = mediaFile.analysis.transcription;
      
      // 新しいプロンプトを生成
      const mvPrompts = await this.aiClient.generateMVPrompts(
        transcription.text,
        transcription.segments,
        options
      );

      // 結果を更新
      const updatedAnalysis = {
        ...mediaFile.analysis,
        mvPrompts: mvPrompts,
        regeneratedAt: new Date().toISOString(),
        options: options
      };

      await prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: {
          analysis: updatedAnalysis
        }
      });

      return {
        success: true,
        data: {
          mvPrompts: mvPrompts,
          transcription: transcription
        }
      };

    } catch (error) {
      console.error('Prompt regeneration error:', error);
      throw error;
    }
  }

  /**
   * シーン別プロンプトを手動編集
   */
  async updateScenePrompts(mediaFileId, updatedScenes) {
    try {
      const mediaFile = await prisma.mediaFile.findUnique({
        where: { id: mediaFileId }
      });

      if (!mediaFile?.analysis) {
        throw new Error('解析結果がありません');
      }

      const updatedAnalysis = {
        ...mediaFile.analysis,
        mvPrompts: {
          ...mediaFile.analysis.mvPrompts,
          scenes: updatedScenes
        },
        lastEditedAt: new Date().toISOString()
      };

      await prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: {
          analysis: updatedAnalysis
        }
      });

      return {
        success: true,
        data: updatedAnalysis.mvPrompts
      };

    } catch (error) {
      console.error('Scene update error:', error);
      throw error;
    }
  }
}

module.exports = new AudioAnalysisService();
