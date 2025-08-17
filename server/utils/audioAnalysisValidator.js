/**
 * Audio Analysis Validator
 * 音声解析リクエストのバリデーション
 */

class AudioAnalysisValidator {
  /**
   * 音声ファイルの形式チェック
   * @param {{ mimetype: string, size: number }} file
   * @returns {{ isValid: boolean, errors: Array<any> }}
   */
  static validateAudioFile(file) {
    const errors = [];

    // ファイル形式チェック
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
      'audio/m4a',
      'audio/aac',
      'audio/ogg'
    ];

    if (!file || typeof file !== 'object') {
      errors.push({
        field: 'file',
        message: 'ファイルが指定されていません'
      });
      return { isValid: false, errors };
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push({
        field: 'fileType',
        message: `サポートされていないファイル形式です: ${file.mimetype}`,
        supportedFormats: ['MP3', 'WAV', 'M4A', 'AAC', 'OGG']
      });
    }

    // ファイルサイズチェック (50MB制限)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (typeof file.size === 'number' && file.size > maxSize) {
      errors.push({
        field: 'fileSize',
        message: `ファイルサイズが大きすぎます: ${Math.round(file.size / 1024 / 1024)}MB`,
        maxSize: '50MB'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 解析オプションのバリデーション
   * @param {{ genre?: string, mood?: string, style?: string }} options
   * @returns {{ isValid: boolean, errors: Array<any> }}
   */
  static validateAnalysisOptions(options = {}) {
    const errors = [];

    const validGenres = [
      'ポップス', 'ロック', 'バラード', 'ヒップホップ',
      'エレクトロニック', 'ジャズ', 'クラシック', ''
    ];

    const validMoods = [
      '明るい', '感動的', '力強い', '穏やか',
      'ドラマチック', 'ノスタルジック', ''
    ];

    const validStyles = [
      'モダン', 'シネマティック', 'アニメ風',
      'リアリスティック', 'アート', 'レトロ'
    ];

    if (options.genre && !validGenres.includes(options.genre)) {
      errors.push({
        field: 'genre',
        message: '無効な音楽ジャンルです',
        validValues: validGenres.filter((g) => g !== '')
      });
    }

    if (options.mood && !validMoods.includes(options.mood)) {
      errors.push({
        field: 'mood',
        message: '無効な雰囲気設定です',
        validValues: validMoods.filter((m) => m !== '')
      });
    }

    if (options.style && !validStyles.includes(options.style)) {
      errors.push({
        field: 'style',
        message: '無効な映像スタイルです',
        validValues: validStyles
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * ユーザーの利用制限チェック（簡易）
   * 実際の実装ではプランや利用履歴と照合する
   * @param {string} userId
   * @param {string} action
   * @returns {Promise<{ isValid: boolean, errors: Array<any> }>}
   */
  static async validateUserLimits(userId, action = 'audio-analyze') {
    const errors = [];

    if (!userId) {
      errors.push({
        field: 'userId',
        message: 'ユーザーIDが指定されていません'
      });
    }

    // TODO: 実際のレート制限/プランチェックに置き換え
    // 例:
    // const user = await getUserById(userId);
    // if (user.plan === 'free' && action === 'audio-analyze') {
    //   errors.push({
    //     field: 'plan',
    //     message: '音声解析機能はプロプラン以上で利用できます',
    //     upgradeRequired: true
    //   });
    // }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * シーン編集データのバリデーション
   * @param {Array<any>} scenes
   * @returns {{ isValid: boolean, errors: Array<any> }}
   */
  static validateSceneData(scenes) {
    const errors = [];

    if (!Array.isArray(scenes)) {
      errors.push({
        field: 'scenes',
        message: 'シーンデータは配列である必要があります'
      });
      return { isValid: false, errors };
    }

    scenes.forEach((scene, index) => {
      // 必須フィールドチェック
      const requiredFields = ['startTime', 'endTime', 'visualPrompt'];
      requiredFields.forEach((field) => {
        if (scene[field] === undefined || scene[field] === null) {
          errors.push({
            field: `scenes[${index}].${field}`,
            message: `${field}は必須項目です`
          });
        }
      });

      // タイムスタンプの妥当性チェック
      if (typeof scene.startTime === 'number' && typeof scene.endTime === 'number') {
        if (scene.startTime >= scene.endTime) {
          errors.push({
            field: `scenes[${index}].time`,
            message: '開始時間は終了時間より前である必要があります'
          });
        }

        if (scene.startTime < 0 || scene.endTime < 0) {
          errors.push({
            field: `scenes[${index}].time`,
            message: '時間は0以上である必要があります'
          });
        }
      }

      // プロンプトの長さチェック
      if (scene.visualPrompt && scene.visualPrompt.length > 1000) {
        errors.push({
          field: `scenes[${index}].visualPrompt`,
          message: '映像プロンプトは1000文字以内で入力してください'
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = AudioAnalysisValidator;