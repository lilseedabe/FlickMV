/**
 * Usage Tracking Service
 * プラン別利用回数制限の管理
 */

const prisma = require('../prisma/client');

class UsageTrackingService {
  /**
   * プラン別制限設定
   */
  static PLAN_LIMITS = {
    free: {
      audioAnalysis: { monthly: 2, daily: 1 },
      promptRegeneration: { monthly: 5, daily: 2 }
    },
    basic: {
      audioAnalysis: { monthly: 10, daily: 3 },
      promptRegeneration: { monthly: 20, daily: 5 }
    },
    pro: {
      audioAnalysis: { monthly: 50, daily: 10 },
      promptRegeneration: { monthly: 100, daily: 20 }
    },
    premium: {
      audioAnalysis: { monthly: -1, daily: -1 }, // 無制限
      promptRegeneration: { monthly: -1, daily: -1 } // 無制限
    }
  };

  /**
   * 利用回数をチェック
   * @param {string} userId - ユーザーID
   * @param {string} userPlan - ユーザープラン
   * @param {'audioAnalysis'|'promptRegeneration'} action - アクション種別
   * @returns {Promise<{allowed: boolean, usage: {monthly:number,daily:number}, limits: Object, remaining: {monthly:number,daily:number}, resetDates: {monthly:Date,daily:Date}}>}
   */
  static async checkUsageLimit(userId, userPlan, action) {
    try {
      const limits = this.PLAN_LIMITS[userPlan] || this.PLAN_LIMITS.free;
      const actionLimits = limits[action];

      if (!actionLimits) {
        // 未定義アクションは許可
        return {
          allowed: true,
          usage: { monthly: 0, daily: 0 },
          limits: { monthly: -1, daily: -1 },
          remaining: { monthly: -1, daily: -1 },
          resetDates: {
            monthly: new Date(),
            daily: new Date()
          }
        };
      }

      // 無制限プランの場合
      if (actionLimits.monthly === -1) {
        return {
          allowed: true,
          usage: { monthly: 0, daily: 0 },
          limits: actionLimits,
          remaining: { monthly: -1, daily: -1 },
          resetDates: {
            monthly: new Date(),
            daily: new Date()
          }
        };
      }

      // 現在の日付
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 月間利用回数を取得
      const monthlyUsage = await this.getUsageCount(userId, action, startOfMonth);

      // 日間利用回数を取得
      const dailyUsage = await this.getUsageCount(userId, action, startOfDay);

      // 制限チェック
      const monthlyAllowed = actionLimits.monthly === -1 || monthlyUsage < actionLimits.monthly;
      const dailyAllowed = actionLimits.daily === -1 || dailyUsage < actionLimits.daily;

      const allowed = monthlyAllowed && dailyAllowed;

      return {
        allowed,
        usage: {
          monthly: monthlyUsage,
          daily: dailyUsage
        },
        limits: actionLimits,
        remaining: {
          monthly: actionLimits.monthly === -1 ? -1 : Math.max(0, actionLimits.monthly - monthlyUsage),
          daily: actionLimits.daily === -1 ? -1 : Math.max(0, actionLimits.daily - dailyUsage)
        },
        resetDates: {
          monthly: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          daily: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        }
      };
    } catch (error) {
      console.error('Usage limit check error:', error);
      // エラー時は制限なしで許可（安全側に倒す）
      return {
        allowed: true,
        usage: { monthly: 0, daily: 0 },
        limits: { monthly: -1, daily: -1 },
        remaining: { monthly: -1, daily: -1 },
        resetDates: {
          monthly: new Date(),
          daily: new Date()
        },
        error: error.message
      };
    }
  }

  /**
   * 利用回数を記録
   * @param {string} userId - ユーザーID
   * @param {string} action - アクション種別
   * @param {Object} metadata - 追加のメタデータ
   */
  static async recordUsage(userId, action, metadata = {}) {
    try {
      // 利用記録をデータベースに保存
      // 注意: 実際のデータベーススキーマに応じて調整が必要
      const usageRecord = {
        userId,
        action,
        timestamp: new Date(),
        metadata,
        ip: metadata.ip || null,
        userAgent: metadata.userAgent || null
      };

      // UserUsageテーブルがない場合は、メモリまたはファイルベースで管理
      console.log('Usage recorded:', usageRecord);

      // TODO: 実際のデータベーステーブルに保存
      // await prisma.userUsage.create({ data: usageRecord });

      return true;
    } catch (error) {
      console.error('Usage recording error:', error);
      return false;
    }
  }

  /**
   * 指定期間の利用回数を取得
   * @param {string} userId - ユーザーID
   * @param {string} action - アクション種別
   * @param {Date} since - 開始日時
   */
  static async getUsageCount(userId, action, since) {
    try {
      // 簡易実装: メモリベース（本番では適切なDBテーブルを使用）
      if (!global.usageCache) {
        global.usageCache = new Map();
      }

      const key = `${userId}-${action}-${since.toDateString()}`;
      const cached = global.usageCache.get(key);

      if (cached && Date.now() - cached.timestamp < 60000) {
        // 1分キャッシュ
        return cached.count;
      }

      // TODO: 実際のデータベースクエリに置き換え
      /*
      const count = await prisma.userUsage.count({
        where: {
          userId,
          action,
          timestamp: { gte: since }
        }
      });
      */

      // 暫定実装: 制限を緩く設定
      const count = 0;

      global.usageCache.set(key, {
        count,
        timestamp: Date.now()
      });

      return count;
    } catch (error) {
      console.error('Usage count retrieval error:', error);
      // エラー時は0を返す（利用可能として扱う）
      return 0;
    }
  }

  /**
   * ユーザーの利用統計を取得
   * @param {string} userId - ユーザーID
   * @param {string} userPlan - ユーザープラン
   */
  static async getUserUsageStats(userId, userPlan) {
    try {
      const stats = {
        audioAnalysis: await this.checkUsageLimit(userId, userPlan, 'audioAnalysis'),
        promptRegeneration: await this.checkUsageLimit(userId, userPlan, 'promptRegeneration'),
        plan: userPlan,
        planLimits: this.PLAN_LIMITS[userPlan] || this.PLAN_LIMITS.free
      };

      return stats;
    } catch (error) {
      console.error('Usage stats retrieval error:', error);
      return null;
    }
  }

  /**
   * プラン別制限情報を取得
   */
  static getPlanLimits() {
    return this.PLAN_LIMITS;
  }
}

module.exports = UsageTrackingService;