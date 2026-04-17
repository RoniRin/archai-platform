// auth-utils.js - ТОЛЬКО ДЛЯ КЛИЕНТА
// Если это сервер (Node.js), экспортируем пустой объект и выходим
if (typeof module !== 'undefined' && module.exports && typeof window === 'undefined') {
    console.log('⚠️ AuthUtils: серверная среда, экспортируем пустой объект');
    module.exports = {};
    // Здесь НЕ ИСПОЛЬЗУЕМ return на верхнем уровне
} else {
    // С этого места код выполняется только в браузере
    console.log('✅ AuthUtils: браузерная среда, инициализация...');

    class AuthUtils {
        // Сохранение токена
        static saveToken(token) {
            if (!token) return;
            
            localStorage.setItem('jwt_token', token);
            localStorage.setItem('token', token);
            document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
            console.log('✅ Токен сохранен');
        }

        // Получение токена
        static getToken() {
            return localStorage.getItem('jwt_token') || localStorage.getItem('token');
        }

        // Удаление токена
        static removeToken() {
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('last_email');
            localStorage.removeItem('archai_parameters');
            localStorage.removeItem('archai_selected_variant');
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
            console.log('🗑️ Все данные очищены');
        }
        
        // Обновление токена
        static updateToken(newToken) {
            if (newToken) {
                this.saveToken(newToken);
            }
        }
        
        // Сохранение пользователя
        static saveUser(user) {
            if (user) {
                localStorage.setItem('user', JSON.stringify(user));
                console.log('✅ Пользователь сохранен');
            }
        }

        // Получение пользователя
        static getUser() {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    return JSON.parse(userStr);
                } catch (e) {
                    console.error('❌ Ошибка парсинга пользователя:', e);
                    return null;
                }
            }
            return null;
        }

        // Проверка авторизации
        static isAuthenticated() {
            return !!this.getToken();
        }

        // Получение заголовков с токеном
        static getAuthHeaders() {
            const token = this.getToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            return headers;
        }

        // Проверка токена на сервере
        static async verifyToken() {
            try {
                const response = await fetch('/api/auth/verify', {
                    headers: this.getAuthHeaders()
                });
                return await response.json();
            } catch (error) {
                return { success: false, message: 'Ошибка проверки токена' };
            }
        }

        // Проверка при загрузке страницы
        static async checkAuthOnLoad() {
            if (!this.isAuthenticated()) {
                if (window.location.pathname !== '/login' && 
                    window.location.pathname !== '/register' &&
                    window.location.pathname !== '/forgot-password') {
                    window.location.href = '/login';
                }
                return false;
            }
            
            const result = await this.verifyToken();
            if (!result.success) {
                this.removeToken();
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login?error=session_expired';
                }
                return false;
            }
            
            return true;
        }

        // Редирект если не авторизован
        static requireAuth(redirectTo = '/login') {
            if (!this.isAuthenticated()) {
                window.location.href = redirectTo;
                return false;
            }
            return true;
        }

        // Редирект если уже авторизован
        static redirectIfAuthenticated(redirectTo = '/profile') {
            if (this.isAuthenticated()) {
                window.location.href = redirectTo;
                return true;
            }
            return false;
        }

        // Запрос с автоматическим добавлением токена
        static async fetchWithAuth(url, options = {}) {
            const token = this.getToken();
            
            if (!token) {
                console.warn('⚠️ Нет токена для запроса', url);
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                throw new Error('Нет токена авторизации');
            }
            
            const headers = {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            
            const response = await fetch(url, { ...options, headers });
            
            if (response.status === 401) {
                console.log('🔄 Токен истек, перенаправление на логин');
                this.removeToken();
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login?error=token_expired';
                }
                throw new Error('Сессия истекла');
            }
            
            return response;
        }
    }

    // Делаем класс глобально доступным в браузере
    if (typeof window !== 'undefined') {
        window.AuthUtils = AuthUtils;
        console.log('✅ AuthUtils доступен в браузере');
    }

    // Экспортируем для модулей
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AuthUtils;
    }
}