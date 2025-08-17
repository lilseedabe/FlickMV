/**
 * Usage Tracking Service
 * プラン別の利用制限と追跡を管理
 */

const prisma = require('../prisma/client');

class UsageTrackingService {
  /**
   * プラン別の月間利用制限
   */
  static getPlanLimits() {
    return {
      free: {
        audioAnalysis: 2,          // 無料: 月2回まで
        promptRegeneration: 5,     // 無料: 月5回まで
        exportVideos: 3            // 無料: 月3回まで
      },
      basic: {
        audioAnalysis: 8,          // ベーシック: 月8回まで
        promptRegeneration: 20,    // ベーシック: 月20回まで
        exportVideos: 15           // ベーシック: 月15回まで
      },
      pro: {
        audioAnalysis: 25,         // プロ: 月25回まで
        promptRegeneration: 75,    // プロ: 月75回まで
        exportVideos: 50           // プロ: 月50回まで
      },
      premium: {
        audioAnalysis: -1,         // プレミアム: 無制限
        promptRegeneration: -1,    // プレミアム: 無制限
        exportVideos: -1           // プレミアム: 無制限
      }
    };
  }

  /**
   * ユーザーの利用制限をチェック
   * @param {string} userId - ユーザーID
   * @param {string} plan - プラン名
   * @param {string} feature - 機能名
   * @returns {Promise<{allowed: boolean, usage: object, limits: object, remaining: object, resetDates: object}>}
   */
  static async checkUsageLimit(userId, plan = 'free', feature) {
    try {
      const limits = this.getPlanLimits()[plan] || this.getPlanLimits().free;
      const featureLimit = limits[feature];

      // 無制限の場合(-1)
      if (featureLimit === -1) {
        return {
          allowed: true,
          usage: { [feature]: 0 },
          limits,
          remaining: { [feature]: -1 },
          resetDates: {}
        };
      }

      // 今月の使用状況を取得
      const currentMonth = new Date();
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

      // データベースから使用回数を取得
      const usage = await this.getCurrentMonthUsage(userId, feature, monthStart, monthEnd);

      const remaining = Math.max(0, featureLimit - usage);
      const allowed = remaining > 0;

      // 次のリセット日
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

      return {
        allowed,
        usage: { [feature]: usage },
        limits,
        remaining: { [feature]: remaining },
        resetDates: {
          monthly: nextMonth.toISOString()
        }
      };
    } catch (error) {
      console.error('Usage limit check error:', error);
      // エラーの場合はデフォルトで制限（安全側）
      return {
        allowed: false,
        usage: {},
        limits: {},
        remaining: {},
        resetDates: {},
        error: error.message
      };
    }
  }

  /**
   * 今月の使用回数を取得
   * @param {string} userId
   * @param {string} feature
   * @param {Date} monthStart
   * @param {Date} monthEnd
   */
  static async getCurrentMonthUsage(userId, feature, monthStart, monthEnd) {
    try {
      // usage_logs テーブルがない場合は、mediaFile の解析回数で代用（例）
      if (feature === 'audioAnalysis') {
        const count = await prisma.mediaFile.count({
          where: {
            ownerId: userId,
            analysis: { not: null },
            updatedAt: {
              gte: monthStart,
              lte: monthEnd
            }
          }
        });
        return count;
      }

      // その他の機能は簡易的に0を返す（実装では専用テーブルを使用）
      return 0;
    } catch (error) {
      console.error('Failed to get current month usage:', error);
      return 0;
    }
  }

  /**
   * 利用記録を保存
   * @param {string} userId - ユーザーID
   * @param {string} feature - 機能名
   * @param {object} metadata - メタデータ
   */
  static async recordUsage(userId, feature, metadata = {}) {
    try {
      // 簡易実装: ログをコンソールに出力
      // 実際の本番環境では dedicated usage_logs テーブルを作成
      console.log(`📊 Usage recorded: ${userId} used ${feature}`, {
        timestamp: new Date().toISOString(),
        metadata
      });

      // TODO: データベースに記録
      // await prisma.usageLog.create({
      //   data: {
      //     userId,
      //     feature,
      //     metadata,
      //     createdAt: new Date()
      //   }
      // });

      return true;
    } catch (error) {
      console.error('Failed to record usage:', error);
      return false;
    }
  }

  /**
   * ユーザーの利用統計を取得
   * @param {string} userId
   * @param {string} plan
   */
  static async getUserUsageStats(userId, plan = 'free') {
    try {
      const limits = this.getPlanLimits()[plan] || this.getPlanLimits().free;

      const currentMonth = new Date();
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

      const stats = {};

      // 各機能の使用状況を取得
      for (const feature of Object.keys(limits)) {
        const usage = await this.getCurrentMonthUsage(userId, feature, monthStart, monthEnd);
        const limit = limits[feature];
        const remaining = limit === -1 ? -1 : Math.max(0, limit - usage);

        stats[feature] = {
          used: usage,
          limit,
          remaining,
          percentage: limit === -1 ? 0 : Math.round((usage / Math.max(1, limit)) * 100)
        };
      }

      return {
        plan,
        period: {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString()
        },
        features: stats,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return null;
    }
  }

  /**
   * プラン情報と制限を取得
   */
  static getPlanInfo(plan = 'free') {
    const limits = this.getPlanLimits()[plan] || this.getPlanLimits().free;

    return {
      plan,
      limits,
      features: {
        audioAnalysis: {
          name: '音声解析',
          description: 'AI による音声テキスト化と MV プロンプト生成',
          limit: limits.audioAnalysis
        },
        promptRegeneration: {
          name: 'プロンプト再生成',
          description: '異なる設定での MV プロンプト再生成',
          limit: limits.promptRegeneration
        },
        exportVideos: {
          name: '動画エクスポート',
          description: '完成した MV の動画ファイル出力',
          limit: limits.exportVideos
        }
      }
    };
  }

  /**
   * 制限チェック（ミドルウェア用）
   */
  static createLimitCheckMiddleware(feature) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const plan = req.user?.plan || 'free';

        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
            error: 'AUTHENTICATION_REQUIRED'
          });
        }

        const usageCheck = await this.checkUsageLimit(userId, plan, feature);

        if (!usageCheck.allowed) {
          return res.status(429).json({
            success: false,
            message: 'Usage limit exceeded',
            error: 'USAGE_LIMIT_EXCEEDED',
            usage: usageCheck.usage,
            limits: usageCheck.limits,
            remaining: usageCheck.remaining,
            resetDates: usageCheck.resetDates,
            upgradeRequired: plan === 'free',
            planInfo: this.getPlanInfo(plan)
          });
        }

        // リクエストオブジェクトに利用状況を添付
        req.usageInfo = usageCheck;
        next();
      } catch (error) {
        console.error('Usage limit middleware error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to check usage limits',
          error: 'USAGE_CHECK_FAILED'
        });
      }
    };
  }
}

module.exports = UsageTrackingService;