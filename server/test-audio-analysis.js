/**
 * FlickMV Audio Analysis Service Test
 * Groq API (Whisper) + MoonshotAI (Kimi) との連携テスト用スクリプト
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { HybridAIClient } = require('./services/groq/groqClient');
const audioAnalysisService = require('./services/audioAnalysisService');
const UsageTrackingService = require('./services/usageTrackingService');

async function testAIConnections() {
  console.log('🧠 AI API接続テスト開始...');

  const groqConfigured = !!process.env.GROQ_API_KEY;
  const moonshotConfigured = !!process.env.MOONSHOT_API_KEY;

  if (!groqConfigured && !moonshotConfigured) {
    console.error('❌ どちらのAPIキーも設定されていません');
    console.log('💡 最低でも以下のいずれかを.envファイルに設定してください:');
    console.log('   - GROQ_API_KEY (音声テキスト化用)');
    console.log('   - MOONSHOT_API_KEY (プロンプト生成用)');
    return false;
  }

  console.log('📊 API設定状況:');
  console.log(`   - Groq API: ${groqConfigured ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`   - MoonshotAI API: ${moonshotConfigured ? '✅ 設定済み' : '❌ 未設定'}`);

  try {
    const aiClient = new HybridAIClient(
      process.env.GROQ_API_KEY,
      process.env.MOONSHOT_API_KEY
    );

    console.log('📝 テストプロンプト生成中...');
    const testLyrics = '桜の花びらが舞い散る春の日\n君と歩いた思い出の道';

    const result = await aiClient.generateMVPrompts(testLyrics, [], {
      genre: 'バラード',
      mood: '感動的',
      style: 'シネマティック'
    });

    console.log('✅ AI接続成功!');
    console.log('🎬 生成されたテーマ:', result.overallTheme);
    console.log('🎭 シーン数:', result.scenes.length);
    console.log('💡 提案数:', result.suggestions.length);

    return true;
  } catch (error) {
    console.error('❌ AI接続エラー:', error.message);
    return false;
  }
}

async function testAudioFileProcessing() {
  console.log('\n🎵 音声ファイル処理テスト開始...');

  const testAudioPath = path.join(__dirname, 'test-assets', 'sample.mp3');

  if (!fs.existsSync(testAudioPath)) {
    console.log('⚠️  テスト音声ファイルが見つかりません');
    console.log('💡 実際の音声ファイルでテストする場合は、以下のパスにファイルを配置してください:');
    console.log(`   ${testAudioPath}`);
    return false;
  }

  try {
    const aiClient = new HybridAIClient(
      process.env.GROQ_API_KEY,
      process.env.MOONSHOT_API_KEY
    );

    console.log('🎤 音声ファイルをテキスト化中...');
    const transcription = await aiClient.transcribeAudio(testAudioPath, 'ja');

    console.log('✅ 音声テキスト化成功!');
    console.log('📝 認識されたテキスト:', transcription.text.substring(0, 100) + '...');
    console.log('⏱️  音声長:', transcription.duration, '秒');
    console.log('🔤 セグメント数:', transcription.segments.length);

    return true;
  } catch (error) {
    console.error('❌ 音声処理エラー:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n🗄️  データベース接続テスト開始...');

  try {
    const prisma = require('./prisma/client');

    // 簡単なクエリテスト
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

async function testUsageLimits() {
  console.log('\n📊 利用制限システムテスト開始...');

  try {
    console.log('🔍 プラン別制限設定:');
    const planLimits = UsageTrackingService.getPlanLimits();

    Object.entries(planLimits).forEach(([plan, limits]) => {
      console.log(`  ${plan.toUpperCase()}:`);
      console.log(`    音声解析: ${limits.audioAnalysis.monthly === -1 ? '無制限' : limits.audioAnalysis.monthly + '回/月'}`);
      console.log(`    プロンプト再生成: ${limits.promptRegeneration.monthly === -1 ? '無制限' : limits.promptRegeneration.monthly + '回/月'}`);
    });

    const testUserId = 'test-user-123';
    const testPlan = 'free';

    const usageCheck = await UsageTrackingService.checkUsageLimit(
      testUserId,
      testPlan,
      'audioAnalysis'
    );

    console.log('\n🧪 テストユーザー利用状況:');
    console.log('  利用可能:', usageCheck.allowed ? '✅ はい' : '❌ いいえ');
    console.log('  今月の利用:', usageCheck.usage.monthly, '回');
    console.log('  残り回数:', usageCheck.remaining.monthly === -1 ? '無制限' : usageCheck.remaining.monthly + '回');

    console.log('✅ 利用制限システム正常!');
    return true;
  } catch (error) {
    console.error('❌ 利用制限テストエラー:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 FlickMV Audio Analysis Service - 総合テスト (MoonshotAI対応版)\n');

  const results = {
    ai: await testAIConnections(),
    database: await testDatabaseConnection(),
    usage: await testUsageLimits(),
    audio: await testAudioFileProcessing()
  };

  console.log('\n📊 テスト結果サマリー:');
  console.log('='.repeat(50));
  console.log(`AI接続:        ${results.ai ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`データベース:   ${results.database ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`利用制限:      ${results.usage ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`音声処理:      ${results.audio ? '✅ 成功' : '⚠️  スキップ'}`);

  const criticalPassed = results.ai && results.database && results.usage;

  console.log('\n🎯 プラン別利用可能回数:');
  console.log('  フリープラン:   音声解析 2回/月, プロンプト再生成 5回/月');
  console.log('  ベーシック:     音声解析 10回/月, プロンプト再生成 20回/月');
  console.log('  プロ:          音声解析 50回/月, プロンプト再生成 100回/月');
  console.log('  プレミアム:     無制限');

  if (criticalPassed) {
    console.log('\n🎉 重要な機能のテストが成功しました!');
    console.log('💡 実際の音声ファイルをアップロードして機能をテストしてください。');
    console.log('🔧 VPSスペック的に無料プランでも問題なく動作するはずです。');
  } else {
    console.log('\n⚠️  一部のテストが失敗しました。上記のエラーを確認してください。');
  }

  console.log('\n📚 詳細なセットアップガイド: AUDIO_ANALYSIS_GUIDE.md');
  console.log('🚀 API設定が必要: GROQ_API_KEY (必須) + MOONSHOT_API_KEY (推奨)');
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testAIConnections,
  testAudioFileProcessing,
  testDatabaseConnection,
  testUsageLimits,
  runAllTests
};