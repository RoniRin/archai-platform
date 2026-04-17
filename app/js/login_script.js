// Добавьте этот код в ваш login_script.js
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем параметры URL (ошибки, успехи)
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const success = urlParams.get('success');
    
    if (error) {
        showNotification(decodeURIComponent(error), 'error');
    }
    if (success) {
        showNotification(decodeURIComponent(success), 'success');
    }
    
    // Автозаполнение если есть сохраненный email
    const savedEmail = localStorage.getItem('last_email');
    if (savedEmail && document.getElementById('email')) {
        document.getElementById('email').value = savedEmail;
    }
});

async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    // Сохраняем email для удобства
    localStorage.setItem('last_email', email);
    
    // Валидация
    if (!email || !password) {
        showNotification('Пожалуйста, заполните все поля', 'error');
        return;
    }
    
    // Индикатор загрузки
    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
    submitBtn.disabled = true;
    
    try {
        console.log('🔑 Отправка запроса входа...');
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        console.log('📥 Ответ сервера:', response.status);
        
        const data = await response.json();
        console.log('📊 Данные ответа:', data);
        
        if (data.success) {
            showNotification('Вход выполнен успешно!', 'success');
            
            // Сохраняем токен
            if (data.token) {
                localStorage.setItem('jwt_token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Устанавливаем cookie для серверного middleware
                document.cookie = `token=${data.token}; path=/; max-age=${24 * 60 * 60}`; // 24 часа
                
                console.log('✅ Токен сохранен:', data.token.substring(0, 20) + '...');
            }
            
            // Перенаправление через 1 секунду
            setTimeout(() => {
                window.location.href = '/profile';
            }, 1000);
            
        } else {
            showNotification(data.message || 'Ошибка входа', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('❌ Ошибка соединения:', error);
        showNotification('Ошибка соединения с сервером', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Функция показа уведомлений (если нет в toasts.js)
function showNotification(message, type = 'info') {
    // Проверяем есть ли глобальная функция
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    
    // Создаем свое уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Автоматическое скрытие
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
    
    // Закрытие по клику
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
}

// Добавьте стили для уведомлений в login.html
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-left: 4px solid;
        padding: 15px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
        min-width: 300px;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    }
    
    .notification.success {
        border-color: #27ae60;
        background: #d4edda;
        color: #155724;
    }
    
    .notification.error {
        border-color: #e74c3c;
        background: #f8d7da;
        color: #721c24;
    }
    
    .notification.info {
        border-color: #3498db;
        background: #d1ecf1;
        color: #0c5460;
    }
    
    .notification-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .notification-message {
        flex: 1;
    }
    
    .notification-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        margin-left: 10px;
        color: inherit;
    }
    
    .fade-out {
        animation: fadeOut 0.3s ease forwards;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);