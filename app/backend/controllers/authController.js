const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken } = require('../config/jwt');

// Регистрация - упрощенная версия с отладкой
exports.register = async (req, res) => {
    console.log('📝 Начало регистрации...');
    
    try {
        const { username, email, password } = req.body;
        console.log('📥 Получены данные:', { username, email, password: password ? '***' : undefined });
        
        // Быстрая валидация
        if (!username || !email || !password) {
            console.log('❌ Не все поля заполнены');
            return res.status(400).json({
                success: false,
                message: 'Все поля обязательны'
            });
        }
        
        console.log('🔍 Проверяем существующего пользователя...');
        
        // Проверяем, существует ли пользователь
        let existingUser;
        try {
            const result = await db.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
            existingUser = result.rows[0];
            console.log('✅ Проверка пользователя завершена');
        } catch (dbError) {
            console.error('❌ Ошибка БД при проверке пользователя:', dbError.message);
            return res.status(500).json({
                success: false,
                message: 'Ошибка базы данных'
            });
        }
        
        if (existingUser) {
            console.log('❌ Пользователь уже существует');
            return res.status(400).json({
                success: false,
                message: 'Пользователь с таким email или именем уже существует'
            });
        }
        
        console.log('🔐 Хэшируем пароль...');
        // Хэшируем пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        console.log('✅ Пароль захеширован');
        
        console.log('📥 Сохраняем пользователя в БД...');
        // Создаем нового пользователя
        let newUser;
        try {
            const result = await db.query(
                'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
                [username, email, hashedPassword]
            );
            newUser = result.rows[0];
            console.log('✅ Пользователь сохранен, ID:', newUser.id);
        } catch (dbError) {
            console.error('❌ Ошибка БД при сохранении:', dbError.message);
            return res.status(500).json({
                success: false,
                message: 'Ошибка при сохранении пользователя'
            });
        }
        
        console.log('🔑 Генерируем JWT токен...');
        // Генерируем JWT токен
        let token;
        try {
            token = generateToken(newUser);
            console.log('✅ Токен сгенерирован');
        } catch (jwtError) {
            console.error('❌ Ошибка генерации JWT:', jwtError.message);
            // Все равно возвращаем успех, но без токена
            return res.status(201).json({
                success: true,
                message: 'Регистрация успешна, но возникла проблема с генерацией токена',
                user: newUser,
                token: null
            });
        }
        
        console.log('✅ Регистрация полностью завершена!');
        
        res.status(201).json({
            success: true,
            message: 'Регистрация успешна',
            user: newUser,
            token
        });
        
    } catch (error) {
        console.error('🔥 Неожиданная ошибка в регистрации:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Вход - упрощенная версия
exports.login = async (req, res) => {
    console.log('🔑 Начало входа...');
    
    try {
        const { email, password } = req.body;
        console.log('📥 Получены данные:', { email, password: password ? '***' : undefined });
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email и пароль обязательны'
            });
        }
        
        console.log('🔍 Ищем пользователя...');
        // Ищем пользователя
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        
        if (!user) {
            console.log('❌ Пользователь не найден');
            return res.status(401).json({
                success: false,
                message: 'Неверный email или пароль'
            });
        }
        
        console.log('🔐 Проверяем пароль...');
        // Проверяем пароль
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            console.log('❌ Неверный пароль');
            return res.status(401).json({
                success: false,
                message: 'Неверный email или пароль'
            });
        }
        
        console.log('🔑 Генерируем токен...');
        // Генерируем токен
        const token = generateToken({
            id: user.id,
            username: user.username,
            email: user.email
        });
        
        console.log('✅ Вход успешен!');
        
        // Убираем пароль из ответа
        delete user.password;
        
        res.json({
            success: true,
            message: 'Вход выполнен успешно',
            user,
            token
        });
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при входе'
        });
    }
};