"""
core/section_factory.py - Фабрика для создания секций
"""

# Вместо относительных импортов используйте прямые
try:
    from row_section_generator import RowSectionGenerator
except ImportError as e:
    print(f"Ошибка импорта RowSectionGenerator: {e}")
    # Создаем заглушку
    RowSectionGenerator = None

# TowerSectionGenerator пока не существует, поэтому или создайте заглушку или удалите
TowerSectionGenerator = None

class SectionFactory:
    """Фабрика для создания генераторов секций"""
    
    SECTION_TYPES = {
        'row': {
            'class': RowSectionGenerator,
            'name': 'Рядовая секция',
            'description': 'Стандартная рядовая секция здания'
        },
        # 'tower' будет добавлен позже
    }
    
    @staticmethod
    def create_section_generator(section_type, params=None):
        if params is None:
            params = {}
        
        if section_type not in SectionFactory.SECTION_TYPES:
            available_types = list(SectionFactory.SECTION_TYPES.keys())
            raise ValueError(f"Неизвестный тип секции: {section_type}. "
                           f"Доступные типы: {available_types}")
        
        section_info = SectionFactory.SECTION_TYPES[section_type]
        
        if section_info['class'] is None:
            raise ValueError(f"Генератор для типа '{section_type}' не доступен")
        
        params['section_type'] = section_type
        return section_info['class'](params)
    
    @staticmethod
    def get_available_section_types():
        result = {}
        for section_type, info in SectionFactory.SECTION_TYPES.items():
            if info['class'] is not None:
                result[section_type] = {
                    'name': info['name'],
                    'description': info['description']
                }
        return result