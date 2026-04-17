document.addEventListener('DOMContentLoaded', async function() {
    // Проверяем авторизацию
    if (!AuthUtils.requireAuth()) {
        return;
    }
    
    // Показываем приветствие
    const user = AuthUtils.getUser();
    if (user && document.getElementById('welcomeUser')) {
        document.getElementById('welcomeUser').textContent = user.username;
    }
    
    // Загружаем защищенные данные
    await loadProtectedData();
});

async function loadProtectedData() {
    try {
        const response = await AuthUtils.fetchWithAuth('/api/protected');
        const data = await response.json();
        
        if (data.success) {
            console.log('Защищенные данные:', data);
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// ==================== МОДАЛЬНЫЕ ОКНА И УВЕДОМЛЕНИЯ ====================
const HelpModal = (function() {
    const helpModal = document.getElementById('helpModal');
    const helpTitle = document.getElementById('helpTitle');
    const helpBody = document.getElementById('helpBody');
    const helpClose = document.getElementById('helpClose');
    
    function init() {
        console.log('HelpModal инициализирован');
        
        if (!helpModal || !helpClose) {
            console.error('HelpModal: элементы не найдены');
            return;
        }
        
        document.querySelectorAll('.help-button').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const title = this.getAttribute('data-title');
                const content = this.getAttribute('data-content');
                
                if (helpTitle) helpTitle.textContent = title || 'Подсказка';
                if (helpBody) helpBody.innerHTML = content || 'Нет информации';
                
                openModal();
            });
        });
        
        helpClose.addEventListener('click', function(e) {
            e.preventDefault();
            closeModal();
        });
        
        helpModal.addEventListener('click', function(e) {
            if (e.target === helpModal) {
                closeModal();
            }
        });
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && helpModal.classList.contains('active')) {
                closeModal();
            }
        });
    }
    
    function openModal() {
        if (helpModal) {
            helpModal.classList.add('active');
        }
    }
    
    function closeModal() {
        if (helpModal) {
            helpModal.classList.remove('active');
        }
    }
    
    return {
        init: init,
        openModal: openModal,
        closeModal: closeModal
    };
})();

// ==================== ВАЛИДАЦИЯ ДАННЫХ ====================
const Validation = (function() {
    function formatApartmentRatio() {
        const apartmentRatioInput = document.getElementById('apartmentRatio');
        if (!apartmentRatioInput) return;
        
        let value = apartmentRatioInput.value.replace(/[^\d]/g, '');
        
        if (value.length > 2) value = value.substring(0, 2) + '-' + value.substring(2);
        if (value.length > 5) value = value.substring(0, 5) + '-' + value.substring(5);
        if (value.length > 8) value = value.substring(0, 8) + '-' + value.substring(8);
        if (value.length > 11) value = value.substring(0, 11);
        
        apartmentRatioInput.value = value;
        validateApartmentRatio();
    }
    
    function validateApartmentRatio() {
        const apartmentRatioInput = document.getElementById('apartmentRatio');
        if (!apartmentRatioInput || !apartmentRatioInput.value) return { isValid: true, message: '' };
        
        const value = apartmentRatioInput.value;
        const parts = value.split('-').map(Number);
        
        apartmentRatioInput.classList.remove('valid', 'invalid', 'warning');
        
        if (parts.length !== 4 || parts.some(isNaN)) {
            apartmentRatioInput.classList.add('invalid');
            return { 
                isValid: false, 
                message: 'Неверный формат. Используйте: X-X-X-X (например: 30-40-20-10)' 
            };
        }
        
        const sum = parts.reduce((a, b) => a + b, 0);
        if (sum !== 100) {
            apartmentRatioInput.classList.add('warning');
            return { 
                isValid: false, 
                message: `Сумма процентов должна быть 100% (сейчас: ${sum}%)` 
            };
        }
        
        apartmentRatioInput.classList.add('valid');
        return { isValid: true, message: 'Формат корректен' };
    }
    
    function validateNumberField(inputId, min, max) {
        const input = document.getElementById(inputId);
        if (!input) return { isValid: true, message: '' };
        
        const value = parseFloat(input.value);
        
        input.classList.remove('valid', 'invalid', 'warning');
        
        if (isNaN(value)) {
            input.classList.add('invalid');
            return { isValid: false, message: 'Введите число' };
        }
        
        if (value < min || value > max) {
            input.classList.add('invalid');
            return { 
                isValid: false, 
                message: `Значение должно быть от ${min} до ${max}` 
            };
        }
        
        if (value === 0) {
            input.classList.add('warning');
            return { isValid: false, message: 'Значение не должно быть 0' };
        }
        
        input.classList.add('valid');
        return { isValid: true, message: '' };
    }
    
    function validateAllFields() {
        let isValid = true;
        const errors = [];
        
        const requiredFields = [
            { id: 'floorCount', type: 'number', min: 5, max: 35 },
            { id: 'sectionType', type: 'select' },
            { id: 'stairType', type: 'select' },
            { id: 'elevatorCount', type: 'number', min: 0, max: 4 },
            { id: 'corridorLength', type: 'number', min: 5, max: 40 },
            { id: 'apartmentsPerFloor', type: 'number', min: 1, max: 20 },
            { id: 'maxApartmentArea', type: 'number', min: 20, max: 500 },
            { id: 'minEfficiency', type: 'number', min: 0.5, max: 0.95 },
            { id: 'constructionStep', type: 'number', min: 1.0, max: 6.0 },
            { id: 'apartmentDepth', type: 'number', min: 5, max: 20 },
            { id: 'corridorWidth', type: 'number', min: 1.2, max: 3.0 },
            { id: 'engineeringLocation', type: 'select' }
        ];
        
        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (!element) return;
            
            if (field.type === 'select') {
                if (!element.value) {
                    element.classList.add('invalid');
                    isValid = false;
                    errors.push(`${getFieldName(field.id)}: необходимо выбрать значение`);
                } else {
                    element.classList.remove('invalid');
                    element.classList.add('valid');
                }
            } else if (field.type === 'number') {
                const result = validateNumberField(field.id, field.min, field.max);
                if (!result.isValid) {
                    isValid = false;
                    errors.push(`${getFieldName(field.id)}: ${result.message}`);
                }
            }
        });
        
        const apartmentRatioResult = validateApartmentRatio();
        if (!apartmentRatioResult.isValid) {
            isValid = false;
            errors.push(`Квартирография: ${apartmentRatioResult.message}`);
        }
        
        return { isValid, errors };
    }
    
    function getFieldName(id) {
        const names = {
            'floorCount': 'Этажность секции',
            'sectionType': 'Тип секции',
            'stairType': 'Тип лестничной клетки',
            'elevatorCount': 'Количество лифтов',
            'corridorLength': 'Предельная длина коридора',
            'apartmentsPerFloor': 'Максимальное количество квартир на этаже',
            'maxApartmentArea': 'Максимальная площадь квартиры',
            'minEfficiency': 'Минимальный коэффициент эффективности',
            'constructionStep': 'Шаг конструкции',
            'apartmentDepth': 'Глубина квартиры в осях',
            'corridorWidth': 'Ширина коридора МОП',
            'engineeringLocation': 'Расположение инженерных сетей',
            'apartmentRatio': 'Квартирография'
        };
        
        return names[id] || id;
    }
    
    return {
        formatApartmentRatio: formatApartmentRatio,
        validateApartmentRatio: validateApartmentRatio,
        validateNumberField: validateNumberField,
        validateAllFields: validateAllFields
    };
})();

// ==================== УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ ====================
const UI = (function() {
    function checkFloorConditions() {
        const floorCountInput = document.getElementById('floorCount');
        const elevatorCountInput = document.getElementById('elevatorCount');
        const stairTypeSelect = document.getElementById('stairType');
        const stairInfo = document.getElementById('stairInfo');
        const elevatorInfo = document.getElementById('elevatorInfo');
        
        if (!floorCountInput || !floorCountInput.value) {
            console.warn('checkFloorConditions: floorCountInput не найден');
            return;
        }
        
        const floors = parseInt(floorCountInput.value);
        
        if (floors < 5) {
            floorCountInput.classList.add('invalid');
            return;
        } else {
            floorCountInput.classList.remove('invalid');
            floorCountInput.classList.add('valid');
        }
        
        if (floors <= 9) {
            if (elevatorCountInput) {
                elevatorCountInput.value = 1;
                elevatorCountInput.classList.add('valid');
            }
            if (elevatorInfo) elevatorInfo.textContent = 'Рекомендуется: 1 лифт (для зданий до 9 этажей)';
            if (stairTypeSelect) {
                stairTypeSelect.value = 'stair1';
                stairTypeSelect.classList.add('valid');
            }
            if (stairInfo) stairInfo.textContent = 'Рекомендуется: ЛЛУ-28 (для зданий до 28м)';
        } else if (floors <= 17) {
            if (elevatorCountInput) {
                elevatorCountInput.value = 2;
                elevatorCountInput.classList.add('valid');
            }
            if (elevatorInfo) elevatorInfo.textContent = 'Рекомендуется: 2 лифта (для зданий 10-17 этажей)';
            if (stairTypeSelect) {
                stairTypeSelect.value = 'stair2';
                stairTypeSelect.classList.add('valid');
            }
            if (stairInfo) stairInfo.textContent = 'Рекомендуется: ЛЛУ-50 (для зданий до 50м)';
        } else {
            if (elevatorCountInput) {
                elevatorCountInput.value = 3;
                elevatorCountInput.classList.add('valid');
            }
            if (elevatorInfo) elevatorInfo.textContent = 'Рекомендуется: 3 лифта (для зданий выше 17 этажей)';
            if (stairTypeSelect) {
                stairTypeSelect.value = 'stair3';
                stairTypeSelect.classList.add('valid');
            }
            if (stairInfo) stairInfo.textContent = 'Рекомендуется: ЛЛУ-75 (для зданий до 75м)';
        }
    }
    
    function initNumberFieldValidation() {
        const numberInputs = document.querySelectorAll('.form-input[type="number"]');
        
        numberInputs.forEach(input => {
            input.addEventListener('input', function() {
                const value = parseFloat(this.value);
                const min = parseFloat(this.min);
                const max = parseFloat(this.max);
                
                this.classList.remove('valid', 'invalid', 'warning');
                
                if (isNaN(value) || value < min || value > max) {
                    this.classList.add('invalid');
                } else if (value === 0) {
                    this.classList.add('warning');
                } else {
                    this.classList.add('valid');
                }
            });
        });
    }
    
    function generateLayoutOptions(params) {
        const { apartmentsPerFloor, maxApartmentArea, minEfficiency, floorCount } = params;
        
        const variants = [
            {
                id: 1,
                title: 'Вариант 1 - Компактный',
                description: 'Этот вариант максимизирует эффективность с компактным дизайном коридоров и оптимальным распределением квартир.',
                efficiency: Math.min(0.95, minEfficiency + 0.12),
                apartments: apartmentsPerFloor,
                area: Math.round(apartmentsPerFloor * maxApartmentArea * 0.9),
                totalApartments: apartmentsPerFloor * floorCount,
                downloads: ['P0:3', 'DVK6', 'JFEG']
            },
            {
                id: 2,
                title: 'Вариант 2 - Инновационный',
                efficiency: Math.min(0.95, minEfficiency + 0.07),
                apartments: Math.max(2, apartmentsPerFloor - 1),
                area: Math.round(Math.max(2, apartmentsPerFloor - 1) * maxApartmentArea * 0.85),
                totalApartments: Math.max(2, apartmentsPerFloor - 1) * floorCount,
                downloads: ['P0:2', 'DVK6', 'JFEG']
            },
            {
                id: 3,
                title: 'Вариант 3 - Просторный',
                efficiency: Math.min(0.95, minEfficiency + 0.04),
                apartments: apartmentsPerFloor + 1,
                area: Math.round((apartmentsPerFloor + 1) * maxApartmentArea * 0.8),
                totalApartments: (apartmentsPerFloor + 1) * floorCount,
                downloads: ['P0:4', 'DVK6', 'JFEG']
            }
        ];
        
        return variants.map(variant => `
            <div class="layout-item">
                <div class="layout-header">
                    <div class="layout-title">${variant.title}</div>
                    <span class="efficiency-badge">Эффективность: ${(variant.efficiency * 100).toFixed(1)}%</span>
                </div>
                <div class="layout-desc">${variant.description}</div>
                <div class="layout-stats">
                    <div class="stat-item">
                        <i class="fas fa-home"></i>
                        <span>${variant.apartments} кв. на этаже</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-building"></i>
                        <span>Всего квартир: ${variant.totalApartments}</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-ruler-combined"></i>
                        <span>${variant.area} м² общая площадь на этаже</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-check-circle"></i>
                        <span>Соответствует всем нормам</span>
                    </div>
                </div>
                <div class="layout-buttons">
                    ${variant.downloads.map(file => 
                        `<button class="btn-secondary download-btn" data-file="${file}"><i class="fas fa-download"></i> ${file}</button>`
                    ).join('')}
                    <button class="select-btn" data-variant="${variant.id}">Выбрать этот вариант</button>
                </div>
            </div>
        `).join('');
    }
    
    function showNotification(message, type = 'info') {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="${icons[type] || icons.info}"></i>
            </div>
            <div class="notification-content">
                ${message}
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    return {
        checkFloorConditions: checkFloorConditions,
        initNumberFieldValidation: initNumberFieldValidation,
        generateLayoutOptions: generateLayoutOptions,
        showNotification: showNotification
    };
})();

// ==================== ОСНОВНОЙ МОДУЛЬ ПРИЛОЖЕНИЯ ====================
const ArchAI = (function() {
    function init() {
        console.log('Планировщик ArchAI инициализирован');
        
        HelpModal.init();
        UI.initNumberFieldValidation();
        initEventHandlers();
        UI.checkFloorConditions();
        loadSavedParameters();
    }
    
    function initEventHandlers() {
        const floorCountInput = document.getElementById('floorCount');
        if (floorCountInput) {
            floorCountInput.addEventListener('input', function() {
                UI.checkFloorConditions();
                saveParameters();
            });
            floorCountInput.addEventListener('change', UI.checkFloorConditions);
        }
        
        const apartmentRatioInput = document.getElementById('apartmentRatio');
        if (apartmentRatioInput) {
            apartmentRatioInput.addEventListener('input', Validation.formatApartmentRatio);
            apartmentRatioInput.addEventListener('blur', Validation.validateApartmentRatio);
        }
        
        document.querySelectorAll('.form-select').forEach(select => {
            select.addEventListener('change', saveParameters);
        });
        
        document.querySelectorAll('.form-input[type="number"]').forEach(input => {
            input.addEventListener('change', saveParameters);
        });
        
        const generateButton = document.getElementById('applyParams');
        if (generateButton) {
            generateButton.addEventListener('click', generatePlans);
        }
    }
    
    function generatePlans() {
        const generateButton = document.getElementById('applyParams');
        if (!generateButton) return;
        
        const validationResult = Validation.validateAllFields();
        
        if (!validationResult.isValid) {
            const errorMessage = validationResult.errors.join('\n• ');
            UI.showNotification('Пожалуйста, исправьте ошибки:\n• ' + errorMessage, 'error');
            return;
        }
        
        const originalText = generateButton.innerHTML;
        generateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Генерация планов...';
        generateButton.disabled = true;
        
        const formData = {};
        document.querySelectorAll('.form-input, .form-select').forEach(input => {
            if (input.id) {
                formData[input.id] = input.value;
            }
        });
        
        formData.projectName = 'Проект от ' + new Date().toLocaleString();
        
        AuthUtils.fetchWithAuth('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                UI.showNotification('Проект успешно сгенерирован!', 'success');
                displayResultsFromServer(data.data, data.projectId);
            } else {
                UI.showNotification('Ошибка генерации: ' + data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            UI.showNotification('Ошибка соединения с сервером', 'error');
        })
        .finally(() => {
            generateButton.innerHTML = originalText;
            generateButton.disabled = false;
        });
    }
    
    function displayResultsFromServer(result, projectId) {
        const resultsSection = document.getElementById('resultsSection');
        if (!resultsSection) return;
        
        resultsSection.innerHTML = '';
        
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'layouts-card';
        
        const title = document.createElement('h3');
        title.className = 'section-title';
        title.textContent = 'Готовые решения';
        resultsContainer.appendChild(title);
        
        const layoutOptions = document.createElement('div');
        layoutOptions.className = 'layout-options';
        layoutOptions.id = 'layoutOptions';
        
        if (result.variants && result.variants.length > 0) {
            layoutOptions.innerHTML = result.variants.map((variant, index) => {
                const variantNumber = index + 1;
                const variantName = variant.name || `Вариант ${variantNumber}`;
                const description = variant.description || `Планировочное решение №${variantNumber}`;
                const efficiency = variant.efficiency ? (variant.efficiency * 100).toFixed(1) : '80.0';
                
                return `
                    <div class="layout-item" data-variant-id="${variant.id || variantNumber}">
                        <div class="layout-header">
                            <div class="layout-title">${variantName}</div>
                            <span class="efficiency-badge">Эффективность: ${efficiency}%</span>
                        </div>
                        <div class="layout-desc">${description}</div>
                        <div class="layout-stats">
                            <div class="stat-item">
                                <i class="fas fa-home"></i>
                                <span>${variant.apartment_count || 4} кв. на этаже</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-building"></i>
                                <span>Всего квартир: ${variant.total_apartments || 20}</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-ruler-combined"></i>
                                <span>Общая площадь: ${Math.round(variant.area || 400)} м²</span>
                            </div>
                        </div>
                        <div class="layout-buttons">
                            <button class="btn-secondary download-dxf" 
                                    data-project-id="${projectId}" 
                                    data-variant-id="${variantNumber}">
                                <i class="fas fa-download"></i> Скачать DXF
                            </button>
                            <button class="select-btn" 
                                    data-project-id="${projectId}" 
                                    data-variant-id="${variantNumber}">
                                Выбрать этот вариант
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            layoutOptions.innerHTML = '<p>Нет доступных вариантов</p>';
        }
        
        resultsContainer.appendChild(layoutOptions);
        resultsSection.appendChild(resultsContainer);
        resultsSection.style.display = 'block';
        
        setTimeout(() => {
            initVariantSelection(projectId);
            initDownloadButtons(projectId);
        }, 100);
        
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
    }
    
    function initVariantSelection(projectId) {
        document.querySelectorAll('.select-btn').forEach(btn => {
            // Удаляем старые обработчики
            btn.replaceWith(btn.cloneNode(true));
        });
        
        document.querySelectorAll('.select-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const variantId = this.getAttribute('data-variant-id');
                
                AuthUtils.fetchWithAuth('/api/select-variant', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId, variantId })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.querySelectorAll('.select-btn').forEach(b => {
                            b.style.background = '';
                            b.style.color = '';
                            b.innerHTML = 'Выбрать этот вариант';
                        });
                        
                        this.style.background = '#1c2340';
                        this.style.color = 'white';
                        this.innerHTML = '<i class="fas fa-check"></i> Выбран';
                        
                        UI.showNotification('Вариант сохранен!', 'success');
                    } else {
                        UI.showNotification('Ошибка при сохранении', 'error');
                    }
                })
                .catch(error => {
                    console.error('Ошибка:', error);
                    UI.showNotification('Ошибка соединения', 'error');
                });
            });
        });
    }
    
    function initDownloadButtons(projectId) {
        document.querySelectorAll('.download-dxf').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        document.querySelectorAll('.download-dxf').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const variantId = this.getAttribute('data-variant-id');
                const token = localStorage.getItem('token') || 
                            document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
                
                if (!token) {
                    console.error('❌ Токен не найден');
                    UI.showNotification('Ошибка авторизации: токен не найден', 'error');
                    return;
                }
                
                console.log('🔑 Токен для скачивания:', token.substring(0, 20) + '...');
                
                const downloadUrl = `/api/download/${projectId}/${variantId}`;
                console.log('📥 Скачивание файла:', downloadUrl);
                
                UI.showNotification('Начинается загрузка DXF файла...', 'info');
                
                // Используем fetch для проверки авторизации
                fetch(downloadUrl, {
                    method: 'GET',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/dxf'
                    }
                })
                .then(response => {
                    console.log('📊 Статус ответа:', response.status);
                    
                    if (response.status === 401) {
                        UI.showNotification('Ошибка авторизации. Пожалуйста, войдите снова.', 'error');
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 2000);
                        throw new Error('Unauthorized');
                    }
                    
                    if (!response.ok) {
                        return response.json().then(data => {
                            throw new Error(data.message || 'Ошибка загрузки');
                        });
                    }
                    
                    return response.blob();
                })
                .then(blob => {
                    console.log('📦 Получен файл, размер:', blob.size);
                    
                    // Создаем ссылку для скачивания
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `variant_${variantId}.dxf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    
                    UI.showNotification('Файл успешно загружен', 'success');
                })
                .catch(error => {
                    console.error('❌ Ошибка:', error);
                    UI.showNotification('Ошибка при загрузке файла: ' + error.message, 'error');
                });
            });
        });
    }
    
    function saveParameters() {
        const parameters = {};
        document.querySelectorAll('.form-input, .form-select').forEach(input => {
            if (input.id) parameters[input.id] = input.value;
        });
        
        try {
            localStorage.setItem('archai_parameters', JSON.stringify(parameters));
        } catch (error) {
            console.error('Ошибка сохранения параметров:', error);
        }
    }
    
    function loadSavedParameters() {
        try {
            const saved = localStorage.getItem('archai_parameters');
            if (!saved) return;
            
            const parameters = JSON.parse(saved);
            
            Object.keys(parameters).forEach(id => {
                const element = document.getElementById(id);
                if (element) element.value = parameters[id];
            });
            
            UI.checkFloorConditions();
            Validation.validateApartmentRatio();
        } catch (error) {
            console.error('Ошибка загрузки параметров:', error);
        }
    }
    
    function clearParameters() {
        if (confirm('Вы уверены, что хотите очистить все сохраненные параметры?')) {
            localStorage.removeItem('archai_parameters');
            localStorage.removeItem('archai_selected_variant');
            location.reload();
        }
    }
    
    return {
        init: init,
        generatePlans: generatePlans,
        saveParameters: saveParameters,
        loadSavedParameters: loadSavedParameters,
        clearParameters: clearParameters
    };
})();

// ==================== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ====================
document.addEventListener('DOMContentLoaded', function() {
    // Добавляем стили для уведомлений
    const style = document.createElement('style');
    style.textContent = `
        .form-input.valid { border-color: #27ae60 !important; background-color: rgba(39, 174, 96, 0.05); }
        .form-input.invalid { border-color: #e74c3c !important; background-color: rgba(231, 76, 60, 0.05); }
        .form-input.warning { border-color: #f39c12 !important; background-color: rgba(243, 156, 18, 0.05); }
        .form-select.valid { border-color: #27ae60 !important; }
        .form-select.invalid { border-color: #e74c3c !important; }
        
        .notification-container {
            position: fixed; top: 80px; right: 20px; z-index: 10000;
            max-width: 400px; width: 100%;
        }
        
        .notification {
            background: white; border-radius: 8px; padding: 16px; margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: flex-start;
            animation: slideIn 0.3s ease; border-left: 4px solid #3498db;
        }
        
        .notification.success { border-left-color: #2ecc71; }
        .notification.error { border-left-color: #e74c3c; }
        .notification.warning { border-left-color: #f39c12; }
        .notification.info { border-left-color: #3498db; }
        
        .notification-icon { margin-right: 12px; font-size: 20px; }
        .notification-content { flex: 1; font-size: 14px; line-height: 1.4; white-space: pre-line; }
        .notification-close {
            background: none; border: none; font-size: 14px; cursor: pointer;
            color: #95a5a6; margin-left: 10px; padding: 0; width: 20px; height: 20px;
            display: flex; align-items: center; justify-content: center;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        .layout-item {
            background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e0e0e0;
        }
        
        .layout-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .layout-title { font-weight: 600; font-size: 18px; color: #1c2340; }
        .efficiency-badge {
            background: #2ecc71; color: white; padding: 5px 10px;
            border-radius: 20px; font-size: 14px; font-weight: 500;
        }
        
        .layout-desc { color: #666; margin-bottom: 15px; line-height: 1.5; }
        
        .layout-stats {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px; margin-bottom: 20px; background: #f8f9fa;
            padding: 15px; border-radius: 6px;
        }
        
        .stat-item { display: flex; align-items: center; gap: 8px; }
        .stat-item i { color: #3498db; width: 20px; }
        
        .layout-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
        
        .select-btn {
            background: #1c2340; color: white; border: none; padding: 10px 20px;
            border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.3s;
        }
        .select-btn:hover { background: #2c3558; }
    `;
    document.head.appendChild(style);
    
    ArchAI.init();
    
    window.ArchAI = ArchAI;
    window.UI = UI;
    window.Validation = Validation;
    window.HelpModal = HelpModal;
});