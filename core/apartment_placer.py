"""
apartment_placer.py - Размещение квартир в ячейках сетки
с учетом процентов пользователя и отрисовкой стен
"""

import ezdxf
import math
import random
import sys
from pathlib import Path


def debug(msg):
    sys.stderr.write(str(msg) + "\n")
    sys.stderr.flush()


class ApartmentPlacer:
    def __init__(self, grid, params, apartments_path=None):
        self.grid = grid
        self.params = params
        self.placed_apartments = []
        self.occupied_cells = getattr(grid, 'occupied_cells', []) or []

        self.apart_depth = params.get('apart_depth', 6.9)
        self.construction_step = params.get('construction_step', 3.0)
        self.cell_width = self.construction_step
        self.section_length = params.get('section_length', 27.0)
        self.section_width = params.get('section_width', 15.55)

        self.wall_thickness = 200
        self.wall_color = 7
        self.wall_lineweight = 50

        self.coefficient = params.get('coefficient', 0.77)
        self.max_apart_count = params.get('max_apart_count', 6)
        self.max_square_apart = params.get('max_square_apart', 316.8)

        self.base_percents = {
            'studio_room': params.get('studio_room', 0),
            'one_room': params.get('one_room', 0),
            'two_room': params.get('two_room', 0),
            'three_room': params.get('three_room', 0),
            'four_room': params.get('four_room', 0),
        }

        self.apartment_configs = {
            'studio_room': {
                'cells_h': 1, 'cells_v': 1,
                'width_m': self.cell_width, 'height_m': self.apart_depth,
                'area_m2': self.cell_width * self.apart_depth,
                'name_ru': 'Студия', 'hatch_color': 5,
                'allowed_rows': [1, 3],
            },
            'one_room': {
                'cells_h': 2, 'cells_v': 1,
                'width_m': self.cell_width * 2, 'height_m': self.apart_depth,
                'area_m2': self.cell_width * 2 * self.apart_depth,
                'name_ru': '1-к', 'hatch_color': 3,
                'allowed_rows': [1, 3],
            },
            'one_room_vertical_end': {
                'cells_h': 1, 'cells_v': 3,
                'width_m': self.cell_width, 'height_m': self.section_width,
                'area_m2': self.cell_width * self.section_width,
                'name_ru': '1-к Верт', 'hatch_color': 4,
                'allowed_rows': [1, 2, 3],
            },
            'two_room': {
                'cells_h': 3, 'cells_v': 1,
                'width_m': self.cell_width * 3, 'height_m': self.apart_depth,
                'area_m2': self.cell_width * 3 * self.apart_depth,
                'name_ru': '2-к', 'hatch_color': 2,
                'allowed_rows': [1, 3],
            },
            'three_room': {
                'cells_h': 4, 'cells_v': 1,
                'width_m': self.cell_width * 4, 'height_m': self.apart_depth,
                'area_m2': self.cell_width * 4 * self.apart_depth,
                'name_ru': '3-к', 'hatch_color': 40,
                'allowed_rows': [1, 3],
            },
            'three_room_end': {
                'cells_h': 3, 'cells_v': 3,
                'width_m': self.cell_width * 3, 'height_m': self.apart_depth * 3,
                'area_m2': 6 * self.cell_width * self.apart_depth,
                'name_ru': '3-к Угл', 'hatch_color': 41,
                'allowed_rows': [1, 2, 3],
            },
            'four_room': {
                'cells_h': 5, 'cells_v': 1,
                'width_m': self.cell_width * 5, 'height_m': self.apart_depth,
                'area_m2': self.cell_width * 5 * self.apart_depth,
                'name_ru': '4-к', 'hatch_color': 6,
                'allowed_rows': [1, 3],
            }
        }

        self.colors = {'wall': 7, 'text': 7}
        debug("ApartmentPlacer initialized")
        debug(f"  Step: {self.construction_step} m, depth: {self.apart_depth} m")

    # ---------- Геометрические методы ----------
    def _normalize_zone_type(self, value):
        return str(value).strip().lower() if value is not None else ''

    def _is_blocker(self, cell):
        z = self._normalize_zone_type(cell.get('zone_type'))
        return z in ['моп', 'ллу']

    def _is_free_cell(self, cell):
        return cell['id'] not in self.occupied_cells and not self._is_blocker(cell)

    def _get_cell(self, col, row):
        return self.grid.cells.get((col, row))

    def _get_row_cells(self, row):
        cells = [c for c in self.grid.cells.values() if c['row'] == row]
        cells.sort(key=lambda x: x['col'])
        return cells

    def _get_all_free_cells(self):
        free = []
        for row in [1, 2, 3]:
            for col in range(1, self._get_max_column() + 1):
                cell = self._get_cell(col, row)
                if cell and self._is_free_cell(cell):
                    free.append(cell)
        return free

    def _get_free_cells_in_rows(self, rows):
        free = []
        for row in rows:
            for col in range(1, self._get_max_column() + 1):
                cell = self._get_cell(col, row)
                if cell and self._is_free_cell(cell):
                    free.append(cell)
        debug(f"    Free cells in rows {rows}: {[(c['row'], c['col']) for c in free]}")
        return free

    def _get_max_column(self):
        return max((c['col'] for c in self.grid.cells.values()), default=0)

    def _get_min_column(self):
        return min((c['col'] for c in self.grid.cells.values()), default=0)

    # ---------- Поиск позиций для торцевых квартир ----------
    def _find_vertical_end_position(self, side='left'):
        col = 1 if side == 'left' else self._get_max_column()
        cells = []
        for row in [3, 2, 1]:
            cell = self._get_cell(col, row)
            if not cell or not self._is_free_cell(cell):
                return None
            cells.append(cell)
        return cells

    def _find_l_shape_end_position(self, side='right'):
        if side == 'left':
            col_start = self._get_min_column()
        else:
            col_start = self._get_max_column() - 2
        cells_upper = []
        for i in range(3):
            col = col_start + i
            cell = self._get_cell(col, 3)
            if not cell or not self._is_free_cell(cell):
                return None
            cells_upper.append(cell)
        cells_middle = []
        for i in range(2):
            col = col_start + 1 + i
            cell = self._get_cell(col, 2)
            if not cell or not self._is_free_cell(cell):
                return None
            cells_middle.append(cell)
        bottom_col = col_start + 2
        cell_bottom = self._get_cell(bottom_col, 1)
        if not cell_bottom or not self._is_free_cell(cell_bottom):
            return None
        return cells_upper + cells_middle + [cell_bottom]

    # ---------- Рисование ----------
    def _draw_double_line_wall(self, x1, y1, x2, y2, is_horizontal=True):
        t = self.wall_thickness
        if is_horizontal:
            self.grid.msp.add_line((x1, y1 - t/2), (x2, y2 - t/2), dxfattribs={'layer': 'WALLS', 'color': self.wall_color, 'lineweight': self.wall_lineweight})
            self.grid.msp.add_line((x1, y1 + t/2), (x2, y2 + t/2), dxfattribs={'layer': 'WALLS', 'color': self.wall_color, 'lineweight': self.wall_lineweight})
        else:
            self.grid.msp.add_line((x1 - t/2, y1), (x2 - t/2, y2), dxfattribs={'layer': 'WALLS', 'color': self.wall_color, 'lineweight': self.wall_lineweight})
            self.grid.msp.add_line((x1 + t/2, y1), (x2 + t/2, y2), dxfattribs={'layer': 'WALLS', 'color': self.wall_color, 'lineweight': self.wall_lineweight})

    def _draw_filled_rectangle(self, x1, y1, x2, y2, color):
        hatch = self.grid.msp.add_hatch(color=color, dxfattribs={'layer': 'APARTMENTS'})
        hatch.set_pattern_fill('SOLID', color=color)
        hatch.paths.add_polyline_path([(x1, y1), (x2, y1), (x2, y2), (x1, y2)], is_closed=True)
        hatch.set_pattern_scale(1.0)

    def _draw_text(self, text, x, y, height):
        self.grid.msp.add_text(text, dxfattribs={'height': height, 'layer': 'TEXT', 'color': self.colors['text'], 'insert': (x, y)})

    def _draw_regular_apartment(self, cells, apt_type):
        cfg = self.apartment_configs[apt_type]
        x_min = min(c['x_min'] for c in cells)
        x_max = max(c['x_max'] for c in cells)
        y_min = min(c['y_min'] for c in cells)
        y_max = max(c['y_max'] for c in cells)
        width_m = x_max - x_min
        height_m = y_max - y_min
        x_mm = x_min * 1000
        y_mm = y_min * 1000
        w_mm = width_m * 1000
        h_mm = height_m * 1000
        t = self.wall_thickness
        inner_x = x_mm + t
        inner_y = y_mm + t
        inner_w = w_mm - 2 * t
        inner_h = h_mm - 2 * t
        self._draw_filled_rectangle(inner_x, inner_y, inner_x + inner_w, inner_y + inner_h, cfg['hatch_color'])
        self._draw_double_line_wall(x_mm, y_mm, x_mm + w_mm, y_mm, is_horizontal=True)
        self._draw_double_line_wall(x_mm, y_mm + h_mm, x_mm + w_mm, y_mm + h_mm, is_horizontal=True)
        self._draw_double_line_wall(x_mm, y_mm, x_mm, y_mm + h_mm, is_horizontal=False)
        self._draw_double_line_wall(x_mm + w_mm, y_mm, x_mm + w_mm, y_mm + h_mm, is_horizontal=False)
        label = cfg['name_ru']
        cx = (x_min + width_m / 2) * 1000
        cy = (y_min + height_m / 2) * 1000
        text_h = min(250, max(150, width_m * 1000 / 6))
        tw = len(label) * text_h * 0.55
        self._draw_text(label, cx - tw / 2, cy - text_h / 2, text_h)

    def _draw_l_shape_apartment(self, cells, apt_type, is_left=True):
        cfg = self.apartment_configs[apt_type]
        t = self.wall_thickness
        for cell in cells:
            x_mm = cell['x_min'] * 1000
            y_mm = cell['y_min'] * 1000
            w_mm = cell['width'] * 1000
            h_mm = cell['height'] * 1000
            inner_x = x_mm + t
            inner_y = y_mm + t
            inner_w = w_mm - 2 * t
            inner_h = h_mm - 2 * t
            self._draw_filled_rectangle(inner_x, inner_y, inner_x + inner_w, inner_y + inner_h, cfg['hatch_color'])
        x_min = min(c['x_min'] for c in cells) * 1000
        x_max = max(c['x_max'] for c in cells) * 1000
        y_min = min(c['y_min'] for c in cells) * 1000
        y_max = max(c['y_max'] for c in cells) * 1000
        self._draw_double_line_wall(x_min, y_max, x_max, y_max, is_horizontal=True)
        self._draw_double_line_wall(x_min, y_min, x_max, y_min, is_horizontal=True)
        self._draw_double_line_wall(x_min, y_min, x_min, y_max, is_horizontal=False)
        self._draw_double_line_wall(x_max, y_min, x_max, y_max, is_horizontal=False)
        label = cfg['name_ru']
        center_x = (x_min + x_max) / 2
        center_y = (y_min + y_max) / 2
        text_h = min(250, max(150, (x_max - x_min) / 6))
        tw = len(label) * text_h * 0.55
        self._draw_text(label, center_x - tw / 2, center_y - text_h / 2, text_h)

    def insert_apartment(self, apt_type, cells, is_end=False, is_left=True):
        if not cells:
            return False, 0
        if apt_type == 'three_room_end':
            self._draw_l_shape_apartment(cells, apt_type, is_left)
            area = self.apartment_configs[apt_type]['area_m2']
        else:
            self._draw_regular_apartment(cells, apt_type)
            area = self.apartment_configs[apt_type]['area_m2']
        for cell in cells:
            if cell['id'] not in self.occupied_cells:
                self.occupied_cells.append(cell['id'])
        return True, area

    # ---------- Основной алгоритм размещения ----------
    def place_apartments(self):
        debug("\n=== START place_apartments ===")
        debug(f"Percentages: studio={self.base_percents['studio_room']}, one={self.base_percents['one_room']}, two={self.base_percents['two_room']}, three={self.base_percents['three_room']}, four={self.base_percents['four_room']}")
        
        placed = []
        total_area = 0

        # ========== 1. АНАЛИЗ КОРИДОРА ==========
        # Определяем, где заканчивается коридор
        corridor_end_col = None
        for col in range(self._get_max_column(), 0, -1):
            cell = self._get_cell(col, 2)
            if cell and cell.get('zone_type') == 'моп':
                corridor_end_col = col
                break
        
        max_col = self._get_max_column()
        debug(f"Corridor ends at column: {corridor_end_col}, max column: {max_col}")
        
        # Свободные ячейки справа после коридора в строке 2
        free_cells_right_row2 = 0
        if corridor_end_col:
            for col in range(corridor_end_col + 1, max_col + 1):
                cell = self._get_cell(col, 2)
                if cell and self._is_free_cell(cell):
                    free_cells_right_row2 += 1
        
        debug(f"Free cells in row2 after corridor: {free_cells_right_row2}")
        
        # ========== 2. ТОРЦЕВЫЕ КВАРТИРЫ ==========
        debug("\n  1. PLACING END APARTMENTS")
        
        # Левая сторона - вертикальная 1-к
        if self.base_percents.get('one_room', 0) > 0:
            cells_left = self._find_vertical_end_position('left')
            if cells_left:
                area = self.apartment_configs['one_room_vertical_end']['area_m2']
                if total_area + area <= self.max_square_apart:
                    ok, area = self.insert_apartment('one_room_vertical_end', cells_left, is_end=True, is_left=True)
                    if ok:
                        placed.append({'type': 'one_room_vertical_end', 'cells': [c['id'] for c in cells_left], 'area': area, 'side': 'left'})
                        total_area += area
                        debug(f"    Vertical 1-room (left), area: {area:.1f}")
        
        # Правая сторона
        right_placed = False
        
        # Если есть свободные ячейки в row2 (минимум 2) и есть трехкомнатные в процентах
        if free_cells_right_row2 >= 2 and self.base_percents.get('three_room', 0) > 0:
            cells_right = self._find_l_shape_end_position('right')
            if cells_right:
                # Проверяем, что все ячейки свободны
                if all(self._is_free_cell(c) for c in cells_right):
                    area = self.apartment_configs['three_room_end']['area_m2']
                    if total_area + area <= self.max_square_apart:
                        ok, area = self.insert_apartment('three_room_end', cells_right, is_end=True, is_left=False)
                        if ok:
                            placed.append({'type': 'three_room_end', 'cells': [c['id'] for c in cells_right], 'area': area, 'side': 'right'})
                            total_area += area
                            right_placed = True
                            debug(f"    L-shaped 3-room (right), area: {area:.1f}")
        
        # Если не разместили Г-образную, пробуем вертикальную 1-к справа
        if not right_placed and self.base_percents.get('one_room', 0) > 0:
            cells_right = self._find_vertical_end_position('right')
            if cells_right:
                if all(self._is_free_cell(c) for c in cells_right):
                    area = self.apartment_configs['one_room_vertical_end']['area_m2']
                    if total_area + area <= self.max_square_apart:
                        ok, area = self.insert_apartment('one_room_vertical_end', cells_right, is_end=True, is_left=False)
                        if ok:
                            placed.append({'type': 'one_room_vertical_end', 'cells': [c['id'] for c in cells_right], 'area': area, 'side': 'right'})
                            total_area += area
                            debug(f"    Vertical 1-room (right), area: {area:.1f}")

        # ========== 3. РАСЧЁТ КОЛИЧЕСТВА КВАРТИР ПО ПРОЦЕНТАМ ==========
        free_cells = self._get_free_cells_in_rows([1, 3])
        total_free_cells = len(free_cells)
        total_apartments = max(1, round(total_free_cells / 2.8))
        total_apartments = min(total_apartments, self.max_apart_count)
        debug(f"  Free cells for regular: {total_free_cells}, planned apartments: {total_apartments}")

        apartments_to_place = []
        total_percent = sum(self.base_percents.values())
        if total_percent > 0:
            for apt_type, percent in self.base_percents.items():
                if percent > 0:
                    count = max(0, round(total_apartments * percent / total_percent))
                    if count == 0 and percent > 0:
                        count = 1
                    for _ in range(count):
                        apartments_to_place.append(apt_type)
        else:
            apartments_to_place = ['one_room'] * 2 + ['two_room'] * 1 + ['studio_room'] * 2

        debug("  Planned apartments by type:")
        for t in set(apartments_to_place):
            debug(f"    {self.apartment_configs[t]['name_ru']}: {apartments_to_place.count(t)}")

        # ========== 4. ЗАПОЛНЕНИЕ РЯДОВЫХ ЯЧЕЕК ==========
        debug("\n  4. FILLING REMAINING CELLS (rows 1 and 3)")
        apartments_to_place.sort(key=lambda x: self.apartment_configs[x]['cells_h'], reverse=True)

        for row in [3, 1]:
            row_cells = [c for c in self._get_row_cells(row) if self._is_free_cell(c)]
            if not row_cells:
                continue
            
            blocks = []
            cur = []
            prev = None
            for cell in row_cells:
                if not cur:
                    cur = [cell]
                    prev = cell['col']
                elif cell['col'] == prev + 1:
                    cur.append(cell)
                else:
                    blocks.append(cur)
                    cur = [cell]
                prev = cell['col']
            if cur:
                blocks.append(cur)

            for block in blocks:
                if not block or not apartments_to_place:
                    continue
                start = 0
                while start < len(block) and apartments_to_place:
                    remaining = len(block) - start
                    selected = None
                    for apt_type in apartments_to_place[:]:
                        cfg = self.apartment_configs[apt_type]
                        if row not in cfg.get('allowed_rows', [1, 3]):
                            continue
                        if cfg['cells_h'] <= remaining:
                            selected = apt_type
                            break
                    if not selected:
                        start += 1
                        continue
                    cells = block[start:start + self.apartment_configs[selected]['cells_h']]
                    area = self.apartment_configs[selected]['area_m2']
                    if total_area + area <= self.max_square_apart:
                        ok, area = self.insert_apartment(selected, cells, is_end=False)
                        if ok:
                            placed.append({'type': selected, 'cells': [c['id'] for c in cells], 'area': area})
                            apartments_to_place.remove(selected)
                            total_area += area
                            debug(f"    {self.apartment_configs[selected]['name_ru']} (row {row}, cols {cells[0]['col']}-{cells[-1]['col']}) area: {area:.1f}")
                            start += self.apartment_configs[selected]['cells_h']
                            continue
                    start += 1

        # ========== 5. ДОЗАПОЛНЕНИЕ ОСТАВШИХСЯ ЯЧЕЕК СТУДИЯМИ ==========
        remaining = self._get_free_cells_in_rows([1, 3])
        if remaining:
            debug(f"\n  5. FILLING REMAINING {len(remaining)} CELLS WITH STUDIOS")
            for cell in remaining:
                area = self.apartment_configs['studio_room']['area_m2']
                if total_area + area <= self.max_square_apart:
                    ok, area = self.insert_apartment('studio_room', [cell], is_end=False)
                    if ok:
                        placed.append({'type': 'studio_room', 'cells': [cell['id']], 'area': area})
                        total_area += area
                        debug(f"    + Studio (row {cell['row']}, col {cell['col']}) area: {area:.1f}")

        # ========== 6. ПРИНУДИТЕЛЬНОЕ ЗАПОЛНЕНИЕ (игнорируем лимиты) ==========
        final_remaining = self._get_free_cells_in_rows([1, 3])
        if final_remaining:
            debug(f"\n  6. FORCING FILL OF {len(final_remaining)} REMAINING CELLS")
            for cell in final_remaining:
                area = self.apartment_configs['studio_room']['area_m2']
                ok, area = self.insert_apartment('studio_room', [cell], is_end=False)
                if ok:
                    placed.append({'type': 'studio_room', 'cells': [cell['id']], 'area': area})
                    total_area += area
                    debug(f"    FORCED: Studio (row {cell['row']}, col {cell['col']}) area: {area:.1f}")

        self.placed_apartments = placed
        debug(f"\n  TOTAL PLACED: {len(placed)}")
        debug(f"  Total area: {total_area:.1f}")
        
        final_free = self._get_free_cells_in_rows([1, 3])
        if final_free:
            debug(f"  WARNING: {len(final_free)} cells remain empty!")
        else:
            debug("  SUCCESS: All cells filled!")
        
        efficiency = total_area / self.max_square_apart if self.max_square_apart > 0 else 0
        debug(f"  Efficiency: {efficiency:.2f} ({efficiency*100:.1f}%)")
        
        type_stats = {}
        for a in placed:
            t = self.apartment_configs[a['type']]['name_ru']
            type_stats[t] = type_stats.get(t, 0) + 1
        debug(f"  Distribution: {type_stats}")
        
        return placed

    def get_apartments_summary(self):
        if not self.placed_apartments:
            return {'total': 0, 'total_area': 0, 'average_area': 0, 'by_type': {}}
        total_area = sum(a.get('area', 0) for a in self.placed_apartments)
        by_type = {}
        for a in self.placed_apartments:
            t = self.apartment_configs[a['type']]['name_ru']
            by_type[t] = by_type.get(t, 0) + 1
        return {
            'total': len(self.placed_apartments),
            'total_area': total_area,
            'average_area': total_area / len(self.placed_apartments),
            'by_type': by_type,
            'apartments': self.placed_apartments
        }

    def get_free_cells(self):
        return [cell for cell in self.grid.cells.values() if self._is_free_cell(cell)]