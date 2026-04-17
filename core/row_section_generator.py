"""
core/row_section_generator.py - Генератор рядовой секции + ЛЛУ/МОП + квартиры
"""

from base_section import BaseSection
from row_section_grid import RowSectionGrid
from apartment_placer import ApartmentPlacer

import math
import os
import sys
import random
from datetime import datetime


def debug(msg):
    sys.stderr.write(str(msg) + "\n")
    sys.stderr.flush()


class RowSectionGenerator(BaseSection):
    def get_default_params(self):
        apart_depth = 6.9
        corridor_width = 1.75
        section_width = apart_depth * 2 + corridor_width
        return {
            'floor_count': 9,
            'section_type': 1,
            'lly_type': 2,
            'elevator_count': 2,
            'lenght_corridor': 18.0,
            'studio_room': 0,
            'one_room': 50,
            'two_room': 50,
            'three_euro_room': 0,
            'four_room': 0,
            'max_apart_count': 20,
            'max_square_apart': 500.0,
            'coefficient': 0.77,
            'apart_depth': apart_depth,
            'construction_step': 3.0,
            'width_corridor': corridor_width,
            'network': 3,
            'section_length': 27.0,
            'section_width': section_width,
            'apartments_path': 'dataset',
            'place_apartments': True,
        }

    def __init__(self, params):
        super().__init__(params)
        defaults = self.get_default_params()
        for k, v in defaults.items():
            if k not in self.params:
                self.params[k] = v
        if 'section_width' not in params:
            self.params['section_width'] = self.params['apart_depth'] * 2 + self.params['width_corridor']
        self.output_dir = self.params.get('output_dir', 'output')
        os.makedirs(self.output_dir, exist_ok=True)
        self.exports_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'exports')
        os.makedirs(self.exports_dir, exist_ok=True)
        self.apartment_placer = None
        self.calculation_results = None
        self.grid_info = None

    def _get_lly_config(self, lly_type, elevator_count=1, construction_step=3.3, apart_depth=6.9):
        lly_width = apart_depth
        lly_length = construction_step * 2
        configs = {
            1: {'name': 'LLU Type 1', 'width': lly_width, 'length': lly_length, 'elevators': min(elevator_count, 1)},
            2: {'name': 'LLU Type 2', 'width': lly_width, 'length': lly_length, 'elevators': min(elevator_count, 2)},
            3: {'name': 'LLU Type 3', 'width': lly_width, 'length': lly_length, 'elevators': min(elevator_count, 3)},
        }
        return configs.get(lly_type, configs[1])

    def _get_actual_lly_size(self, lly_type, construction_step, elevator_count=1, apart_depth=6.9):
        lly_config = self._get_lly_config(lly_type, elevator_count, construction_step, apart_depth)
        length_cells = 2
        actual_length = construction_step * 2
        width_cells = 1
        actual_width = apart_depth
        return actual_length, actual_width, length_cells, width_cells, lly_config

    def calculations(self):
        debug(f"\n{'='*60}\nCALCULATIONS FOR ROW SECTION\n{'='*60}")
        lly_type = self.params.get('lly_type', 2)
        elevator_count = self.params.get('elevator_count', 2)
        lenght_corridor = self.params.get('lenght_corridor', 18.0)
        max_square_apart = self.params.get('max_square_apart', 500.0)
        apart_depth = self.params.get('apart_depth', 6.9)
        construction_step = self.params.get('construction_step', 3.0)
        width_corridor = self.params.get('width_corridor', 1.75)
        section_length = self.params.get('section_length', 27.0)
        section_width = self.params.get('section_width', 15.55)
        lly_config = self._get_lly_config(lly_type, elevator_count, construction_step, apart_depth)
        width_lly = lly_config['width']
        lenght_lly = lly_config['length']
        square_lly = width_lly * lenght_lly
        square_mop = lenght_corridor * width_corridor
        square_mop_lly = square_mop + square_lly
        square_section = section_length * section_width
        actual_length, actual_width, length_cells, width_cells, _ = self._get_actual_lly_size(lly_type, construction_step, elevator_count, apart_depth)
        self.calculation_results = {
            'square_lly': square_lly, 'square_mop': square_mop, 'square_mop_lly': square_mop_lly,
            'square_section': square_section, 'width_lly': width_lly, 'lenght_lly': lenght_lly,
            'actual_length_lly': actual_length, 'actual_width_lly': actual_width,
            'lly_length_cells': length_cells, 'lly_width_cells': width_cells,
            'section_length': section_length, 'section_width': section_width,
            'construction_step': construction_step, 'apart_depth': apart_depth,
            'width_corridor': width_corridor, 'lly_config': lly_config,
            'elevator_count': elevator_count
        }
        return self.calculation_results

    def _validate_parameters(self, section_length, section_width, construction_step, lly_type, corridor_width, corridor_length, apart_depth):
        errors = []
        if section_length <= 0: errors.append("section_length <= 0")
        if section_width <= 0: errors.append("section_width <= 0")
        if construction_step <= 0: errors.append("construction_step <= 0")
        if lly_type not in [1,2,3]: errors.append("unknown lly_type")
        if corridor_width <= 0: errors.append("corridor_width <= 0")
        if corridor_length <= 0: errors.append("corridor_length <= 0")
        if errors:
            for e in errors: debug(f"Error: {e}")
            return False
        return True

    def create_construction_grid(self):
        debug(f"\n{'='*60}\nCREATING SECTION + GRID + LLU/MOP + APARTMENTS\n{'='*60}")
        random_seed = self.params.get('random_seed', None)
        if random_seed:
            random.seed(random_seed)
            debug(f"Random seed set to: {random_seed}")
        else:
            random.seed(datetime.now().timestamp())
            debug(f"Random seed auto-generated")

        if not self.calculation_results:
            self.calculations()

        section_length = self.params.get('section_length', 27.0)
        section_width = self.params.get('section_width', 15.55)
        lly_type = self.params.get('lly_type', 2)
        corridor_width = self.params.get('width_corridor', 1.75)
        corridor_length = self.params.get('lenght_corridor', 18.0)
        construction_step = self.params.get('construction_step', 3.0)
        apart_depth = self.params.get('apart_depth', 6.9)
        elevator_count = self.params.get('elevator_count', 2)

        debug("\n  USED PARAMETERS:")
        debug(f"    apart_depth: {apart_depth} m")
        debug(f"    construction_step: {construction_step} m")
        debug(f"    section_length: {section_length} m")
        debug(f"    section_width: {section_width} m")
        debug(f"    corridor_width: {corridor_width} m")
        debug(f"    corridor_length: {corridor_length} m")
        debug(f"    lly_type: {lly_type}")
        debug(f"    elevator_count: {elevator_count}")

        if not self._validate_parameters(section_length, section_width, construction_step, lly_type, corridor_width, corridor_length, apart_depth):
            return None

        grid = RowSectionGrid(doc=None)
        grid.setup_parameters(section_length, section_width, construction_step, apart_depth)

        y_points = [0, apart_depth, apart_depth + corridor_width, apart_depth * 2 + corridor_width]
        if abs(y_points[-1] - section_width) > 0.01:
            y_points[-1] = section_width
        grid.add_y_points(y_points)

        x_points = []
        x = 0.0
        while x <= section_length + 1e-9:
            x_points.append(round(x, 2))
            x += construction_step
        if 0.0 not in x_points:
            x_points.insert(0, 0.0)
        if round(section_length, 2) not in x_points:
            x_points.append(round(section_length, 2))
        x_points = sorted(set(x_points))
        grid.add_x_points(x_points)

        grid.create_grid(x_range=(0.0, section_length), y_range=(0.0, section_width))
        grid.add_section_outline(section_length, section_width)
        occupied_info = grid.add_lly_and_corridor_by_cells(
            section_length=section_length, section_width=section_width,
            lly_type=lly_type, corridor_length=corridor_length, corridor_width=corridor_width,
            elevator_count=elevator_count, apart_depth=apart_depth
        )
        grid.add_cell_ids()

        if self.params.get('place_apartments', True):
            self.apartment_placer = ApartmentPlacer(grid, self.params)
            self.apartment_placer.place_apartments()

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        project_id = self.params.get('projectId', None)
        variant_id = self.params.get('variantId', None)

        # Определяем путь для сохранения
        if project_id and variant_id:
            filename = os.path.join(self.exports_dir, f"{project_id}_{variant_id}.dxf")
        else:
            filename = os.path.join(self.output_dir, f"row_section_{timestamp}.dxf")

        # Сохраняем файл
        grid.save(filename)
        debug(f"DXF saved: {filename}")

        self.grid_info = {
            'type': 'row_section',
            'section_length': section_length,
            'section_width': section_width,
            'construction_step': construction_step,
            'apart_depth': apart_depth,
            'cells_info': grid.get_cell_info(),
            'occupied_info': occupied_info,
            'filename': filename,
            'apartments': self.apartment_placer.get_apartments_summary() if self.apartment_placer else None,
        }
        debug(f"\nReady: {filename}")
        return grid