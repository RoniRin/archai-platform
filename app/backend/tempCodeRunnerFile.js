require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Простая проверка аутентификации
app.use((req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (token) {
        try {
            // Простая проверка токена
            req.isAuthenticated = true;
            // Здесь можно добавить реальную проверку JWT
        } catch (error) {
            req.isAuthenticated = false;
        }
    }
    req.isAuthenticated = req.isAuthenticated || false;
    next();
});

// Логирование запросов
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url} - ${new Date().toLocaleTimeString()} - Auth: ${req.isAuthenticated ? '✅' : '❌'}`);
    next();
});

// API Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Маршруты для HTML страниц
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/login', (req, res) => {
    if (req.isAuthenticated) {
        return res.redirect('/profile');
    }
    res.sendFile(path.join(__dirname, '..', 'pages', 'login.html'));
});

app.get('/register', (req, res) => {
    if (req.isAuthenticated) {
        return res.redirect('/profile');
    }
    res.sendFile(path.join(__dirname, '..', 'pages', 'register.html'));
});

app.get('/profile', (req, res) => {
    if (!req.isAuthenticated) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, '..', 'pages', 'profile.html'));
});

app.get('/history', (req, res) => {
    if (!req.isAuthenticated) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, '..', 'pages', 'history.html'));
});

app.get('/main', (req, res) => {
    if (!req.isAuthenticated) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, '..', 'pages', 'main.html'));
});

app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'pages', 'forgot-password.html'));
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

// Защищенный API (временная защита)
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

// ========== НОВЫЕ API ДЛЯ ПРОФИЛЯ ==========

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
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
        
        // Декодируем токен
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
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
        
        // Декодируем токен
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id_auth || decoded.id;
        
        const { username, surname, email } = req.body;
        
        // Валидация
        if (!username || !email) {
            return res.status(400).json({
                success: false,
                message: 'Имя пользователя и email обязательны'
            });
        }
        
        const db = require('./config/database');
        
        // Проверяем email на уникальность
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
        
        // Обновляем профиль
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
        
        // Обновляем токен с новыми данными
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

// Получение активных сессий
app.get('/api/auth/sessions', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Требуется авторизация'
        });
    }
    
    try {
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
        
        // Декодируем токен
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id_auth || decoded.id;
        
        const db = require('./config/database');
        
        // Хэшируем текущий токен для сравнения
        const sessionTokenHash = await bcrypt.hash(token, 10);
        
        const sessions = await db.query(
            `SELECT id_session, device_info, ip_address, created_at, last_activity,
                    session_token_hash = $1 as is_current
             FROM auth_sessions 
             WHERE id_auth = $2 AND is_revoked = false AND expires_at > NOW()
             ORDER BY last_activity DESC`,
            [sessionTokenHash, userId]
        );
        
        res.json({
            success: true,
            sessions: sessions.rows
        });
        
    } catch (error) {
        console.error('Ошибка получения сессий:', error);
        
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

// Отзыв других сессий
app.post('/api/auth/sessions/revoke-others', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Требуется авторизация'
        });
    }
    
    try {
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
        
        // Декодируем токен
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id_auth || decoded.id;
        
        const db = require('./config/database');
        
        // Хэшируем текущий токен
        const currentTokenHash = await bcrypt.hash(token, 10);
        
        // Отзываем все сессии кроме текущей
        await db.query(
            `UPDATE auth_sessions 
             SET is_revoked = true 
             WHERE id_auth = $1 
             AND session_token_hash != $2
             AND is_revoked = false`,
            [userId, currentTokenHash]
        );
        
        res.json({
            success: true,
            message: 'Все другие сессии отозваны'
        });
        
    } catch (error) {
        console.error('Ошибка отзыва сессий:', error);
        
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

// Выход из системы
app.post('/api/auth/logout', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'Токен не предоставлен'
        });
    }
    
    try {
        const db = require('./config/database');
        
        // Хэшируем токен для поиска в БД
        const sessionTokenHash = await bcrypt.hash(token, 10);
        
        // Отмечаем сессию как отозванную
        await db.query(
            'UPDATE auth_sessions SET is_revoked = true WHERE session_token_hash = $1',
            [sessionTokenHash]
        );
        
        res.json({
            success: true,
            message: 'Выход выполнен успешно'
        });
        
    } catch (error) {
        console.error('Ошибка выхода:', error);
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
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
        
        // Декодируем токен
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id_auth || decoded.id;
        
        console.log('🟢 Изменение пароля для пользователя ID:', userId);
        
        const { currentPassword, newPassword } = req.body;
        
        // Валидация
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Текущий и новый пароль обязательны'
            });
        }
        
        // Проверка сложности пароля
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Новый пароль должен содержать минимум 8 символов'
            });
        }
        
        const db = require('./config/database');
        
        // Получаем текущий хэш пароля из БД (используем pass_hash вместо password_hash)
        const userResult = await db.query(
            'SELECT pass_hash FROM auth_principals WHERE id_auth = $1',
            [userId]
        );
        
        console.log('🟢 Результат поиска пользователя:', userResult.rows);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        const currentPasswordHash = userResult.rows[0].pass_hash; // Изменили на pass_hash
        
        console.log('🟢 Хэш пароля найден:', !!currentPasswordHash);
        console.log('🟢 Длина хэша:', currentPasswordHash ? currentPasswordHash.length : 0);
        
        // Проверяем, что хэш существует и не пустой
        if (!currentPasswordHash || currentPasswordHash.trim() === '') {
            console.error('🔴 Ошибка: pass_hash пустой или null');
            return res.status(500).json({
                success: false,
                message: 'Ошибка: хэш пароля отсутствует в базе данных'
            });
        }
        
        // Проверяем текущий пароль
        console.log('🟢 Проверка пароля...');
        const isPasswordValid = await bcrypt.compare(currentPassword, currentPasswordHash);
        console.log('🟢 Валидность текущего пароля:', isPasswordValid);
        
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Текущий пароль неверен'
            });
        }
        
        // Проверяем, что новый пароль не совпадает с текущим
        if (currentPassword === newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Новый пароль должен отличаться от текущего'
            });
        }
        
        // Хэшируем новый пароль
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);
        
        // Обновляем пароль в БД (используем pass_hash)
        const updateResult = await db.query(
            `UPDATE auth_principals 
             SET pass_hash = $1, updated_at = NOW()
             WHERE id_auth = $2
             RETURNING id_auth, username, email`,
            [newPasswordHash, userId]
        );
        
        console.log('🟢 Результат обновления пароля:', updateResult.rowCount, 'записей обновлено');
        
        // Отзываем все сессии пользователя (кроме текущей)
        const currentTokenHash = await bcrypt.hash(token, 10);
        
        const revokeResult = await db.query(
            `UPDATE auth_sessions 
             SET is_revoked = true 
             WHERE id_auth = $1 
             AND session_token_hash != $2
             AND is_revoked = false`,
            [userId, currentTokenHash]
        );
        
        console.log('🟢 Отозвано сессий:', revokeResult.rowCount);
        
        res.json({
            success: true,
            message: 'Пароль успешно изменен. Все другие сессии отозваны.'
        });
        
    } catch (error) {
        console.error('🔴 Ошибка изменения пароля:', error.message);
        console.error('🔴 Stack trace:', error.stack);
        
        if (error.message.includes('Illegal arguments')) {
            console.error('🔴 Ошибка bcrypt: проверьте хэш пароля в БД');
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки пароля. Возможно, хэш поврежден.'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            console.error('🔴 JWT ошибка:', error.message);
            return res.status(401).json({
                success: false,
                message: 'Недействительный токен'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            console.error('🔴 Токен истек:', error.message);
            return res.status(401).json({
                success: false,
                message: 'Срок действия токена истек'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при изменении пароля: ' + error.message
        });
    }
});

// ========== API ДЛЯ ПРОЕКТОВ ==========

// Сохранение параметров проекта
// Сохранение параметров проекта
app.post('/api/projects/save', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Требуется авторизация'
        });
    }
    
    try {
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
        
        // Декодируем токен
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id_auth || decoded.id;
        
        console.log('🟢 Сохранение проекта для пользователя ID:', userId);
        console.log('🟢 Данные проекта:', JSON.stringify(req.body, null, 2));
        
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
        
        // Валидация обязательных полей
        if (!projectName || !floorCount || !sectionType) {
            return res.status(400).json({
                success: false,
                message: 'Обязательные поля: название проекта, этажность и тип секции'
            });
        }
        
        // Маппинг типов секций на человекочитаемые названия
        const sectionTypeMap = {
            'type1': 'Рядовая широтная',
            'type2': 'Рядовая меридиональная 1 коридорная',
            'type3': 'Рядовая меридиональная 2 коридорная',
            'type4': 'Угловая 90 градусов',
            'type5': 'Угловая 60 градусов',
            'type6': 'Угловая 135 градусов',
            'type7': 'Башня'
        };
        
        // Маппинг типов ЛЛУ на человекочитаемые названия
        const stairTypeMap = {
            'stair0': 'ЛЛУ (По умолчанию)',
            'stair1': 'ЛЛУ-28 (до 28м высоты)',
            'stair2': 'ЛЛУ-50 (до 50м высоты)',
            'stair3': 'ЛЛУ-75 (до 75м высоты)'
        };
        
        // Маппинг инженерных сетей
        const engineeringMap = {
            'ceiling': 'В потолке (подвесные потолки)',
            'wall': 'В стенах (технические ниши)',
            'floor': 'В полу (фальшполы)',
            'combined': 'Комбинированное (оптимальное)'
        };
        
        // Используем человекочитаемые названия
        const sectionName = sectionTypeMap[sectionType] || sectionType;
        const stairName = stairTypeMap[stairType] || stairType;
        const engineeringName = engineeringMap[engineeringLocation] || engineeringLocation;
        
        console.log('🟢 Преобразованные значения:');
        console.log('  - Тип секции:', sectionName);
        console.log('  - Тип ЛЛУ:', stairName);
        console.log('  - Инженерные сети:', engineeringName);
        
        const db = require('./config/database');
        
        // ДЕБАГ: Проверим, какие типы данных мы отправляем
        console.log('🟢 Типы данных для вставки:');
        console.log('  - sectionName (тип):', typeof sectionName, 'значение:', sectionName);
        console.log('  - stairName (тип):', typeof stairName, 'значение:', stairName);
        console.log('  - engineeringName (тип):', typeof engineeringName, 'значение:', engineeringName);
        
        // Проверка, что значения не undefined/null
        if (!sectionName || !stairName || !engineeringName) {
            console.error('🔴 Ошибка: одно из значений пустое!');
            console.error('  - sectionName:', sectionName);
            console.error('  - stairName:', stairName);
            console.error('  - engineeringName:', engineeringName);
            
            return res.status(400).json({
                success: false,
                message: 'Ошибка преобразования типов: одно из значений пустое'
            });
        }
        
        // Сохраняем параметры в БД
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
                String(projectName),
                parseInt(floorCount) || 5,
                String(sectionName), // Гарантируем строку
                String(stairName),   // Гарантируем строку
                parseInt(elevatorCount) || 1,
                parseFloat(corridorLength) || 15.0,
                String(apartmentRatio || '30-40-20-10'),
                parseInt(apartmentsPerFloor) || 4,
                parseFloat(maxApartmentArea) || 120.0,
                parseFloat(minEfficiency) || 0.75,
                parseFloat(constructionStep) || 3.0,
                parseFloat(apartmentDepth) || 12.0,
                parseFloat(corridorWidth) || 1.8,
                String(engineeringName) // Гарантируем строку
            ]
        );
        
        console.log('🟢 Проект сохранен, ID:', result.rows[0].id_project);
        
        res.json({
            success: true,
            message: 'Параметры проекта успешно сохранены',
            projectId: result.rows[0].id_project,
            createdAt: result.rows[0].created_at,
            sectionName: sectionName
        });
        
    } catch (error) {
        console.error('🔴 Ошибка сохранения параметров проекта:', error.message);
        console.error('🔴 Stack trace:', error.stack);
        
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Недействительный токен'
            });
        }
        
        // Проверяем ошибки БД
        if (error.code) {
            console.error('🔴 Код ошибки БД:', error.code);
            console.error('🔴 Сообщение БД:', error.message);
            console.error('🔴 Детали ошибки:', error);
            
            // Ошибка приведения типа (22P02)
            if (error.code === '22P02') {
                return res.status(400).json({
                    success: false,
                    message: `Ошибка типа данных: ${error.message}. 
                    Проверьте соответствие типов данных между фронтендом и БД. 
                    section: должен быть VARCHAR, получен: ${req.body.sectionType}`
                });
            }
            
            // Ошибка уникальности
            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    message: 'Проект с таким названием уже существует'
                });
            }
            
            // Ошибка внешнего ключа
            if (error.code === '23503') {
                return res.status(400).json({
                    success: false,
                    message: 'Пользователь не найден'
                });
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при сохранении параметров: ' + error.message
        });
    }
});
// ========== ОБРАБОТКА ОШИБОК ==========

// 404 для всех несуществующих маршрутов
app.use((req, res) => {
    // Если запрос на API
    if (req.path.startsWith('/api/')) {
        console.log(`🔴 404 API endpoint не найден: ${req.method} ${req.path}`);
        return res.status(404).json({
            success: false,
            message: 'API endpoint не найден',
            path: req.path
        });
    }
    
    // Если запрос на HTML страницу
    console.log(`🔴 404 Страница не найдена: ${req.path}`);
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>404 - Страница не найдена</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #e74c3c; }
                a { color: #3498db; text-decoration: none; }
            </style>
        </head>
        <body>
            <h1>404 - Страница не найдена</h1>
            <p>Страница <strong>${req.path}</strong> не существует.</p>
            <p><a href="/">Вернуться на главную</a></p>
        </body>
        </html>
    `);
});

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
    console.error('🔥 Ошибка сервера:', err.message);
    console.error(err.stack);
    
    // Для API возвращаем JSON
    if (req.path.startsWith('/api/')) {
        return res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
    
    // Для HTML возвращаем страницу ошибки
    res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>500 - Ошибка сервера</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #e74c3c; }
            </style>
        </head>
        <body>
            <h1>500 - Ошибка сервера</h1>
            <p>Произошла внутренняя ошибка сервера.</p>
            <p><a href="/">Вернуться на главную</a></p>
        </body>
        </html>
    `);
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
    console.log(`   📱 Сессии:         GET  http://localhost:${PORT}/api/auth/sessions`);
    console.log(`   🚫 Отозвать:       POST http://localhost:${PORT}/api/auth/sessions/revoke-others`);
    console.log(`   👋 Выход:          POST http://localhost:${PORT}/api/auth/logout`);
    console.log(`   🛡️  Защищенный:    GET  http://localhost:${PORT}/api/protected`);
    console.log('='.repeat(60));
});