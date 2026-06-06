"""
从数据库同步食材名称映射到 backend/frontend 配置文件。
新增食材（如用户通过冰箱添加的草莓、葡萄）会自动分配 slug 文件名并写入映射表。

用法:
  cd backend
  python scripts/sync_ingredient_maps_from_db.py
  python scripts/sync_ingredient_maps_from_db.py --dry-run
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_ROOT = BACKEND_ROOT.parent / "frontend"
sys.path.insert(0, str(BACKEND_ROOT))

from src.crud.ingredient_base import get_all_ingredients  # noqa: E402
from src.utils.database import SessionLocal  # noqa: E402
from src.utils.ingredient_images import (  # noqa: E402
    INGREDIENT_LOCAL_FILENAMES,
    ensure_ingredient_filename,
    merge_db_ingredient_sources,
)


def _format_py_mapping(items: dict[str, str]) -> str:
    lines = ['INGREDIENT_LOCAL_FILENAMES: Dict[str, str] = {']
    for name, filename in sorted(items.items(), key=lambda x: x[0]):
        lines.append(f'    "{name}": "{filename}",')
    lines.append('}')
    return '\n'.join(lines)


def _format_ts_mapping(items: dict[str, str]) -> str:
    lines = ['export const INGREDIENT_LOCAL_IMAGE_BY_NAME: Record<string, string> = {']
    for name, filename in sorted(items.items(), key=lambda x: x[0]):
        key = name if re.match(r'^[\w\u4e00-\u9fff]+$', name) else f"'{name}'"
        lines.append(f'  {key}: \'{filename}\',')
    lines.append('};')
    return '\n'.join(lines)


def _replace_block(content: str, start_marker: str, end_marker: str, new_block: str) -> str:
    start = content.find(start_marker)
    if start < 0:
        raise ValueError(f'未找到标记: {start_marker}')
    end = content.find(end_marker, start)
    if end < 0:
        raise ValueError(f'未找到结束标记: {end_marker}')
    return content[:start] + new_block + content[end:]


def sync_maps(dry_run: bool = False) -> int:
    db = SessionLocal()
    try:
        sources = merge_db_ingredient_sources(db)
        items = get_all_ingredients(db)
    finally:
        db.close()

    merged = dict(INGREDIENT_LOCAL_FILENAMES)
    added = 0
    for item in items:
        before = merged.get(item.name)
        filename = ensure_ingredient_filename(item.name)
        merged[item.name] = filename
        if before != filename:
            added += 1
            print(f'  + {item.name} -> {filename} ({item.category})')

    if added == 0:
        print('映射已是最新，无需更新')
        return 0

    py_block = _format_py_mapping(merged)
    ts_block = _format_ts_mapping(merged)

    py_path = BACKEND_ROOT / 'src' / 'utils' / 'ingredient_images.py'
    ts_path = FRONTEND_ROOT / 'src' / 'utils' / 'ingredientImageMap.ts'

    py_content = py_path.read_text(encoding='utf-8')
    ts_content = ts_path.read_text(encoding='utf-8')

    new_py = _replace_block(
        py_content,
        'INGREDIENT_LOCAL_FILENAMES: Dict[str, str] = {',
        '\n}\n\nINGREDIENT_CATALOG',
        py_block + '\n\n',
    )
    new_ts = _replace_block(
        ts_content,
        'export const INGREDIENT_LOCAL_IMAGE_BY_NAME: Record<string, string> = {',
        '\n};\n\n/** 与 backend slugify',
        ts_block + '\n\n',
    )

    if dry_run:
        print(f'\n[dry-run] 将新增/更新 {added} 条映射')
        return added

    py_path.write_text(new_py, encoding='utf-8')
    ts_path.write_text(new_ts, encoding='utf-8')
    print(f'\n已写入 {py_path.name} 与 {ts_path.name}（{added} 条变更）')
    return added


def main() -> None:
    parser = argparse.ArgumentParser(description='从数据库同步食材图片映射')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    print('同步数据库食材映射...')
    sync_maps(dry_run=args.dry_run)


if __name__ == '__main__':
    main()
