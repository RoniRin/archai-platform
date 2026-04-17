// notifications.js - Управление уведомлениями без рекурсии

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.init();
    }

    init() {
        // Создаем контейнер для уведомлений
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 5000) {
        console.log(`📢 Показываем уведомление: ${type} - ${message}`);
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            background: white;
            border-left: 4px solid;
            padding: 15px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            min-width: 300px;
            max-width: 400px;
            animation: slideIn 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        // Цвета для разных типов
        const colors = {
            success: { border: '#27ae60', bg: '#d4edda', text: '#155724' },
            error: { border: '#e74c3c', bg: '#f8d7da', text: '#721c24' },
            info: { border: '#3498db', bg: '#d1ecf1', text: '#0c5460' }
        };
        
        const color = colors[type] || colors.info;
        notification.style.borderLeftColor = color.border;
        notification.style.backgroundColor = color.bg;
        notification.style.color = color.text;
        
        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="flex: 1; font-size: 14px; line-height: 1.4;">${message}</span>
                <button class="notification-close" style="
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    margin-left: 10px;
                    color: inherit;
                    opacity: 0.7;
                ">&times;</button>
            </div>
        `;
        
        this.container.appendChild(notification);
        this.notifications.push(notification);
        
        // Обработчик закрытия
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.remove(notification));
        
        // Автоматическое удаление
        if (duration > 0) {
            setTimeout(() => this.remove(notification), duration);
        }
        
        return notification;
    }

    remove(notification) {
        if (!notification.parentNode) return;
        
        notification.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications = this.notifications.filter(n => n !== notification);
        }, 300);
    }

    clearAll() {
        this.notifications.forEach(notification => this.remove(notification));
    }
}

// Глобальный экземпляр
window.notificationManager = new NotificationManager();

// Глобальная функция для обратной совместимости
window.showNotification = function(message, type = 'info') {
    return window.notificationManager.show(message, type);
};

// Добавляем стили анимаций
const style = document.createElement('style');
style.textContent = `
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