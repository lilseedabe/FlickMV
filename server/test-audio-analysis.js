/**
 * FlickMV Audio Analysis Service Test
 * Groq API 連携 + プラン制限テスト + DB 接続テスト
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs');

// Groq クライアント互換読み込み（エクスポート形態の違いに対応）
const GroqModule = require('./services/groq/groqClient');
const GroqClientClass =
  GroqModule?.HybridAIClient || GroqModule?.GroqClient || GroqModule;

const UsageTrackingService = require('./services/usageTrackingService');
const audioAnalysisService = require('./services/audioAnalysisService');

async function testGroqConnection() {
  console.log('🧠 Groq API接続テスト開始...');

  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEYが設定されていません');
    console.log('💡 .envファイルに GROQ_API_KEY=your-api-key を追加してください');
    return false;
  }

  try {
    const groqClient = new GroqClientClass(process.env.GROQ_API_KEY);

    // テスト用のシンプルなプロンプト生成
    console.log('📝 テストプロンプト生成中...');
    const testLyrics = '桜の花びらが舞い散る春の日\n君と歩いた思い出の道';

    const result = await groqClient.generateMVPrompts(testLyrics, [], {
      genre: 'バラード',
      mood: '感動的',
      style: 'シネマティック',
    });

    console.log('✅ Groq API接続成功!');
    console.log('🎬 生成されたテーマ:', result.overallTheme);
    console.log('🎭 シーン数:', result.scenes.length);
    console.log('💡 提案数:', result.suggestions.length);

    return true;
  } catch (error) {
    console.error('❌ Groq API接続エラー:', error.message);
    return false;
  }
}

async function testPlanLimits() {
  console.log('\n📊 プラン別制限テスト開始...');

  try {
    const plans = ['free', 'basic', 'pro', 'premium'];

    console.log('\n🎯 プラン別利用制限:');
    console.log('='.repeat(60));

    plans.forEach((plan) => {
      const limits = UsageTrackingService.getPlanLimits()[plan];
      console.log(`\n${plan.toUpperCase()} プラン:`);
      console.log(
        `  📢 音声解析: ${
          limits.audioAnalysis === -1 ? '無制限' : `月${limits.audioAnalysis}回`
        }`
      );
      console.log(
        `  🔄 プロンプト再生成: ${
          limits.promptRegeneration === -1
            ? '無制限'
            : `月${limits.promptRegeneration}回`
        }`
      );
      console.log(
        `  📹 動画エクスポート: ${
          limits.exportVideos === -1 ? '無制限' : `月${limits.exportVideos}回`
        }`
      );
    });

    // テストユーザーでの制限チェック
    const testUserId = 'test-user-123';

    console.log('\n🧪 制限チェックテスト (無料プラン: audioAnalysis):');
    const freeCheck = await UsageTrackingService.checkUsageLimit(
      testUserId,
      'free',
      'audioAnalysis'
    );
    console.log('  結果:', {
      allowed: freeCheck.allowed,
      remaining: freeCheck.remaining,
      limits: UsageTrackingService.getPlanLimits().free.audioAnalysis,
    });

    console.log('\n🧪 制限チェックテスト (プレミアムプラン: audioAnalysis):');
    const premiumCheck = await UsageTrackingService.checkUsageLimit(
      testUserId,
      'premium',
      'audioAnalysis'
    );
    console.log('  結果:', {
      allowed: premiumCheck.allowed,
      remaining: premiumCheck.remaining,
      limits: UsageTrackingService.getPlanLimits().premium.audioAnalysis,
    });

    console.log('\n✅ プラン制限テスト完了!');
    return true;
  } catch (error) {
    console.error('❌ プラン制限テストエラー:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n🗄️  データベース接続テスト開始...');

  try {
    const prisma = require('./prisma/client');

    // データベースへの簡単なクエリテスト
    // 注意: $queryRaw の tagged template は Prisma に委譲
    const result = await prisma.$queryRaw`SELECT 1`;

    console.log('✅ データベース接続成功!');

    // MediaFileテーブルの存在確認
    const mediaFileCount = await prisma.mediaFile.count();
    console.log('📊 MediaFileテーブル:', mediaFileCount, '件のレコード');

    return true;
  } catch (error) {
    console.error('❌ データベース接続エラー:', error.message);
    console.log('💡 データベースの設定を確認してください:');
    console.log('   - DATABASE_URLが正しく設定されているか');
    console.log('   - Prismaマイグレーションが実行されているか');
    return false;
  }
}

async function testModelComparison() {
  console.log('\n🔍 AIモデル比較テスト開始...');

  if (!process.env.GROQ_API_KEY) {
    console.log('⚠️  Groq APIキーが設定されていないため、スキップします');
    return true;
  }

  try {
    const groqClient = new GroqClientClass(process.env.GROQ_API_KEY);
    const testLyrics = '夜空に輝く星たちよ\n君に届けこの想い';

    console.log('🤖 テスト歌詞:', testLyrics.replace('\n', ' / '));

    const startTime = Date.now();
    const result = await groqClient.generateMVPrompts(testLyrics, [], {
      genre: 'ポップス',
      mood: '明るい',
      style: 'モダン',
    });
    const endTime = Date.now();

    console.log(`⚡ 生成時間: ${endTime - startTime}ms`);
    console.log('📋 生成されたシーン数:', result.scenes.length);
    console.log(
      '💡 最初のシーンプロンプト:',
      (result.scenes[0]?.visualPrompt || '').substring(0, 50) + '...'
    );

    return true;
  } catch (error) {
    console.error('❌ モデル比較テストエラー:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 FlickMV Audio Analysis Service - 総合テスト\n');

  const results = {
    groq: await testGroqConnection(),
    database: await testDatabaseConnection(),
    planLimits: await testPlanLimits(),
    modelComparison: await testModelComparison(),
  };

  console.log('\n📊 テスト結果サマリー:');
  console.log('='.repeat(50));
  console.log(`Groq API:      ${results.groq ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`データベース:   ${results.database ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`プラン制限:    ${results.planLimits ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`モデル比較:    ${results.modelComparison ? '✅ 成功' : '❌ 失敗'}`);

  const allPassed = results.groq && results.database && results.planLimits;

  if (allPassed) {
    console.log('\n🎉 重要な機能のテストが成功しました!');
    console.log('\n🆓 無料プランの利用制限:');
    console.log('  - 音声解析: 月2回まで');
    console.log('  - プロンプト再生成: 月5回まで');
    console.log('  - 動画エクスポート: 月3回まで');

    console.log('\n🚀 プロプランの利用制限:');
    console.log('  - 音声解析: 月25回まで');
    console.log('  - プロンプト再生成: 月75回まで');
    console.log('  - 動画エクスポート: 月50回まで');

    console.log('\n💡 実際の音声ファイルをアップロードして機能をテストしてください。');
  } else {
    console.log('\n⚠️  一部のテストが失敗しました。上記のエラーを確認してください。');
  }

  console.log('\n📚 詳細なセットアップガイド: AUDIO_ANALYSIS_GUIDE.md');
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testGroqConnection,
  testDatabaseConnection,
  testPlanLimits,
  testModelComparison,
  runAllTests,
};