"""
main.py - Главный скрипт для генерации планировок секций
"""

import sys
import json
import os
import traceback
import random
from datetime import datetime

# Добавляем путь к модулям
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Устанавливаем кодировку
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    import io
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

original_stdout = sys.stdout
sys.stdout = sys.stderr

from row_section_generator import RowSectionGenerator

def debug(msg):
    sys.stderr.write(str(msg) + "\n")
    sys.stderr.flush()

def generate_variants(params):
    """Генерирует 3 РАЗНЫХ варианта планировок"""
    variants = []
    
    # Базовые параметры (общие для всех вариантов)
    base_params = {
        'floor_count': int(params.get('floorCount', 9)),
        'section_type': 1,
        'section_length': float(params.get('sectionLength', 27.0)),
        'construction_step': float(params.get('constructionStep', 3.0)),
        'apart_depth': float(params.get('apartmentDepth', 6.9)),
        'width_corridor': float(params.get('corridorWidth', 1.75)),
        'lly_type': int(params.get('llyType', 2)),
        'elevator_count': int(params.get('elevatorCount', 2)),
        'lenght_corridor': float(params.get('corridorLength', 18.0)),
        'max_square_apart': float(params.get('maxApartmentArea', 400)),
        'max_apart_count': int(params.get('apartmentsPerFloor', 8)),
        'apartments_path': 'dataset',
        'place_apartments': True,
        'output_dir': 'exports',
        
        # Проценты квартир (5 типов: студии, 1-к, 2-к, 3-к, 4-к)
        'studio_room': int(params.get('r0', 10)),      # Студии
        'one_room': int(params.get('r1', 30)),         # 1-комнатные
        'two_room': int(params.get('r2', 30)),         # 2-комнатные
        'three_room': int(params.get('r3', 20)),       # 3-комнатные
        'four_room': int(params.get('r4', 10)),        # 4-комнатные
    }
    
    # Корректировка процентов, если сумма не 100
    total_percent = base_params['studio_room'] + base_params['one_room'] + base_params['two_room'] + base_params['three_room'] + base_params['four_room']
    if total_percent != 100 and total_percent > 0:
        debug(f"Adjusting percentages: total={total_percent}")
        base_params['studio_room'] = int(base_params['studio_room'] * 100 / total_percent)
        base_params['one_room'] = int(base_params['one_room'] * 100 / total_percent)
        base_params['two_room'] = int(base_params['two_room'] * 100 / total_percent)
        base_params['three_room'] = int(base_params['three_room'] * 100 / total_percent)
        base_params['four_room'] = 100 - base_params['studio_room'] - base_params['one_room'] - base_params['two_room'] - base_params['three_room']
    
    debug(f"Final percentages: Studio={base_params['studio_room']}%, 1k={base_params['one_room']}%, 2k={base_params['two_room']}%, 3k={base_params['three_room']}%, 4k={base_params['four_room']}%")
    
    # Три РАЗНЫХ варианта с разными параметрами
    variants_config = [
        {
            'coeff': 0.70,
            'name': 'Экономичный',
            'desc': 'Максимальное количество квартир',
            'max_apart_count': base_params['max_apart_count'] + 2,
            'max_square_apart': base_params['max_square_apart'] * 0.8,
        },
        {
            'coeff': 0.85,
            'name': 'Сбалансированный',
            'desc': 'Оптимальное соотношение',
            'max_apart_count': base_params['max_apart_count'],
            'max_square_apart': base_params['max_square_apart'],
        },
        {
            'coeff': 0.95,
            'name': 'Комфортный',
            'desc': 'Просторные квартиры',
            'max_apart_count': max(4, base_params['max_apart_count'] - 2),
            'max_square_apart': base_params['max_square_apart'] * 1.2,
        }
    ]
    
    project_id = params.get('projectId', 'unknown')
    exports_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'exports')
    os.makedirs(exports_dir, exist_ok=True)
    
    # Используем seed для разнообразия
    random.seed(project_id)
    
    for i, config in enumerate(variants_config, 1):
        debug(f"="*50)
        debug(f"Generating variant {i}: {config['name']}")
        debug(f"  Coefficient: {config['coeff']}")
        debug(f"  Max apartments: {config['max_apart_count']}")
        debug(f"  Max area: {config['max_square_apart']:.1f}")
        
        # Копируем параметры для варианта
        variant_params = base_params.copy()
        variant_params['coefficient'] = config['coeff']
        variant_params['max_apart_count'] = config['max_apart_count']
        variant_params['max_square_apart'] = config['max_square_apart']
        variant_params['projectId'] = project_id
        variant_params['variantId'] = i
        variant_params['output_dir'] = exports_dir
        
        # Добавляем случайное смещение для разнообразия планировки
        variant_params['random_seed'] = hash(f"{project_id}_{i}") % 10000
        
        try:
            generator = RowSectionGenerator(variant_params)
            grid = generator.create_construction_grid()
            
            if grid and generator.apartment_placer:
                summary = generator.apartment_placer.get_apartments_summary()
                
                dxf_filename = f"{project_id}_{i}.dxf"
                dxf_path = os.path.join(exports_dir, dxf_filename)
                
                if grid.save(dxf_path):
                    debug(f"  DXF saved: {dxf_path} ({os.path.getsize(dxf_path)} bytes)")
                else:
                    debug(f"  Error saving DXF")
                    dxf_path = None
                
                # Преобразование типов квартир
                type_mapping = {
                    'Студия': 'Студия',
                    '1-к': '1-комнатная',
                    '1-к Верт': '1-к вертикальная',
                    '2-к': '2-комнатная',
                    '3-к': '3-комнатная',
                    '3-к Угл': '3-к угловая',
                    '4-к': '4-комнатная'
                }
                
                by_type_ru = {}
                for key, value in summary.get('by_type', {}).items():
                    ru_key = type_mapping.get(key, key)
                    by_type_ru[ru_key] = by_type_ru.get(ru_key, 0) + value
                
                variants.append({
                    'id': i,
                    'name': config['name'],
                    'efficiency': config['coeff'],
                    'apartment_count': summary.get('total', 0),
                    'total_apartments': summary.get('total', 0) * variant_params.get('floor_count', 1),
                    'area': round(summary.get('total_area', 0), 1),
                    'description': config['desc'],
                    'dxf_path': dxf_path,
                    'dxf_filename': dxf_filename if dxf_path else None,
                    'by_type': by_type_ru,
                    'used_params': {
                        'coeff': config['coeff'],
                        'max_apart_count': config['max_apart_count'],
                        'max_area': round(config['max_square_apart'], 1)
                    }
                })
                debug(f"  Variant {i} completed: {summary.get('total', 0)} apartments, {summary.get('total_area', 0):.1f} sq.m")
                debug(f"  Distribution: {by_type_ru}")
            else:
                debug(f"  Error: grid not created for variant {i}")
                variants.append({
                    'id': i,
                    'name': config['name'],
                    'efficiency': config['coeff'],
                    'apartment_count': 0,
                    'total_apartments': 0,
                    'area': 0,
                    'description': config['desc'],
                    'dxf_path': None,
                    'dxf_filename': None,
                    'by_type': {},
                    'error': 'Grid not created'
                })
        except Exception as e:
            debug(f"  Error in variant {i}: {str(e)}")
            traceback.print_exc(file=sys.stderr)
            variants.append({
                'id': i,
                'name': config['name'],
                'efficiency': config['coeff'],
                'apartment_count': 0,
                'total_apartments': 0,
                'area': 0,
                'description': config['desc'],
                'dxf_path': None,
                'dxf_filename': None,
                'by_type': {},
                'error': str(e)
            })
    
    return variants

def main():
    result = {
        'success': False,
        'variants': [],
        'statistics': {
            'totalVariants': 0,
            'bestEfficiency': 0,
            'averageEfficiency': 0
        }
    }
    
    try:
        if len(sys.argv) < 2:
            sys.stdout = original_stdout
            print(json.dumps(result, ensure_ascii=False))
            return
        
        params_file = sys.argv[1]
        with open(params_file, 'r', encoding='utf-8') as f:
            params = json.load(f)
        
        debug("="*60)
        debug("PARAMETERS LOADED")
        debug(f"Project ID: {params.get('projectId', 'unknown')}")
        debug(f"Floor count: {params.get('floorCount', 9)}")
        debug(f"Percentages: Studio={params.get('r0', 10)}%, 1k={params.get('r1', 30)}%, 2k={params.get('r2', 30)}%, 3k={params.get('r3', 20)}%, 4k={params.get('r4', 10)}%")
        debug("="*60)
        
        variants = generate_variants(params)
        
        if variants:
            result['success'] = True
            result['variants'] = variants
            valid_variants = [v for v in variants if v.get('apartment_count', 0) > 0]
            if valid_variants:
                result['statistics'] = {
                    'totalVariants': len(valid_variants),
                    'bestEfficiency': max(v.get('efficiency', 0) for v in valid_variants),
                    'averageEfficiency': sum(v.get('efficiency', 0) for v in valid_variants) / len(valid_variants)
                }
            debug(f"Successfully generated {len(variants)} variants")
            
    except Exception as e:
        debug(f"Fatal error: {str(e)}")
        traceback.print_exc(file=sys.stderr)
        result['error'] = str(e)
    
    sys.stdout = original_stdout
    print(json.dumps(result, ensure_ascii=False))
    sys.stdout.flush()

if __name__ == "__main__":
    main()