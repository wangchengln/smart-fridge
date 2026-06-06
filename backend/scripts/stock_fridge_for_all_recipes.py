"""Analyze all recipe ingredient requirements and stock fridge for all 50 recipes."""
from collections import defaultdict
from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from dotenv import load_dotenv

load_dotenv(BACKEND_ROOT / ".env")

from src.utils.database import SessionLocal, init_db
from src.models.recipe_base import RecipeBase
from src.models.recipe_ingredient_rel import RecipeIngredientRel
from src.models.ingredient_base import IngredientBase
from src.models.user import User
from src.crud.user_ingredient import create_user_ingredient, get_user_ingredients
from src.schemas.ingredient import StockUpdateCreate
from src.utils.fridge_inventory import build_user_ingredient_quantities
from src.crud.recipe_ingredient_rel import get_recipe_ingredients
from src.services.recommendation_service import recommendation_service

init_db()
db = SessionLocal()

try:
    recipes = db.query(RecipeBase).all()
    users = db.query(User).all()
    print(f"Recipes: {len(recipes)}")
    print(f"Users: {[(u.id, getattr(u, 'username', None) or getattr(u, 'name', None)) for u in users]}")

    max_qty: dict[str, float] = defaultdict(float)
    ingredient_ids: dict[str, int] = {}
    for r in recipes:
        reqs = (
            db.query(RecipeIngredientRel)
            .filter(RecipeIngredientRel.recipe_id == r.id)
            .all()
        )
        for req in reqs:
            ing = (
                db.query(IngredientBase)
                .filter(IngredientBase.id == req.ingredient_id)
                .first()
            )
            name = ing.name if ing else str(req.ingredient_id)
            ingredient_ids[name] = req.ingredient_id
            max_qty[name] = max(max_qty[name], float(req.required_quantity))

    print(f"\nUnique ingredients needed: {len(max_qty)}")
    for name in sorted(max_qty):
        print(f"  {name} (id={ingredient_ids[name]}): max {max_qty[name]}")

    if not users:
        print("No users found, aborting stock update.")
        sys.exit(1)

    for user in users:
        user_id = user.id
        print(f"\nStocking fridge for user_id={user_id} ({user.nickname or user.phone}) ...")

        for name in sorted(max_qty):
            qty = max_qty[name] + 1.0  # buffer
            ing_id = ingredient_ids[name]
            create_user_ingredient(
                db,
                user_id=user_id,
                stock=StockUpdateCreate(
                    ingredient_id=ing_id,
                    quantity=qty,
                    freshness="fresh",
                ),
            )
            print(f"  Added {name}: {qty}")

        db.commit()

        user_ingredients = build_user_ingredient_quantities(db, user_id)
        cook_self = 0
        for recipe in recipes:
            reqs = get_recipe_ingredients(db, recipe.id)
            missing = 0
            for req in reqs:
                if user_ingredients.get(req.ingredient_id, 0) < float(req.required_quantity):
                    missing += 1
            if missing == 0:
                cook_self += 1

        print(f"Verification user {user_id}: {cook_self}/{len(recipes)} recipes fully covered")
finally:
    db.close()
