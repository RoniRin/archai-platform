

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Генерация токена для auth_principals
exports.generateToken = (user) => {
    try {
        return jwt.sign(
            {
                id_auth: user.id_auth,  // ⬅️ изменено с id на id_auth
                email: user.email,
                username: user.username,
                surname: user.surname    // ⬅️ добавлено surname
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
    } catch (error) {
        console.error('❌ Ошибка генерации JWT:', error.message);
        throw error;
    }
};

// Middleware для проверки аутентификации
exports.authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            // Для HTML страниц перенаправляем на логин
            if (req.accepts('html')) {
                return res.redirect('/login');
            }
            // Для API возвращаем JSON ошибку
            return res.status(401).json({
                success: false,
                message: 'Токен не предоставлен'
            });
        }
        
        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Неверный формат токена'
            });
        }
        
        // Проверяем токен
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Добавляем информацию о пользователе в запрос
        req.user = decoded;
        req.userId = decoded.id_auth;  // ⬅️ изменено на id_auth
        
        next();
    } catch (error) {
        console.error('❌ Ошибка проверки JWT:', error.message);
        
        if (req.accepts('html')) {
            // Для HTML страниц перенаправляем на логин
            return res.redirect('/login?error=token_expired');
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Срок действия токена истек'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Неверный токен'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Ошибка аутентификации'
        });
    }
};

// Дополнительная функция для проверки сессии в БД
exports.checkSessionInDB = async (token, userId) => {
    try {
        const db = require('./database');
        
        // Хэшируем токен для сравнения с хранимым в БД
        const sessionTokenHash = await bcrypt.hash(token, 10);
        
        const sessionCheck = await db.query(
            `SELECT * FROM auth_sessions 
             WHERE id_auth = $1 
             AND session_token_hash = $2
             AND is_revoked = false 
             AND expires_at > NOW()`,
            [userId, sessionTokenHash]
        );
        
        return sessionCheck.rows.length > 0;
    } catch (error) {
        console.error('❌ Ошибка проверки сессии в БД:', error.message);
        return false;
    }
};