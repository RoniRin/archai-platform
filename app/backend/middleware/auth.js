const jwt = require('jsonwebtoken');

// ВАЖНО: используем ТОЛЬКО из process.env
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: JWT_SECRET не определен в middleware/auth.js!');
    process.exit(1);
}

// Middleware для защиты API маршрутов
exports.protectAPI = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Требуется авторизация'
            });
        }
        
        const token = authHeader.split(' ')[1];
        
        // Проверяем JWT токен - ТОТ ЖЕ СЕКРЕТ
        const decoded = jwt.verify(token, JWT_SECRET);
        
        req.user = decoded;
        req.userId = decoded.id_auth || decoded.id;
        req.token = token;
        
        console.log(`🛡️  Аутентифицирован: ${decoded.username || decoded.email} (ID: ${req.userId})`);
        next();
        
    } catch (error) {
        console.error('❌ Ошибка аутентификации:', error.message);
        
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

// Middleware для проверки аутентификации без блокировки
exports.isAuthenticated = (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            req.userId = decoded.id_auth || decoded.id;
            req.isAuthenticated = true;
        } catch (error) {
            req.isAuthenticated = false;
        }
    }
    
    req.isAuthenticated = req.isAuthenticated || false;
    next();
};