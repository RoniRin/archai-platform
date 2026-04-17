const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    },
    // ПРИНУДИТЕЛЬНО ИСПОЛЬЗОВАТЬ IPv4
    family: 4
});

// Проверка подключения
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Ошибка подключения к Supabase:', err.message);
    } else {
        console.log('✅ Подключено к Supabase PostgreSQL');
        release();
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};