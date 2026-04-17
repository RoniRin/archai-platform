"""
test_grid_only.py - Прямое создание сетки без квартир
"""

import os
import sys
import math
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.row_section_grid import RowSectionGrid

def main():
    print("="*70)
    print("ПРЯМОЕ СОЗДАНИЕ СЕТКИ (БЕЗ КВАРТИР)")
    print("="*70)
    
    # Параметры
    section_length = 27.0
    section_width = 15.55
    construction_step = 3.0
    apart_depth = 6.9
    corridor_width = 1.75
    corridor_length = 18.0
    lly_type = 2
    elevator_count = 2
    
    print(f"\nПараметры:")
    print(f"  Размер секции: {section_length:.1f} × {section_width:.1f} м")
    print(f"  Глубина квартир: {apart_depth:.1f} м")
    print(f"  Шаг конструкции: {construction_step:.1f} м")
    print(f"  Ширина коридора: {corridor_width:.1f} м")
    print(f"  Длина коридора: {corridor_length:.1f} м")
    print(f"  Тип ЛЛУ: {lly_type}")
    print(f"  Количество лифтов: {elevator_count}")
    
    # Создаем сетку
    grid = RowSectionGrid(doc=None)
    grid.setup_parameters(section_length, section_width, construction_step, apart_depth)
    
    # Устанавливаем точки Y
    y_points = [0, apart_depth, apart_depth + corridor_width, apart_depth * 2 + corridor_width]
    if abs(y_points[-1] - section_width) > 0.01:
        y_points[-1] = section_width
    
    print(f"\nТочки по Y: {y_points}")
    grid.add_y_points(y_points)
    
    # Устанавливаем точки X
    x_points = []
    margin = 2.0
    grid_x_max = math.ceil((section_length + margin) / construction_step) * construction_step
    current_x = 0
    while current_x <= grid_x_max:
        x_points.append(round(current_x, 2))
        current_x += construction_step
    
    if 0 not in x_points:
        x_points.insert(0, 0)
    if section_length not in x_points:
        x_points.append(section_length)
    x_points.sort()
    
    print(f"Точки по X: {[round(x, 1) for x in x_points]}")
    grid.add_x_points(x_points)
    
    # Создаем сетку
    print(f"\nСоздание сетки...")
    grid.create_grid(
        x_range=(-margin, grid_x_max),
        y_range=(-margin, section_width + margin)
    )
    
    # Добавляем ID ячеек
    print(f"\nДобавление ID ячеек...")
    grid.add_cell_ids()
    
    # Рисуем контур секции
    print(f"\nРисуем контур секции...")
    grid.add_section_outline(section_length, section_width)
    
    # Размещаем ЛЛУ и коридор
    print(f"\nРазмещение ЛЛУ и коридора...")
    occupied_info = grid.add_lly_and_corridor_by_cells(
        section_length, section_width,
        lly_type, corridor_length, corridor_width,
        elevator_count, apart_depth
    )
    
    if occupied_info:
        print(f"\n  ЛЛУ размещена: ячейки {occupied_info['lly']['cell_ids']}")
        if occupied_info['corridor']:
            print(f"  Коридор размещен: ячейки {occupied_info['corridor']['cell_ids']}")
    
    # Добавляем контрольные точки
    print(f"\nДобавление контрольных точек...")
    corners = [
        (0, 0, "A - Левый нижний"),
        (section_length, 0, "B - Правый нижний"),
        (section_length, section_width, "C - Правый верхний"),
        (0, section_width, "D - Левый верхний")
    ]
    for x, y, label in corners:
        grid.add_reference_point(x, y, label, 7, show_coordinates=False)
    
    # Сохраняем файл
    output_dir = "output"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = os.path.join(output_dir, f"grid_only_{timestamp}.dxf")
    
    print(f"\nСохранение файла...")
    result = grid.save(filename)
    
    if result:
        print(f"\n{'='*70}")
        print(f"✓ СЕТКА УСПЕШНО СОЗДАНА!")
        print(f"  Файл: {filename}")
        print(f"  Размер секции: {section_length:.1f} × {section_width:.1f} м")
        print(f"  Глубина квартир: {apart_depth:.1f} м")
        print(f"  ЛЛУ: {construction_step * 2:.1f} × {apart_depth:.1f} м")
        print(f"  Коридор: {corridor_length:.1f} × {corridor_width:.1f} м")
        print(f"  Квартиры: НЕ РАЗМЕЩЕНЫ")
        print(f"{'='*70}")
    else:
        print(f"\n✗ Ошибка сохранения файла!")

if __name__ == "__main__":
    main()