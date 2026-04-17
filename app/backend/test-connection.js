const { query } = require('./config/database');

async function testConnection() {
    console.log('🔍 Проверка подключения к Supabase...\n');
    
    try {
        // 1. Проверка времени
        const timeResult = await query('SELECT NOW() as current_time');
        console.log('✅ 1. Подключение установлено');
        console.log(`   Текущее время БД: ${timeResult.rows[0].current_time}\n`);
        
        // 2. Проверка списка таблиц
        const tablesResult = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        console.log('✅ 2. Таблицы в базе данных:');
        tablesResult.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
        console.log('\n🎉 Подключение к Supabase работает корректно!');
        
    } catch (error) {
        console.error('❌ Ошибка подключения:', error.message);
        console.log('\n💡 Проверьте:');
        console.log('   1. Правильный ли пароль в .env (из Supabase)');
        console.log('   2. Активен ли проект в Supabase');
        console.log('   3. Интернет-соединение');
    }
}

testConnection();