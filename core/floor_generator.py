"""
core/floor_generator.py - Основной генератор этажей (обновленный)
"""

import os
import sys
from datetime import datetime
from section_factory import SectionFactory

# Функция для отладки (в stderr)
def debug(msg):
    sys.stderr.write(msg + "\n")
    sys.stderr.flush()

class FloorGenerator:
    """Основной генератор этажей с поддержкой разных типов секций"""
    
    def __init__(self, params=None):
        """
        Инициализация генератора
        
        Args:
            params (dict): Параметры генерации
                - section_type: тип секции ('row', 'tower', etc.)
                - другие параметры...
        """
        self.params = params.copy() if params else {}
        self.section_generator = None
        self.output_dir = "output"
        self.exports_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'exports')
        
        # Создаем папки output и exports
        for directory in [self.output_dir, self.exports_dir]:
            if not os.path.exists(directory):
                os.makedirs(directory)
                debug(f"✓ Создана папка: {directory}")
    
    def initialize_generator(self):
        """Инициализирует генератор для выбранного типа секции"""
        section_type = self.params.get('section_type', 'row')
        
        try:
            self.section_generator = SectionFactory.create_section_generator(
                section_type, self.params
            )
            debug(f"✓ Инициализирован генератор для типа секции: {section_type}")
            return True
        except ValueError as e:
            debug(f"✗ Ошибка инициализации: {e}")
            debug(f"Доступные типы секций: {SectionFactory.get_available_section_types()}")
            return False
    
    def calculations(self):
        """Выполняет расчеты для текущего типа секции"""
        if not self.section_generator:
            if not self.initialize_generator():
                return None
        
        return self.section_generator.calculations()
    
    def create_construction_grid(self):
        """Создает сетку построения для текущего типа секции"""
        if not self.section_generator:
            if not self.initialize_generator():
                return None
        
        return self.section_generator.create_construction_grid()
    
    def get_parameters(self):
        """Возвращает параметры генератора"""
        if self.section_generator:
            return self.section_generator.params
        return self.params
    
    def get_calculation_results(self):
        """Возвращает результаты расчетов"""
        if self.section_generator:
            return self.section_generator.calculation_results
        return {}
    
    def get_grid_info(self):
        """Возвращает информацию о созданной сетке"""
        if self.section_generator:
            return self.section_generator.grid_info
        return {}
    
    def save_dxf(self, variant, output_path):
        """
        Сохраняет вариант в DXF файл
        
        Args:
            variant (dict): Данные варианта
            output_path (str): Путь для сохранения DXF файла
        """
        try:
            debug(f"📄 Генерация DXF для варианта {variant.get('id', 'unknown')}")
            
            # Получаем параметры
            floor_count = self.params.get('floor_count', 5)
            apartments_per_floor = variant.get('apartment_count', 4)
            efficiency = variant.get('efficiency', 0.8)
            
            # Создаем содержимое DXF файла
            dxf_content = self._generate_dxf_content(variant)
            
            # Сохраняем файл
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(dxf_content)
            
            debug(f"✅ DXF файл сохранен: {output_path}")
            debug(f"   Размер: {os.path.getsize(output_path)} байт")
            return True
            
        except Exception as e:
            debug(f"❌ Ошибка сохранения DXF: {e}")
            import traceback
            traceback.print_exc(file=sys.stderr)
            return False
    
    def _generate_dxf_content(self, variant):
        """
        Генерирует содержимое DXF файла
        
        Args:
            variant (dict): Данные варианта
            
        Returns:
            str: Содержимое DXF файла
        """
        # Получаем параметры
        variant_id = variant.get('id', 1)
        variant_name = variant.get('name', 'Вариант')
        floor_count = self.params.get('floor_count', 5)
        apartments_per_floor = variant.get('apartment_count', 4)
        total_apartments = variant.get('total_apartments', 20)
        area = variant.get('area', 400)
        efficiency = variant.get('efficiency', 0.8)
        
        # Базовая ширина и высота секции
        width = 30.0  # метров
        height = 20.0  # метров
        
        # Генерируем DXF
        lines = []
        
        # Заголовок
        lines.extend([
            "0",
            "SECTION",
            "2",
            "HEADER",
            "9",
            "$ACADVER",
            "1",
            "AC1009",
            "0",
            "ENDSEC",
            "0",
            "SECTION",
            "2",
            "TABLES",
            "0",
            "ENDSEC",
            "0",
            "SECTION",
            "2",
            "BLOCKS",
            "0",
            "ENDSEC",
            "0",
            "SECTION",
            "2",
            "ENTITIES"
        ])
        
        # Добавляем текст с информацией о проекте
        text_info = [
            f"Проект: {variant_name}",
            f"Этажность: {floor_count}",
            f"Квартир на этаже: {apartments_per_floor}",
            f"Всего квартир: {total_apartments}",
            f"Общая площадь: {area:.1f} м²",
            f"Эффективность: {efficiency*100:.1f}%",
            f"Дата: {datetime.now().strftime('%d.%m.%Y %H:%M')}"
        ]
        
        y_pos = height + 2
        for i, text in enumerate(text_info):
            lines.extend([
                "0",
                "TEXT",
                "8",
                "0",
                "10",
                "2.0",
                "20",
                str(y_pos - i * 1.5),
                "40",
                "1.0",
                "1",
                text,
                "0"
            ])
        
        # Рисуем внешний контур
        lines.extend([
            "0",
            "LINE",
            "8",
            "0",
            "10",
            "0",
            "20",
            "0",
            "11",
            str(width),
            "21",
            "0",
            "0",
            "LINE",
            "8",
            "0",
            "10",
            str(width),
            "20",
            "0",
            "11",
            str(width),
            "21",
            str(height),
            "0",
            "LINE",
            "8",
            "0",
            "10",
            str(width),
            "20",
            str(height),
            "11",
            "0",
            "21",
            str(height),
            "0",
            "LINE",
            "8",
            "0",
            "10",
            "0",
            "20",
            str(height),
            "11",
            "0",
            "21",
            "0"
        ])
        
        # Рисуем сетку квартир
        cols = 2
        rows = 2
        cell_width = width / cols
        cell_height = height / rows
        
        for i in range(1, cols):
            x = i * cell_width
            lines.extend([
                "0",
                "LINE",
                "8",
                "1",
                "10",
                str(x),
                "20",
                "0",
                "11",
                str(x),
                "21",
                str(height)
            ])
        
        for i in range(1, rows):
            y = i * cell_height
            lines.extend([
                "0",
                "LINE",
                "8",
                "1",
                "10",
                "0",
                "20",
                str(y),
                "11",
                str(width),
                "21",
                str(y)
            ])
        
        # Добавляем номера квартир
        for i in range(cols):
            for j in range(rows):
                apt_num = i * rows + j + 1
                x_center = i * cell_width + cell_width / 2
                y_center = j * cell_height + cell_height / 2
                lines.extend([
                    "0",
                    "TEXT",
                    "8",
                    "2",
                    "10",
                    str(x_center - 1),
                    "20",
                    str(y_center),
                    "40",
                    "1.5",
                    "1",
                    f"КВ {apt_num}",
                    "0"
                ])
        
        # Завершаем файл
        lines.extend([
            "0",
            "ENDSEC",
            "0",
            "EOF"
        ])
        
        return "\n".join(lines)
    
    def generate_variants(self):
        """Генерирует варианты планировок"""
        variants = []
        
        # Получаем параметры из self.params
        min_efficiency = float(self.params.get('min_efficiency', 0.75))
        apartments_per_floor = int(self.params.get('apartments_per_floor', 4))
        floor_count = int(self.params.get('floor_count', 5))
        max_apartment_area = float(self.params.get('max_apartment_area', 120))
        
        debug(f"📊 Параметры генерации: min_efficiency={min_efficiency}, apartments={apartments_per_floor}, floors={floor_count}")
        
        # Вариант 1 - Оптимальный
        variant1 = {
            'id': 1,
            'name': 'Оптимальный вариант',
            'efficiency': min(min_efficiency * 1.1, 0.95),
            'apartment_count': apartments_per_floor,
            'total_apartments': apartments_per_floor * floor_count,
            'area': max_apartment_area * apartments_per_floor * 0.9,
            'description': 'Сбалансированное решение'
        }
        variants.append(variant1)
        
        # Вариант 2 - Экономичный (больше квартир)
        variant2 = {
            'id': 2,
            'name': 'Экономичный вариант',
            'efficiency': min(min_efficiency * 0.95, 0.90),
            'apartment_count': min(apartments_per_floor + 2, 8),
            'total_apartments': min(apartments_per_floor + 2, 8) * floor_count,
            'area': max_apartment_area * min(apartments_per_floor + 2, 8) * 0.8,
            'description': 'Максимальное количество квартир'
        }
        variants.append(variant2)
        
        # Вариант 3 - Комфортный (меньше квартир, но больше площадь)
        variant3 = {
            'id': 3,
            'name': 'Комфортный вариант',
            'efficiency': min(min_efficiency * 1.05, 0.93),
            'apartment_count': max(apartments_per_floor - 1, 2),
            'total_apartments': max(apartments_per_floor - 1, 2) * floor_count,
            'area': max_apartment_area * max(apartments_per_floor - 1, 2) * 1.1,
            'description': 'Просторные квартиры'
        }
        variants.append(variant3)
        
        debug(f"✅ Сгенерировано {len(variants)} вариантов")
        
        return variants