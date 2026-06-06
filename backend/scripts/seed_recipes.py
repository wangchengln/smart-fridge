"""将菜谱种子数据写入数据库（补全至 50 道）"""

from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from dotenv import load_dotenv

load_dotenv(BACKEND_ROOT / ".env")

from src.utils.database import SessionLocal, init_db
from src.crud.recipe_base import ALL_SEED_RECIPES, seed_recipe_base
from src.models.recipe_base import RecipeBase

# 确保表结构与食材库已初始化
init_db()

db = SessionLocal()
try:
    seed_recipe_base(db)
    count = db.query(RecipeBase).count()
    names = [r.name for r in db.query(RecipeBase).order_by(RecipeBase.id).all()]
    print(f"recipe_count: {count}")
    print(f"seed_defined: {len(ALL_SEED_RECIPES)}")
    for idx, name in enumerate(names, 1):
        print(f"{idx:02d}. {name}")
finally:
    db.close()
