// profile.js - Логика страницы профиля

document.addEventListener('DOMContentLoaded', function() {
  // Проверяем, что Toast загружен
  if (typeof Toast === 'undefined') {
    console.error('Toast notifications not loaded!');
    return;
  }
  
  // Инициализируем Toast
  Toast.init();
  
  // Элементы страницы
  const saveBtn = document.querySelector('.btn-primary');
  const logoutBtn = document.querySelector('.btn-outline');
  const changePasswordBtn = document.querySelector('.btn-ghost');
  const deleteAccountBtn = document.querySelector('.btn-ghost[style*="color: #e3503e"]');
  const helpBtn = document.querySelector('.btn-ghost:not([style*="color: #e3503e"])');
  const formInputs = document.querySelectorAll('.profile-form input');
  
  // Валидация формы при сохранении
  saveBtn.addEventListener('click', function(e) {
    e.preventDefault();
    
    let hasErrors = false;
    const errors = [];
    
    formInputs.forEach(input => {
      const field = input.closest('.field');
      
      if (input.value.trim() === '') {
        field.classList.add('error');
        hasErrors = true;
        errors.push(`Поле "${input.previousElementSibling.textContent.trim()}" не заполнено`);
      } else {
        field.classList.remove('error');
        
        // Валидация email
        if (input.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(input.value.trim())) {
            field.classList.add('error');
            hasErrors = true;
            errors.push('Некорректный email адрес');
          }
        }
      }
    });
    
    if (!hasErrors) {
      // Показываем уведомление об успехе
      Toast.success(
        'Успешно!',
        'Изменения профиля успешно сохранены.',
        3000
      );
      
      // Здесь можно добавить отправку данных на сервер
      // Пример:
      // fetch('/api/profile/update', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     name: document.querySelector('input[type="text"]').value,
      //     email: document.querySelector('input[type="email"]').value
      //   })
      // })
      
      // Анимация успешного сохранения
      saveBtn.innerHTML = '<i class="fas fa-check"></i> Сохранено';
      saveBtn.style.background = 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)';
      
      setTimeout(() => {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить изменения';
        saveBtn.style.background = '';
      }, 2000);
      
    } else {
      // Показываем уведомление об ошибке
      Toast.error(
        'Ошибка сохранения',
        errors.join('<br>') || 'Пожалуйста, заполните все поля корректно.',
        4000
      );
    }
  });
  
  // Выход из аккаунта
  logoutBtn.addEventListener('click', function(e) {
    e.preventDefault();
    
    Toast.confirm(
      'Подтверждение выхода',
      'Вы действительно хотите выйти из аккаунта?',
      function() {
        // При подтверждении
        Toast.info('Выход', 'Выполняется выход из системы...', 2000);
        
        // Имитация задержки перед выходом
        setTimeout(() => {
          // Здесь должна быть логика выхода (очистка токенов, сессий и т.д.)
          // localStorage.removeItem('authToken');
          // sessionStorage.clear();
          
          // Перенаправление на страницу входа
          window.location.href = '../pages/login.html';
        }, 1500);
      },
      function() {
        // При отмене
        Toast.info('Отменено', 'Выход отменён.', 2000);
      }
    );
  });
  
  // Изменение пароля
  changePasswordBtn.addEventListener('click', function(e) {
    e.preventDefault();
    
    // Показываем уведомление о будущей функции
    Toast.info(
      'Смена пароля',
      'Функция смены пароля будет доступна в следующем обновлении.',
      3000
    );
    
    // Можно заменить на модальное окно для смены пароля
    // Пример:
    // const newPassword = prompt('Введите новый пароль:');
    // if (newPassword) {
    //   Toast.success('Пароль изменён', 'Новый пароль установлен.', 3000);
    // }
  });
  
  // Удаление аккаунта
  deleteAccountBtn.addEventListener('click', function(e) {
    e.preventDefault();
    
    Toast.confirm(
      'Удаление аккаунта',
      'ВНИМАНИЕ: Это действие необратимо!<br>Все ваши данные и проекты будут удалены без возможности восстановления.',
      function() {
        // Подтверждение удаления
        Toast.confirm(
          'Последнее подтверждение',
          'Вы уверены на 100%? Это приведет к полному удалению вашего аккаунта.',
          function() {
            Toast.error(
              'Удаление аккаунта',
              'Аккаунт помечен на удаление. Это займет до 24 часов.',
              5000
            );
            
            // Здесь должна быть логика удаления аккаунта
            // Пример:
            // fetch('/api/profile/delete', { method: 'DELETE' })
            //   .then(() => {
            //     window.location.href = '/';
            //   });
          },
          function() {
            Toast.info('Отменено', 'Удаление аккаунта отменено.', 2000);
          }
        );
      },
      function() {
        Toast.info('Отменено', 'Удаление аккаунта отменено.', 2000);
      }
    );
  });
  
  // Помощь и поддержка
  helpBtn.addEventListener('click', function(e) {
    e.preventDefault();
    
    Toast.info(
      'Помощь и поддержка',
      'Свяжитесь с нами по email: support@archai.com',
      5000
    );
  });
  
  // Обработка переключателей настроек
  const switches = document.querySelectorAll('.switch input');
  switches.forEach(switchEl => {
    switchEl.addEventListener('change', function() {
      const settingName = this.closest('.setting-item').querySelector('h4').textContent;
      const isChecked = this.checked;
      
      // Показываем уведомление о изменении настройки
      const status = isChecked ? 'включена' : 'выключена';
      Toast.info(
        'Настройка изменена',
        `${settingName} ${status}.`,
        2000
      );
      
      // Здесь можно добавить сохранение настройки на сервер
      // Пример:
      // fetch('/api/settings/update', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     [this.name]: isChecked
      //   })
      // });
    });
  });
  
  // Обработка кнопок проектов
  const projectButtons = document.querySelectorAll('.project-actions .btn-small');
  projectButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      const projectName = this.closest('.project-item').querySelector('.project-name').textContent;
      const action = this.textContent.trim();
      
      if (action.includes('Открыть')) {
        Toast.info('Открытие проекта', `Открываем проект "${projectName}"...`, 2000);
        // window.location.href = `/projects/${projectId}`;
      } else if (action.includes('PDF')) {
        Toast.success('Скачивание', `PDF проекта "${projectName}" готовится к скачиванию.`, 3000);
        // window.open(`/projects/${projectId}/pdf`);
      } else if (action.includes('Статистика')) {
        Toast.info('Статистика', `Загружаем статистику проекта "${projectName}"...`, 2000);
        // window.location.href = `/projects/${projectId}/stats`;
      }
    });
  });
  
  // Добавляем обработку нажатия Enter в полях формы
  formInputs.forEach(input => {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveBtn.click();
      }
    });
  });
  
  // Демонстрационное уведомление при загрузке страницы
  setTimeout(() => {
    Toast.info(
      'Добро пожаловать!',
      'Вы можете изменить свои данные и настройки на этой странице.',
      4000
    );
  }, 1000);
});
document.addEventListener('DOMContentLoaded', async function() {
    // Проверяем авторизацию
    if (!AuthUtils.requireAuth()) {
        return;
    }
    
    try {
        // Загружаем профиль
        const response = await AuthUtils.fetchWithAuth('/api/auth/profile');
        const data = await response.json();
        
        if (data.success) {
            // Отображаем данные
            if (document.getElementById('username')) {
                document.getElementById('username').textContent = data.user.username;
            }
            if (document.getElementById('email')) {
                document.getElementById('email').textContent = data.user.email;
            }
            if (document.getElementById('surname')) {
                document.getElementById('surname').textContent = data.user.surname || 'Не указано';
            }
            if (document.getElementById('userId')) {
                document.getElementById('userId').textContent = data.user.id_auth;
            }
            if (document.getElementById('createdAt')) {
                const date = new Date(data.user.created_at);
                document.getElementById('createdAt').textContent = date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU');
            }
            
            // Загружаем сессии
            await loadSessions();
        } else {
            // Если ошибка авторизации, делаем выход
            if (data.message.includes('токен') || data.message.includes('авторизация')) {
                AuthUtils.removeToken();
                window.location.href = '/login';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
    }
});

async function loadSessions() {
    try {
        const response = await AuthUtils.fetchWithAuth('/api/auth/sessions');
        const data = await response.json();
        
        if (data.success && document.getElementById('sessionsList')) {
            const sessionsList = document.getElementById('sessionsList');
            sessionsList.innerHTML = data.sessions.map(session => `
                <div class="session-item">
                    <div><strong>Устройство:</strong> ${session.device_info || 'Неизвестно'}</div>
                    <div><strong>IP:</strong> ${session.ip_address || 'Неизвестно'}</div>
                    <div><strong>Создана:</strong> ${new Date(session.created_at).toLocaleString('ru-RU')}</div>
                    <div><strong>Последняя активность:</strong> ${new Date(session.last_activity || session.created_at).toLocaleString('ru-RU')}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Ошибка загрузки сессий:', error);
    }
}

// Выход
async function logout() {
    try {
        await AuthUtils.fetchWithAuth('/api/auth/logout', {
            method: 'POST'
        });
    } catch (error) {
        // Игнорируем ошибки при выходе
    } finally {
        AuthUtils.removeToken();
        window.location.href = '/login';
    }
}