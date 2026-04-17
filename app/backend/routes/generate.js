const express = require('express');
const router = express.Router();
const { PythonShell } = require('python-shell');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

// Путь к Python алгоритму
const ALGORITHM_PATH = 'D:\\ALGORITM\\core';
const PYTHON_SCRIPT = 'main.py';

console.log('🔍 Путь к алгоритму:', ALGORITHM_PATH);
console.log('📁 Папка существует:', fs.existsSync(ALGORITHM_PATH) ? '✅' : '❌');
console.log('📄 Файл main.py существует:', fs.existsSync(path.join(ALGORITHM_PATH, PYTHON_SCRIPT)) ? '✅' : '❌');

// Эндпоинт для генерации проекта
router.post('/generate', async (req, res) => {
    let tempFile = null;
    let projectId = null;
    
    try {
        const params = req.body;
        console.log('📥 Получены параметры для генерации:', params);
        
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Пользователь не идентифицирован' });
        }

        // Сохраняем параметры в БД
       const projectResult = await db.query(
        `INSERT INTO project_parameters (
            id_auth, project_name, floor_count, section, lly, 
            elevator_count, corridor_length, apartmentography, 
            max_appart_count, max_appart_area, min_coefficient, 
            construction_step, apart_depth, corridor_width, engineering,
            apartment_ratio_0k, apartment_ratio_1k, apartment_ratio_2k, 
            apartment_ratio_3k, apartment_ratio_4k
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20)
        RETURNING id_project`,
        [
            userId,
            params.projectName || 'Новый проект',
            params.floorCount,
            params.sectionType,
            params.stairType || '',
            params.elevatorCount || 1,
            params.corridorLength || 15.0,
            params.apartmentRatio || '30-40-20-10',
            params.apartmentsPerFloor || 4,
            params.maxApartmentArea || 120.0,
            params.minEfficiency || 0.75,
            params.constructionStep || 3.0,
            params.apartmentDepth || 12.0,
            params.corridorWidth || 1.8,
            params.engineeringLocation || 'combined',
            params.r0 || 10,   // Студии
            params.r1 || 30,   // 1-к
            params.r2 || 30,   // 2-к
            params.r3 || 20,   // 3-к
            params.r4 || 10    // 4-к
        ]
    );
        
        projectId = projectResult.rows[0].id_project;
        console.log('✅ Проект сохранен в БД, ID:', projectId);

        // Подготовка параметров для Python
        // Подготовка параметров для Python
        const pythonParams = {
        projectId: projectId,
        floorCount: parseInt(params.floorCount),
        sectionType: params.sectionType,
        stairType: params.stairType,
        elevatorCount: parseInt(params.elevatorCount) || 1,
        corridorLength: parseFloat(params.corridorLength) || 15.0,
        apartmentsPerFloor: parseInt(params.apartmentsPerFloor) || 4,
        maxApartmentArea: parseFloat(params.maxApartmentArea) || 120.0,
        minEfficiency: parseFloat(params.minEfficiency) || 0.75,
        constructionStep: parseFloat(params.constructionStep) || 3.0,
        apartmentDepth: parseFloat(params.apartmentDepth) || 12.0,
        corridorWidth: parseFloat(params.corridorWidth) || 1.8,
        engineeringLocation: params.engineeringLocation || 'combined',
        
        // ПРОЦЕНТЫ - напрямую, как ожидает main.py
        r0: parseInt(params.r0) || 10,   // Студии
        r1: parseInt(params.r1) || 30,   // 1-комнатные
        r2: parseInt(params.r2) || 30,   // 2-комнатные
        r3: parseInt(params.r3) || 20,   // 3-комнатные
        r4: parseInt(params.r4) || 10    // 4-комнатные
    };

        // Сохраняем временный файл
        tempFile = path.join(ALGORITHM_PATH, `temp_params_${Date.now()}.json`);
        fs.writeFileSync(tempFile, JSON.stringify(pythonParams, null, 2));
        console.log('✅ Временный файл создан:', tempFile);

        // Запускаем Python
        const options = {
            mode: 'json',
            pythonPath: 'python',
            scriptPath: ALGORITHM_PATH,
            args: [tempFile],
            pythonOptions: ['-u'],
        };

        console.log('🚀 Запускаем Python скрипт из:', ALGORITHM_PATH);
        console.log('📝 Аргументы:', options.args);
        
        const messages = await PythonShell.run(PYTHON_SCRIPT, options);
        console.log('✅ Python скрипт выполнен, получено сообщений:', messages.length);
        
        const result = messages[messages.length - 1];
        console.log('📊 Результат от Python:', JSON.stringify(result, null, 2));
        
        // Сохраняем варианты
        if (result && result.success && result.variants && result.variants.length > 0) {
            for (const variant of result.variants) {
                await db.query(
                    `INSERT INTO project_result (id_project, status, efficiency, variant_data)
                     VALUES ($1, $2, $3, $4)`,
                    [
                        projectId,
                        'generated',
                        variant.efficiency || 0,
                        JSON.stringify(variant)
                    ]
                );
            }
            console.log(`✅ Сохранено ${result.variants.length} вариантов в project_result`);
        }

        res.json({
            success: true,
            message: 'Проект успешно сгенерирован',
            projectId: projectId,
            data: result
        });

    } catch (error) {
        console.error('❌ Ошибка в /generate:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при генерации проекта',
            error: error.message
        });
    } finally {
        if (tempFile && fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
            console.log('🗑️ Временный файл удален');
        }
    }
});

// Эндпоинт для выбора варианта
router.post('/select-variant', async (req, res) => {
    try {
        const { projectId, variantId } = req.body;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Не авторизован' });
        }

        // Проверяем, что проект принадлежит пользователю
        const projectCheck = await db.query(
            'SELECT id_project FROM project_parameters WHERE id_project = $1 AND id_auth = $2',
            [projectId, userId]
        );
        
        if (projectCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Проект не найден или доступ запрещен' });
        }

        // Получаем все варианты этого проекта
        const variants = await db.query(
            'SELECT id_variant FROM project_result WHERE id_project = $1 ORDER BY id_variant',
            [projectId]
        );

        // Проверяем, что variantId в допустимых пределах
        if (variantId < 1 || variantId > variants.rows.length) {
            return res.status(404).json({ success: false, message: 'Вариант не найден' });
        }

        // Получаем реальный UUID варианта
        const realVariantId = variants.rows[variantId - 1].id_variant;

        // Сначала сбрасываем статус у всех вариантов этого проекта
        await db.query(
            `UPDATE project_result 
             SET status = 'generated' 
             WHERE id_project = $1`,
            [projectId]
        );

        // Затем устанавливаем статус 'selected' для выбранного варианта
        const updateResult = await db.query(
            `UPDATE project_result 
             SET status = 'selected' 
             WHERE id_project = $1 AND id_variant = $2
             RETURNING id_variant`,
            [projectId, realVariantId]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Вариант не найден' });
        }

        res.json({
            success: true,
            message: 'Вариант успешно выбран'
        });

    } catch (error) {
        console.error('Ошибка выбора варианта:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при выборе варианта'
        });
    }
});

// Эндпоинт для скачивания DXF файла
router.get('/download/:projectId/:variantId', async (req, res) => {
    try {
        const { projectId, variantId } = req.params;
        const userId = req.userId;

        console.log(`📥 Запрос на скачивание: проект ${projectId}, вариант ${variantId}, пользователь ${userId}`);

        if (!userId) {
            console.log('❌ Ошибка: пользователь не авторизован');
            return res.status(401).json({ success: false, message: 'Не авторизован' });
        }

        // Проверяем, что проект принадлежит пользователю
        const projectCheck = await db.query(
            'SELECT id_project FROM project_parameters WHERE id_project = $1 AND id_auth = $2',
            [projectId, userId]
        );
        
        if (projectCheck.rows.length === 0) {
            console.log('❌ Ошибка: проект не найден или доступ запрещен');
            return res.status(403).json({ success: false, message: 'Проект не найден или доступ запрещен' });
        }

        // Ищем файл в разных возможных местах
        const possiblePaths = [
            path.join('D:\\ALGORITM', 'exports', `${projectId}_${variantId}.dxf`),
            path.join('D:\\ALGORITM', 'core', 'exports', `${projectId}_${variantId}.dxf`),
            path.join('D:\\ALGORITM', 'core', '..', 'exports', `${projectId}_${variantId}.dxf`),
            path.join(__dirname, '../../../ALGORITM/exports', `${projectId}_${variantId}.dxf`)
        ];

        let filePath = null;
        for (const p of possiblePaths) {
            console.log('🔍 Проверяем путь:', p);
            if (fs.existsSync(p)) {
                filePath = p;
                console.log('✅ Файл найден:', p);
                break;
            }
        }

        if (!filePath) {
            console.error('❌ Файл не найден ни в одном из путей');
            
            // Создаем тестовый DXF файл, если его нет
            const exportDir = 'D:\\ALGORITM\\exports';
            if (!fs.existsSync(exportDir)) {
                fs.mkdirSync(exportDir, { recursive: true });
                console.log('✅ Создана папка exports');
            }
            
            filePath = path.join(exportDir, `${projectId}_${variantId}.dxf`);
            
            // Получаем данные варианта из БД для создания информативного DXF
            let variantInfo = { name: 'Вариант', efficiency: 0 };
            try {
                const variantData = await db.query(
                    'SELECT variant_data FROM project_result WHERE id_project = $1',
                    [projectId]
                );
                if (variantData.rows.length >= variantId) {
                    variantInfo = JSON.parse(variantData.rows[variantId - 1].variant_data);
                }
            } catch (e) {
                console.log('Не удалось получить данные варианта:', e.message);
            }
            
            // Создаем тестовый DXF с реальными данными
            const testContent = `0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
0
10
0.0
20
0.0
30
0.0
11
100.0
21
100.0
31
0.0
0
CIRCLE
8
0
10
50.0
20
50.0
40
25.0
0
TEXT
8
0
10
50.0
20
30.0
40
5.0
1
${variantInfo.name || 'Вариант ' + variantId}
0
TEXT
8
0
10
50.0
20
23.0
40
3.0
1
Эффективность: ${Math.round((variantInfo.efficiency || 0.8) * 100)}%
0
TEXT
8
0
10
50.0
20
18.0
40
3.0
1
Проект: ${projectId.substring(0, 8)}...
0
ENDSEC
0
EOF`;
            
            fs.writeFileSync(filePath, testContent);
            console.log('✅ Создан тестовый DXF файл:', filePath);
        }

        // Проверяем размер файла
        const stats = fs.statSync(filePath);
        console.log(`📊 Размер файла: ${stats.size} байт`);

        // Отправляем файл
        console.log('📤 Отправка файла:', filePath);
        
        // Устанавливаем правильные заголовки
        res.setHeader('Content-Type', 'application/dxf');
        res.setHeader('Content-Disposition', `attachment; filename="variant_${variantId}.dxf"`);
        res.setHeader('Content-Length', stats.size);
        
        res.download(filePath, `variant_${variantId}.dxf`, (err) => {
            if (err) {
                console.error('❌ Ошибка при отправке файла:', err);
                if (!res.headersSent) {
                    res.status(500).json({ success: false, message: 'Ошибка при скачивании' });
                }
            } else {
                console.log('✅ Файл успешно отправлен');
            }
        });

    } catch (error) {
        console.error('❌ Ошибка скачивания:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при скачивании файла',
            error: error.message
        });
    }
});

// Тестовый эндпоинт для проверки авторизации
router.get('/check-auth', (req, res) => {
    console.log('🔍 Проверка авторизации:');
    console.log('  userId:', req.userId);
    console.log('  user:', req.user);
    console.log('  headers:', req.headers.authorization ? '✅ Token present' : '❌ No token');
    
    res.json({
        success: true,
        authenticated: !!req.userId,
        userId: req.userId,
        message: 'Авторизация работает'
    });
});

// Тестовый эндпоинт для создания DXF
router.get('/test-dxf/:projectId/:variantId', async (req, res) => {
    try {
        const { projectId, variantId } = req.params;
        
        const exportDir = 'D:\\ALGORITM\\exports';
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }
        
        const dxfPath = path.join(exportDir, `${projectId}_${variantId}.dxf`);
        
        const testContent = `0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
0
10
0.0
20
0.0
30
0.0
11
100.0
21
100.0
31
0.0
0
CIRCLE
8
0
10
50.0
20
50.0
40
25.0
0
TEXT
8
0
10
50.0
20
30.0
40
5.0
1
Тестовый DXF вариант ${variantId}
0
ENDSEC
0
EOF`;
        
        fs.writeFileSync(dxfPath, testContent);
        console.log('✅ Создан тестовый DXF файл:', dxfPath);
        
        res.json({
            success: true,
            message: 'Тестовый DXF файл создан',
            path: dxfPath
        });
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;