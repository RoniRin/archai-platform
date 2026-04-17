// auth-utils.js – только для клиента
(function() {
    'use strict';

    // ===== КЛАСС РАБОТАЕТ ТОЛЬКО В БРАУЗЕРЕ =====
    class AuthUtils {
        static saveToken(token) {
            if (!token) return;
            localStorage.setItem('jwt_token', token);
            localStorage.setItem('token', token);
            document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
        }

        static getToken() {
            return localStorage.getItem('jwt_token') || localStorage.getItem('token');
        }

        static removeToken() {
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
            document.cookie = 'session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
        }

        static saveUser(user) {
            if (user) {
                localStorage.setItem('user', JSON.stringify(user));
            }
        }

        static getUser() {
            const userStr = localStorage.getItem('user');
            try {
                return userStr ? JSON.parse(userStr) : null;
            } catch (e) {
                console.error('❌ Ошибка парсинга пользователя:', e);
                return null;
            }
        }

        static isAuthenticated() {
            return !!this.getToken();
        }

        static getAuthHeaders() {
            const token = this.getToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            return headers;
        }

        static async verifyToken() {
            try {
                const response = await fetch('/api/auth/verify', {
                    headers: this.getAuthHeaders()
                });
                return await response.json();
            } catch {
                return { success: false };
            }
        }

        static async checkAuthOnLoad() {
            if (!this.isAuthenticated()) {
                if (!['/login', '/register', '/forgot-password'].includes(window.location.pathname)) {
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

        static redirectIfAuthenticated(redirectTo = '/profile') {
            if (this.isAuthenticated()) {
                window.location.href = redirectTo;
                return true;
            }
            return false;
        }

        static requireAuth(redirectTo = '/login') {
            if (!this.isAuthenticated()) {
                window.location.href = redirectTo;
                return false;
            }
            return true;
        }

        static async fetchWithAuth(url, options = {}) {
            const token = this.getToken();
            if (!token) {
                throw new Error('Нет токена');
            }
            
            const headers = { 
                ...options.headers, 
                ...this.getAuthHeaders() 
            };
            
            const response = await fetch(url, { ...options, headers });
            
            if (response.status === 401) {
                this.removeToken();
                if (!['/login', '/register'].includes(window.location.pathname)) {
                    window.location.href = '/login?error=token_expired';
                }
                throw new Error('Сессия истекла');
            }
            
            return response;
        }
    }

    // ===== ДЕЛАЕМ ГЛОБАЛЬНО ДОСТУПНЫМ В БРАУЗЕРЕ =====
    if (typeof window !== 'undefined') {
        window.AuthUtils = AuthUtils;
    }

    // ===== ЗАЩИТА ОТ СЛУЧАЙНОГО ИСПОЛЬЗОВАНИЯ НА СЕРВЕРЕ =====
    if (typeof module !== 'undefined' && module.exports) {
        if (typeof window === 'undefined') {
            module.exports = {};
        } else {
            module.exports = AuthUtils;
        }
    }
})();