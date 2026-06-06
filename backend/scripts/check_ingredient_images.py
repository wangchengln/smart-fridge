"""检查数据库食材与本地图片覆盖情况"""
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from src.crud.ingredient_base import get_all_ingredients
from src.utils.database import SessionLocal
from src.utils.ingredient_images import (
    CATEGORY_IMAGE_DIR,
    CATEGORY_LOCAL_FILENAMES,
    INGREDIENT_IMAGE_DIR,
    INGREDIENT_LOCAL_FILENAMES,
    merge_db_ingredient_sources,
)

db = SessionLocal()
items = get_all_ingredients(db)
sources = merge_db_ingredient_sources(db)

print(f"ingredient_base: {len(items)} 条")
for i in sorted(items, key=lambda x: x.id):
    fn = INGREDIENT_LOCAL_FILENAMES.get(i.name, "NONE")
    exists = (INGREDIENT_IMAGE_DIR / fn).exists() if fn != "NONE" else False
    print(f"  {i.id:3} | {i.category:6} | {i.name} | {fn} | file={exists}")

missing_ing = [n for n, (f, _) in sources.items() if not (INGREDIENT_IMAGE_DIR / f).exists()]
print(f"\nmissing ingredient images: {len(missing_ing)}")
for n in missing_ing:
    print(f"  - {n} -> {sources[n][0]}")

missing_cat = [k for k, f in CATEGORY_LOCAL_FILENAMES.items() if not (CATEGORY_IMAGE_DIR / f).exists()]
print(f"\nmissing category icons: {len(missing_cat)}")
for k in missing_cat:
    print(f"  - {k or '全部'} -> {CATEGORY_LOCAL_FILENAMES[k]}")

db.close()
