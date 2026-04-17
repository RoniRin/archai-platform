// toasts.js - Всплывающие уведомления (тосты) для всех страниц

const ToastNotifications = (function() {
    let container = null;
    
    // Типы уведомлений и их настройки
    const types = {
        success: {
            icon: '✓',
            color: '#2e7d32',
            bgColor: 'rgba(46, 125, 50, 0.1)'
        },
        error: {
            icon: '✕',
            color: '#e3503e',
            bgColor: 'rgba(227, 80, 62, 0.1)'
        },
        warning: {
            icon: '!',
            color: '#f39c12',
            bgColor: 'rgba(243, 156, 18, 0.1)'
        },
        info: {
            icon: 'i',
            color: '#1c2340',
            bgColor: 'rgba(28, 35, 64, 0.1)'
        }
    };
    
    // Создание контейнера, если его нет
    function createContainer() {
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }
    
    // Показ уведомления
    function show(type, title, message, duration = 5000) {
        const container = createContainer();
        const config = types[type] || types.info;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="toast-icon" style="background: ${config.color}">${config.icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Закрыть">&times;</button>
        `;
        
        container.appendChild(toast);
        
        // Анимация появления
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Закрытие по клику на крестик
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            hideToast(toast);
        });
        
        // Закрытие по клику на тост (опционально)
        toast.addEventListener('click', (e) => {
            if (e.target === toast || e.target.closest('.toast-content')) {
                hideToast(toast);
            }
        });
        
        // Автоматическое закрытие
        if (duration > 0) {
            setTimeout(() => {
                hideToast(toast);
            }, duration);
        }
        
        return toast;
    }
    
    // Скрытие уведомления
    function hideToast(toast) {
        if (!toast) return;
        
        toast.classList.remove('show');
        toast.classList.add('hiding');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 400);
    }
    
    // Вспомогательные функции для разных типов уведомлений
    function success(title, message, duration = 3000) {
        return show('success', title, message, duration);
    }
    
    function error(title, message, duration = 4000) {
        return show('error', title, message, duration);
    }
    
    function warning(title, message, duration = 4000) {
        return show('warning', title, message, duration);
    }
    
    function info(title, message, duration = 4000) {
        return show('info', title, message, duration);
    }
    
    // Уведомление с подтверждением
    function confirm(title, message, onConfirm, onCancel = null) {
        const toast = show('warning', title, message, 0);
        
        const content = toast.querySelector('.toast-content');
        const buttons = document.createElement('div');
        buttons.className = 'toast-buttons';
        
        buttons.innerHTML = `
            <button class="toast-btn toast-btn-confirm">Подтвердить</button>
            <button class="toast-btn toast-btn-cancel">Отмена</button>
        `;
        
        content.appendChild(buttons);
        
        const confirmBtn = buttons.querySelector('.toast-btn-confirm');
        const cancelBtn = buttons.querySelector('.toast-btn-cancel');
        
        confirmBtn.addEventListener('click', () => {
            if (typeof onConfirm === 'function') onConfirm();
            hideToast(toast);
        });
        
        cancelBtn.addEventListener('click', () => {
            if (typeof onCancel === 'function') onCancel();
            hideToast(toast);
        });
        
        return toast;
    }
    
    // Инициализация (если нужно добавить глобальные обработчики)
    function init() {
        createContainer();
    }
    
    return {
        init: init,
        show: show,
        success: success,
        error: error,
        warning: warning,
        info: info,
        confirm: confirm,
        hide: hideToast
    };
})();
// Система уведомлений
document.addEventListener('DOMContentLoaded', function() {
    // Создаем контейнер для уведомлений если его нет
    if (!document.getElementById('notification-container')) {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
});

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Иконки для разных типов
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    // Тексты заголовков
    const titles = {
        success: 'Успешно!',
        error: 'Ошибка!',
        warning: 'Внимание!',
        info: 'Информация'
    };
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="${icons[type] || icons.info}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${titles[type] || titles.info}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Автоматическое удаление через 5 секунд
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Добавляем CSS анимации если их нет
if (!document.querySelector('#toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        .notification-container {
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            width: 100%;
        }
        
        .notification {
            background: white;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: flex-start;
            animation: slideIn 0.3s ease;
            border-left: 4px solid #3498db;
            max-width: 350px;
        }
        
        .notification.success {
            border-left-color: #2ecc71;
        }
        
        .notification.error {
            border-left-color: #e74c3c;
        }
        
        .notification.warning {
            border-left-color: #f39c12;
        }
        
        .notification.info {
            border-left-color: #3498db;
        }
        
        .notification-icon {
            margin-right: 12px;
            font-size: 20px;
        }
        
        .notification.success .notification-icon {
            color: #2ecc71;
        }
        
        .notification.error .notification-icon {
            color: #e74c3c;
        }
        
        .notification.warning .notification-icon {
            color: #f39c12;
        }
        
        .notification.info .notification-icon {
            color: #3498db;
        }
        
        .notification-content {
            flex: 1;
        }
        
        .notification-title {
            font-weight: 600;
            margin-bottom: 4px;
            font-size: 14px;
        }
        
        .notification-message {
            font-size: 13px;
            line-height: 1.4;
            color: #333;
        }
        
        .notification-close {
            background: none;
            border: none;
            font-size: 14px;
            cursor: pointer;
            color: #95a5a6;
            margin-left: 10px;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .notification-close:hover {
            color: #7f8c8d;
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
        
        @keyframes slideOut {
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
}

// Экспортируем функцию в глобальную область видимости
window.showNotification = showNotification;

// Функция для тестирования уведомлений
function testNotifications() {
    showNotification('Тестовое информационное сообщение', 'info');
    setTimeout(() => showNotification('Тестовое успешное сообщение', 'success'), 1000);
    setTimeout(() => showNotification('Тестовое предупреждение', 'warning'), 2000);
    setTimeout(() => showNotification('Тестовая ошибка', 'error'), 3000);
}
// Экспорт для глобального использования
window.Toast = ToastNotifications;