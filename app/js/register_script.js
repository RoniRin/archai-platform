// register_script.js
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, не авторизован ли пользователь
    if (typeof AuthUtils !== 'undefined') {
        AuthUtils.redirectIfAuthenticated('/profile');
    }
    
    const form = document.getElementById('registerForm');
    if (!form) {
        console.error('Форма регистрации не найдена');
        return;
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username')?.value.trim();
        const surname = document.getElementById('surname')?.value.trim();
        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const terms = document.getElementById('terms')?.checked;
        
        // Валидация
        if (!username || !email || !password || !confirmPassword) {
            alert('Пожалуйста, заполните все поля');
            return;
        }
        
        if (password !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }
        
        if (password.length < 8) {
            alert('Пароль должен содержать минимум 8 символов');
            return;
        }
        
        if (!terms) {
            alert('Необходимо согласие с условиями');
            return;
        }
        
        // Блокируем кнопку
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';
        submitBtn.disabled = true;
        
        try {
            console.log('Отправка запроса регистрации...');
            
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, surname, email, password })
            });
            
            console.log('Статус ответа:', response.status);
            
            // Проверяем, что ответ вообще есть
            if (!response.ok) {
                let errorMsg = `Ошибка сервера: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (e) {
                    // Если не удалось распарсить JSON
                }
                throw new Error(errorMsg);
            }
            
            const data = await response.json();
            console.log('Данные ответа:', data);
            
            if (data.success) {
                // Сохраняем данные
                if (typeof AuthUtils !== 'undefined') {
                    AuthUtils.saveToken(data.token);
                    AuthUtils.saveUser(data.user);
                    console.log('Данные сохранены');
                }
                
                alert('Регистрация успешна!');
                
                // Перенаправляем на профиль
                window.location.href = '/profile';
            } else {
                alert(data.message || 'Ошибка регистрации');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
            
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            alert(error.message || 'Ошибка соединения с сервером');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
});