require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  console.log('🔍 新しいSupabase接続テスト開始...\n');
  
  console.log('📋 環境変数確認:');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 80)}...`);
  console.log(`DIRECT_URL: ${process.env.DIRECT_URL?.substring(0, 80)}...`);
  console.log('');

  try {
    // 1. 基本的な接続テスト
    console.log('1. 基本接続テスト...');
    await prisma.$connect();
    console.log('✅ Prisma接続成功');

    // 2. データベースクエリテスト
    console.log('\n2. データベースクエリテスト...');
    const result = await prisma.$queryRaw`SELECT NOW() as current_time, version() as db_version`;
    console.log('✅ クエリ実行成功:', result[0]);

    // 3. 現在のテーブル確認
    console.log('\n3. 現在のテーブル確認...');
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('✅ 現在のテーブル:', tables.map(t => t.table_name));

    // 4. Prismaマイグレーション状態確認
    console.log('\n4. Prismaマイグレーション確認...');
    try {
      const migrations = await prisma.$queryRaw`
        SELECT * FROM _prisma_migrations 
        ORDER BY finished_at DESC 
        LIMIT 3
      `;
      console.log('✅ マイグレーション履歴:', migrations.length > 0 ? migrations : '未実行');
    } catch (error) {
      console.log('⚠️ マイグレーションテーブルが存在しません（初回セットアップ必要）');
    }

  } catch (error) {
    console.error('❌ データベース接続エラー:');
    console.error('エラータイプ:', error.constructor.name);
    console.error('エラーコード:', error.code);
    console.error('メッセージ:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔚 テスト完了');
  }
}

testConnection().catch(console.error);
