const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET не определен');
    process.exit(1);
}

// Подключение к БД
let db;
try {
    db = require('../config/database');
    console.log('✅ БД подключена в auth.js');
} catch (error) {
    console.log('⚠️ БД не подключена, работаем в тестовом режиме');
    db = null;
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// Middleware для проверки токена
const authenticateToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Не авторизован'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Недействительный токен'
        });
    }
};

// ========== ВХОД ==========
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email и пароль обязательны'
            });
        }
        
        // Тестовый режим без БД
        if (!db) {
            const token = jwt.sign(
                { 
                    id_auth: 1, 
                    username: 'testuser', 
                    email,
                    surname: 'Тестовый'
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.cookie('token', token, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000,
                sameSite: 'lax'
            });
            
            // Создаем тестовую сессию
            const sessionId = Date.now().toString();
            res.cookie('session_id', sessionId, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000,
                sameSite: 'lax'
            });
            
            return res.json({
                success: true,
                user: { 
                    id_auth: 1, 
                    username: 'testuser', 
                    email,
                    surname: 'Тестовый',
                    created_at: new Date().toISOString()
                },
                token
            });
        }
        
        // Реальный режим с БД
        const userResult = await db.query(
            'SELECT * FROM auth_principals WHERE email = $1',
            [email]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Неверный email или пароль'
            });
        }
        
        const user = userResult.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.pass_hash);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Неверный email или пароль'
            });
        }
        
        const token = jwt.sign(
            { 
                id_auth: user.id_auth, 
                username: user.username, 
                email: user.email,
                surname: user.surname 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Создаем запись о сессии
        const sessionId = Date.now().toString();
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        try {
            // Пытаемся сохранить сессию в БД (если есть таблица)
            await db.query(
                `INSERT INTO auth_sessions (id_session, id_auth, user_agent, ip_address, created_at, last_activity)
                 VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                [sessionId, user.id_auth, userAgent, ipAddress]
            );
        } catch (sessionError) {
            console.log('⚠️ Не удалось сохранить сессию:', sessionError.message);
            // Продолжаем даже без сохранения сессии
        }
        
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        
        res.cookie('session_id', sessionId, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        
        // Убираем хэш пароля из ответа
        const { pass_hash, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            user: userWithoutPassword,
            token
        });
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
};

// ========== РЕГИСТРАЦИЯ ==========
const register = async (req, res) => {
    try {
        const { username, email, password, surname } = req.body;
        
        console.log('📝 Получен запрос регистрации:', { username, email, surname });
        
        // Валидация
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Имя пользователя, email и пароль обязательны'
            });
        }
        
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Пароль должен содержать минимум 8 символов'
            });
        }
        
        // РЕАЛЬНЫЙ РЕЖИМ С БД
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'База данных не подключена'
            });
        }
        
        // Проверяем существующего пользователя
        const existingUser = await db.query(
            'SELECT id_auth FROM auth_principals WHERE email = $1 OR username = $2',
            [email, username]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Пользователь с таким email или именем уже существует'
            });
        }
        
        // Хэшируем пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Создаем пользователя
        const result = await db.query(
            `INSERT INTO auth_principals (username, surname, email, pass_hash, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING id_auth, username, surname, email, created_at`,
            [username, surname || '', email, hashedPassword]
        );
        
        const newUser = result.rows[0];
        
        // Генерируем токен
        const token = jwt.sign(
            { 
                id_auth: newUser.id_auth, 
                username, 
                email, 
                surname: surname || ''
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Создаем сессию
        const sessionId = Date.now().toString();
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        try {
            await db.query(
                `INSERT INTO auth_sessions (id_session, id_auth, user_agent, ip_address, created_at, last_activity)
                 VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                [sessionId, newUser.id_auth, userAgent, ipAddress]
            );
        } catch (sessionError) {
            console.log('⚠️ Не удалось сохранить сессию:', sessionError.message);
        }
        
        // Устанавливаем cookie
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        
        res.cookie('session_id', sessionId, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        
        console.log('✅ Пользователь создан:', newUser.id_auth);
        
        res.status(201).json({
            success: true,
            message: 'Регистрация успешна',
            user: newUser,
            token
        });
        
    } catch (error) {
        console.error('❌ Ошибка регистрации:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при регистрации: ' + error.message
        });
    }
};

// ========== ПОЛУЧЕНИЕ ПРОФИЛЯ ==========
const getProfile = async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Не авторизован'
            });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id_auth;
        
        if (!db) {
            // Тестовый режим
            return res.json({
                success: true,
                user: {
                    id_auth: userId,
                    username: decoded.username || 'testuser',
                    email: decoded.email || 'test@example.com',
                    surname: decoded.surname || 'Тестовый',
                    created_at: new Date().toISOString()
                }
            });
        }
        
        const userResult = await db.query(
            'SELECT id_auth, username, surname, email, created_at FROM auth_principals WHERE id_auth = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        res.json({
            success: true,
            user: userResult.rows[0]
        });
        
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
};

// ========== ПОЛУЧЕНИЕ СЕССИЙ ==========
const getSessions = async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Не авторизован'
            });
        }
        
        // Проверяем токен
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id_auth;
        const currentSessionId = req.cookies?.session_id;
        
        console.log('📊 Запрос сессий для пользователя:', userId);
        
        // Если нет БД, возвращаем тестовые данные
        if (!db) {
            const mockSessions = [
                {
                    id_session: currentSessionId || 'current',
                    device_info: req.headers['user-agent'] || 'Chrome / Windows',
                    ip_address: req.ip || req.connection.remoteAddress || '127.0.0.1',
                    created_at: new Date().toISOString(),
                    last_activity: new Date().toISOString(),
                    is_current: true
                },
                {
                    id_session: 'prev_session_1',
                    device_info: 'Safari / iPhone',
                    ip_address: '192.168.1.2',
                    created_at: new Date(Date.now() - 86400000).toISOString(),
                    last_activity: new Date(Date.now() - 3600000).toISOString(),
                    is_current: false
                }
            ];
            
            return res.json({
                success: true,
                sessions: mockSessions
            });
        }
        
        // Реальный запрос к БД
        try {
            // Проверяем существование таблицы
            const tableCheck = await db.query(
                `SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'auth_sessions'
                )`
            );
            
            const tableExists = tableCheck.rows[0].exists;
            
            if (!tableExists) {
                console.log('⚠️ Таблица auth_sessions не существует');
                return res.json({
                    success: true,
                    sessions: [],
                    message: 'Таблица сессий не создана'
                });
            }
            
            // Получаем сессии пользователя
            const sessionsResult = await db.query(
                `SELECT id_session, user_agent, ip_address, created_at, last_activity 
                 FROM auth_sessions 
                 WHERE id_auth = $1 
                 ORDER BY last_activity DESC`,
                [userId]
            );
            
            // Форматируем device_info из user_agent
            const sessions = sessionsResult.rows.map(session => {
                // Простое определение устройства из user_agent
                let device_info = 'Неизвестное устройство';
                const ua = session.user_agent || '';
                
                if (ua.includes('iPhone') || ua.includes('iPad')) device_info = 'iOS устройство';
                else if (ua.includes('Android')) device_info = 'Android устройство';
                else if (ua.includes('Windows')) device_info = 'Windows ПК';
                else if (ua.includes('Mac')) device_info = 'Mac ПК';
                else if (ua.includes('Linux')) device_info = 'Linux ПК';
                
                // Определяем браузер
                if (ua.includes('Chrome') && !ua.includes('Edg')) device_info += ' / Chrome';
                else if (ua.includes('Firefox')) device_info += ' / Firefox';
                else if (ua.includes('Safari') && !ua.includes('Chrome')) device_info += ' / Safari';
                else if (ua.includes('Edg')) device_info += ' / Edge';
                
                return {
                    ...session,
                    device_info,
                    is_current: session.id_session === currentSessionId
                };
            });
            
            res.json({
                success: true,
                sessions
            });
            
        } catch (dbError) {
            console.error('❌ Ошибка БД при получении сессий:', dbError);
            // Возвращаем пустой массив в случае ошибки
            res.json({
                success: true,
                sessions: []
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения сессий:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
};

// ========== ВЫХОД ==========
const logout = async (req, res) => {
    try {
        const sessionId = req.cookies?.session_id;
        const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
        
        if (sessionId && db) {
            try {
                // Удаляем сессию из БД
                await db.query(
                    'DELETE FROM auth_sessions WHERE id_session = $1',
                    [sessionId]
                );
            } catch (dbError) {
                console.log('⚠️ Не удалось удалить сессию:', dbError.message);
            }
        }
        
        // Очищаем cookie
        res.clearCookie('token');
        res.clearCookie('session_id');
        
        res.json({
            success: true,
            message: 'Выход выполнен успешно'
        });
        
    } catch (error) {
        console.error('Ошибка при выходе:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
};

// ========== ПРОВЕРКА ТОКЕНА ==========
const verifyToken = async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
        
        if (!token) {
            return res.json({
                success: false,
                message: 'Токен не предоставлен'
            });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        res.json({
            success: true,
            user: decoded
        });
        
    } catch (error) {
        res.json({
            success: false,
            message: 'Недействительный токен'
        });
    }
};

// ========== SQL ДЛЯ СОЗДАНИЯ ТАБЛИЦЫ СЕССИЙ ==========
const createSessionsTable = async () => {
    if (!db) return;
    
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS auth_sessions (
                id_session VARCHAR(255) PRIMARY KEY,
                id_auth INTEGER REFERENCES auth_principals(id_auth) ON DELETE CASCADE,
                user_agent TEXT,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Таблица auth_sessions создана или уже существует');
    } catch (error) {
        console.log('⚠️ Не удалось создать таблицу сессий:', error.message);
    }
};

// Вызываем создание таблицы при старте
createSessionsTable();

// ========== РОУТЫ ==========
router.post('/login', login);
router.post('/register', register);
router.get('/profile', authenticateToken, getProfile);
router.get('/sessions', authenticateToken, getSessions);
router.post('/logout', authenticateToken, logout);
router.get('/verify', verifyToken);

// Экспортируем middleware для использования в других роутах
router.authenticateToken = authenticateToken;

module.exports = router;