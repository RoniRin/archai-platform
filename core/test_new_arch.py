"""
test_new_architecture.py - Тестирование новой архитектуры
"""

import sys
import os
sys.path.append('core')

from floor_generator import FloorGenerator
from section_factory import SectionFactory

def test_factory():
    """Тестирование фабрики секций"""
    print("=" * 60)
    print("ТЕСТ ФАБРИКИ СЕКЦИЙ")
    print("=" * 60)
    
    # Доступные типы секций
    available_types = SectionFactory.get_available_section_types()
    print(f"Доступные типы секций: {available_types}")
    
    # Создаем линейную секцию
    print("\n1. Создание линейной секции...")
    linear_section = SectionFactory.create_section('linear', {
        'section_length': 30.0,
        'section_width': 18.0
    })
    
    print(f"   Тип: linear")
    print(f"   Параметры: {linear_section.params['section_length']}x{linear_section.params['section_width']} м")
    
    # Информация о секции
    print(f"\n2. Информация о типах секций:")
    for section_type in available_types:
        description = SectionFactory.get_section_description(section_type)
        print(f"   {section_type}: {description}")

def test_floor_generator():
    """Тестирование основного генератора"""
    print("\n" + "=" * 60)
    print("ТЕСТ ОСНОВНОГО ГЕНЕРАТОРА")
    print("=" * 60)
    
    # Создаем генератор для линейной секции
    print("1. Создание генератора для линейной секции...")
    generator = FloorGenerator('linear', {
        'section_length': 28.2,
        'section_width': 16.15,
        'coefficient': 0.77,
        'max_apart_count': 4  # Уменьшим для теста
    })
    
    print(f"   Тип секции: {generator.section_type}")
    print(f"   Параметры: {generator.section.params['section_length']}x{generator.section.params['section_width']} м")
    
    # Выполняем расчеты
    print("\n2. Выполнение расчетов...")
    results = generator.calculate()
    print(f"   Результаты: {len(results)} показателей")
    
    # Генерируем сетку
    print("\n3. Генерация сетки...")
    grid = generator.generate_grid()
    
    if grid:
        print(f"   ✓ Сетка создана")
        cell_info = grid.get_cell_info()
        print(f"   Ячеек: {cell_info['total_cells']}")
    else:
        print(f"   ✗ Не удалось создать сетку")
    
    # Тестируем информацию о типах
    print("\n4. Информация о доступных секциях:")
    available_types = FloorGenerator.get_available_section_types()
    for section_type in available_types:
        info = FloorGenerator.get_section_info(section_type)
        print(f"   {info['type']}: {info['description']}")

def test_backward_compatibility():
    """Тестирование обратной совместимости"""
    print("\n" + "=" * 60)
    print("ТЕСТ ОБРАТНОЙ СОВМЕСТИМОСТИ")
    print("=" * 60)
    
    # Используем старые параметры
    old_params = {
        'floor_count': 9,
        'section_type': 1,  # Старый параметр
        'lly_type': 1,
        'lenght_corridor': 15.0,
        'studio_room': 33,
        'one_room': 33,
        'three_euro_room': 33,
        'max_apart_count': 6,
        'max_square_apart': 316.8,
        'coefficient': 0.77,
        'construction_step': 3.3,
        'width_corridor': 1.75,
        'section_length': 28.2,
        'section_width': 16.15
    }
    
    # Создаем генератор
    generator = FloorGenerator('linear', old_params)
    
    print("1. Проверка параметров...")
    # Преобразование старых параметров в новые
    if 'section_type' in generator.section.params:
        old_section_type = generator.section.params['section_type']
        print(f"   Старый section_type: {old_section_type}")
        print(f"   Преобразовано в: linear")
    
    print("\n2. Полный цикл генерации...")
    try:
        # Расчеты
        generator.calculate()
        
        # Сетка
        grid = generator.generate_grid()
        
        if grid:
            print("   ✓ Обратная совместимость обеспечена")
            
            # Сохраняем результаты
            generator.save_results()
            print("   ✓ Результаты сохранены")
        else:
            print("   ⚠ Проблемы с генерацией сетки")
    
    except Exception as e:
        print(f"   ✗ Ошибка: {e}")

def quick_test():
    """Быстрый тест"""
    print("\n" + "=" * 60)
    print("БЫСТРЫЙ ТЕСТ НОВОЙ АРХИТЕКТУРЫ")
    print("=" * 60)
    
    # Минимальные параметры
    params = {
        'section_length': 28.2,
        'section_width': 16.15,
        'coefficient': 0.77,
        'max_apart_count': 4
    }
    
    generator = FloorGenerator('linear', params)
    
    print("1. Расчеты...")
    generator.calculate()
    
    print("2. Сетка...")
    grid = generator.generate_grid()
    
    if grid:
        print(f"   ✓ Успешно! Создана {generator.section_type} секция")
        print(f"   Файлы сохранены в: {generator.type_output_dir}")
    else:
        print("   ✗ Ошибка создания сетки")
    
    return generator

if __name__ == "__main__":
    print("ТЕСТИРОВАНИЕ НОВОЙ ООП-АРХИТЕКТУРЫ")
    print("=" * 60)
    
    test_choice = input("Выберите тест:\n1. Фабрика секций\n2. Основной генератор\n3. Обратная совместимость\n4. Быстрый тест\n5. Все тесты\nВаш выбор (1-5): ").strip()
    
    if test_choice == "1":
        test_factory()
    elif test_choice == "2":
        test_floor_generator()
    elif test_choice == "3":
        test_backward_compatibility()
    elif test_choice == "4":
        quick_test()
    elif test_choice == "5":
        test_factory()
        test_floor_generator()
        test_backward_compatibility()
    else:
        print("Неверный выбор. Запуск быстрого теста...")
        quick_test()