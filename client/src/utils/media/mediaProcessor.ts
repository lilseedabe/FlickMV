import type { MediaFile, TimelineClip } from '@/types';

/**
 * メディアファイルのメタデータ抽出/生成ユーティリティ
 * シングルトンで利用します
 */
export class MediaProcessor {
  private static instance: MediaProcessor;

  public static getInstance(): MediaProcessor {
    if (!MediaProcessor.instance) {
      MediaProcessor.instance = new MediaProcessor();
    }
    return MediaProcessor.instance;
  }

  /**
   * メディアファイルからメタデータを抽出
   */
  async extractMediaMetadata(file: File): Promise<{
    width?: number;
    height?: number;
    duration?: number;
    format: string;
    size: number;
    mimeType: string;
    thumbnail?: string;
  }> {
    const url = URL.createObjectURL(file);
    const mimeType = file.type || '';
    const format = this.getFileFormat(file.name, mimeType);

    try {
      if (mimeType.startsWith('video/')) {
        return await this.extractVideoMetadata(url, file.size, format, mimeType);
      } else if (mimeType.startsWith('image/')) {
        return await this.extractImageMetadata(url, file.size, format, mimeType);
      } else if (mimeType.startsWith('audio/')) {
        return await this.extractAudioMetadata(url, file.size, format, mimeType);
      } else {
        throw new Error(`Unsupported media type: ${mimeType}`);
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * 動画メタデータの抽出（簡易）
   */
  private async extractVideoMetadata(
    url: string,
    size: number,
    format: string,
    mimeType: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = url;

      const onLoaded = () => {
        // サムネイル生成
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = 160;
        canvas.height = 90;

        const cleanup = () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          video.removeEventListener('error', onError);
        };

        try {
          // 中間フレームにシークしてから描画
          const capture = () => {
            try {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
              cleanup();
              resolve({
                width: video.videoWidth,
                height: video.videoHeight,
                duration: video.duration,
                format,
                size,
                mimeType,
                thumbnail
              });
            } catch {
              cleanup();
              resolve({
                width: video.videoWidth,
                height: video.videoHeight,
                duration: video.duration,
                format,
                size,
                mimeType
              });
            }
          };

          video.currentTime = Math.min(1, Math.max(0, video.duration / 2));
          video.onseeked = capture;
        } catch {
          cleanup();
          resolve({
            width: video.videoWidth,
            height: video.videoHeight,
            duration: video.duration,
            format,
            size,
            mimeType
          });
        }
      };

      const onError = () => {
        reject(new Error('Failed to load video metadata'));
      };

      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
    });
  }

  /**
   * 画像メタデータの抽出
   */
  private async extractImageMetadata(
    url: string,
    size: number,
    format: string,
    mimeType: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          format,
          size,
          mimeType,
          thumbnail: url // 画像自体をサムネイルとして利用
        });
      };
      img.onerror = () => reject(new Error('Failed to load image metadata'));
      img.src = url;
    });
  }

  /**
   * 音声メタデータの抽出
   */
  private async extractAudioMetadata(
    url: string,
    size: number,
    format: string,
    mimeType: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        resolve({
          duration: audio.duration,
          format,
          size,
          mimeType
        });
      };
      audio.onerror = () => reject(new Error('Failed to load audio metadata'));
      audio.src = url;
    });
  }

  /**
   * ファイル形式を特定
   */
  private getFileFormat(filename: string, mimeType: string): string {
    // ファイル名から拡張子を取得
    const extension = filename.split('.').pop()?.toLowerCase();

    if (extension) {
      return extension;
    }

    // MIMEタイプから推測
    const mimeToFormat: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/ogg': 'ogv',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/aac': 'aac',
      'audio/mp4': 'm4a'
    };

    return mimeToFormat[mimeType] || 'unknown';
  }

  /**
   * MediaFile を作成（原始 File も保持）
   */
  async createMediaFile(file: File): Promise<MediaFile> {
    const metadata = await this.extractMediaMetadata(file);
    const url = URL.createObjectURL(file); // 呼び出し側で適切に revoke してください
    const type = this.getMediaType(metadata.mimeType);

    return {
      id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      name: file.name,
      type,
      url,
      thumbnail: metadata.thumbnail,
      size: metadata.size,
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
      format: metadata.format,
      uploadedAt: new Date(),
      originalFile: file,
      metadata: {
        mimeType: metadata.mimeType,
        originalName: file.name,
        lastModified: new Date(file.lastModified)
      }
    };
  }

  /**
   * メディアタイプを判定
   */
  private getMediaType(mimeType: string): 'video' | 'image' | 'audio' {
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    throw new Error(`Unsupported media type: ${mimeType}`);
    }

  /**
   * ファイルサイズの整形
   */
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * 時間の整形
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * 解像度の整形
   */
  formatResolution(width?: number, height?: number): string {
    if (!width || !height) return 'Unknown';

    const resolutionNames: Record<string, string> = {
      '1920x1080': 'Full HD (1080p)',
      '1280x720': 'HD (720p)',
      '3840x2160': '4K UHD',
      '2560x1440': 'QHD (1440p)',
      '1080x1920': 'Vertical HD',
      '720x1280': 'Vertical 720p',
      '1080x1080': 'Square HD'
    };

    const key = `${width}x${height}`;
    return resolutionNames[key] || `${width} x ${height}`;
  }

  /**
   * メディアファイルの検証
   */
  validateMediaFile(file: File): {
    isValid: boolean;
    error?: string;
    warnings?: string[];
  } {
    const warnings: string[] = [];

    // ファイルサイズチェック (100MB 制限)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `ファイルサイズが制限を超えています (最大: ${this.formatFileSize(maxSize)})`
      };
    }

    // ファイルサイズ警告 (50MB 超)
    if (file.size > 50 * 1024 * 1024) {
      warnings.push('大きなファイルです。処理に時間がかかる場合があります。');
    }

    // 対応形式チェック
    const supportedTypes = [
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp4'
    ];

    if (!supportedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `対応していないファイル形式です: ${file.type || 'unknown'}`
      };
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * TimelineClip を作成
   */
  createTimelineClip(
    mediaFile: MediaFile,
    startTime: number = 0,
    layer: number = 0
  ): TimelineClip {
    const duration = mediaFile.duration ?? (mediaFile.type === 'image' ? 5 : 10);
    return {
      id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      mediaId: mediaFile.id,
      startTime,
      duration,
      trimStart: 0,
      trimEnd: duration,
      layer,
      effects: mediaFile.type === 'image'
        ? [
            {
              id: `effect_${Date.now()}`,
              type: 'pan_zoom',
              parameters: { zoom: 1.1, panX: 0, panY: 0 },
              enabled: true
            }
          ]
        : undefined
    };
  }

  /**
   * リソースの解放
   */
  cleanupMediaFile(mediaFile: MediaFile): void {
    if (mediaFile.url && mediaFile.url.startsWith('blob:')) {
      URL.revokeObjectURL(mediaFile.url);
    }
    if (mediaFile.thumbnail && mediaFile.thumbnail.startsWith('blob:')) {
      URL.revokeObjectURL(mediaFile.thumbnail);
    }
  }
}

// シングルトンインスタンスをエクスポート
export const mediaProcessor = MediaProcessor.getInstance();

// ヘルパー関数をエクスポート
export async function processMediaFile(file: File): Promise<MediaFile> {
  return mediaProcessor.createMediaFile(file);
}

export function validateFile(file: File) {
  return mediaProcessor.validateMediaFile(file);
}

export function createClipFromMedia(
  mediaFile: MediaFile,
  startTime?: number,
  layer?: number
): TimelineClip {
  return mediaProcessor.createTimelineClip(mediaFile, startTime, layer);
}
