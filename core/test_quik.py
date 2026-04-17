"""
test_quik_full.py - Полный тест генерации секции с выбором варианта
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'core'))

from row_section_generator import RowSectionGenerator

def test_quick():
    """Быстрый тест с параметрами по умолчанию"""
    params = {
        'floor_count': 11,
        'section_type': 1,
        'section_length': 27.0,
        'construction_step': 3.0,
        'apart_depth': 6.9,
        'width_corridor': 1.75,
        'lly_type': 2,
        'elevator_count': 2,
        'lenght_corridor': 18.0,
        'studio_room': 20,
        'one_room': 50,
        'two_room': 20,
        'three_room': 10,
        'four_room': 0,
        'max_square_apart': 400,
        'coefficient': 0.9,
        'max_apart_count': 10,
        'apartments_path': 'dataset',
        'place_apartments': True,
        'output_dir': 'output',
    }
    return params

def test_econom():
    """Эконом-класс"""
    params = {
        'floor_count': 11,
        'section_type': 1,
        'section_length': 27.0,
        'construction_step': 3.0,
        'apart_depth': 6.9,
        'width_corridor': 1.75,
        'lly_type': 2,
        'elevator_count': 2,
        'lenght_corridor': 18.0,
        'studio_room': 40,
        'one_room': 40,
        'two_room': 20,
        'three_room': 0,
        'four_room': 0,
        'max_square_apart': 350,
        'coefficient': 0.95,
        'max_apart_count': 12,
        'apartments_path': 'dataset',
        'place_apartments': True,
        'output_dir': 'output',
    }
    return params

def test_business():
    """Бизнес-класс"""
    params = {
        'floor_count': 11,
        'section_type': 1,
        'section_length': 27.0,
        'construction_step': 3.0,
        'apart_depth': 6.9,
        'width_corridor': 1.75,
        'lly_type': 2,
        'elevator_count': 2,
        'lenght_corridor': 18.0,
        'studio_room': 0,
        'one_room': 30,
        'two_room': 40,
        'three_room': 30,
        'four_room': 0,
        'max_square_apart': 450,
        'coefficient': 0.8,
        'max_apart_count': 8,
        'apartments_path': 'dataset',
        'place_apartments': True,
        'output_dir': 'output',
    }
    return params

def test_premium():
    """Премиум-класс"""
    params = {
        'floor_count': 11,
        'section_type': 1,
        'section_length': 27.0,
        'construction_step': 3.0,
        'apart_depth': 6.9,
        'width_corridor': 1.75,
        'lly_type': 2,
        'elevator_count': 2,
        'lenght_corridor': 18.0,
        'studio_room': 0,
        'one_room': 0,
        'two_room': 50,
        'three_room': 40,
        'four_room': 10,
        'max_square_apart': 500,
        'coefficient': 0.75,
        'max_apart_count': 6,
        'apartments_path': 'dataset',
        'place_apartments': True,
        'output_dir': 'output',
    }
    return params

def main():
    print("="*80)
    print("ВЫБЕРИТЕ ТИП ТЕСТА")
    print("="*80)
    print("1. Быстрый тест (сбалансированный)")
    print("2. Эконом-класс (много студий и 1-к)")
    print("3. Бизнес-класс (больше 2-к и 3-к)")
    print("4. Премиум-класс (просторные квартиры)")
    print("5. Свой вариант (ввод параметров)")
    print("="*80)
    
    choice = input("\nВаш выбор (1-5): ").strip()
    
    if choice == '1':
        params = test_quick()
    elif choice == '2':
        params = test_econom()
    elif choice == '3':
        params = test_business()
    elif choice == '4':
        params = test_premium()
    elif choice == '5':
        print("\nВведите параметры (оставьте пустым для значения по умолчанию):")
        
        params = {
            'floor_count': int(input("Этажность (11): ") or 11),
            'section_type': 1,
            'section_length': float(input("Длина секции (27.0): ") or 27.0),
            'construction_step': float(input("Шаг конструкции (3.0): ") or 3.0),
            'apart_depth': float(input("Глубина квартир (6.9): ") or 6.9),
            'width_corridor': 1.75,
            'lly_type': int(input("Тип ЛЛУ (2): ") or 2),
            'elevator_count': int(input("Количество лифтов (2): ") or 2),
            'lenght_corridor': 18.0,
            'studio_room': int(input("Студии % (20): ") or 20),
            'one_room': int(input("1-к % (50): ") or 50),
            'two_room': int(input("2-к % (20): ") or 20),
            'three_room': int(input("3-к % (10): ") or 10),
            'four_room': int(input("4-к % (0): ") or 0),
            'max_square_apart': float(input("Макс. площадь (400): ") or 400),
            'coefficient': float(input("Коэффициент (0.9): ") or 0.9),
            'max_apart_count': int(input("Макс. квартир (10): ") or 10),
            'apartments_path': 'dataset',
            'place_apartments': True,
            'output_dir': 'output',
        }
    else:
        print("Неверный выбор. Использую быстрый тест.")
        params = test_quick()
    
    print("\n📋 ПАРАМЕТРЫ ТЕСТА:")
    for key, value in params.items():
        print(f"   {key}: {value}")
    
    try:
        print("\n🔧 Создание генератора...")
        generator = RowSectionGenerator(params)
        
        print("\n🏗️ Генерация секции...")
        grid = generator.create_construction_grid()
        
        if grid:
            print("\n" + "="*80)
            print("✅ ТЕСТ УСПЕШНО ЗАВЕРШЕН!")
            print("="*80)
            print(f"\n💾 Файл сохранен: {generator.grid_info['filename']}")
            
            if generator.apartment_placer:
                summary = generator.apartment_placer.get_apartments_summary()
                print(f"\n📊 ИТОГОВАЯ СТАТИСТИКА:")
                print(f"   Всего квартир: {summary['total']}")
                print(f"   Общая площадь: {summary['total_area']:.1f} м²")
                print(f"   Средняя площадь: {summary['average_area']:.1f} м²")
                print(f"   Распределение по типам: {summary['by_type']}")
        else:
            print("\n❌ Ошибка при создании сетки!")
            
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()