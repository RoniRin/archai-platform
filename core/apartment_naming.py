"""
core/apartment_naming.py - Парсинг и работа с маркировкой квартир
"""

import re
from typing import Dict, Any, Optional, Tuple

class ApartmentNaming:
    """
    Парсит и интерпретирует маркировку квартир согласно правилам:
    1К - однокомнатная
    _Р - рядовая
    _Т - торцевая
    В - коммуникации внутри
    С - коммуникации снаружи
    Л - лоджия есть (если буквы Л нет - лоджии нет)
    Далее тип планировки: Е (евро), К (классика)
    Затем могут быть: Г (гардеробная), Р (рабочая зона)
    Цифра в конце 1 или 2 - количество санузлов
    В скобках: (шаг конструкции - глубина в осях)
    """
    
    @staticmethod
    def parse_filename(filename: str) -> Dict[str, Any]:
        """
        Парсит имя файла и возвращает словарь с характеристиками квартиры
        
        Args:
            filename: Имя файла (например, "1К_РВЛК (3-6.3).dxf")
            
        Returns:
            Словарь с характеристиками
        """
        # Убираем расширение и скобки с размерами
        base_name = filename.replace('.dxf', '').strip()
        
        # Извлекаем размеры из скобок
        size_match = re.search(r'\((\d+\.?\d*)-(\d+\.?\d*)\)', base_name)
        step_width = None
        depth = None
        if size_match:
            step_width = float(size_match.group(1))
            depth = float(size_match.group(2))
            base_name = base_name[:base_name.index('(')].strip()
        
        # Основная маркировка до скобок
        # Пример: 1К_РВЛК_Г1
        
        # Количество комнат
        rooms_match = re.search(r'(\d+)К', base_name)
        rooms = int(rooms_match.group(1)) if rooms_match else 1
        
        # Тип секции: Р (рядовая) или Т (торцевая)
        section_type = None
        if '_Р' in base_name:
            section_type = 'row'
        elif '_Т' in base_name:
            section_type = 'end'
        else:
            # Если не указано, пытаемся определить по контексту
            section_type = 'row'  # по умолчанию
        
        # Расположение коммуникаций: В (внутри) или С (снаружи)
        comm_type = None
        if 'В' in base_name:
            comm_type = 'inside'  # к коридору
        elif 'С' in base_name:
            comm_type = 'outside'  # от коридора
        
        # Наличие лоджии
        has_loggia = 'Л' in base_name
        
        # Тип планировки: Е (евро) или К (классика)
        layout_type = None
        if 'Е' in base_name:
            layout_type = 'euro'
        elif 'К' in base_name:
            layout_type = 'classic'
        else:
            layout_type = 'classic'  # по умолчанию
        
        # Дополнительные опции: Г (гардеробная), Р (рабочая зона)
        has_wardrobe = 'Г' in base_name
        # Проверяем, что 'Р' не является частью цифры в конце
        has_workzone = 'Р' in base_name and not re.search(r'Р\d+$', base_name)
        
        # Количество санузлов (цифра в конце)
        toilet_match = re.search(r'(\d+)$', base_name)
        toilets = int(toilet_match.group(1)) if toilet_match else 1
        
        # Определяем тип санузла (смешанный или раздельный)
        # Если 1 санузел - смешанный, если 2 - раздельный
        bathroom_type = 'mixed' if toilets == 1 else 'separate'
        
        return {
            'filename': filename,
            'base_name': base_name,
            'rooms': rooms,
            'section_type': section_type,  # 'row' или 'end'
            'comm_type': comm_type,        # 'inside' или 'outside'
            'has_loggia': has_loggia,
            'layout_type': layout_type,    # 'euro' или 'classic'
            'has_wardrobe': has_wardrobe,
            'has_workzone': has_workzone,
            'toilets': toilets,
            'bathroom_type': bathroom_type,  # 'mixed' или 'separate'
            'step_width': step_width,
            'depth': depth,
            'display_name': ApartmentNaming.get_display_name(base_name)
        }
    
    @staticmethod
    def get_display_name(marking: str) -> str:
        """
        Возвращает отображаемое имя для чертежа
        
        Args:
            marking: Маркировка (например, "1К_РВЛК_Г1")
            
        Returns:
            Отображаемое имя (например, "1K_RVLK_G1")
        """
        # Просто заменяем русские буквы на английские
        mapping = {
            'К': 'K', 'Р': 'R', 'Т': 'T', 'В': 'V', 'С': 'S',
            'Л': 'L', 'Е': 'E', 'Г': 'G', 'И': 'I'
        }
        
        result = []
        for char in marking:
            if char in mapping:
                result.append(mapping[char])
            elif char.isdigit() or char == '_':
                result.append(char)
            else:
                result.append(char)
        
        return ''.join(result)
    
    @staticmethod
    def get_apartment_type_from_filename(filename: str) -> str:
        """
        Определяет тип квартиры из имени файла (row/end)
        
        Args:
            filename: Имя файла
            
        Returns:
            'row' или 'end'
        """
        if '_Т' in filename:
            return 'end'
        elif '_Р' in filename:
            return 'row'
        return 'row'  # по умолчанию
    
    @staticmethod
    def is_suitable_for_position(filename: str, position_type: str) -> bool:
        """
        Проверяет, подходит ли квартира для данной позиции
        
        Args:
            filename: Имя файла квартиры
            position_type: Тип позиции ('row' или 'end')
            
        Returns:
            True если подходит
        """
        apt_type = ApartmentNaming.get_apartment_type_from_filename(filename)
        
        # Торцевые квартиры только в торцевых позициях
        if position_type == 'end':
            return apt_type == 'end'
        
        # Рядовые квартиры в рядовых позициях
        if position_type == 'row':
            return apt_type == 'row'
        
        return True
    
    @staticmethod
    def matches_params(filename: str, params: Dict[str, Any]) -> bool:
        """
        Проверяет, соответствует ли квартира заданным параметрам
        
        Args:
            filename: Имя файла
            params: Параметры фильтрации
            
        Returns:
            True если соответствует
        """
        apt_info = ApartmentNaming.parse_filename(filename)
        
        # Проверяем количество комнат
        if 'rooms' in params:
            if apt_info['rooms'] not in params['rooms']:
                return False
        
        # Проверяем тип планировки
        if 'layout_type' in params and params['layout_type'] != 'any':
            if apt_info['layout_type'] != params['layout_type']:
                return False
        
        # Проверяем наличие лоджии
        if 'has_loggia' in params:
            if apt_info['has_loggia'] != params['has_loggia']:
                return False
        
        # Проверяем тип санузла
        if 'bathroom_type' in params:
            if apt_info['bathroom_type'] != params['bathroom_type']:
                return False
        
        return True