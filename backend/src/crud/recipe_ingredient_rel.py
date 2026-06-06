from sqlalchemy.orm import Session
from ..models.recipe_ingredient_rel import RecipeIngredientRel as RecipeIngredientRelModel

def get_recipe_ingredients(db: Session, recipe_id: int):
    """获取菜谱所需食材"""
    return db.query(RecipeIngredientRelModel).filter(
        RecipeIngredientRelModel.recipe_id == recipe_id
    ).all()

def get_ingredient_recipes(db: Session, ingredient_id: int):
    """获取包含特定食材的菜谱"""
    return db.query(RecipeIngredientRelModel).filter(
        RecipeIngredientRelModel.ingredient_id == ingredient_id
    ).all()

def create_recipe_ingredient_rel(db: Session, recipe_id: int, ingredient_id: int, required_quantity: float, is_required: bool = True):
    """创建菜谱食材关联"""
    db_rel = RecipeIngredientRelModel(
        recipe_id=recipe_id,
        ingredient_id=ingredient_id,
        required_quantity=required_quantity,
        is_required=is_required
    )
    db.add(db_rel)
    db.commit()
    db.refresh(db_rel)
    return db_rel

def update_recipe_ingredient_rel(db: Session, rel_id: int, **kwargs):
    """更新菜谱食材关联"""
    db_rel = db.query(RecipeIngredientRelModel).filter(RecipeIngredientRelModel.id == rel_id).first()
    if db_rel:
        for key, value in kwargs.items():
            if hasattr(db_rel, key):
                setattr(db_rel, key, value)
        db.commit()
        db.refresh(db_rel)
    return db_rel

def delete_recipe_ingredient_rel(db: Session, rel_id: int):
    """删除菜谱食材关联"""
    db_rel = db.query(RecipeIngredientRelModel).filter(RecipeIngredientRelModel.id == rel_id).first()
    if db_rel:
        db.delete(db_rel)
        db.commit()
        return True
    return False
