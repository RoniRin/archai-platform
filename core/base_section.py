"""
core/base_section.py - Базовый класс для всех типов секций
"""

from abc import ABC, abstractmethod

class BaseSection(ABC):
    """Абстрактный класс для всех типов секций"""
    
    def __init__(self, params):
        """
        Инициализация секции
        
        Args:
            params (dict): Параметры генерации
        """
        self.params = params.copy() if params else {}
        self.calculation_results = {}
        self.grid_info = {}
    
    @abstractmethod
    def calculations(self):
        """Выполняет расчеты для конкретного типа секции"""
        pass
    
    @abstractmethod
    def create_construction_grid(self):
        """Создает сетку построения для конкретного типа секции"""
        pass
    
    @abstractmethod
    def get_default_params(self):
        """Возвращает параметры по умолчанию для типа секции"""
        pass