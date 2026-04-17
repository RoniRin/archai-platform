const path = require('path');
const fs = require('fs');

// Сначала определяем путь к .env файлу
const envPath = path.join(__dirname, '.env');
console.log('🔍 Путь к .env файлу:', envPath);
console.log('📁 Файл существует:', fs.existsSync(envPath) ? '✅' : '❌');

// Загружаем .env из ПРАВИЛЬНОГО пути
require('dotenv').config({ path: envPath });

// Теперь проверяем JWT_SECRET
console.log('🔑 JWT_SECRET после загрузки:', process.env.JWT_SECRET ? '✅ загружен' : '❌ ОТСУТСТВУЕТ');
if (!process.env.JWT_SECRET) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: JWT_SECRET не найден в .env!');
    console.error('📁 Содержимое .env файла:');
    try {
        const content = fs.readFileSync(envPath, 'utf8');
        console.log(content);
    } catch (e) {
        console.error('❌ Не удалось прочитать .env файл:', e.message);
    }
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

console.log('🔑 JWT_SECRET используется, длина:', JWT_SECRET.length);

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    exposedHeaders: ['Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..')));

// Список публичных маршрутов (не требующих аутентификации)
const PUBLIC_ROUTES = [
    '/login',
    '/register',
    '/forgot-password',
    '/api/auth/login',
    '/api/auth/register',
    '/api/health',
    '/',
    '/reset-session'  // Добавляем маршрут сброса
];

// ===== УЛУЧШЕННАЯ ПРОВЕРКА АУТЕНТИФИКАЦИИ =====
app.use((req, res, next) => {
    // Для API запросов не делаем редиректы
    if (req.path.startsWith('/api/')) {
        const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
        
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                req.user = decoded;
                req.userId = decoded.id_auth || decoded.id;
                req.isAuthenticated = true;
            } catch (error) {
                req.isAuthenticated = false;
                req.user = null;
                req.userId = null;
            }
        } else {
            req.isAuthenticated = false;
            req.user = null;
            req.userId = null;
        }
        return next();
    }
    
    // Проверяем, является ли маршрут публичным
    const isPublicRoute = PUBLIC_ROUTES.some(route => 
        req.path === route || req.path.startsWith(route + '?')
    );
    
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
        try {
            // Реальная проверка JWT токена
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            req.userId = decoded.id_auth || decoded.id;
            req.isAuthenticated = true;
            
            if (!isPublicRoute) {
                console.log(`✅ Токен валиден: ${decoded.email || decoded.username}`);
            }
        } catch (error) {
            // Токен невалидный - очищаем
            console.log(`❌ Невалидный токен: ${error.message}`);
            req.isAuthenticated = false;
            req.user = null;
            req.userId = null;
            res.clearCookie('token');
        }
    } else {
        req.isAuthenticated = false;
        req.user = null;
        req.userId = null;
    }
    
    next();
});

// Логирование запросов
app.use((req, res, next) => {
    const authStatus = req.isAuthenticated ? '✅' : '❌';
    console.log(`📨 ${req.method} ${req.url} - ${new Date().toLocaleTimeString()} - Auth: ${authStatus}`);
    next();
});

// API Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Подключаем защищенные роуты генерации
const { protectAPI } = require('./middleware/auth');
const generateRoutes = require('./routes/generate');
app.use('/api', protectAPI, generateRoutes);

// ===== ЭКСТРЕННЫЙ МАРШРУТ ДЛЯ СБРОСА СЕССИИ =====
app.get('/reset-session', (req, res) => {
    console.log('🔄 Экстренный сброс сессии');
    res.clearCookie('token');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Сброс сессии</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    height: 100vh;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }
                .container {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    text-align: center;
                }
                h1 { font-size: 2.5em; margin-bottom: 20px; }
                p { font-size: 1.2em; margin-bottom: 30px; }
                a {
                    display: inline-block;
                    padding: 12px 30px;
                    background: white;
                    color: #667eea;
                    text-decoration: none;
                    border-radius: 25px;
                    font-weight: bold;
                    transition: transform 0.3s;
                }
                a:hover { transform: scale(1.05); }
                .loader {
                    border: 3px solid rgba(255,255,255,0.3);
                    border-top: 3px solid white;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 20px auto;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔄 Сброс сессии</h1>
                <p>Ваша сессия была очищена. Перенаправляем на страницу входа...</p>
                <div class="loader"></div>
                <p><small>Если перенаправление не происходит, <a href="/login">нажмите здесь</a></small></p>
            </div>
            <script>
                localStorage.clear();
                sessionStorage.clear();
                setTimeout(() => { window.location.href = '/login'; }, 2000);
            </script>
        </body>
        </html>
    `);
});

// ===== МАРШРУТ ВЫХОДА =====
app.post('/api/auth/logout', (req, res) => {
    console.log('🚪 Выход из системы');
    res.clearCookie('token');
    res.json({ success: true, message: 'Выход выполнен успешно' });
});

// ===== МАРШРУТЫ ДЛЯ HTML СТРАНИЦ =====

// Публичные маршруты (доступны без авторизации)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/login', (req, res) => {
    // Защита от бесконечного цикла
    if (req.isAuthenticated) {
        // Проверяем, не пришли ли мы с профиля (цикл)
        if (req.headers.referer && req.headers.referer.includes('/profile')) {
            console.log('⚠️ Обнаружен цикл, принудительно показываем страницу логина');
            res.clearCookie('token');
            return res.sendFile(path.join(__dirname, '..', 'pages', 'login.html'));
        }
        console.log('🔄 Пользователь уже авторизован, перенаправление на /profile');
        return res.redirect('/profile');
    }
    res.sendFile(path.join(__dirname, '..', 'pages', 'login.html'));
});

app.get('/register', (req, res) => {
    // Защита от бесконечного цикла
    if (req.isAuthenticated) {
        if (req.headers.referer && req.headers.referer.includes('/profile')) {
            console.log('⚠️ Обнаружен цикл, принудительно показываем страницу регистрации');
            res.clearCookie('token');
            return res.sendFile(path.join(__dirname, '..', 'pages', 'register.html'));
        }
        console.log('🔄 Пользователь уже авторизован, перенаправление на /profile');
        return res.redirect('/profile');
    }
    res.sendFile(path.join(__dirname, '..', 'pages', 'register.html'));
});

app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'pages', 'forgot-password.html'));
});

// Защищенные маршруты (требуют авторизации)
app.get('/profile', (req, res) => {
    if (!req.isAuthenticated) {
        console.log('🔄 Неавторизованный доступ к /profile, перенаправление на /login');
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, '..', 'pages', 'profile.html'));
});

app.get('/history', (req, res) => {
    if (!req.isAuthenticated) {
        console.log('🔄 Неавторизованный доступ к /history, перенаправление на /login');
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, '..', 'pages', 'history.html'));
});

app.get('/main', (req, res) => {
    if (!req.isAuthenticated) {
        console.log('🔄 Неавторизованный доступ к /main, перенаправление на /login');
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, '..', 'pages', 'main.html'));
});

// ========== API ENDPOINTS ==========

// Публичный эндпоинт для проверки здоровья
app.get('/api/health', async (req, res) => {
    try {
        const db = require('./config/database');
        const dbCheck = await db.query('SELECT NOW() as db_time');
        
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            service: 'ArchAI Backend',
            version: '1.0.0',
            database: 'PostgreSQL',
            dbTime: dbCheck.rows[0]?.db_time,
            authentication: req.isAuthenticated ? 'AUTHENTICATED' : 'GUEST',
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: 'Ошибка проверки',
            authentication: 'GUEST'
        });
    }
});

// Защищенный API
app.get('/api/protected', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Требуется авторизация'
        });
    }
    
    res.json({
        success: true,
        message: 'Это защищенный маршрут API',
        timestamp: new Date().toISOString()
    });
});

// Получение профиля пользователя
app.get('/api/auth/profile', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Требуется авторизация'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const db = require('./config/database');
        const user = await db.query(
            'SELECT id_auth, username, email, surname, created_at FROM auth_principals WHERE id_auth = $1',
            [decoded.id_auth || decoded.id]
        );
        
        if (user.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        res.json({
            success: true,
            user: user.rows[0]
        });
        
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Недействительный токен'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// Обновление профиля
app.put('/api/auth/update-profile', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Требуется авторизация'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id_auth || decoded.id;
        
        const { username, surname, email } = req.body;
        
        if (!username || !email) {
            return res.status(400).json({
                success: false,
                message: 'Имя пользователя и email обязательны'
            });
        }
        
        const db = require('./config/database');
        
        const existingEmail = await db.query(
            'SELECT id_auth FROM auth_principals WHERE email = $1 AND id_auth != $2',
            [email, userId]
        );
        
        if (existingEmail.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Этот email уже используется другим пользователем'
            });
        }
        
        const result = await db.query(
            `UPDATE auth_principals 
             SET username = $1, surname = $2, email = $3, updated_at = NOW()
             WHERE id_auth = $4
             RETURNING id_auth, username, surname, email, created_at`,
            [username, surname || '', email, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        const updatedToken = jwt.sign(
            {
                id_auth: result.rows[0].id_auth,
                username: result.rows[0].username,
                email: result.rows[0].email,
                surname: result.rows[0].surname
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Обновляем куку
        res.cookie('token', updatedToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        
        res.json({
            success: true,
            message: 'Профиль обновлен',
            user: result.rows[0],
            token: updatedToken
        });
        
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Недействительный токен'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// Изменение пароля
app.put('/api/auth/change-password', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Требуется авторизация'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id_auth || decoded.id;
        
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Текущий и новый пароль обязательны'
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Новый пароль должен содержать минимум 8 символов'
            });
        }
        
        const db = require('./config/database');
        
        const userResult = await db.query(
            'SELECT pass_hash FROM auth_principals WHERE id_auth = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        const currentPasswordHash = userResult.rows[0].pass_hash;
        
        const isPasswordValid = await bcrypt.compare(currentPassword, currentPasswordHash);
        
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Текущий пароль неверен'
            });
        }
        
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);
        
        await db.query(
            'UPDATE auth_principals SET pass_hash = $1, updated_at = NOW() WHERE id_auth = $2',
            [newPasswordHash, userId]
        );
        
        res.json({
            success: true,
            message: 'Пароль успешно изменен'
        });
        
    } catch (error) {
        console.error('Ошибка изменения пароля:', error);
        
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Недействительный токен'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// Сохранение проекта
app.post('/api/projects/save', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Требуется авторизация'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id_auth || decoded.id;
        
        const {
            projectName,
            floorCount,
            sectionType,
            stairType,
            elevatorCount,
            corridorLength,
            apartmentRatio,
            apartmentsPerFloor,
            maxApartmentArea,
            minEfficiency,
            constructionStep,
            apartmentDepth,
            corridorWidth,
            engineeringLocation
        } = req.body;
        
        if (!projectName || !floorCount || !sectionType) {
            return res.status(400).json({
                success: false,
                message: 'Обязательные поля: название проекта, этажность и тип секции'
            });
        }
        
        const db = require('./config/database');
        
        const result = await db.query(
            `INSERT INTO project_parameters (
                id_auth, project_name, floor_count, section, lly, 
                elevator_count, corridor_length, apartmentography, 
                max_appart_count, max_appart_area, min_coefficient, 
                construction_step, apart_depth, corridor_width, engineering
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id_project, created_at`,
            [
                userId,
                projectName,
                floorCount,
                sectionType,
                stairType || '',
                elevatorCount || 1,
                corridorLength || 15.0,
                apartmentRatio || '30-40-20-10',
                apartmentsPerFloor || 4,
                maxApartmentArea || 120.0,
                minEfficiency || 0.75,
                constructionStep || 3.0,
                apartmentDepth || 12.0,
                corridorWidth || 1.8,
                engineeringLocation || 'combined'
            ]
        );
        
        res.json({
            success: true,
            message: 'Параметры проекта успешно сохранены',
            projectId: result.rows[0].id_project,
            createdAt: result.rows[0].created_at
        });
        
    } catch (error) {
        console.error('Ошибка сохранения проекта:', error);
        
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Недействительный токен'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// Получение истории проектов
app.get('/api/projects/history', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Требуется авторизация'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id_auth || decoded.id;
        
        const db = require('./config/database');
        
        const projects = await db.query(
            `SELECT id_project, project_name, floor_count, section, created_at
             FROM project_parameters 
             WHERE id_auth = $1
             ORDER BY created_at DESC`,
            [userId]
        );
        
        res.json({
            success: true,
            projects: projects.rows
        });
        
    } catch (error) {
        console.error('Ошибка получения истории:', error);
        
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Недействительный токен'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// ========== ТЕСТОВЫЙ ЭНДПОИНТ ГЕНЕРАЦИИ ==========
app.post('/api/test-generate', protectAPI, (req, res) => {
    console.log('🧪 Тестовая генерация, пользователь:', req.userId);
    
    // Возвращаем тестовые данные
    res.json({
        success: true,
        message: 'Тестовая генерация',
        data: {
            variants: [
                {
                    id: 1,
                    name: 'Вариант 1 - Компактный',
                    efficiency: 0.85,
                    description: 'Оптимальное соотношение площади и функциональности',
                    stats: {
                        apartments: '4 кв. на этаже',
                        total: '20 квартир всего',
                        area: '380 м²'
                    }
                },
                {
                    id: 2,
                    name: 'Вариант 2 - Инновационный',
                    efficiency: 0.82,
                    description: 'Современная планировка с улучшенным освещением',
                    stats: {
                        apartments: '3 кв. на этаже',
                        total: '15 квартир всего',
                        area: '420 м²'
                    }
                },
                {
                    id: 3,
                    name: 'Вариант 3 - Просторный',
                    efficiency: 0.79,
                    description: 'Увеличенные площади квартир',
                    stats: {
                        apartments: '2 кв. на этаже',
                        total: '10 квартир всего',
                        area: '450 м²'
                    }
                }
            ]
        }
    });
});

// ========== ОБРАБОТКА ОШИБОК ==========

// 404 для всех несуществующих маршрутов
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'API endpoint не найден',
            path: req.path
        });
    }
    
    res.status(404).sendFile(path.join(__dirname, '..', 'pages', '404.html'));
});

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
    console.error('🔥 Ошибка сервера:', err);
    
    if (req.path.startsWith('/api/')) {
        return res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
    
    res.status(500).send('500 - Внутренняя ошибка сервера');
});

// Запуск сервера
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🚀 ArchAI Server запущен!');
    console.log('='.repeat(60));
    console.log(`📍 Порт: ${PORT}`);
    console.log(`🌐 Локальный URL: http://localhost:${PORT}`);
    console.log('='.repeat(60));
    console.log('📋 Доступные страницы:');
    console.log(`   📍 Главная:        http://localhost:${PORT}/`);
    console.log(`   🔐 Вход:           http://localhost:${PORT}/login`);
    console.log(`   📝 Регистрация:    http://localhost:${PORT}/register`);
    console.log(`   👤 Профиль:        http://localhost:${PORT}/profile`);
    console.log(`   🔧 История:        http://localhost:${PORT}/history`);
    console.log(`   🏠 Основная:       http://localhost:${PORT}/main`);
    console.log(`   🔓 Сброс пароля:   http://localhost:${PORT}/forgot-password`);
    console.log(`   🔄 Сброс сессии:   http://localhost:${PORT}/reset-session`);
    console.log('='.repeat(60));
    console.log('🔧 API Endpoints:');
    console.log(`   📍 Проверка API:   http://localhost:${PORT}/api/health`);
    console.log(`   📝 Регистрация:    POST http://localhost:${PORT}/api/auth/register`);
    console.log(`   🔑 Авторизация:    POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   👤 Профиль:        GET  http://localhost:${PORT}/api/auth/profile`);
    console.log(`   ✏️  Обновить:       PUT  http://localhost:${PORT}/api/auth/update-profile`);
    console.log(`   🔐 Изм. пароль:    PUT  http://localhost:${PORT}/api/auth/change-password`);
    console.log(`   🏗️  Сохр. проект:  POST http://localhost:${PORT}/api/projects/save`);
    console.log(`   📚 История:        GET  http://localhost:${PORT}/api/projects/history`);
    console.log(`   🛡️  Защищенный:    GET  http://localhost:${PORT}/api/protected`);
    console.log(`   🚪 Выход:          POST http://localhost:${PORT}/api/auth/logout`);
    console.log(`   🧪 Тест генерации: POST http://localhost:${PORT}/api/test-generate`);
    console.log('='.repeat(60));
});