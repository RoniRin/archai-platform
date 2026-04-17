"""
core/base_grid.py - Базовый класс для сетки построения
"""

import ezdxf
from abc import ABC, abstractmethod

class BaseGrid(ABC):
    """Базовый класс для всех типов сеток построения"""
    
    def __init__(self, doc=None):
        """
        Инициализация сетки
        
        Args:
            doc: DXF документ (если None - создаст новый)
        """
        if doc is None:
            self.doc = ezdxf.new('R2010')
        else:
            self.doc = doc
            
        self.msp = self.doc.modelspace()
        self.setup_layers()
        
        # Общие данные
        self.cells = {}
        self.cell_width = 0
        self.cell_height = 0
    
    def setup_layers(self):
        """Создает общие слои для всех типов сеток"""
        layers_to_create = [
            ('CONSTRUCTION_GRID', 9),
            ('SECTION_OUTLINE', 7),
            ('REFERENCE_POINTS', 1),
            ('LLY_OUTLINE', 3),
            ('CELL_IDS', 5),
            ('CELL_ZONES', 6)
        ]
        
        existing_layers = [layer.dxf.name for layer in self.doc.layers]
        for layer_name, color in layers_to_create:
            if layer_name not in existing_layers:
                self.doc.layers.new(layer_name, dxfattribs={'color': color})
    
    @abstractmethod
    def create_grid(self, x_range, y_range):
        """Создает сетку построения"""
        pass
    
    @abstractmethod
    def add_cell_ids(self):
        """Добавляет ID ячеек"""
        pass
    
    @abstractmethod
    def add_lly_and_corridor(self, lly_type, corridor_length, corridor_width):
        """Добавляет ЛЛУ и коридор"""
        pass
    
    def save(self, filename):
        """Сохраняет сетку в файл"""
        self.doc.saveas(filename)
        return filename
    
    def get_cell_info(self):
        """Возвращает информацию о ячейках"""
        if not self.cells:
            return {}
        
        rows_info = {}
        for (col, row), cell in self.cells.items():
            if row not in rows_info:
                rows_info[row] = {
                    'y_range': f"{cell['y_min']:.1f}-{cell['y_max']:.1f}",
                    'height': cell['height'],
                    'cells': []
                }
            rows_info[row]['cells'].append(cell['id'])
        
        return {
            'total_cells': len(self.cells),
            'cell_width': self.cell_width,
            'cell_height': self.cell_height,
            'rows_info': rows_info,
            'cells': self.cells
        }