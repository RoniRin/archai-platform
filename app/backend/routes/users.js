const express = require('express');
const router = express.Router();

// Получение профиля пользователя
router.get('/profile', (req, res) => {
    res.json({
        success: true,
        message: 'API профиля пользователя',
        endpoint: 'GET /api/users/profile'
    });
});

// Обновление профиля
router.put('/profile', (req, res) => {
    res.json({
        success: true,
        message: 'Обновление профиля',
        endpoint: 'PUT /api/users/profile'
    });
});

module.exports = router;