"""
test_row_section.py - Тестирование рядовой секции
"""

from row_section_generator import RowSectionGenerator

def test_row_section():
    """Тестирование рядовой секции"""
    print("=== ТЕСТИРОВАНИЕ РЯДОВОЙ СЕКЦИИ ===")
    
    # Параметры для тестирования
    params = {
        'floor_count': 9,
        'section_type': 'row',
        'lly_type': 2,  # Тип ЛЛУ: 1, 2 или 3
        'elevator_count': 1,
        'lenght_corridor': 15.0,
        'studio_room': 0,
        'one_room': 100,
        'two_room': 0,
        'three_euro_room': 0,
        'four_room': 0,
        'max_apart_count': 6,
        'max_square_apart': 316.8,
        'coefficient': 0.77,
        'appart_depth': 6,
        'construction_step': 3,
        'width_corridor': 1.75,
        'network': 3,
        'section_length': 28.2,
        'section_width': 16.15
    }
    
    # Создаем генератор
    generator = RowSectionGenerator(params)
    print(f"✓ Инициализирован генератор для типа секции: row")
    
    # Выполняем расчеты
    results = generator.calculations()
    print(f"Результаты расчетов: {results}")
    
    # Создаем сетку построения
    grid = generator.create_construction_grid()
    
    if grid:
        grid_info = generator.grid_info
        print(f"Информация о сетке: {grid_info}")
    else:
        print("✗ Не удалось создать сетку построения")
    
    print("\n=== ТЕСТ ЗАВЕРШЕН ===")

if __name__ == "__main__":
    test_row_section()