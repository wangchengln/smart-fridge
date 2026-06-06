from typing import Dict

from sqlalchemy.orm import Session

from ..crud.ingredient_base import get_ingredient_by_name
from ..crud.user_ingredient import get_user_ingredients
from ..data.ingredient_aliases import PARENT_SUBSTITUTES


def build_user_ingredient_quantities(db: Session, user_id: int) -> Dict[int, float]:
    """
    汇总用户冰箱库存（合并同食材多条记录），并应用别名替代规则。
    """
    stocks = get_user_ingredients(db, user_id)
    quantities: Dict[int, float] = {}

    for stock in stocks:
        ingredient_id = stock.ingredient_id
        quantities[ingredient_id] = quantities.get(ingredient_id, 0.0) + float(stock.quantity)

    for parent_name, substitute_names in PARENT_SUBSTITUTES.items():
        parent = get_ingredient_by_name(db, parent_name)
        if not parent:
            continue

        total = quantities.get(parent.id, 0.0)
        for substitute_name in substitute_names:
            substitute = get_ingredient_by_name(db, substitute_name)
            if substitute:
                total += quantities.get(substitute.id, 0.0)

        if total > 0:
            quantities[parent.id] = total

    return quantities
