"""
core/row_section_grid.py - Сетка для рядовой секции (единая система единиц)
Храним геометрию ячеек в метрах, а рисуем в DXF в миллиметрах.
"""

import os
import sys
import ezdxf
from base_grid import BaseGrid


def debug(msg):
    """Вывод отладочных сообщений в stderr"""
    sys.stderr.write(str(msg) + "\n")
    sys.stderr.flush()


class RowSectionGrid(BaseGrid):
    def __init__(self, doc=None):
        if doc is None:
            self.doc = ezdxf.new('R2010')
        else:
            self.doc = doc

        self.msp = self.doc.modelspace()

        # DXF в миллиметрах
        self.doc.header['$INSUNITS'] = 4  # Millimeters
        self.doc.header['$MEASUREMENT'] = 1  # Metric

        # Масштаб вывода: метры -> миллиметры
        self.scale_factor = 1000.0

        # Данные сетки (в метрах)
        self.x_points = []
        self.y_points = []
        self.x_range = None
        self.y_range = None
        self.section_length = None
        self.section_width = None
        self.construction_step = None
        self.cell_width = None
        self.cell_height = None
        self.apart_depth = 6.9

        self.occupied_cells = []
        self.cells = {}

        # Настройки цветов/толщин
        self.grid_color = 9
        self.axis_color = 9
        self.outline_color = 7
        self.lly_color = 7
        self.cell_id_color = 7
        self.cell_zone_color = 7
        self.text_color = 7
        self.corridor_color = 7

        self.lly_fill_color = 9
        self.corridor_fill_color = 9

        self.grid_lineweight = 5
        self.axis_lineweight = 10
        self.outline_lineweight = 30
        self.lly_lineweight = 25
        self.corridor_lineweight = 20

    # ---------- helpers ----------
    def _mm(self, v_m: float) -> float:
        return v_m * self.scale_factor

    def _pt_mm(self, x_m: float, y_m: float):
        return (x_m * self.scale_factor, y_m * self.scale_factor)

    # ============ ЛЛУ конфигурации ============
    def _get_lly_config(self, lly_type, elevator_count=1, construction_step=3.3, apart_depth=6.9):
        lly_width = apart_depth
        lly_length = construction_step * 2

        configs = {
            1: {'name': 'LLU Type 1', 'width': lly_width, 'length': lly_length,
                'elevators': min(elevator_count, 1),
                'description': f'{lly_length:.1f}x{lly_width:.1f} m, 1 lift possible'},
            2: {'name': 'LLU Type 2', 'width': lly_width, 'length': lly_length,
                'elevators': min(elevator_count, 2),
                'description': f'{lly_length:.1f}x{lly_width:.1f} m, 2 lifts possible'},
            3: {'name': 'LLU Type 3', 'width': lly_width, 'length': lly_length,
                'elevators': min(elevator_count, 3),
                'description': f'{lly_length:.1f}x{lly_width:.1f} m, 3 lifts possible'},
        }
        return configs.get(lly_type, configs[1])

    def _get_actual_lly_size(self, lly_type, construction_step, elevator_count=1, apart_depth=6.9):
        lly_config = self._get_lly_config(lly_type, elevator_count, construction_step, apart_depth)
        length_cells = 2
        actual_length = construction_step * 2
        width_cells = 1
        actual_width = apart_depth
        return actual_length, actual_width, length_cells, width_cells, lly_config

    # ============ Основные методы сетки ============
    def add_y_points(self, points):
        self.y_points = sorted(points)
        debug(f"  Added Y points: {self.y_points}")

    def add_x_points(self, points):
        self.x_points = sorted(points)
        debug(f"  Added X points: {self.x_points}")

    def setup_parameters(self, section_length, section_width, construction_step, apart_depth=6.9):
        self.section_length = section_length
        self.section_width = section_width
        self.construction_step = construction_step
        self.cell_width = construction_step
        self.apart_depth = apart_depth

        debug("  Grid parameters:")
        debug(f"    section_length: {section_length}")
        debug(f"    section_width: {section_width}")
        debug(f"    construction_step: {construction_step}")
        debug(f"    apart_depth: {apart_depth}")

    def create_grid(self, x_range, y_range):
        """Рисуем только в пределах секции, в миллиметрах"""
        debug("  Creating construction grid for row section...")

        self.x_range = x_range
        self.y_range = y_range

        self._create_axes()
        if self.x_points:
            self._create_vertical_lines()
        if self.y_points:
            self._create_horizontal_lines()
        self._add_point_labels()
        self._create_cell_structure()

        debug("  Grid created successfully")

    def _create_axes(self):
        """Оси координат (в мм)"""
        self.msp.add_line(
            self._pt_mm(0, 0),
            self._pt_mm(self.section_length, 0),
            dxfattribs={'layer': 'CONSTRUCTION_GRID', 'color': self.axis_color, 'lineweight': self.axis_lineweight},
        )
        self.msp.add_line(
            self._pt_mm(0, 0),
            self._pt_mm(0, self.section_width),
            dxfattribs={'layer': 'CONSTRUCTION_GRID', 'color': self.axis_color, 'lineweight': self.axis_lineweight},
        )
        debug("    Axes created")

    def _create_vertical_lines(self):
        """Вертикальные линии сетки (в мм)"""
        for x in self.x_points:
            if 0 <= x <= self.section_length:
                self.msp.add_line(
                    self._pt_mm(x, 0),
                    self._pt_mm(x, self.section_width),
                    dxfattribs={'layer': 'CONSTRUCTION_GRID', 'color': self.grid_color, 'lineweight': self.grid_lineweight},
                )
        debug(f"    Created {len(self.x_points)} vertical lines")

    def _create_horizontal_lines(self):
        """Горизонтальные линии сетки (в мм)"""
        for y in self.y_points:
            if 0 <= y <= self.section_width:
                self.msp.add_line(
                    self._pt_mm(0, y),
                    self._pt_mm(self.section_length, y),
                    dxfattribs={'layer': 'CONSTRUCTION_GRID', 'color': self.grid_color, 'lineweight': self.grid_lineweight},
                )
        debug(f"    Created {len(self.y_points)} horizontal lines")

    def _add_point_labels(self):
        """Подписи точек сетки (в мм)"""
        text_height_mm = 200

        for y in self.y_points:
            if 0 <= y <= self.section_width:
                self.msp.add_text(
                    f"Y={y:.1f}",
                    dxfattribs={
                        'height': text_height_mm,
                        'layer': 'CONSTRUCTION_GRID',
                        'color': self.text_color,
                        'insert': (self._mm(0.2), self._mm(y) + 50),
                    }
                )

        for x in self.x_points:
            if 0 <= x <= self.section_length:
                self.msp.add_text(
                    f"X={x:.1f}",
                    dxfattribs={
                        'height': text_height_mm,
                        'layer': 'CONSTRUCTION_GRID',
                        'color': self.text_color,
                        'insert': (self._mm(x) + 50, self._mm(0.2)),
                    }
                )

        debug("    Point labels added")

    def _create_cell_structure(self):
        """Структура ячеек хранится в метрах"""
        if not self.x_points or not self.y_points:
            debug("Not enough data to create cell structure")
            return

        debug("    Creating cell structure based on points:")
        debug(f"      X points: {len(self.x_points)}")
        debug(f"      Y points: {len(self.y_points)}")

        y_zones = []
        for i in range(len(self.y_points) - 1):
            y_min = self.y_points[i]
            y_max = self.y_points[i + 1]
            height = y_max - y_min
            row = i + 1

            zone_type = "standard"
            if abs(height - self.apart_depth) < 0.01:
                zone_type = "apartment zone"
            elif abs(height - 1.75) < 0.01:
                zone_type = "corridor"

            y_zones.append({'y_min': y_min, 'y_max': y_max, 'height': height, 'row': row, 'zone_type': zone_type})
            debug(f"      Row {row}: Y={y_min:.2f}-{y_max:.2f}, height={height:.2f} m ({zone_type})")

        x_cells = []
        for i in range(len(self.x_points) - 1):
            x_min = self.x_points[i]
            x_max = self.x_points[i + 1]
            width = x_max - x_min
            col = i + 1
            x_cells.append({'x_min': x_min, 'x_max': x_max, 'width': width, 'col': col})

        self.cells = {}
        for zone in y_zones:
            for cell in x_cells:
                cell_id = f"{cell['col']}-{zone['row']}"
                self.cells[(cell['col'], zone['row'])] = {
                    'id': cell_id,
                    'x_min': cell['x_min'],
                    'x_max': cell['x_max'],
                    'y_min': zone['y_min'],
                    'y_max': zone['y_max'],
                    'width': cell['width'],
                    'height': zone['height'],
                    'center_x': (cell['x_min'] + cell['x_max']) / 2,
                    'center_y': (zone['y_min'] + zone['y_max']) / 2,
                    'col': cell['col'],
                    'row': zone['row'],
                    'zone_type': zone['zone_type'],
                }

        heights = [z['height'] for z in y_zones]
        self.cell_height = min(heights) if heights else 1.0

        debug("    Cell structure created:")
        debug(f"      Total cells: {len(self.cells)}")
        debug(f"      Columns: {len(x_cells)}")
        debug(f"      Rows: {len(y_zones)}")
        debug(f"      Cell width: {self.construction_step:.1f} m")
        debug(f"      Cell height: {self.cell_height:.2f} m")

    # --------- Отрисовка контура/подсветки ---------
    def add_section_outline(self, length, width):
        """Контур секции (в мм)"""
        if length <= 0 or width <= 0:
            debug("Invalid section outline dimensions")
            return

        pts = [
            self._pt_mm(0, 0),
            self._pt_mm(length, 0),
            self._pt_mm(length, width),
            self._pt_mm(0, width),
            self._pt_mm(0, 0),
        ]

        self.msp.add_lwpolyline(
            pts,
            dxfattribs={'layer': 'SECTION_OUTLINE', 'color': self.outline_color, 'lineweight': self.outline_lineweight, 'closed': True},
        )

        self.msp.add_text(
            f"Section {length:.1f} x {width:.1f} m",
            dxfattribs={
                'height': 300,
                'layer': 'SECTION_OUTLINE',
                'color': self.text_color,
                'insert': (self._mm(length / 2) - 1500, self._mm(width) + 300),
            }
        )
        debug(f"Section outline created: {length:.1f} x {width:.1f} m")

    def highlight_cells(self, cell_ids):
        """Подсветка ячеек (в мм)"""
        highlighted = 0
        for cell_id in cell_ids:
            cell = next((c for c in self.cells.values() if c['id'] == cell_id), None)
            if not cell:
                continue

            pts = [
                self._pt_mm(cell['x_min'], cell['y_min']),
                self._pt_mm(cell['x_max'], cell['y_min']),
                self._pt_mm(cell['x_max'], cell['y_max']),
                self._pt_mm(cell['x_min'], cell['y_max']),
                self._pt_mm(cell['x_min'], cell['y_min']),
            ]

            self.msp.add_lwpolyline(
                pts,
                dxfattribs={'layer': 'CELL_ZONES', 'color': self.cell_zone_color, 'lineweight': 10, 'closed': True},
            )
            highlighted += 1

        if highlighted:
            debug(f"    Highlighted {highlighted} cells")

    # --------- Hatch helpers ---------
    def _add_hatch(self, points_mm, color=9, pattern='ANSI31', scale=0.5, angle=45):
        try:
            hatch = self.msp.add_hatch(color=color)
            hatch.set_pattern_fill(name=pattern, scale=scale, angle=angle)
            hatch.paths.add_polyline_path(points_mm, is_closed=True)
            return hatch
        except Exception as e:
            debug(f"    Hatch error: {e}")
            return None

    def _add_solid_fill(self, points_mm, color=9):
        try:
            hatch = self.msp.add_hatch(color=color)
            hatch.set_solid_fill()
            hatch.paths.add_polyline_path(points_mm, is_closed=True)
            return hatch
        except Exception as e:
            debug(f"    Solid fill error: {e}")
            return None

    # --------- ЛЛУ и коридор ---------
    def get_cells_in_section(self, section_length, section_width):
        cells_in_section = []
        for cell in self.cells.values():
            if (cell['x_min'] >= 0 and cell['x_max'] <= section_length and
                    cell['y_min'] >= 0 and cell['y_max'] <= section_width):
                cells_in_section.append(cell)
        return cells_in_section

    def find_best_lly_position(self, section_length, section_width, lly_type=1, elevator_count=1, apart_depth=6.9):
        actual_length, actual_width, length_cells, width_cells, _ = \
            self._get_actual_lly_size(lly_type, self.construction_step, elevator_count, apart_depth)

        cells_in_section = self.get_cells_in_section(section_length, section_width)
        if not cells_in_section:
            return None

        target_row = 3
        target_cells = [c for c in cells_in_section if c['row'] == target_row]
        if len(target_cells) < length_cells:
            return None

        target_cells.sort(key=lambda x: x['col'])
        center_col = (target_cells[0]['col'] + target_cells[-1]['col']) / 2

        best = None
        best_dist = float('inf')

        for i in range(len(target_cells) - length_cells + 1):
            candidate = target_cells[i:i + length_cells]
            cols = [c['col'] for c in candidate]
            if any(cols[j] + 1 != cols[j + 1] for j in range(len(cols) - 1)):
                continue

            if candidate[0]['x_min'] < 0 or candidate[-1]['x_max'] > section_length:
                continue

            cand_center_col = (cols[0] + cols[-1]) / 2
            dist = abs(cand_center_col - center_col)

            if dist < best_dist:
                y_min = self.y_points[2]
                y_max = self.y_points[3]
                best_dist = dist
                best = {
                    'x_min': candidate[0]['x_min'],
                    'x_max': candidate[-1]['x_max'],
                    'y_min': y_min,
                    'y_max': y_max,
                    'cells': candidate,
                    'cell_ids': [c['id'] for c in candidate],
                    'center_x': (candidate[0]['x_min'] + candidate[-1]['x_max']) / 2,
                    'center_y': (y_min + y_max) / 2,
                    'col_start': candidate[0]['col'],
                    'col_end': candidate[-1]['col'],
                    'row': target_row,
                    'length_cells': length_cells,
                    'width_cells': width_cells,
                    'actual_length': actual_length,
                    'actual_width': actual_width,
                }
        return best

    def find_corridor_position(self, lly_position, corridor_length, corridor_width=1.75, section_length=None):
        if not lly_position:
            return None

        lly_center_x = lly_position['center_x']

        max_corridor_length = min(corridor_length, self.section_length)
        corridor_length_cells = max(1, int(round(max_corridor_length / self.cell_width)))
        corridor_length_meters = corridor_length_cells * self.cell_width

        corridor_cells = [
            c for c in self.cells.values()
            if c['row'] == 2 and c['x_min'] >= 0 and c['x_max'] <= self.section_length
        ]
        if not corridor_cells:
            return None

        corridor_cells.sort(key=lambda x: x['col'])
        corridor_length_cells = min(corridor_length_cells, len(corridor_cells))
        corridor_length_meters = corridor_length_cells * self.cell_width

        best = None
        best_dist = float('inf')

        for i in range(len(corridor_cells) - corridor_length_cells + 1):
            candidate = corridor_cells[i:i + corridor_length_cells]
            cols = [c['col'] for c in candidate]
            if any(cols[j] + 1 != cols[j + 1] for j in range(len(cols) - 1)):
                continue

            if candidate[0]['x_min'] < 0 or candidate[-1]['x_max'] > self.section_length:
                continue

            cand_center_x = (candidate[0]['x_min'] + candidate[-1]['x_max']) / 2
            dist = abs(cand_center_x - lly_center_x)

            if dist < best_dist:
                best_dist = dist
                y_min = self.y_points[1]
                y_max = self.y_points[2]
                best = {
                    'x_min': candidate[0]['x_min'],
                    'x_max': candidate[-1]['x_max'],
                    'y_min': y_min,
                    'y_max': y_max,
                    'cells': candidate,
                    'cell_ids': [c['id'] for c in candidate],
                    'center_x': cand_center_x,
                    'center_y': (y_min + y_max) / 2,
                    'length_cells': corridor_length_cells,
                    'actual_length': corridor_length_meters,
                    'actual_width': corridor_width,
                    'col_start': candidate[0]['col'],
                    'col_end': candidate[-1]['col'],
                }
        return best

    def add_lly_and_corridor_by_cells(self, section_length, section_width,
                                    lly_type=1, corridor_length=15.0, corridor_width=1.75,
                                    elevator_count=None, apart_depth=6.9):
        if elevator_count is None:
            elevator_count = 1

        lly_config = self._get_lly_config(lly_type, elevator_count, self.construction_step, apart_depth)
        actual_length, actual_width, length_cells, width_cells, _ = \
            self._get_actual_lly_size(lly_type, self.construction_step, elevator_count, apart_depth)

        lly_position = self.find_best_lly_position(section_length, section_width, lly_type, elevator_count, apart_depth)
        if not lly_position:
            debug("Failed to place LLU")
            return None

        corridor_position = self.find_corridor_position(lly_position, corridor_length, corridor_width, section_length)

        # Clear zones
        for cell in self.cells.values():
            if cell.get('zone_type') in ['ллу', 'моп']:
                cell['zone_type'] = 'standard'

        # Mark LLU cells
        for col in range(lly_position['col_start'], lly_position['col_end'] + 1):
            cell_row3 = self.cells.get((col, 3))
            if cell_row3:
                cell_row3['zone_type'] = 'ллу'
            cell_row2 = self.cells.get((col, 2))
            if cell_row2:
                cell_row2['zone_type'] = 'ллу'

        # Mark corridor cells
        if corridor_position and corridor_position.get('cell_ids'):
            for cell_id in corridor_position['cell_ids']:
                cell = next((c for c in self.cells.values() if c['id'] == cell_id), None)
                if cell:
                    cell['zone_type'] = 'моп'

        # Draw LLU
        y_min_lly = self.y_points[1]
        y_max_lly = self.y_points[3]
        
        lly_pts = [
            self._pt_mm(lly_position['x_min'], y_min_lly),
            self._pt_mm(lly_position['x_max'], y_min_lly),
            self._pt_mm(lly_position['x_max'], y_max_lly),
            self._pt_mm(lly_position['x_min'], y_max_lly),
            self._pt_mm(lly_position['x_min'], y_min_lly),
        ]
        self._add_solid_fill(lly_pts, color=self.lly_fill_color)
        self._add_hatch(lly_pts, color=self.lly_color, pattern='ANSI31', scale=0.5, angle=45)
        self.msp.add_lwpolyline(
            lly_pts,
            dxfattribs={'layer': 'LLY_OUTLINE', 'color': self.lly_color, 'lineweight': self.lly_lineweight, 'closed': True},
        )

        # Draw corridor
        if corridor_position and corridor_position.get('cell_ids'):
            y_min_cor = self.y_points[1]
            y_max_cor = self.y_points[2]
            
            cor_pts = [
                self._pt_mm(corridor_position['x_min'], y_min_cor),
                self._pt_mm(corridor_position['x_max'], y_min_cor),
                self._pt_mm(corridor_position['x_max'], y_max_cor),
                self._pt_mm(corridor_position['x_min'], y_max_cor),
                self._pt_mm(corridor_position['x_min'], y_min_cor),
            ]
            self._add_solid_fill(cor_pts, color=self.corridor_fill_color)
            self._add_hatch(cor_pts, color=self.corridor_color, pattern='ANSI31', scale=0.3, angle=135)
            self.msp.add_lwpolyline(
                cor_pts,
                dxfattribs={'layer': 'LLY_OUTLINE', 'color': self.corridor_color, 'lineweight': self.corridor_lineweight, 'closed': True},
            )
        else:
            debug("  Corridor not placed: insufficient space")

        # Labels
        lly_center_x_mm = self._mm((lly_position['x_min'] + lly_position['x_max']) / 2)
        lly_center_y_mm = self._mm((y_min_lly + y_max_lly) / 2)

        self.msp.add_text(
            f"LLU {actual_length:.1f}x{actual_width:.1f} m",
            dxfattribs={'height': 250, 'layer': 'LLY_OUTLINE', 'color': self.text_color, 'insert': (lly_center_x_mm - 1000, lly_center_y_mm)},
        )
        elevators_text = f"{lly_config['elevators']} lift" if lly_config['elevators'] == 1 else f"{lly_config['elevators']} lifts"
        self.msp.add_text(
            f"Type {lly_type} ({elevators_text})",
            dxfattribs={'height': 200, 'layer': 'LLY_OUTLINE', 'color': self.text_color, 'insert': (lly_center_x_mm - 800, lly_center_y_mm - 400)},
        )

        if corridor_position:
            cor_center_x_mm = self._mm((corridor_position['x_min'] + corridor_position['x_max']) / 2)
            cor_center_y_mm = self._mm((y_min_cor + y_max_cor) / 2)
            self.msp.add_text(
                f"Corridor {corridor_position['actual_length']:.1f}x{corridor_width:.1f} m",
                dxfattribs={'height': 200, 'layer': 'LLY_OUTLINE', 'color': self.text_color, 'insert': (cor_center_x_mm - 1200, cor_center_y_mm)},
            )

        # Highlight cells
        lly_cell_ids = []
        for col in range(lly_position['col_start'], lly_position['col_end'] + 1):
            for row in [2, 3]:
                cell = self.cells.get((col, row))
                if cell:
                    lly_cell_ids.append(cell['id'])
                    self.highlight_cells([cell['id']])
        
        corridor_cell_ids = []
        if corridor_position and corridor_position.get('cell_ids'):
            corridor_cell_ids = corridor_position['cell_ids']
            self.highlight_cells(corridor_position['cell_ids'])

        self.occupied_cells = []
        for cell in self.cells.values():
            if cell.get('zone_type') in ['ллу', 'моп']:
                self.occupied_cells.append(cell['id'])

        llu_count = len([c for c in self.cells.values() if c.get('zone_type') == 'ллу'])
        mop_count = len([c for c in self.cells.values() if c.get('zone_type') == 'моп'])
        
        debug(f"    LLU cells occupied: {llu_count}")
        debug(f"    MOP cells occupied: {mop_count}")
        debug(f"    Total occupied cells: {len(self.occupied_cells)}")

        return {
            'lly': {
                'position': lly_position, 
                'cell_ids': lly_cell_ids,
                'actual_length': actual_length, 
                'actual_width': actual_width
            },
            'corridor': {
                'position': corridor_position, 
                'cell_ids': corridor_cell_ids
            },
        }

    def add_cell_ids(self):
        """ID ячеек (в мм)"""
        if not self.cells:
            debug("Cell structure not created")
            return

        text_height_mm = 150
        added = 0

        for cell in self.cells.values():
            x_mm = self._mm(cell['center_x'])
            y_mm = self._mm(cell['center_y'])
            self.msp.add_text(
                cell['id'],
                dxfattribs={'height': text_height_mm, 'layer': 'CELL_IDS', 'color': self.cell_id_color, 'insert': (x_mm - 250, y_mm - 100)}
            )
            added += 1

        debug(f"    Added {added} cell IDs")

    def add_lly_and_corridor(self, lly_type, corridor_length, corridor_width):
        if not self.section_length or not self.section_width:
            debug("Error: section parameters not set")
            return None

        return self.add_lly_and_corridor_by_cells(
            self.section_length,
            self.section_width,
            lly_type,
            corridor_length,
            corridor_width,
            apart_depth=self.apart_depth
        )

    def get_cell_info(self):
        rows_info = {}
        for cell in self.cells.values():
            row = cell['row']
            if row not in rows_info:
                rows_info[row] = {
                    'y_range': f"{cell['y_min']:.1f}-{cell['y_max']:.1f}",
                    'height': cell['height'],
                    'zone_type': cell.get('zone_type', 'standard'),
                    'cells': []
                }
            rows_info[row]['cells'].append(cell['id'])

        return {
            'total_cells': len(self.cells),
            'cell_width': self.cell_width,
            'cell_height': self.cell_height,
            'x_points_count': len(self.x_points),
            'y_points_count': len(self.y_points),
            'rows_info': rows_info,
            'cells': self.cells,
        }

    def save(self, filename="construction_grid.dxf"):
        """Сохраняем DXF"""
        try:
            if not self.doc:
                debug("  Error: DXF document not created")
                return None

            required_layers = [
                'CONSTRUCTION_GRID', 'CELL_IDS', 'CELL_ZONES',
                'SECTION_OUTLINE', 'LLY_OUTLINE', 'APARTMENTS',
                'REFERENCE_POINTS', 'TEXT', 'WALLS'
            ]
            for name in required_layers:
                if not self.doc.layers.has_entry(name):
                    self.doc.layers.new(name, dxfattribs={'color': 7})

            if not self.doc.styles.has_entry('STANDARD'):
                self.doc.styles.new('STANDARD', dxfattribs={'font': 'txt.shx'})

            auditor = self.doc.audit()
            if auditor.has_errors:
                debug("DXF AUDIT ERRORS:")
                auditor.print_report()

            entities_count = len(list(self.msp))
            debug(f"  Total entities in drawing: {entities_count}")
            if entities_count == 0:
                debug("  Warning: drawing contains no entities")
                return None

            self.doc.saveas(filename)

            if os.path.exists(filename) and os.path.getsize(filename) > 100:
                debug(f"  DXF saved: {filename} ({os.path.getsize(filename)} bytes)")
                return filename

            debug("  Error: file not created or too small")
            return None

        except Exception as e:
            debug(f"  Error saving DXF: {e}")
            import traceback
            traceback.print_exc()
            return None