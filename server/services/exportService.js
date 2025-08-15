// ExportService (pg-boss + Prisma + Watermark Support)
// - VPS 側では重処理は行わず、pg-boss にジョブIDを publish
// - 実際のエンコード処理はオンデマンド Docker ワーカーが取得・処理
// - キューメトリクスやジョブ状態は Prisma (Supabase Postgres) から集計
// - プラン制限とFlickMV透かしを自動適用
//
// 必要な環境変数:
//   DATABASE_URL=postgres://...       # Supabase/Postgres
//   PGBOSS_SCHEMA=pgboss              # 任意: pg-boss 用スキーマ
//   EXPORT_QUEUE_NAME=video-export    # 任意: キュー名
//
// 実装メモ:
// - queueExport(jobId): pg-bossに publish。processing.bossJobId を保存（ベストエフォート）
// - cancelJob(jobId): pg-bossのキャンセルを試行（publish済み待機ジョブ向け）。実ジョブ側の停止はワーカー側の実装依存。
// - getQueueStats(): ExportJob テーブル集計
// - deleteOutputFiles(jobId): 出力とサムネイルのローカル削除（R2利用時は通常不要だがローカル運用の互換用）

const path = require('path');
const fs = require('fs').promises;
const PgBoss = require('pg-boss');
const prisma = require('../prisma/client');
const WatermarkService = require('./watermarkService');

class ExportService {
  constructor() {
    this.boss = null;
    this.queueName = process.env.EXPORT_QUEUE_NAME || 'video-export';
    this._starting = null;
  }

  async ensureBoss() {
    if (this.boss) return this.boss;
    if (this._starting) return this._starting;

    const connectionString =
      process.env.DATABASE_URL ||
      process.env.SUPABASE_DB_URL ||
      process.env.SUPABASE_POSTGRES_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL (Postgres) is required for pg-boss.');
    }

    const options = {
      connectionString,
      schema: process.env.PGBOSS_SCHEMA || undefined
    };

    this.boss = new PgBoss(options);
    this._starting = this.boss.start().then(() => this.boss).catch((err) => {
      this.boss = null;
      throw err;
    });

    return this._starting;
  }

  /**
   * Publish export job to pg-boss with watermark validation
   * @param {string} exportJobId - UUID of ExportJob
   */
  async queueExport(exportJobId) {
    // Get export job with user information
    const exportJob = await prisma.exportJob.findUnique({
      where: { id: exportJobId },
      include: {
        user: {
          select: { 
            id: true, 
            plan: true,
            subscription: true 
          }
        }
      }
    });

    if (!exportJob) {
      throw new Error(`Export job not found: ${exportJobId}`);
    }

    // Check export limits based on user plan
    const exportLimit = await WatermarkService.checkExportLimit(
      exportJob.userId, 
      exportJob.user?.plan || 'free'
    );

    if (!exportLimit.canExport) {
      throw new Error(`Export limit exceeded. Remaining: ${exportLimit.remaining}/${exportLimit.limit}`);
    }

    // Apply watermark settings based on user plan
    const updatedExportJob = WatermarkService.applyWatermarkToExport(
      exportJob, 
      exportJob.user?.plan || 'free'
    );

    // Update export job with watermark settings
    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: {
        watermarkSettings: updatedExportJob.watermarkSettings,
        metadata: updatedExportJob.metadata
      }
    });

    const boss = await this.ensureBoss();

    const jobId = await boss.publish(
      this.queueName,
      { exportJobId },
      {
        singletonKey: exportJobId,
        priority: this.getJobPriority(exportJob.user?.plan || 'free'),
        retryLimit: 3,
        retryDelay: 10_000
      }
    );

    // processing.bossJobId を保存（JSONフィールドに追記）
    try {
      const current = await prisma.exportJob.findUnique({
        where: { id: exportJobId },
        select: { processing: true, status: true, progress: true }
      });

      const processing = { 
        ...(current?.processing || {}), 
        bossJobId: jobId,
        queuedAt: new Date().toISOString(),
        watermarkApplied: updatedExportJob.watermarkSettings.enabled
      };

      // ジョブを queued にして進行度0に（安全側）
      await prisma.exportJob.update({
        where: { id: exportJobId },
        data: {
          status: 'queued',
          progress: 0,
          processing
        }
      });
    } catch (e) {
      // ベストエフォートのため失敗は致命ではない
      console.warn(`Failed to persist bossJobId for ${exportJobId}: ${e.message}`);
    }

    console.log(`Queued export job on pg-boss: jobId=${jobId} exportJob=${exportJobId} watermark=${updatedExportJob.watermarkSettings.enabled}`);
  }

  /**
   * Get job priority based on user plan
   * @param {string} userPlan 
   * @returns {number}
   */
  getJobPriority(userPlan) {
    switch (userPlan) {
      case 'premium': return 90;
      case 'pro': return 70;
      case 'basic': return 50;
      case 'free': return 30;
      default: return 30;
    }
  }

  /**
   * Cancel export job (best-effort on pg-boss queue)
   * @param {string} exportJobId - UUID of ExportJob
   */
  async cancelJob(exportJobId) {
    try {
      const boss = await this.ensureBoss();

      const row = await prisma.exportJob.findUnique({
        where: { id: exportJobId },
        select: { processing: true }
      });

      const bossJobId = row?.processing?.bossJobId;
      if (bossJobId) {
        try {
          await boss.cancel(bossJobId);
          console.log(`Cancelled pg-boss job: ${bossJobId}`);
        } catch (e) {
          console.warn(`pg-boss cancel failed (ignored): ${e.message}`);
        }
      }

      // Update status in database
      await prisma.exportJob.update({
        where: { id: exportJobId },
        data: {
          status: 'cancelled',
          updatedAt: new Date()
        }
      });
    } catch (err) {
      console.warn(`cancelJob failed: ${err.message}`);
    }

    console.log(`Export job cancelled (app-level): ${exportJobId}`);
  }

  /**
   * Queue statistics via Prisma
   * @returns {Promise<{waiting:number, active:number, completed:number, failed:number, total:number}>}
   */
  async getQueueStats() {
    const [queued, processing, completed, failed, cancelled] = await Promise.all([
      prisma.exportJob.count({ where: { status: 'queued' } }),
      prisma.exportJob.count({ where: { status: 'processing' } }),
      prisma.exportJob.count({ where: { status: 'completed' } }),
      prisma.exportJob.count({ where: { status: 'failed' } }),
      prisma.exportJob.count({ where: { status: 'cancelled' } })
    ]);

    return {
      waiting: queued,
      active: processing,
      completed,
      failed,
      cancelled,
      total: queued + processing + completed + failed + cancelled
    };
  }

  /**
   * Get watermark settings for export job
   * @param {string} exportJobId 
   * @returns {Promise<object>}
   */
  async getWatermarkSettings(exportJobId) {
    const exportJob = await prisma.exportJob.findUnique({
      where: { id: exportJobId },
      select: {
        watermarkSettings: true,
        user: {
          select: { plan: true }
        }
      }
    });

    if (!exportJob) {
      throw new Error(`Export job not found: ${exportJobId}`);
    }

    // Return validated watermark settings
    return WatermarkService.validateWatermarkSettings(
      exportJob.user?.plan || 'free',
      exportJob.watermarkSettings || WatermarkService.getDefaultWatermarkSettings(exportJob.user?.plan || 'free')
    );
  }

  /**
   * Update watermark settings for export job
   * @param {string} exportJobId 
   * @param {object} watermarkSettings 
   * @param {string} userPlan 
   */
  async updateWatermarkSettings(exportJobId, watermarkSettings, userPlan) {
    // Validate settings based on user plan
    const validatedSettings = WatermarkService.validateWatermarkSettings(userPlan, watermarkSettings);

    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: {
        watermarkSettings: validatedSettings,
        updatedAt: new Date()
      }
    });

    return validatedSettings;
  }

  /**
   * Get user's export statistics
   * @param {string} userId 
   * @param {string} userPlan 
   * @returns {Promise<object>}
   */
  async getUserExportStats(userId, userPlan) {
    const planFeatures = WatermarkService.getPlanFeatures(userPlan);
    
    // Get current month's export count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const currentMonthExports = await prisma.exportJob.count({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth
        },
        status: 'completed'
      }
    });

    // Get total export count
    const totalExports = await prisma.exportJob.count({
      where: {
        userId,
        status: 'completed'
      }
    });

    const remaining = planFeatures.maxExportsPerMonth === -1 
      ? -1 
      : Math.max(0, planFeatures.maxExportsPerMonth - currentMonthExports);

    return {
      currentMonth: currentMonthExports,
      total: totalExports,
      limit: planFeatures.maxExportsPerMonth,
      remaining,
      canExport: remaining > 0 || remaining === -1,
      planFeatures
    };
  }

  /**
   * Delete output files (local FS)
   * @param {string} exportJobId - UUID of ExportJob
   */
  async deleteOutputFiles(exportJobId) {
    const job = await prisma.exportJob.findUnique({
      where: { id: exportJobId },
      select: { userId: true, output: true }
    });
    if (!job?.output?.filename) return;

    const outputPath = this.getOutputPath({
      userId: job.userId,
      filename: job.output.filename
    });

    try {
      await fs.unlink(outputPath);
    } catch (error) {
      console.warn(`Could not delete output file: ${error.message}`);
    }

    if (job.output.thumbnail) {
      const thumbnailPath = path.join(
        path.dirname(outputPath),
        path.basename(job.output.thumbnail)
      );
      try {
        await fs.unlink(thumbnailPath);
      } catch (error) {
        console.warn(`Could not delete thumbnail: ${error.message}`);
      }
    }
  }

  /**
   * Local output path resolver
   * @param {{userId:string, filename:string}} param0
   * @returns {string}
   */
  getOutputPath({ userId, filename }) {
    return path.join(__dirname, '../exports', String(userId), filename);
  }
}

module.exports = new ExportService();